import * as core from '@actions/core'
import {promises as fs} from 'fs'
import * as yaml from 'js-yaml'

run()

async function run(): Promise<void> {
  try {
    const configPath = core.getInput('config')
    const paramsInput = core.getInput('params')
    const extract = core.getInput('extract') === 'true'
    const extractRegex = core.getInput('extractRegex')
    const type = core.getInput('type')

    const configFile = await fs.readFile(configPath)
    const config = yaml.load(configFile.toString())
    const paramsText = getParams(paramsInput, extract, extractRegex)
    const params = parse(paramsText, type)
    const merge = Object.assign(config, params)
    const content = format(merge, type)

    core.setOutput('content', content)
  } catch (error) {
    core.setFailed(error.message)
  }
}

function format(params: any, type: string): string {
  switch (type) {
    case 'json':
      return JSON.stringify(params)
    case 'yaml':
      return yaml.dump(params)
    default:
      return JSON.stringify(params)
  }
}

function parse(params: string, type: string): any {
  switch (type) {
    case 'json':
      return JSON.parse(params)
    case 'yaml':
      return yaml.load(params)
    default:
      return JSON.stringify(params)
  }
}

function getParams(params: string, extract: boolean, regex: string): any {
  const text = extract ? extractFromInput(params, regex) : params

  if (text === '') {
    return {}
  }

  return text
}

function extractFromInput(input: string, regex: string): string {
  const matches = input.match(new RegExp(regex, 'g'))

  if (matches != null && matches.length > 0) {
    for (const match of matches) {
      if (match !== '') {
        return match
      }
    }
  }

  return ''
}
