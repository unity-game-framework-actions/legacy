import * as core from '@actions/core'
import {context, GitHub} from '@actions/github'

run()

async function run(): Promise<void> {
  try {
    const token = core.getInput('token')
    const id = core.getInput('id')
    const tag = core.getInput('tag')
    const commitish = core.getInput('commitish')
    const name = core.getInput('name')
    const body = core.getInput('body')
    const draft = core.getInput('draft')
    const prerelease = core.getInput('prerelease')

    const github = new GitHub(token)
    const change = {
      tag: tag,
      commitish: commitish,
      name: name,
      body: body,
      draft: draft,
      prerelease: prerelease
    }

    const release = await getRelease(github, id)
    const changed = changeRelease(release, change)

    await updateRelease(github, changed)
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function getRelease(github: GitHub, idOrName: string): Promise<any> {
  try {
    const releases = await github.paginate(`GET /repos/${context.repo.owner}/${context.repo.repo}/releases/${idOrName}`)

    return releases[0]
  } catch (error) {
    const releases = await github.paginate(`GET /repos/${context.repo.owner}/${context.repo.repo}/releases`)

    for (const release of releases) {
      if (release.name === idOrName) {
        return release
      }
    }

    throw `Release by the specified id or name not found: '${idOrName}'.`
  }
}

async function updateRelease(github: GitHub, release: any): Promise<void> {
  await github.repos.updateRelease({
    owner: context.repo.owner,
    repo: context.repo.repo,
    release_id: release.id,
    tag_name: release.tag_name,
    target_commitish: release.target_commitish,
    name: release.name,
    body: release.body,
    draft: release.draft,
    prerelease: release.prerelease
  })
}

function changeRelease(release: any, change: any): any {
  if (change.tag !== '') {
    release.tag_name = change.tag
  }

  if (change.commitish !== '') {
    release.target_commitish = change.commitish
  }

  if (change.name !== '') {
    release.name = change.name
  }

  if (change.body !== '') {
    release.body = change.body
  }

  if (change.draft !== '') {
    release.draft = change.draft === 'true'
  }

  if (change.prerelease !== '') {
    release.prerelease = change.prerelease === 'true'
  }

  return release
}
