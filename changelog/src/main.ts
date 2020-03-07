import * as core from '@actions/core'
import { context, GitHub } from "@actions/github"
import * as changelog from './changelog'

run()

async function run(): Promise<void> {
  try {
    const token = core.getInput('github-token')
    const github = new GitHub(token)
    const owner = context.repo.owner
    const repo = context.repo.repo
    const url = 'https://github.com/' + owner + '/' + repo
    const milestones = (await github.issues.listMilestonesForRepo({ owner, repo, state: 'all' })).data
    const issues = (await github.issues.listForRepo({ owner, repo, state: 'all' })).data
    const config = changelog.createDefaultConfig(url)
    const log = changelog.createChangelog(milestones, issues, config)
    const format = changelog.formatChangelog(log, config)
    
    console.log(format)
    console.log(JSON.stringify(log, null, 2))
    console.log(JSON.stringify(milestones, null, 2))
    console.log(JSON.stringify(issues, null, 2))
  } catch (error) {
    core.setFailed(error.message)
  }
}