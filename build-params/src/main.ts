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
    const config = parse(configFile.toString(), type)
    const paramsText = extractParamsText(paramsInput, extract, extractRegex)
    const params = parse(paramsText, type)
    const merged = Object.assign(config, params)
    const content = format(merged, type)

    core.info('Config')
    core.info(JSON.stringify(config, null, 2))
    core.info('Parameters')
    core.info(JSON.stringify(params, null, 2))
    core.info('Merged')
    core.info(JSON.stringify(merged, null, 2))
    core.info('Content Output')
    core.info(content)

    core.setOutput('content', content)
  } catch (error) {
    core.setFailed(error.message)
  }
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

function extractParamsText(input: string, extract: boolean, regex: string): string {
  return extract ? extractFromInput(input, regex) : input
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

  core.warning(`No matches found in specified input with regex: '${regex}'.`)

  return ''
}
