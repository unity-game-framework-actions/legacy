import * as core from '@actions/core'

run()

async function run(): Promise<void> {
  try {
    const start = core.getInput('start')
    const end = core.getInput('end', {required: true})
    const endType = core.getInput('endType', {required: true})

    const result = getName(start, end, endType)

    core.setOutput('result', result)
  } catch (error) {
    core.setFailed(error.message)
  }
}

function getName(start: string, end: string, endType: string): string {
  switch (endType) {
    case 'date':
      return getNameByDate(start, end)
    case 'length':
      return getNameByLength(start, Number.parseInt(end))
    default:
      throw `Invalid end type specified: '${endType}'.`
  }
}

function getNameByDate(start: string, end: string): string {
  const startDate = start === '' ? new Date() : new Date(start)
  const endDate = new Date(end)

  return formatDate(startDate, endDate)
}

function getNameByLength(start: string, end: number): string {
  const startDate = start === '' ? new Date() : new Date(start)
  const endDate = new Date(startDate)

  endDate.setDate(startDate.getDate() + end)

  return formatDate(startDate, endDate)
}

function formatDate(start: Date, end: Date): string {
  const dayFormat = new Intl.DateTimeFormat('en', {day: '2-digit'})
  const monthFormat = new Intl.DateTimeFormat('en', {month: 'short'})
  const yearFormat = new Intl.DateTimeFormat('en', {year: 'numeric'})

  const startDay = dayFormat.format(start)
  const startMonth = monthFormat.format(start)
  const startYear = yearFormat.format(start)

  const endDay = dayFormat.format(end)
  const endMonth = monthFormat.format(end)
  const endYear = yearFormat.format(end)

  let result = ''

  result += `${startDay} ${startMonth} `

  if (startYear !== endYear) {
    result += `${startYear} `
  }

  result += `- ${endDay} ${endMonth} ${endYear}`

  return result
}
