import * as core from '@actions/core'
import {GitHub} from '@actions/github'
import * as yaml from 'js-yaml'

run()

async function run(): Promise<void> {
  try {
    const token = core.getInput('token')
    const repository = core.getInput('repository')
    const eventType = core.getInput('eventType', {required: true})
    const type = core.getInput('type')
    const payloadText = core.getInput('payload')

    const github = new GitHub(token)
    const repo = getOwnerAndRepo(repository)
    const payload = parse(payloadText, type)

    await dispatch(github, repo.owner, repo.repo, eventType, payload)
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function dispatch(github: GitHub, owner: string, repo: string, eventType: string, payload: any): Promise<void> {
  const response = await github.repos.createDispatchEvent({
    owner: owner,
    repo: repo,
    event_type: eventType,
    client_payload: JSON.stringify(payload)
  })

  core.info('Create Dispatch Event Response')
  core.info(JSON.stringify(response, null, 2))
}

function parse(input: string, type: string): any {
  if (input === '') {
    return {}
  }

  switch (type) {
    case 'json':
      return JSON.parse(input)
    case 'yaml':
      return yaml.load(input)
    default:
      throw `Invalid parse type: '${type}'.`
  }
}

function getOwnerAndRepo(repo: string): {owner: string; repo: string} {
  const split = repo.split('/')

  if (split.length < 2) {
    throw `Invalid repository name: '${repo}'.`
  }

  return {
    owner: split[0],
    repo: split[1]
  }
}
