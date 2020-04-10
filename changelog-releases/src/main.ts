import * as core from '@actions/core'
import {context, GitHub} from '@actions/github'

run()

async function run(): Promise<void> {
  try {
    const token = core.getInput('token')
    const commitContent = core.getInput('commit-content')
    const commitMessage = core.getInput('commit-message')
    const commitUserName = core.getInput('commit-user-name')
    const commitUserEmail = core.getInput('commit-user-email')
    const contentName = core.getInput('content-name')
    const contentHeader = core.getInput('content-header')

    const github = new GitHub(token)

    const content = await createChangelogContent(github, contentHeader)

    if (commitContent) {
      await updateChangelogContent(github, content, contentName, commitMessage, commitUserName, commitUserEmail)
    }

    core.setOutput('content', content)
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function createChangelogContent(github: GitHub, header: string): Promise<string> {
  const releases = await github.paginate(`GET /repos/${context.repo.owner}/${context.repo.repo}/releases`)

  releases.sort((a, b) => a.name.localeCompare(b.name))

  const content = formatReleaseAll(releases, header)

  return content
}

async function updateChangelogContent(github: GitHub, content: string, contentName: string, message: string, userName: string, userEmail: string): Promise<void> {
  const response = await github.request(`GET /repos/${context.repo.owner}/${context.repo.repo}/contents/${contentName}`)
  const base64 = new Buffer(content).toString('base64')
  const sha = response.data.sha

  await github.repos.createOrUpdateFile({
    owner: context.repo.owner,
    repo: context.repo.repo,
    path: contentName,
    message: message,
    content: base64,
    sha: sha,
    committer: {
      name: userName,
      email: userEmail
    },
    author: {
      name: userName,
      email: userEmail
    }
  })
}

function formatReleaseAll(releases: any[], header: string): string {
  let format = `${header}\n\n`

  for (const release of releases) {
    format += formatRelease(release)
  }

  return format
}

function formatRelease(release: any): string {
  const name = release.name
  const date = formatDate(release.published_at)
  const body = release.body

  return `## ${name} - ${date}\n${body}\n\n`
}

function formatDate(date: string): string {
  const index = date.indexOf('T')

  return date.substr(0, index)
}
