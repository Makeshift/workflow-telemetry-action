import {
  finish,
  finish1 as finish3,
  report,
  report1 as report3,
  require_github
} from "./chunk-gwppk74n.js";
import {
  finish as finish2,
  report as report2
} from "./chunk-e4nbz3jw.js";
import {
  __toESM,
  debug,
  error,
  info,
  isDebugEnabled,
  require_core,
  require_register
} from "./chunk-7jcg8yy5.js";

// src/post.ts
var import_register = __toESM(require_register(), 1);
var core = __toESM(require_core(), 1);
var github = __toESM(require_github(), 1);
var { pull_request } = github.context.payload;
var { workflow, job, repo, runId, sha } = github.context;
var PAGE_SIZE = 100;
async function getCurrentJob() {
  const _getCurrentJob = async () => {
    const octokit = github.getOctokit(core.getInput("github_token"));
    for (let page = 0;; page++) {
      const result = await octokit.rest.actions.listJobsForWorkflowRun({
        owner: repo.owner,
        repo: repo.repo,
        run_id: runId,
        per_page: PAGE_SIZE,
        page
      });
      const jobs = result.data.jobs;
      if (!jobs || !jobs.length) {
        break;
      }
      const currentJobs = jobs.filter((it) => it.status === "in_progress" && it.runner_name === process.env.RUNNER_NAME);
      if (currentJobs && currentJobs.length) {
        return currentJobs[0];
      }
      if (jobs.length < PAGE_SIZE) {
        break;
      }
    }
    return null;
  };
  try {
    for (let i = 0;i < 10; i++) {
      const currentJob = await _getCurrentJob();
      if (currentJob && currentJob.id) {
        return currentJob;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  } catch (error2) {
    error(`Unable to get current workflow job info. ` + `Please sure that your workflow have "actions:read" permission!`);
  }
  return null;
}
async function reportAll(currentJob, stepTracerContent, statCollectorContent, procTracerContent) {
  info(`Reporting all content ...`);
  debug(`Workflow - Job: ${workflow} - ${job}`);
  const jobUrl = `https://github.com/${repo.owner}/${repo.repo}/runs/${currentJob.id}?check_suite_focus=true`;
  debug(`Job url: ${jobUrl}`);
  const title = `## Workflow Telemetry - ${workflow} / ${currentJob.name}`;
  debug(`Title: ${title}`);
  const commit = pull_request && pull_request.head && pull_request.head.sha || sha;
  debug(`Commit: ${commit}`);
  const commitUrl = `https://github.com/${repo.owner}/${repo.repo}/commit/${commit}`;
  debug(`Commit url: ${commitUrl}`);
  const info2 = `Workflow telemetry for commit [${commit}](${commitUrl})
` + `You can access workflow job details [here](${jobUrl})`;
  const jobSummary = core.getInput("job_summary");
  if (jobSummary === "true") {
    try {
      core.summary.addRaw(title).addEOL().addRaw(info2).addEOL();
      if (stepTracerContent) {
        core.summary.addDetails("Step Trace", `

` + stepTracerContent + `
`);
      }
      if (procTracerContent) {
        core.summary.addDetails("Process Trace", `

` + procTracerContent + `
`);
      }
      if (statCollectorContent) {
        core.summary.addDetails("Stat Graphs", `

` + statCollectorContent + `
`);
      }
      await core.summary.write();
    } catch (error2) {
      const msg = error2 instanceof Error ? error2.message : String(error2);
      core.warning(`Failed to write job summary: ${msg}. ` + `To fix this, ensure your workflow has the required permissions. ` + `Add the following to your job:
` + `  permissions:
` + `    actions: read
` + `    contents: read`);
    }
  }
  const commentOnPR = core.getInput("comment_on_pr");
  if (pull_request && commentOnPR === "true") {
    if (isDebugEnabled()) {
      debug(`Found Pull Request: ${JSON.stringify(pull_request)}`);
    }
    try {
      const bodyParts = [title, info2];
      if (stepTracerContent) {
        bodyParts.push(`<details><summary>Step Trace</summary>

${stepTracerContent}
</details>`);
      }
      if (statCollectorContent) {
        bodyParts.push(`<details><summary>Stat Graphs</summary>

${statCollectorContent}
</details>`);
      }
      if (procTracerContent) {
        bodyParts.push(`<details><summary>Process Trace</summary>

${procTracerContent}
</details>`);
      }
      const octokit = github.getOctokit(core.getInput("github_token"));
      await octokit.rest.issues.createComment({
        ...github.context.repo,
        issue_number: Number(github.context.payload.pull_request?.number),
        body: bodyParts.join(`
`)
      });
    } catch (error2) {
      const msg = error2 instanceof Error ? error2.message : String(error2);
      core.warning(`Failed to comment on PR: ${msg}. ` + `To fix this, ensure your workflow has the required permissions. ` + `Add the following to your job:
` + `  permissions:
` + `    actions: read
` + `    pull-requests: write`);
    }
  } else {
    debug(`Couldn't find Pull Request`);
  }
  info(`Reporting all content completed`);
}
async function run() {
  try {
    info(`Finishing ...`);
    const currentJob = await getCurrentJob();
    if (!currentJob) {
      error(`Couldn't find current job. So action will not report any data.`);
      return;
    }
    debug(`Current job: ${JSON.stringify(currentJob)}`);
    await finish3(currentJob);
    await finish2(currentJob);
    await finish(currentJob);
    const parseLogGroups = core.getInput("parse_log_groups").toLowerCase() === "true";
    const stepTracerContent = await report3(currentJob, parseLogGroups);
    const statCollectorContent = await report2(currentJob);
    const procTracerContent = await report(currentJob);
    await reportAll(currentJob, stepTracerContent, statCollectorContent, procTracerContent);
    info(`Finish completed`);
  } catch (error2) {
    error(error2.message);
  }
}
run();

//# debugId=E34112D9BD31F63164756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL3Bvc3QudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbCiAgICAiaW1wb3J0ICdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInXG5pbXBvcnQgKiBhcyBjb3JlIGZyb20gJ0BhY3Rpb25zL2NvcmUnXG5pbXBvcnQgKiBhcyBnaXRodWIgZnJvbSAnQGFjdGlvbnMvZ2l0aHViJ1xuaW1wb3J0ICogYXMgc3RlcFRyYWNlciBmcm9tICcuL3N0ZXBUcmFjZXInXG5pbXBvcnQgKiBhcyBzdGF0Q29sbGVjdG9yIGZyb20gJy4vc3RhdENvbGxlY3RvcidcbmltcG9ydCAqIGFzIHByb2Nlc3NUcmFjZXIgZnJvbSAnLi9wcm9jZXNzVHJhY2VyJ1xuaW1wb3J0ICogYXMgbG9nZ2VyIGZyb20gJy4vbG9nZ2VyJ1xuaW1wb3J0IHsgV29ya2Zsb3dKb2JUeXBlIH0gZnJvbSAnLi9pbnRlcmZhY2VzJ1xuXG5jb25zdCB7IHB1bGxfcmVxdWVzdCB9ID0gZ2l0aHViLmNvbnRleHQucGF5bG9hZFxuY29uc3QgeyB3b3JrZmxvdywgam9iLCByZXBvLCBydW5JZCwgc2hhIH0gPSBnaXRodWIuY29udGV4dFxuY29uc3QgUEFHRV9TSVpFID0gMTAwXG5cbmFzeW5jIGZ1bmN0aW9uIGdldEN1cnJlbnRKb2IoKTogUHJvbWlzZTxXb3JrZmxvd0pvYlR5cGUgfCBudWxsPiB7XG4gIGNvbnN0IF9nZXRDdXJyZW50Sm9iID0gYXN5bmMgKCk6IFByb21pc2U8V29ya2Zsb3dKb2JUeXBlIHwgbnVsbD4gPT4ge1xuICAgIGNvbnN0IG9jdG9raXQgPSBnaXRodWIuZ2V0T2N0b2tpdChjb3JlLmdldElucHV0KCdnaXRodWJfdG9rZW4nKSlcbiAgICBmb3IgKGxldCBwYWdlID0gMDsgOyBwYWdlKyspIHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IG9jdG9raXQucmVzdC5hY3Rpb25zLmxpc3RKb2JzRm9yV29ya2Zsb3dSdW4oe1xuICAgICAgICBvd25lcjogcmVwby5vd25lcixcbiAgICAgICAgcmVwbzogcmVwby5yZXBvLFxuICAgICAgICBydW5faWQ6IHJ1bklkLFxuICAgICAgICBwZXJfcGFnZTogUEFHRV9TSVpFLFxuICAgICAgICBwYWdlXG4gICAgICB9KVxuICAgICAgY29uc3Qgam9iczogV29ya2Zsb3dKb2JUeXBlW10gPSByZXN1bHQuZGF0YS5qb2JzXG4gICAgICAvLyBJZiB0aGVyZSBhcmUgbm8gam9icywgc3RvcCBoZXJlXG4gICAgICBpZiAoIWpvYnMgfHwgIWpvYnMubGVuZ3RoKSB7XG4gICAgICAgIGJyZWFrXG4gICAgICB9XG4gICAgICBjb25zdCBjdXJyZW50Sm9icyA9IGpvYnMuZmlsdGVyKFxuICAgICAgICBpdCA9PlxuICAgICAgICAgIGl0LnN0YXR1cyA9PT0gJ2luX3Byb2dyZXNzJyAmJlxuICAgICAgICAgIGl0LnJ1bm5lcl9uYW1lID09PSBwcm9jZXNzLmVudi5SVU5ORVJfTkFNRVxuICAgICAgKVxuICAgICAgaWYgKGN1cnJlbnRKb2JzICYmIGN1cnJlbnRKb2JzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gY3VycmVudEpvYnNbMF1cbiAgICAgIH1cbiAgICAgIC8vIFNpbmNlIHJldHVybmluZyBqb2IgY291bnQgaXMgbGVzcyB0aGFuIHBhZ2Ugc2l6ZSwgdGhpcyBtZWFucyB0aGF0IHRoZXJlIGFyZSBubyBvdGhlciBqb2JzLlxuICAgICAgLy8gU28gbm8gbmVlZCB0byBtYWtlIGFub3RoZXIgcmVxdWVzdCBmb3IgdGhlIG5leHQgcGFnZS5cbiAgICAgIGlmIChqb2JzLmxlbmd0aCA8IFBBR0VfU0laRSkge1xuICAgICAgICBicmVha1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbFxuICB9XG4gIHRyeSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAxMDsgaSsrKSB7XG4gICAgICBjb25zdCBjdXJyZW50Sm9iOiBXb3JrZmxvd0pvYlR5cGUgfCBudWxsID0gYXdhaXQgX2dldEN1cnJlbnRKb2IoKVxuICAgICAgaWYgKGN1cnJlbnRKb2IgJiYgY3VycmVudEpvYi5pZCkge1xuICAgICAgICByZXR1cm4gY3VycmVudEpvYlxuICAgICAgfVxuICAgICAgYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIDEwMDApKVxuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgIGxvZ2dlci5lcnJvcihcbiAgICAgIGBVbmFibGUgdG8gZ2V0IGN1cnJlbnQgd29ya2Zsb3cgam9iIGluZm8uIGAgK1xuICAgICAgICBgUGxlYXNlIHN1cmUgdGhhdCB5b3VyIHdvcmtmbG93IGhhdmUgXCJhY3Rpb25zOnJlYWRcIiBwZXJtaXNzaW9uIWBcbiAgICApXG4gIH1cbiAgcmV0dXJuIG51bGxcbn1cblxuYXN5bmMgZnVuY3Rpb24gcmVwb3J0QWxsKFxuICBjdXJyZW50Sm9iOiBXb3JrZmxvd0pvYlR5cGUsXG4gIHN0ZXBUcmFjZXJDb250ZW50OiBzdHJpbmcgfCBudWxsLFxuICBzdGF0Q29sbGVjdG9yQ29udGVudDogc3RyaW5nIHwgbnVsbCxcbiAgcHJvY1RyYWNlckNvbnRlbnQ6IHN0cmluZyB8IG51bGxcbik6IFByb21pc2U8dm9pZD4ge1xuICBsb2dnZXIuaW5mbyhgUmVwb3J0aW5nIGFsbCBjb250ZW50IC4uLmApXG5cbiAgbG9nZ2VyLmRlYnVnKGBXb3JrZmxvdyAtIEpvYjogJHt3b3JrZmxvd30gLSAke2pvYn1gKVxuXG4gIGNvbnN0IGpvYlVybCA9IGBodHRwczovL2dpdGh1Yi5jb20vJHtyZXBvLm93bmVyfS8ke3JlcG8ucmVwb30vcnVucy8ke2N1cnJlbnRKb2IuaWR9P2NoZWNrX3N1aXRlX2ZvY3VzPXRydWVgXG4gIGxvZ2dlci5kZWJ1ZyhgSm9iIHVybDogJHtqb2JVcmx9YClcblxuICBjb25zdCB0aXRsZSA9IGAjIyBXb3JrZmxvdyBUZWxlbWV0cnkgLSAke3dvcmtmbG93fSAvICR7Y3VycmVudEpvYi5uYW1lfWBcbiAgbG9nZ2VyLmRlYnVnKGBUaXRsZTogJHt0aXRsZX1gKVxuXG4gIGNvbnN0IGNvbW1pdDogc3RyaW5nID1cbiAgICAocHVsbF9yZXF1ZXN0ICYmIHB1bGxfcmVxdWVzdC5oZWFkICYmIHB1bGxfcmVxdWVzdC5oZWFkLnNoYSkgfHwgc2hhXG4gIGxvZ2dlci5kZWJ1ZyhgQ29tbWl0OiAke2NvbW1pdH1gKVxuXG4gIGNvbnN0IGNvbW1pdFVybCA9IGBodHRwczovL2dpdGh1Yi5jb20vJHtyZXBvLm93bmVyfS8ke3JlcG8ucmVwb30vY29tbWl0LyR7Y29tbWl0fWBcbiAgbG9nZ2VyLmRlYnVnKGBDb21taXQgdXJsOiAke2NvbW1pdFVybH1gKVxuXG4gIGNvbnN0IGluZm8gPVxuICAgIGBXb3JrZmxvdyB0ZWxlbWV0cnkgZm9yIGNvbW1pdCBbJHtjb21taXR9XSgke2NvbW1pdFVybH0pXFxuYCArXG4gICAgYFlvdSBjYW4gYWNjZXNzIHdvcmtmbG93IGpvYiBkZXRhaWxzIFtoZXJlXSgke2pvYlVybH0pYFxuXG4gIGNvbnN0IGpvYlN1bW1hcnk6IHN0cmluZyA9IGNvcmUuZ2V0SW5wdXQoJ2pvYl9zdW1tYXJ5JylcbiAgaWYgKCd0cnVlJyA9PT0gam9iU3VtbWFyeSkge1xuICAgIHRyeSB7XG4gICAgICBjb3JlLnN1bW1hcnkuYWRkUmF3KHRpdGxlKS5hZGRFT0woKS5hZGRSYXcoaW5mbykuYWRkRU9MKClcbiAgICAgIGlmIChzdGVwVHJhY2VyQ29udGVudCkge1xuICAgICAgICBjb3JlLnN1bW1hcnkuYWRkRGV0YWlscygnU3RlcCBUcmFjZScsICdcXG5cXG4nICsgc3RlcFRyYWNlckNvbnRlbnQgKyAnXFxuJylcbiAgICAgIH1cbiAgICAgIGlmIChwcm9jVHJhY2VyQ29udGVudCkge1xuICAgICAgICBjb3JlLnN1bW1hcnkuYWRkRGV0YWlscyhcbiAgICAgICAgICAnUHJvY2VzcyBUcmFjZScsXG4gICAgICAgICAgJ1xcblxcbicgKyBwcm9jVHJhY2VyQ29udGVudCArICdcXG4nXG4gICAgICAgIClcbiAgICAgIH1cbiAgICAgIGlmIChzdGF0Q29sbGVjdG9yQ29udGVudCkge1xuICAgICAgICBjb3JlLnN1bW1hcnkuYWRkRGV0YWlscyhcbiAgICAgICAgICAnU3RhdCBHcmFwaHMnLFxuICAgICAgICAgICdcXG5cXG4nICsgc3RhdENvbGxlY3RvckNvbnRlbnQgKyAnXFxuJ1xuICAgICAgICApXG4gICAgICB9XG4gICAgICBhd2FpdCBjb3JlLnN1bW1hcnkud3JpdGUoKVxuICAgIH0gY2F0Y2ggKGVycm9yOiB1bmtub3duKSB7XG4gICAgICBjb25zdCBtc2cgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcilcbiAgICAgIGNvcmUud2FybmluZyhcbiAgICAgICAgYEZhaWxlZCB0byB3cml0ZSBqb2Igc3VtbWFyeTogJHttc2d9LiBgICtcbiAgICAgICAgICBgVG8gZml4IHRoaXMsIGVuc3VyZSB5b3VyIHdvcmtmbG93IGhhcyB0aGUgcmVxdWlyZWQgcGVybWlzc2lvbnMuIGAgK1xuICAgICAgICAgIGBBZGQgdGhlIGZvbGxvd2luZyB0byB5b3VyIGpvYjpcXG5gICtcbiAgICAgICAgICBgICBwZXJtaXNzaW9uczpcXG5gICtcbiAgICAgICAgICBgICAgIGFjdGlvbnM6IHJlYWRcXG5gICtcbiAgICAgICAgICBgICAgIGNvbnRlbnRzOiByZWFkYFxuICAgICAgKVxuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGNvbW1lbnRPblBSOiBzdHJpbmcgPSBjb3JlLmdldElucHV0KCdjb21tZW50X29uX3ByJylcbiAgaWYgKHB1bGxfcmVxdWVzdCAmJiAndHJ1ZScgPT09IGNvbW1lbnRPblBSKSB7XG4gICAgaWYgKGxvZ2dlci5pc0RlYnVnRW5hYmxlZCgpKSB7XG4gICAgICBsb2dnZXIuZGVidWcoYEZvdW5kIFB1bGwgUmVxdWVzdDogJHtKU09OLnN0cmluZ2lmeShwdWxsX3JlcXVlc3QpfWApXG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGJvZHlQYXJ0czogc3RyaW5nW10gPSBbdGl0bGUsIGluZm9dXG4gICAgICBpZiAoc3RlcFRyYWNlckNvbnRlbnQpIHtcbiAgICAgICAgYm9keVBhcnRzLnB1c2goXG4gICAgICAgICAgYDxkZXRhaWxzPjxzdW1tYXJ5PlN0ZXAgVHJhY2U8L3N1bW1hcnk+XFxuXFxuJHtzdGVwVHJhY2VyQ29udGVudH1cXG48L2RldGFpbHM+YFxuICAgICAgICApXG4gICAgICB9XG4gICAgICBpZiAoc3RhdENvbGxlY3RvckNvbnRlbnQpIHtcbiAgICAgICAgYm9keVBhcnRzLnB1c2goXG4gICAgICAgICAgYDxkZXRhaWxzPjxzdW1tYXJ5PlN0YXQgR3JhcGhzPC9zdW1tYXJ5PlxcblxcbiR7c3RhdENvbGxlY3RvckNvbnRlbnR9XFxuPC9kZXRhaWxzPmBcbiAgICAgICAgKVxuICAgICAgfVxuICAgICAgaWYgKHByb2NUcmFjZXJDb250ZW50KSB7XG4gICAgICAgIGJvZHlQYXJ0cy5wdXNoKFxuICAgICAgICAgIGA8ZGV0YWlscz48c3VtbWFyeT5Qcm9jZXNzIFRyYWNlPC9zdW1tYXJ5PlxcblxcbiR7cHJvY1RyYWNlckNvbnRlbnR9XFxuPC9kZXRhaWxzPmBcbiAgICAgICAgKVxuICAgICAgfVxuICAgICAgY29uc3Qgb2N0b2tpdCA9IGdpdGh1Yi5nZXRPY3Rva2l0KGNvcmUuZ2V0SW5wdXQoJ2dpdGh1Yl90b2tlbicpKVxuICAgICAgYXdhaXQgb2N0b2tpdC5yZXN0Lmlzc3Vlcy5jcmVhdGVDb21tZW50KHtcbiAgICAgICAgLi4uZ2l0aHViLmNvbnRleHQucmVwbyxcbiAgICAgICAgaXNzdWVfbnVtYmVyOiBOdW1iZXIoZ2l0aHViLmNvbnRleHQucGF5bG9hZC5wdWxsX3JlcXVlc3Q/Lm51bWJlciksXG4gICAgICAgIGJvZHk6IGJvZHlQYXJ0cy5qb2luKCdcXG4nKVxuICAgICAgfSlcbiAgICB9IGNhdGNoIChlcnJvcjogdW5rbm93bikge1xuICAgICAgY29uc3QgbXNnID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpXG4gICAgICBjb3JlLndhcm5pbmcoXG4gICAgICAgIGBGYWlsZWQgdG8gY29tbWVudCBvbiBQUjogJHttc2d9LiBgICtcbiAgICAgICAgICBgVG8gZml4IHRoaXMsIGVuc3VyZSB5b3VyIHdvcmtmbG93IGhhcyB0aGUgcmVxdWlyZWQgcGVybWlzc2lvbnMuIGAgK1xuICAgICAgICAgIGBBZGQgdGhlIGZvbGxvd2luZyB0byB5b3VyIGpvYjpcXG5gICtcbiAgICAgICAgICBgICBwZXJtaXNzaW9uczpcXG5gICtcbiAgICAgICAgICBgICAgIGFjdGlvbnM6IHJlYWRcXG5gICtcbiAgICAgICAgICBgICAgIHB1bGwtcmVxdWVzdHM6IHdyaXRlYFxuICAgICAgKVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBsb2dnZXIuZGVidWcoYENvdWxkbid0IGZpbmQgUHVsbCBSZXF1ZXN0YClcbiAgfVxuXG4gIGxvZ2dlci5pbmZvKGBSZXBvcnRpbmcgYWxsIGNvbnRlbnQgY29tcGxldGVkYClcbn1cblxuYXN5bmMgZnVuY3Rpb24gcnVuKCk6IFByb21pc2U8dm9pZD4ge1xuICB0cnkge1xuICAgIGxvZ2dlci5pbmZvKGBGaW5pc2hpbmcgLi4uYClcblxuICAgIGNvbnN0IGN1cnJlbnRKb2I6IFdvcmtmbG93Sm9iVHlwZSB8IG51bGwgPSBhd2FpdCBnZXRDdXJyZW50Sm9iKClcblxuICAgIGlmICghY3VycmVudEpvYikge1xuICAgICAgbG9nZ2VyLmVycm9yKFxuICAgICAgICBgQ291bGRuJ3QgZmluZCBjdXJyZW50IGpvYi4gU28gYWN0aW9uIHdpbGwgbm90IHJlcG9ydCBhbnkgZGF0YS5gXG4gICAgICApXG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBsb2dnZXIuZGVidWcoYEN1cnJlbnQgam9iOiAke0pTT04uc3RyaW5naWZ5KGN1cnJlbnRKb2IpfWApXG5cbiAgICAvLyBGaW5pc2ggc3RlcCB0cmFjZXJcbiAgICBhd2FpdCBzdGVwVHJhY2VyLmZpbmlzaChjdXJyZW50Sm9iKVxuICAgIC8vIEZpbmlzaCBzdGF0IGNvbGxlY3RvclxuICAgIGF3YWl0IHN0YXRDb2xsZWN0b3IuZmluaXNoKGN1cnJlbnRKb2IpXG4gICAgLy8gRmluaXNoIHByb2Nlc3MgdHJhY2VyXG4gICAgYXdhaXQgcHJvY2Vzc1RyYWNlci5maW5pc2goY3VycmVudEpvYilcblxuICAgIC8vIFJlcG9ydCBzdGVwIHRyYWNlclxuICAgIGNvbnN0IHBhcnNlTG9nR3JvdXBzID1cbiAgICAgIGNvcmUuZ2V0SW5wdXQoJ3BhcnNlX2xvZ19ncm91cHMnKS50b0xvd2VyQ2FzZSgpID09PSAndHJ1ZSdcbiAgICBjb25zdCBzdGVwVHJhY2VyQ29udGVudDogc3RyaW5nIHwgbnVsbCA9IGF3YWl0IHN0ZXBUcmFjZXIucmVwb3J0KFxuICAgICAgY3VycmVudEpvYixcbiAgICAgIHBhcnNlTG9nR3JvdXBzXG4gICAgKVxuICAgIC8vIFJlcG9ydCBzdGF0IGNvbGxlY3RvclxuICAgIGNvbnN0IHN0YXRDb2xsZWN0b3JDb250ZW50OiBzdHJpbmcgfCBudWxsID1cbiAgICAgIGF3YWl0IHN0YXRDb2xsZWN0b3IucmVwb3J0KGN1cnJlbnRKb2IpXG4gICAgLy8gUmVwb3J0IHByb2Nlc3MgdHJhY2VyXG4gICAgY29uc3QgcHJvY1RyYWNlckNvbnRlbnQ6IHN0cmluZyB8IG51bGwgPVxuICAgICAgYXdhaXQgcHJvY2Vzc1RyYWNlci5yZXBvcnQoY3VycmVudEpvYilcblxuICAgIGF3YWl0IHJlcG9ydEFsbChcbiAgICAgIGN1cnJlbnRKb2IsXG4gICAgICBzdGVwVHJhY2VyQ29udGVudCxcbiAgICAgIHN0YXRDb2xsZWN0b3JDb250ZW50LFxuICAgICAgcHJvY1RyYWNlckNvbnRlbnRcbiAgICApXG5cbiAgICBsb2dnZXIuaW5mbyhgRmluaXNoIGNvbXBsZXRlZGApXG4gIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICBsb2dnZXIuZXJyb3IoZXJyb3IubWVzc2FnZSlcbiAgfVxufVxuXG5ydW4oKVxuIgogIF0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFB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
