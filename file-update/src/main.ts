import * as core from '@actions/core'
import {context, GitHub} from '@actions/github'
import {promises as fs} from 'fs'

run()

async function run(): Promise<void> {
  try {
    const token = core.getInput('token')
    const message = core.getInput('message', {required: true})
    const file = core.getInput('file', {required: true})
    const contentInput = core.getInput('content', {required: true})
    const contentAsPath = core.getInput('contentAsPath') === 'true'
    const user = core.getInput('user')
    const email = core.getInput('email')

    const github = new GitHub(token)
    const content = await getContent(contentInput, contentAsPath)

    await updateContent(github, content, file, message, user, email)

    core.info('Content Output')
    core.info(content)

    core.setOutput('content', content)
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function getContent(input: string, isPath: boolean): Promise<string> {
  if (isPath) {
    const file = await fs.readFile(input)
    const content = file.toString()

    return content
  }

  return input
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
