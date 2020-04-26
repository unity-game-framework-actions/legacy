import * as core from '@actions/core'
import {promises as fs} from 'fs'
import * as yaml from 'js-yaml'
import objectPath from 'object-path'

run()

async function run(): Promise<void> {
  try {
    const fileInput = core.getInput('file', {required: true})
    const isPath = core.getInput('isPath', {required: true}) === 'true'
    const write = core.getInput('write') === 'true'
    const getInput = core.getInput('get')
    const setInput = core.getInput('set')
    const type = core.getInput('type')

    const content = await getContent(fileInput, isPath, type)
    const get = await getContent(getInput, false, type)
    const set = await getContent(setInput, false, type)

    getProps(content, get)
    setProps(content, set)

    const output = format(content, type)

    if (isPath && write) {
      setContent(output, fileInput)
    }

    core.setOutput('content', output)
  } catch (error) {
    core.setFailed(error.message)
  }
}

function getProps(content: any, get: any): void {
  const keys = Object.keys(get)

  for (const key of keys) {
    const prop = get[key]
    const value = objectPath.get(content, prop.path)

    if (prop.step) {
      core.setOutput(key, value)
    }

    if (prop.env) {
      core.exportVariable(key, value)
    }
  }
}

function setProps(content: any, set: any): void {
  const keys = Object.keys(set)

  for (const key of keys) {
    const prop = set[key]

    objectPath.set(content, prop.path, prop.value)
  }
}

async function setContent(input: string, path: string): Promise<void> {
  await fs.writeFile(path, input)
}

async function getContent(input: string, isPath: boolean, type: string): Promise<any> {
  if (isPath) {
    const file = await fs.readFile(input)

    return parse(file.toString(), type)
  }

  return parse(input, type)
}

function format(input: any, type: string): string {
  switch (type) {
    case 'json':
      return JSON.stringify(input)
    case 'yaml':
      return yaml.dump(input)
    default:
      throw `Invalid parse type: '${type}'.`
  }
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
