import * as core from '@actions/core'
import {context, GitHub} from '@actions/github'
import {promises as fs} from 'fs'
import * as yaml from 'js-yaml'

run()

async function run(): Promise<void> {
  try {
    const token = core.getInput('token')
    const commit = core.getInput('commit') === 'true'
    const message = core.getInput('message')
    const user = core.getInput('user')
    const email = core.getInput('email')
    const file = core.getInput('file')
    const configPath = core.getInput('config')

    const github = new GitHub(token)
    const configFile = await fs.readFile(configPath)
    const config = yaml.load(configFile.toString())
    const content = await createChangelogContent(github, config)

    if (commit) {
      await updateChangelogContent(github, content, file, message, user, email)
    }

    core.setOutput('content', content)
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function createChangelogContent(github: GitHub, config: any): Promise<string> {
  const releases = await github.paginate(`GET /repos/${context.repo.owner}/${context.repo.repo}/releases`)

  releases.sort((a, b) => b.name.localeCompare(a.name))

  const content = formatReleaseAll(releases, config)

  return content
}

async function updateChangelogContent(github: GitHub, content: string, file: string, message: string, user: string, email: string): Promise<void> {
  const response = await github.request(`GET /repos/${context.repo.owner}/${context.repo.repo}/contents/${file}`)
  const base64 = Buffer.from(content).toString('base64')
  const sha = response.data.sha

  await github.repos.createOrUpdateFile({
    owner: context.repo.owner,
    repo: context.repo.repo,
    path: file,
    message: message,
    content: base64,
    sha: sha,
    committer: {
      name: user,
      email: email
    },
    author: {
      name: user,
      email: email
    }
  })
}

function formatReleaseAll(releases: any[], config: any): string {
  let format = `${config.changelog.title}\r\n\r\n${config.changelog.description}\r\n\r\n`

  for (const release of releases) {
    format += formatRelease(release, config)
  }

  return format
}

function formatRelease(release: any, config: any): string {
  const name = release.name !== '' ? release.name : release.tag_name
  const date = formatDate(release.published_at)
  const body = release.body !== '' ? release.body : config.changelog.descriptionEmptyRelease

  return `## [${name}](${release.html_url}) - ${date}\r\n${body}\r\n\r\n`
}

function formatDate(date: string): string {
  const index = date.indexOf('T')

  return date.substr(0, index)
}
