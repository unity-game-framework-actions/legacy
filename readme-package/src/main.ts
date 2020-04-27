import * as core from '@actions/core'
import {context, GitHub} from '@actions/github'
import {promises as fs} from 'fs'
import * as yaml from 'js-yaml'
import * as eol from 'eol'

run()

async function run(): Promise<void> {
  try {
    const token = core.getInput('token')
    const packagePath = core.getInput('package', {required: true})
    const commit = core.getInput('commit') === 'true'
    const message = core.getInput('message')
    const user = core.getInput('user')
    const email = core.getInput('email')
    const file = core.getInput('file')
    const configPath = core.getInput('config')

    const github = new GitHub(token)
    const packageFile = await fs.readFile(packagePath)
    const packageInfo = JSON.parse(packageFile.toString())
    const configFile = await fs.readFile(configPath)
    const config = yaml.load(configFile.toString())
    const content = createReadme(packageInfo, config)

    core.info('Config')
    core.info(JSON.stringify(config, null, 2))

    if (commit) {
      await updateContent(github, content, file, message, user, email)
    }

    core.info('Content Output')
    core.info(content)

    core.setOutput('content', content)
  } catch (error) {
    core.setFailed(error.message)
  }
}

function createReadme(info: any, config: any): string {
  let content = ''

  content += `# ${info.name}\n`
  content += `${info.displayName}\n`
  content += '\n'

  content += '## Info\n'
  content += `- **Version**: \`${info.version}\`\n`
  content += `- **Unity**: \`${info.unity}\`\n`
  content += '\n'

  if (info.dependencies != null) {
    content += '### Dependencies\n'

    const keys = Object.keys(info.dependencies)

    if (keys.length > 0) {
      for (const key of keys) {
        const value = info.dependencies[key]

        content += `- \`${key}\`: \`${value}\`\n`
      }
    } else {
      content += '- N/A\n'
    }

    content += '\n'
  }

  content += '### Changelog'
  content += '- [Full changelog](changelog.md)'
  content += '\n'

  content += '### Description\n'

  if (info.description !== '') {
    content += `${info.description}\n`
  } else {
    content += 'No description.\n'
  }

  if (config.fullDescription !== '') {
    content += `\n${config.fullDescription}\n`
  }

  content += '\n'

  if (config.closing !== '') {
    content += `${config.closing}\n`
  }

  if (config.footer !== '') {
    content += `\n${config.footer}`
    content += '\n'
  }

  content = eol.crlf(content)

  return content
}

async function updateContent(github: GitHub, content: string, file: string, message: string, user: string, email: string): Promise<void> {
  const info = await github.request(`GET /repos/${context.repo.owner}/${context.repo.repo}/contents/${file}`)
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
