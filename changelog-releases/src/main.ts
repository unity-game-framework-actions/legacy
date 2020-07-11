import * as core from '@actions/core'
import {context, GitHub} from '@actions/github'
import {promises as fs} from 'fs'
import * as yaml from 'js-yaml'
import * as eol from 'eol'

run()

async function run(): Promise<void> {
  try {
    const token = core.getInput('token')
    const commit = core.getInput('commit') === 'true'
    const message = core.getInput('message')
    const user = core.getInput('user')
    const email = core.getInput('email')
    const file = core.getInput('file')
    const ref = core.getInput('ref')
    const configPath = core.getInput('config')

    const github = new GitHub(token)
    const configFile = await fs.readFile(configPath)
    const config = yaml.load(configFile.toString())
    const content = await createChangelogContent(github, config)

    core.info('Config')
    core.info(JSON.stringify(config, null, 2))

    if (commit) {
      await updateChangelogContent(github, content, file, ref, message, user, email)
    }

    core.info('Content Output')
    core.info(content)

    core.setOutput('content', content)
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function createChangelogContent(github: GitHub, config: any): Promise<string> {
  const releases = await github.paginate(`GET /repos/${context.repo.owner}/${context.repo.repo}/releases`)

  releases.sort((a, b) => b.published_at.localeCompare(a.published_at))

  let content = formatReleaseAll(releases, config)

  content = eol.crlf(content)

  return content
}

async function updateChangelogContent(github: GitHub, content: string, file: string, ref: string, message: string, user: string, email: string): Promise<void> {
  const info = await github.request(`GET /repos/${context.repo.owner}/${context.repo.repo}/contents/${file}?ref=${ref}`)
  const base64 = Buffer.from(content).toString('base64')
  const sha = info.data.sha

  core.info('Content Info')
  core.info(JSON.stringify(info, null, 2))

  const response = await github.repos.createOrUpdateFile({
    owner: context.repo.owner,
    repo: context.repo.repo,
    path: file,
    message: message,
    content: base64,
    sha: sha,
    branch: ref,
    committer: {
      name: user,
      email: email
    },
    author: {
      name: user,
      email: email
    }
  })

  core.info('Create or Update File Response')
  core.info(JSON.stringify(response, null, 2))
}

function formatReleaseAll(releases: any[], config: any): string {
  let format = `${config.changelog.title}\r\n\r\n${config.changelog.description}\r\n\r\n`

  for (const release of releases) {
    format += formatRelease(release, config)
  }

  return format
}

function formatRelease(release: any, config: any): string {
  const name = release.name !== '' && release.name !== release.tag_name ? `${release.tag_name} (${release.name})` : release.tag_name
  const date = formatDate(release.published_at)
  const body = release.body !== '' ? `<br/>${release.body}` : `<br/>${config.changelog.descriptionEmptyRelease}`

  return `## [${name}](${release.html_url}) - ${date}\r\n${body}\r\n\r\n`
}

function formatDate(date: string): string {
  const index = date.indexOf('T')

  return date.substr(0, index)
}
