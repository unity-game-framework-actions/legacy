import * as core from '@actions/core'
import {context, GitHub} from '@actions/github'
import * as changelog from './changelog'

run()

async function run(): Promise<void> {
  try {
    const token = core.getInput('token')
    const milestonesRequest = core.getInput('milestonesRequest')
    const issuesRequest = core.getInput('issuesRequest')

    const github = new GitHub(token)
    const owner = context.repo.owner
    const repo = context.repo.repo
    const url = `https://github.com/${owner}/${repo}`

    const milestones = (await github.issues.listMilestonesForRepo({owner, repo, state: getState(milestonesRequest)})).data
    const issues = (await github.issues.listForRepo({owner, repo, state: getState(issuesRequest)})).data

    const config = changelog.createDefaultConfig(url)
    const log = changelog.createChangelog(milestones, issues, config)
    const format = changelog.formatChangelog(log, config)

    core.info(format)
  } catch (error) {
    core.setFailed(error.message)
  }
}

function getState(value: string): 'open' | 'closed' | 'all' | undefined {
  switch (value) {
    case 'open':
      return 'open'
    case 'closed':
      return 'closed'
    case 'all':
      return 'all'
  }
  return undefined
}
