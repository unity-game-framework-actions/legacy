import * as core from '@actions/core'
import {context, GitHub} from '@actions/github'

run()

async function run(): Promise<void> {
  try {
    const token = core.getInput('token')
    const milestone = core.getInput('milestone')
    const groupsConfig = core.getInput('groups-config')

    const github = new GitHub(token)
    const groupLabels = JSON.parse(groupsConfig)

    const content = await createChangelogContent(github, milestone, groupLabels)

    core.setOutput('content', content)
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function createChangelogContent(github: GitHub, milestoneNumber: string, groupLabels: any[]): Promise<string> {
  const milestone: any = await github.paginate(`GET /repos/${context.repo.owner}/${context.repo.repo}/milestones/${milestoneNumber}`)
  const issues = await github.paginate(`GET /repos/${context.repo.owner}/${context.repo.repo}/issues?milestone=${milestoneNumber}&state=closed`)
  const map = getIssueGroupsMap(issues, groupLabels)
  const groups = getIssueGroups(map)
  let content = ''

  content += ` - [Milestone](${milestone.html_url})\r\n`

  if (milestone.description !== '') {
    content += `<br/>${milestone.description}\r\n`
  }

  content += formatIssues(groups)

  return ``
}

function formatIssues(groups: any[]): string {
  let format = ''

  for (const group of groups) {
    format += `### ${group.name}\r\n`

    for (const issue of group.issues) {
      format += ` - ${formatIssue(issue)}\r\n`
    }
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

function getIssueGroups(issues: Map<string, any[]>): any[] {
  const groups: any[] = []

  issues.forEach((value, key) => {
    const group = {
      name: key,
      issues: value
    }

    group.issues.sort((a, b) => b.title.localeCompare(a.title))

    groups.push(group)
  })

  groups.sort((a, b) => b.name.localeCompare(a.name))

  return groups
}

function getIssueGroupsMap(issues: any[], groupLabels: any[]): Map<string, any[]> {
  const map = new Map<string, any[]>()

  for (const issue of issues) {
    const groupName = getIssueGroupName(issue, groupLabels)

    if (groupName != null) {
      let collection = map.get(groupName)

      if (collection == undefined) {
        collection = []

        map.set(groupName, collection)
      }

      collection.push(issue)
    }
  }

  return map
}

function getIssueGroupName(issue: any, groupLabels: any[]): string | null {
  const labels = issue.labels

  for (const label of labels) {
    const name = label.name
    const groupName = getGroupNameByLabel(groupLabels, name)

    if (groupName != null) {
      return groupName
    }
  }

  return null
}

function getGroupNameByLabel(groupLabels: any[], label: string): string | null {
  for (const group of groupLabels) {
    if (group.labels.includes(label)) {
      return group.name
    }
  }

  return null
}
