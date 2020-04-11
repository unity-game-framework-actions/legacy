import * as core from '@actions/core'
import {context, GitHub} from '@actions/github'
import {promises as fs} from 'fs'
import * as yaml from 'js-yaml'

run()

async function run(): Promise<void> {
  try {
    const token = core.getInput('token')
    const milestone = core.getInput('milestone')
    const configPath = core.getInput('config')

    const github = new GitHub(token)
    const file = await fs.readFile(configPath)
    const config = yaml.load(file.toString())

    const content = await createChangelogContent(github, milestone, config)

    core.setOutput('content', content)
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function createChangelogContent(github: GitHub, milestone: string, config: any[]): Promise<string> {
  let content = ''
  const milestones = await github.paginate(`GET /repos/${context.repo.owner}/${context.repo.repo}/milestones/${milestone}`)
  const groups = []

  for (const group of config) {
    const issues = await github.paginate(`GET /repos/${context.repo.owner}/${context.repo.repo}/issues?milestone=${milestone}&state=all&labels=${group.labels}`)

    if (issues.length > 0) {
      groups.push({
        name: group.name,
        issues: issues
      })
    }
  }

  content += formatMilestone(milestones[0])
  content += formatIssues(groups)

  return content
}

function formatMilestone(milestone: any): string {
  let format = ''

  format += ` - [Milestone](${milestone.html_url})\r\n`

  if (milestone.description !== '') {
    format += `\r\n${milestone.description}\r\n\r\n`
  }

  return format
}

function formatIssues(groups: any[]): string {
  let format = ''

  for (const group of groups) {
    format += `### ${group.name}\r\n`

    for (const issue of group.issues) {
      format += ` - ${formatIssue(issue)}\r\n`
    }

    format += '\r\n'
  }

  return format
}

function formatIssue(issue: any): string {
  let format = `${issue.title} ([#${issue.number}](${issue.html_url}))`

  if (issue.body !== '') {
    format += `<br/>${issue.body}`
  }

  return format
}
