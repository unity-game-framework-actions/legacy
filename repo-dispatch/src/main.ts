import * as core from '@actions/core'
import {GitHub} from '@actions/github'
import * as yaml from 'js-yaml'

run()

async function run(): Promise<void> {
  try {
    const token = core.getInput('token')
    const repository = core.getInput('repository')
    const eventType = core.getInput('eventType')
    const payload = core.getInput('payload')

    const github = new GitHub(token)
    const repo = getOwnerAndRepo(repository)
    const clientPayload = getPayload(payload)
    const json = JSON.stringify(clientPayload)

    core.debug(`clientPayload: '${clientPayload}'`)
    core.debug(`json: '${json}'`)

    await github.repos.createDispatchEvent({
      owner: repo.owner,
      repo: repo.repo,
      event_type: eventType,
      client_payload: json
    })
  } catch (error) {
    core.setFailed(error.message)
  }
}

function getPayload(payload: string): any {
  if (payload === '') {
    return {}
  } else if (payload.trimLeft().startsWith('{')) {
    return JSON.parse(payload)
  } else {
    return yaml.load(payload)
  }
}

function getOwnerAndRepo(repo: string): {owner: string; repo: string} {
  const split = repo.split('/')

  if (split.length < 2) {
    throw `Invalid specified repository name: '${repo}'.`
  }

  return {
    owner: split[0],
    repo: split[1]
  }
}
