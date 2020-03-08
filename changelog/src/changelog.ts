import * as core from '@actions/core'

export type ChangelogConfig = {
  repoUrl: string
  header: string
  description: string
  sections: SectionConfig[]
  footer: string
}

export type SectionConfig = {
  name: string
  labels: string[]
}

type Changelog = {
  milestones: ChangelogMilestone[]
}

type ChangelogMilestone = {
  name: string
  number: number
  date: Date
  sections: ChangelogSection[]
}

type ChangelogSection = {
  name: string
  issues: IssueInfo[]
}

type MilestoneGroupInfo = {
  milestone: MilestoneInfo
  issues: IssueInfo[]
}

type IssueInfo = {
  number: number
  title: string
  body: string
  labels: LabelInfo[]
  milestone: MilestoneInfo
  pull_request: PullRequestInfo
}

type PullRequestInfo = {
  url: string
}

type MilestoneInfo = {
  number: number
  title: string
  description: string
  closed_at: string
}

type LabelInfo = {
  name: string
}

export function createDefaultConfig(repoUrl: string): ChangelogConfig {
  return {
    repoUrl: repoUrl,
    header: 'Changelog',
    description: `All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).`,
    footer: `---
> Unity Game Framework | Copyright 2019`,
    sections: [
      {
        name: 'Added',
        labels: ['Added']
      },
      {
        name: 'Changed',
        labels: ['Changed']
      },
      {
        name: 'Deprecated',
        labels: ['Deprecated']
      },
      {
        name: 'Removed',
        labels: ['Removed']
      },
      {
        name: 'Fixed',
        labels: ['Fixed']
      },
      {
        name: 'Security',
        labels: ['Security']
      }
    ]
  }
}

export function formatChangelog(changelog: Changelog, config: ChangelogConfig): string {
  let format = ''

  format += `# ${config.header}`
  format += `\n\r${config.description}`

  for (const milestone of changelog.milestones) {
    format += formatMilestone(milestone, config)
  }

  format += `\n\r${config.footer}`

  return format
}

function formatMilestone(milestone: ChangelogMilestone, config: ChangelogConfig): string {
  let format = ''

  format += `\n\r## ${milestone.name} - ${milestone.date.toISOString()}`
  format += `\n\r - [Commits](${config.repoUrl}/compare/0...${milestone.name})`
  format += `\n\r - [Milestone](${config.repoUrl}/milestone/${milestone.number}?closed=1)`

  for (const section of milestone.sections) {
    format += formatSection(section)
  }

  return format
}

function formatSection(section: ChangelogSection): string {
  let format = ''

  format += `\n\r### ${section.name}`

  for (const issue of section.issues) {
    format += formatIssue(issue)
  }

  return format
}

function formatIssue(issue: IssueInfo): string {
  let format = ''

  format += `\n\r - ${issue.title} (#${issue.number})`

  return format
}

export function createChangelog(milestones: MilestoneInfo[], issues: IssueInfo[], config: ChangelogConfig): Changelog {
  const changelog: Changelog = {
    milestones: []
  }

  const groups = getMilestoneGroups(milestones, issues)

  for (const group of groups) {
    const milestone = createMilestone(group, config.sections)

    changelog.milestones.push(milestone)
  }

  changelog.milestones.sort((a, b) => a.date.getTime() - b.date.getTime())

  return changelog
}

function createMilestone(milestoneGroup: MilestoneGroupInfo, sectionConfigs: SectionConfig[]): ChangelogMilestone {
  const milestone: ChangelogMilestone = {
    name: milestoneGroup.milestone.title,
    number: milestoneGroup.milestone.number,
    date: new Date(milestoneGroup.milestone.closed_at),
    sections: []
  }

  core.debug(`Create milestone '${milestoneGroup.milestone.number}'.`)

  const issues = groupIssuesBySection(milestoneGroup.issues, sectionConfigs)

  issues.forEach((value, key) => {
    const section: ChangelogSection = {
      name: key,
      issues: value
    }

    section.issues.sort((a, b) => a.title.localeCompare(b.title))

    milestone.sections.push(section)
  })

  milestone.sections.sort((a, b) => a.name.localeCompare(b.name))

  return milestone
}

function getMilestoneGroups(milestones: MilestoneInfo[], issues: IssueInfo[]): MilestoneGroupInfo[] {
  var groups = new Map<number, MilestoneGroupInfo>()

  for (const milestone of milestones) {
    const info: MilestoneGroupInfo = {
      milestone: milestone,
      issues: []
    }

    groups.set(milestone.number, info)

    core.debug(`Create milestone group '${milestone.number}'.`)
  }

  for (const issue of issues) {
    if (issue.pull_request == null && issue.milestone != null) {
      const info = groups.get(issue.milestone.number)

      info?.issues.push(issue)

      core.debug(`Add issues '${issue.number}' to milestone group '${info?.milestone.number}'.`)
    }
  }

  return Array.from(groups.values())
}

function groupIssuesBySection(issues: IssueInfo[], sectionConfigs: SectionConfig[]): Map<string, IssueInfo[]> {
  const groups = new Map<string, IssueInfo[]>()

  for (const issue of issues) {
    for (const section of sectionConfigs) {
      if (hasAnyLabel(issue.labels, section.labels)) {
        const group = getOrCreate(groups, section.name)

        group.push(issue)

        if (core.isDebug()) {
          const label = getMatchedLabel(issue.labels, section.labels)

          core.debug(`Add issue '${issue.number}' to section '${section.name}'.`)
          core.debug(`\tMatched label '${label}'.`)
          core.debug(`\tIssues labels:`)

          for (const info of issue.labels) {
            core.debug(`\t\t${info.name}`)
          }
        }
      }
    }
  }

  return groups
}

function getOrCreate<TKey, TArray>(map: Map<TKey, TArray[]>, key: TKey): TArray[] {
  let result: TArray[] | undefined = map.get(key)

  if (result == undefined) {
    result = []
    map.set(key, result)
  }

  return result
}

function hasAnyLabel(labels: LabelInfo[], names: string[]): boolean {
  for (const name of names) {
    if (hasLabel(labels, name)) {
      return true
    }
  }
  return false
}

function getMatchedLabel(labels: LabelInfo[], names: string[]): string | null {
  for (const name of names) {
    if (hasLabel(labels, name)) {
      return name
    }
  }
  return null
}

function hasLabel(labels: LabelInfo[], name: string): boolean {
  for (const label of labels) {
    if (label.name === name) {
      return true
    }
  }
  return false
}
