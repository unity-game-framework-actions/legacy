import * as core from '@actions/core'
import {context, GitHub} from '@actions/github'

run()

async function run(): Promise<void> {
  try {
    const token = core.getInput('token')
    const projectName = core.getInput('project', {required: true})
    const columnName = core.getInput('column', {required: true})
    const action = core.getInput('action')
    const name = core.getInput('name')
    const position = core.getInput('position')

    const github = new GitHub(token)

    await doAction(github, projectName, columnName, action, name, position)
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function doAction(github: GitHub, projectName: string, columnName: string, action: string, name: string, position: string): Promise<void> {
  const project = await getProject(github, projectName)

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
    const pos = await getPosition(github, position)
    const response = await github.projects.moveColumn({
      column_id: column.id,
      position: pos
    })

    core.info('Move Column')
    core.info(JSON.stringify(response))
  }
}

async function getProject(gitHub: GitHub, name: string): Promise<any> {
  const projects = await gitHub.paginate(`GET /repos/${context.repo.owner}/${context.repo.repo}/projects`)

  for (const project of projects) {
    if (project.name === name) {
      return project
    }
  }

  throw `Project not found by the specified name: '${name}'.`
}

async function getColumn(github: GitHub, project: any, name: string): Promise<any> {
  const columns = await github.paginate(`GET /projects/${project.id}/columns`)

  for (const column of columns) {
    if (column.name === name) {
      return column
    }
  }

  throw `Column not found by the specified name: '${name}' (project: '${project.name}').`
}

async function getPosition(github: GitHub, position: string): Promise<string> {
  if (position.includes(':')) {
    const split = position.split(':')

    if (split.length != 2) {
      throw `Invalid position specified: '${position}'.`
    }

    const pos = split[0]
    const name = split[1]
    const project = await getProject(github, name)

    return `${pos}:${project.id}`
  }

  return position
}
