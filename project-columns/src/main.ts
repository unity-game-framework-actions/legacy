import * as core from '@actions/core'
import {context, GitHub} from '@actions/github'

run()

async function run(): Promise<void> {
  try {
    const token = core.getInput('token')
    const source = core.getInput('source', {required: true})
    const sourceType = core.getInput('sourceType', {required: true})
    const projectName = core.getInput('project', {required: true})
    const columnName = core.getInput('column', {required: true})
    const action = core.getInput('action')
    const name = core.getInput('name')
    const position = core.getInput('position')

    const github = new GitHub(token)

    await request(github, source, sourceType, projectName, columnName, action, name, position)
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function request(github: GitHub, source: string, sourceType: string, projectName: string, columnName: string, action: string, name: string, position: string): Promise<void> {
  const project = await getProject(github, source, sourceType, projectName)

  switch (action) {
    case 'create':
      await createColumn(github, project, columnName, position)
      break
    case 'update':
      await updateColumn(github, project, columnName, name, position)
      break
    default:
      throw `Invalid action specified: '${action}'. (Must be: create or update)`
  }
}

async function createColumn(github: GitHub, project: any, name: string, position: string): Promise<void> {
  const response = await github.projects.createColumn({
    project_id: project.id,
    name: name
  })

  core.info('Create Column')
  core.info(JSON.stringify(response))

  if (position !== '') {
    await updateColumn(github, project, name, '', position)
  }
}

async function updateColumn(github: GitHub, project: any, name: string, updateName: string, position: string): Promise<void> {
  const column = await getColumn(github, project, name)

  if (updateName !== '') {
    const response = await github.projects.updateColumn({
      column_id: column.id,
      name: updateName
    })

    core.info('Update Column')
    core.info(JSON.stringify(response))
  }

  if (position !== '') {
    const pos = await getPosition(github, project, position)
    const response = await github.projects.moveColumn({
      column_id: column.id,
      position: pos
    })

    core.info('Move Column')
    core.info(JSON.stringify(response))
  }
}

async function getProject(github: GitHub, source: string, sourceType: string, name: string): Promise<any> {
  const projects = await getProjects(github, source, sourceType)

  for (const project of projects) {
    if (project.name === name) {
      return project
    }
  }

  throw `Project not found by the specified name: '${name}'.`
}

async function getProjects(github: GitHub, source: string, sourceType: string): Promise<any[]> {
  switch (sourceType) {
    case 'repo':
      const repo = getOwnerAndRepo(source)
      const responseRepo = await github.projects.listForRepo({
        owner: repo.owner,
        repo: repo.repo
      })

      return responseRepo.data
    case 'user':
      const responseUser = await github.projects.listForUser({
        username: source
      })

      return responseUser.data
    case 'org':
      const responseOrg = await github.projects.listForOrg({
        org: source
      })

      return responseOrg.data
    default:
      throw `Invalid source type specified: '${sourceType}'. (Must be 'repo', 'user' or 'org')`
  }
}

async function getColumn(github: GitHub, project: any, name: string): Promise<any> {
  const columns = await github.projects.listColumns({
    project_id: project.id
  })

  for (const column of columns.data) {
    if (column.name === name) {
      return column
    }
  }

  throw `Column not found by the specified name: '${name}' (project: '${project.name}').`
}

async function getPosition(github: GitHub, project: any, position: string): Promise<string> {
  if (position.includes(':')) {
    const split = position.split(':')

    if (split.length != 2) {
      throw `Invalid position specified: '${position}'.`
    }

    const pos = split[0]
    const name = split[1]
    const column = await getColumn(github, project, name)

    return `${pos}:${column.id}`
  }

  return position
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
