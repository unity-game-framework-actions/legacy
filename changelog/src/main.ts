import * as core from '@actions/core'
import {context, GitHub} from '@actions/github'
import * as changelog from './changelog'
import {promises as fs} from 'fs'

run()

async function run(): Promise<void> {
  try {
    const token = core.getInput('token')
    const workspace = core.getInput('workspace')
    const milestonesRequest = core.getInput('milestones-request')
    const issuesRequest = core.getInput('issues-request')
    let configPath = core.getInput('config-path')

    if (core.isDebug()) {
      core.debug(`Working directory: '${__dirname}'.`)
      core.debug(`Input workspace: '${workspace}'.`)
      core.debug(`Input milestones-request: '${milestonesRequest}'.`)
      core.debug(`Input issues-request: '${issuesRequest}'.`)
      core.debug(`Input configPath: '${configPath}'.`)
    }

    if (configPath === null) {
      configPath = `${__dirname}/../res/config.json`

      core.debug(`Input configPath: '${configPath}'.`)
    }

    const github = new GitHub(token)
    const owner = context.repo.owner
    const repo = context.repo.repo

    const milestones = (await github.issues.listMilestonesForRepo({owner, repo, state: getState(milestonesRequest)})).data
    const issues = (await github.issues.listForRepo({owner, repo, state: getState(issuesRequest)})).data
    const commits = (await github.repos.listCommits({owner, repo})).data
    const config = JSON.parse((await fs.readFile(configPath)).toString())

    const url = `https://github.com/${owner}/${repo}`
    const sha = changelog.getFirstCommitSha(commits)

    const repoConfig: changelog.RepoConfig = {
      url: url,
      firstCommitSha: sha
    }

    const log = changelog.createChangelog(milestones, issues, config)
    const format = changelog.formatChangelog(log, repoConfig, config)

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
