import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import { ChildProcess, exec, spawn } from 'child_process'
import { chmodSync } from 'fs'
import os from 'os'
import path from 'path'
import { sprintf } from 'sprintf-js'
import { CompletedCommand, WorkflowJobType } from './interfaces'
import * as logger from './logger'
import { parse } from './procTraceParser'

const PROC_TRACER_PID_KEY = 'PROC_TRACER_PID'
const PROC_TRACER_OUTPUT_PATH_KEY = 'PROC_TRACER_OUTPUT_PATH'
const PROC_TRACER_OUTPUT_FILE_NAME = 'proc-trace.out'
const DEFAULT_PROC_TRACE_CHART_MAX_COUNT = 100
const GHA_FILE_NAME_PREFIX = '/home/runner/work/_actions/'

// TODO: Update version when the first release is published at https://github.com/Makeshift/proc-tracer/releases
const PROC_TRACER_REPO = 'Makeshift/proc-tracer'
const PROC_TRACER_VERSION = 'v0.0.1'
const arch = getArchSuffix()
const PROC_TRACER_TOOL_NAME = `proc-tracer_linux_${arch}`

let finished = false

function getArchSuffix(): string {
  switch (os.arch()) {
    case 'arm64':
      return 'arm64'
    case 'x64':
      return 'amd64'
    default:
      throw new Error(`Unsupported architecture for proc-tracer: ${os.arch()}`)
  }
}

async function downloadProcTracer(): Promise<string> {
  const arch = getArchSuffix()

  const cachedPath = tc.find(PROC_TRACER_TOOL_NAME, PROC_TRACER_VERSION, arch)
  if (cachedPath) {
    logger.info(`Using cached proc-tracer from ${cachedPath}`)
    return path.join(cachedPath, PROC_TRACER_TOOL_NAME)
  }

  const downloadUrl = `https://github.com/${PROC_TRACER_REPO}/releases/latest/download/${PROC_TRACER_TOOL_NAME}`
  logger.info(`Downloading proc-tracer from ${downloadUrl}`)

  const downloadedPath = await tc.downloadTool(downloadUrl)
  chmodSync(downloadedPath, 0o755)

  const cached = await tc.cacheFile(
    downloadedPath,
    PROC_TRACER_TOOL_NAME,
    PROC_TRACER_TOOL_NAME,
    PROC_TRACER_VERSION,
    arch
  )

  const binaryPath = path.join(cached, PROC_TRACER_TOOL_NAME)
  logger.info(`Cached proc-tracer at ${binaryPath}`)
  return binaryPath
}

function getExtraProcessInfo(command: CompletedCommand): string | null {
  // Check whether this is node process with args
  if (command.name === 'node' && command.args.length > 1) {
    const arg1: string = command.args[1]
    // Check whether this is Node.js GHA process
    if (arg1.startsWith(GHA_FILE_NAME_PREFIX)) {
      const actionFile: string = arg1.substring(GHA_FILE_NAME_PREFIX.length)
      const idx1: number = actionFile.indexOf('/')
      const idx2: number = actionFile.indexOf('/', idx1 + 1)
      if (idx1 >= 0 && idx2 > idx1) {
        // If we could find a valid GHA name, use it as extra info
        return actionFile.substring(idx1 + 1, idx2)
      }
    }
  }
  return null
}

///////////////////////////

export async function start(): Promise<boolean> {
  logger.info(`Starting process tracer ...`)

  try {
    const binaryPath = await downloadProcTracer()
    const procTraceOutFilePath = path.join(
      process.env.RUNNER_TEMP || os.tmpdir(),
      PROC_TRACER_OUTPUT_FILE_NAME
    )

    const child: ChildProcess = spawn(
      'sudo',
      [binaryPath, '--format', 'json', '--output', procTraceOutFilePath],
      {
        detached: true,
        stdio: 'ignore',
        env: {
          ...process.env
        }
      }
    )
    child.unref()

    core.saveState(PROC_TRACER_PID_KEY, child.pid?.toString())
    core.saveState(PROC_TRACER_OUTPUT_PATH_KEY, procTraceOutFilePath)

    logger.info(`Started process tracer`)

    return true
  } catch (error: any) {
    logger.error('Unable to start process tracer')
    logger.error(error)

    return false
  }
}

export async function finish(currentJob: WorkflowJobType): Promise<boolean> {
  logger.info(`Finishing process tracer ...`)

  const procTracePID: string = core.getState(PROC_TRACER_PID_KEY)
  if (!procTracePID) {
    logger.info(
      `Skipped finishing process tracer since process tracer didn't started`
    )
    return false
  }
  try {
    logger.debug(
      `Interrupting process tracer with pid ${procTracePID} to stop gracefully ...`
    )

    exec(`sudo kill -s INT ${procTracePID}`)
    finished = true

    logger.info(`Finished process tracer`)

    return true
  } catch (error: any) {
    logger.error('Unable to finish process tracer')
    logger.error(error)

    return false
  }
}

export async function report(
  currentJob: WorkflowJobType
): Promise<string | null> {
  logger.info(`Reporting process tracer result ...`)

  if (!finished) {
    logger.info(
      `Skipped reporting process tracer since process tracer didn't finished`
    )
    return null
  }
  try {
    const procTraceOutFilePath = core.getState(PROC_TRACER_OUTPUT_PATH_KEY)
    if (!procTraceOutFilePath) {
      logger.info('No process tracer output path found in state')
      return null
    }

    logger.info(
      `Getting process tracer result from file ${procTraceOutFilePath} ...`
    )

    let procTraceMinDuration = -1
    const procTraceMinDurationInput: string = core.getInput(
      'proc_trace_min_duration'
    )
    if (procTraceMinDurationInput) {
      const minProcDurationVal: number = parseInt(procTraceMinDurationInput)
      if (Number.isInteger(minProcDurationVal)) {
        procTraceMinDuration = minProcDurationVal
      }
    }
    const procTraceSysEnable: boolean =
      core.getInput('proc_trace_sys_enable') === 'true'

    const procTraceChartShow: boolean =
      core.getInput('proc_trace_chart_show') === 'true'
    const procTraceChartMaxCountInput: number = parseInt(
      core.getInput('proc_trace_chart_max_count')
    )
    const procTraceChartMaxCount = Number.isInteger(procTraceChartMaxCountInput)
      ? procTraceChartMaxCountInput
      : DEFAULT_PROC_TRACE_CHART_MAX_COUNT
    const procTraceTableShow: boolean =
      core.getInput('proc_trace_table_show') === 'true'

    const completedCommands: CompletedCommand[] = await parse(
      procTraceOutFilePath,
      {
        minDuration: procTraceMinDuration,
        traceSystemProcesses: procTraceSysEnable
      }
    )

    ///////////////////////////////////////////////////////////////////////////

    let chartContent = ''

    if (procTraceChartShow) {
      chartContent = chartContent.concat('gantt', '\n')
      chartContent = chartContent.concat('\t', `title ${currentJob.name}`, '\n')
      chartContent = chartContent.concat('\t', `dateFormat x`, '\n')
      chartContent = chartContent.concat('\t', `axisFormat %H:%M:%S`, '\n')

      const filteredCommands: CompletedCommand[] = [...completedCommands]
        .sort((a: CompletedCommand, b: CompletedCommand) => {
          return -(a.durationNs - b.durationNs)
        })
        .slice(0, procTraceChartMaxCount)
        .sort((a: CompletedCommand, b: CompletedCommand) => {
          return a.startTimeNs - b.startTimeNs
        })

      for (const command of filteredCommands) {
        const extraProcessInfo: string | null = getExtraProcessInfo(command)
        const escapedName = command.name.replace(/:/g, '#colon;')
        if (extraProcessInfo) {
          chartContent = chartContent.concat(
            '\t',
            `${escapedName} (${extraProcessInfo}) : `
          )
        } else {
          chartContent = chartContent.concat('\t', `${escapedName} : `)
        }
        if (command.exitCode !== 0) {
          // to show red
          chartContent = chartContent.concat('crit, ')
        }

        const startTimeMs: number = Math.round(command.startTimeNs / 1e6)
        const finishTimeMs: number = Math.round(
          (command.startTimeNs + command.durationNs) / 1e6
        )
        chartContent = chartContent.concat(
          `${Math.min(startTimeMs, finishTimeMs)}, ${finishTimeMs}`,
          '\n'
        )
      }
    }

    ///////////////////////////////////////////////////////////////////////////

    let tableContent = ''

    if (procTraceTableShow) {
      const commandInfos: string[] = []
      commandInfos.push(
        sprintf(
          '%-16s %7s %7s %15s %15s %10s %-20s',
          'NAME',
          'PID',
          'PPID',
          'START TIME (ms)',
          'DURATION (ms)',
          'EXIT CODE',
          'ARGS'
        )
      )
      for (const command of completedCommands) {
        commandInfos.push(
          sprintf(
            '%-16s %7d %7d %15d %15d %10d %s',
            command.name,
            command.pid,
            command.ppid,
            Math.round(command.startTimeNs / 1e6),
            Math.round(command.durationNs / 1e6),
            command.exitCode,
            command.args.join(' ')
          )
        )
      }

      tableContent = commandInfos.join('\n')
    }

    ///////////////////////////////////////////////////////////////////////////

    const postContentItems: string[] = ['', '### Process Trace']
    if (procTraceChartShow) {
      postContentItems.push(
        '',
        `#### Top ${procTraceChartMaxCount} processes with highest duration`,
        '',
        '```mermaid' + '\n' + chartContent + '\n' + '```'
      )
    }
    if (procTraceTableShow) {
      postContentItems.push(
        '',
        `#### All processes with detail`,
        '',
        '```' + '\n' + tableContent + '\n' + '```'
      )
    }

    const postContent: string = postContentItems.join('\n')

    logger.info(`Reported process tracer result`)

    return postContent
  } catch (error: any) {
    logger.debug('Unable to report process tracer result')
    logger.debug(error)

    return null
  }
}
