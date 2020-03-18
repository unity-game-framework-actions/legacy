import * as core from '@actions/core'
import {context, GitHub} from '@actions/github'
import * as changelog from './changelog'
import {promises as fs} from 'fs'

run()

async function run(): Promise<void> {
  try {
    const token = core.getInput('token')
    const workspace = core.getInput('workspace')
    const requestMilestoneState = core.getInput('request-milestones-state')
    const requestIssuesState = core.getInput('request-issues-state')
    let configPath = core.getInput('config-path')
    const milestone = core.getInput('milestone')

    if (configPath === null) {
      configPath = `${__dirname}/../res/config.json`
    }

    if (core.isDebug()) {
      core.debug(`Working directory: '${__dirname}'.`)
      core.debug(`Input workspace: '${workspace}'.`)
      core.debug(`Input request-milestones-state: '${requestMilestoneState}'.`)
      core.debug(`Input request-issues-state: '${requestIssuesState}'.`)
      core.debug(`Input config-path: '${configPath}'.`)
      core.debug(`Input milestone: '${milestone}'.`)
    }

    const github = new GitHub(token)
    const owner = context.repo.owner
    const repo = context.repo.repo
    const url = `GET /repos/${owner}/${repo}`

    const milestones = await github.paginate(`${url}/milestones?state=${requestMilestoneState}`)
    const issues = await github.paginate(`${url}/issues?state=${requestMilestoneState}`)
    const commits = await github.paginate(`${url}/commits`)
    const config = JSON.parse((await fs.readFile(configPath)).toString())

    const repoConfig: changelog.RepoConfig = {
      owner: owner,
      repo: repo,
      milestones: milestones,
      issues: issues,
      firstCommitSha: commits[commits.length - 1]
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
