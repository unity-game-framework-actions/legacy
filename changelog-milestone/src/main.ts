import * as core from '@actions/core'

async function run(): Promise<void> {
  try {
    console.log('Hello World!')
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
