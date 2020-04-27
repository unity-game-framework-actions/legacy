import * as core from '@actions/core'
import {GitHub} from '@actions/github'
import * as yaml from 'js-yaml'
import * as sodium from 'tweetsodium'

run()

async function run(): Promise<void> {
  try {
    const token = core.getInput('token')
    const repository = core.getInput('repo', {required: true})
    const secrets = core.getInput('secrets')
    const type = core.getInput('type')

    const github = new GitHub(token)
    const repoInfo = getOwnerAndRepo(repository)
    const secretsData = parse(secrets, type)

    await updateSecrets(github, repoInfo.owner, repoInfo.repo, secretsData)
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function updateSecrets(github: GitHub, owner: string, repo: string, secrets: any): Promise<void> {
  const keyInfo = await github.actions.getPublicKey({
    owner: owner,
    repo: repo
  })

  const keys = Object.keys(secrets)

  for (const key of keys) {
    const value = secrets[key]
    const encrypted = encrypt(keyInfo.data.key, value)

    await github.actions.createOrUpdateSecretForRepo({
      owner: owner,
      repo: repo,
      name: key,
      encrypted_value: encrypted,
      key_id: keyInfo.data.key_id
    })
  }
}

function encrypt(key: string, value: string): string {
  const messageBytes = Buffer.from(value)
  const keyBytes = Buffer.from(key, 'base64')
  const encryptedBytes = sodium.seal(messageBytes, keyBytes)
  const encrypted = Buffer.from(encryptedBytes).toString('base64')

  core.setSecret(encrypted)

  return encrypted
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
