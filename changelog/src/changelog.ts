import * as core from '@actions/core'

export type RepoConfig = {
  owner: string
  repo: string
  milestones: MilestoneInfo[]
  issues: IssueInfo[]
  firstCommitSha: string
}

export type ChangelogConfig = {
  header: string
  description: string
  sections: SectionConfig[]
  footer: string
}

export type SectionConfig = {
  type: string
  order: number
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
  type: string
  order: number
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
  due_on: string
}

type LabelInfo = {
  name: string
}

export function generateMilestoneAll(repoConfig: RepoConfig, config: ChangelogConfig): string {
  const log = createChangelog(repoConfig.milestones, repoConfig.issues, config)
  const format = formatChangelog(log, repoConfig, config)

  return format
}

export function generateMilestone(repoConfig: RepoConfig, config: ChangelogConfig, number: string): string {
  const changelog = createChangelog(repoConfig.milestones, repoConfig.issues, config)
  const firstSha = formatCommitSha(repoConfig.firstCommitSha)

  for (let i = 0; i < changelog.milestones.length; i++) {
    const milestone = changelog.milestones[i]

    if (milestone.number.toString() === number) {
      const previousTag = i < changelog.milestones.length - 1 ? changelog.milestones[i + 1].name : firstSha

      return formatMilestone(milestone, repoConfig, config, previousTag)
    }
  }

  throw `Milestone by the specified number not found: '${number}'.`
}

function formatChangelog(changelog: Changelog, repoConfig: RepoConfig, config: ChangelogConfig): string {
  const firstSha = formatCommitSha(repoConfig.firstCommitSha)
  let format = ''

  format += `# ${config.header}`
  format += `\n\r${config.description}`

  for (let i = 0; i < changelog.milestones.length; i++) {
    const milestone = changelog.milestones[i]
    const previousTag = i < changelog.milestones.length - 1 ? changelog.milestones[i + 1].name : firstSha

    format += formatMilestone(milestone, repoConfig, config, previousTag)
  }

  format += `\n\r${config.footer}`

  return format
}

function formatMilestone(milestone: ChangelogMilestone, repoConfig: RepoConfig, config: ChangelogConfig, previousTag: string): string {
  let format = ''

  format += `\n\r## ${milestone.name} - ${formatDate(milestone.date)}`
  format += `\n\r - [Commits](https://github.com/${repoConfig.owner}/${repoConfig.repo}/compare/${previousTag}...${milestone.name})`
  format += `\n\r - [Milestone](https://github.com/${repoConfig.owner}/${repoConfig.repo}/milestone/${milestone.number}?closed=1)`

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

function createChangelog(milestones: MilestoneInfo[], issues: IssueInfo[], config: ChangelogConfig): Changelog {
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
    date: new Date(),
    sections: []
  }

  if (milestoneGroup.milestone.due_on !== null) {
    milestone.date = new Date(milestoneGroup.milestone.due_on)
  } else {
    milestone.date = new Date(milestoneGroup.milestone.closed_at)
  }

  core.debug(`Create milestone '${milestoneGroup.milestone.number}'.`)

  const issues = groupIssuesBySection(milestoneGroup.issues, sectionConfigs)

  issues.forEach((value, key) => {
    const sectionConfig = sectionConfigs.find(x => x.type === key)

    if (sectionConfig == undefined) {
      throw `Section not found by type: '${key}'.`
    }

    const section: ChangelogSection = {
      type: key,
      order: sectionConfig.order,
      name: sectionConfig.name,
      issues: value
    }

    section.issues.sort((a, b) => a.title.localeCompare(b.title))

    milestone.sections.push(section)
  })

  milestone.sections.sort((a, b) => a.order - b.order)

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
      if (getMatchedLabel(issue.labels, section.labels) != null) {
        const group = getOrCreate(groups, section.type)

        group.push(issue)

        if (core.isDebug()) {
          const label = getMatchedLabel(issue.labels, section.labels)

          core.debug(`Add issue '${issue.number}' to section '${section.type}', '${section.name}'.`)
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

function getMatchedLabel(labels: LabelInfo[], names: string[]): string | null {
  for (const name of names) {
    if (labels.findIndex(x => x.name === name) > -1) {
      return name
    }
  }
  return null
}

function formatDate(date: Date): string {
  const iso = date.toISOString()
  const index = iso.indexOf('T')

  return iso.substr(0, index)
}

function formatCommitSha(sha: string): string {
  return sha.substr(0, 7)
}
