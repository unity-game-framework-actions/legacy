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
  let format = ''

  format += `# ${info.name}\n`
  format += `${info.displayName}\n`
  format += '\n'

  format += '## Info\n'
  format += ` - **Version**: \`${info.version}\`\n`
  format += ` - **Unity**: \`${info.unity}\`\n`

  if (info.api !== '') {
    format += ` - **API Compatibility Level**: \`${info.api}\`\n`
  }

  format += '\n'

  if (info.dependencies != null) {
    format += '### Dependencies\n'

    const keys = Object.keys(info.dependencies)

    if (keys.length > 0) {
      for (const key of keys) {
        const value = info.dependencies[key]

        format += ` - \`${key}\`: \`${value}\`\n`
      }
    } else {
      format += ' - N/A\n'
    }

    format += '\n'
  }

  format += '### Description\n'

  if (info.description !== '') {
    format += `${info.description}\n`
  } else {
    format += 'No description.\n'
  }

  if (config.fullDescription !== '') {
    format += `\n${config.fullDescription}\n`
  }

  format += '\n'

  if (config.closing !== '') {
    format += `${config.closing}\n`
  }

  if (config.footer !== '') {
    format += `\n${config.footer}`
    format += '\n'
  }

  format = eol.crlf(format)

  return format
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
