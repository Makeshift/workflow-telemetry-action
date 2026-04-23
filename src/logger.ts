import * as core from '@actions/core'

const LOG_HEADER: string = '[Workflow Telemetry]'

export function isDebugEnabled(): boolean {
  return core.isDebug()
}

export function debug(msg: string) {
  core.debug(LOG_HEADER + ' ' + msg)
}

export function info(msg: string) {
  core.info(LOG_HEADER + ' ' + msg)
}

export function error(msg: string | Error) {
  if (msg instanceof String || typeof msg === 'string') {
    core.warning(LOG_HEADER + ' ' + msg)
  } else {
    core.warning(LOG_HEADER + ' ' + (msg as Error).name)
    core.warning(msg as Error)
  }
}

