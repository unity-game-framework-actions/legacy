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
    const milestone = core.getInput('milestone')

    if (configPath === null) {
      configPath = `${__dirname}/../res/config.json`
    }

    if (core.isDebug()) {
      core.debug(`Working directory: '${__dirname}'.`)
      core.debug(`Input workspace: '${workspace}'.`)
      core.debug(`Input milestones-request: '${milestonesRequest}'.`)
      core.debug(`Input issues-request: '${issuesRequest}'.`)
      core.debug(`Input config-path: '${configPath}'.`)
      core.debug(`Input milestone: '${milestone}'.`)
    }

    const github = new GitHub(token)
    const owner = context.repo.owner
    const repo = context.repo.repo

    const test1 = await github.paginate(`GET /repos/dotnet/runtime/issues`)
    const test2 = (await github.issues.listForRepo({owner: 'dotnet', repo: 'runtime', state: getState(issuesRequest)})).data

    core.debug(`test1: ${test1.length}`)
    core.debug(`test2: ${test2.length}`)

    const milestones = (await github.issues.listMilestonesForRepo({owner, repo, state: getState(milestonesRequest)})).data
    const issues = (await github.issues.listForRepo({owner, repo, state: getState(issuesRequest)})).data
    const commits = (await github.repos.listCommits({owner, repo})).data
    const config = JSON.parse((await fs.readFile(configPath)).toString())

    const repoConfig: changelog.RepoConfig = {
      owner: owner,
      repo: repo,
      milestones: milestones,
      issues: issues,
      commits: commits
    }

    if (milestone === 'all') {
      const result = changelog.generateMilestoneAll(repoConfig, config)

      core.setOutput('changelog', result)
    } else {
      const result = changelog.generateMilestone(repoConfig, config, milestone)

      core.setOutput('changelog', result)
    }
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
