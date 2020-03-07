
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
    const lineEnd = '\n\r'

    format += '# ' + config.header + lineEnd
    format += config.description + lineEnd

    for (const milestone of changelog.milestones) {
        format += formatMilestone(milestone, config)
    }

    format += config.footer + lineEnd

    return format
}

function formatMilestone(milestone: ChangelogMilestone, config: ChangelogConfig): string {
    let format = ''
    const lineEnd = '\n\r'

    format += '## ' + milestone.name + ' - ' + milestone.date.toISOString + lineEnd
    format += ' - [Commits](' + config.repoUrl + 'compare/0...' + milestone.name + ')' + lineEnd
    format += ' - [Milestone](' + config.repoUrl + 'milestone/' + milestone.number + '?closed=1)' + lineEnd

    for (const section of milestone.sections) {
        format += formatSection(section)    
    }

    format += lineEnd

    return format
}

function formatSection(section: ChangelogSection): string {
    let format = ''
    const lineEnd = '\n\r'

    format += '### ' + section.name + lineEnd

    for (const issue of section.issues) {
        format += formatIssue(issue)
    }

    format += lineEnd

    return format
}

function formatIssue(issue: IssueInfo): string {
    let format = ''
    const lineEnd = '\n\r'

    format += ' - ' + issue.title + ' (#' + issue.number + ')'
    format += lineEnd

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
    }

    for (const issue of issues) {
        if (issue.pull_request != null && issue.milestone != null) {
            const info = groups.get(issue.milestone.number)

            info?.issues.push(issue)
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

function hasAnyLabel(labels: LabelInfo[], targets: string[]): boolean {
    for (const label of targets) {
        if (hasLabel(labels, label)) {
            return true
        }
    }
    return false
}

function hasLabel(labels: LabelInfo[], name: string): boolean {
    for (const label of labels) {
        if (label.name.toLowerCase == name.toLowerCase) {
            return true
        }
    }
    return false
}