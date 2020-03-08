import * as core from '@actions/core'

export type RepoConfig = {
  url: string
  firstCommitSha: string
}

export type ChangelogConfig = {
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

export function getFirstCommitSha(commits: Array<any>): string {
  commits.sort((a, b) => a.commit.committer.date.localeCompare(b.commit.committer.date))

  return commits[0].sha
}

export function formatChangelog(changelog: Changelog, repoConfig: RepoConfig, config: ChangelogConfig): string {
  let format = ''

  format += `# ${config.header}`
  format += `\n\r${config.description}`

  for (let i = 0; i < changelog.milestones.length; i++) {
    const milestone = changelog.milestones[i]
    const previousTag = i < changelog.milestones.length - 1 ? changelog.milestones[i + 1].name : repoConfig.firstCommitSha

    format += formatMilestone(milestone, repoConfig, config, previousTag)
  }

  format += `\n\r${config.footer}`

  return format
}

function formatMilestone(milestone: ChangelogMilestone, repoConfig: RepoConfig, config: ChangelogConfig, previousTag: string): string {
  let format = ''

  format += `\n\r## ${milestone.name} - ${formatDate(milestone.date)}`
  format += `\n\r - [Commits](${repoConfig.url}/compare/${previousTag}...${milestone.name})`
  format += `\n\r - [Milestone](${repoConfig.url}/milestone/${milestone.number}?closed=1)`

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

  changelog.milestones.sort((a, b) => b.date.getTime() - a.date.getTime())

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

function formatDate(date: Date): string {
  const iso = date.toISOString()
  const index = iso.indexOf('T')

  return iso.substr(0, index)
}
