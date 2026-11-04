import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'

import { instructions } from '../hooks/register'

const START = { cwd: '/repo', surface: 'terminal', isInteractive: true } as const
const RUN = { origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } } as const

function world(on: On) {
  const registered: string[] = []
  const submitted: string[] = []
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => {
    registered.push(e.name)
    return { value: { command: e.name } }
  })
  on('prompt.submit', ($, e) => {
    submitted.push(e.text)
    return {}
  })
  return { registered, submitted }
}

test('registers the command at session start', async ($, on) => {
  const { registered } = world(on)
  await $.session.start(START)

  expect(registered).toContain('notes-verifier')
})

test('hands the model the note and opens the turn that reads it', async ($, on) => {
  const { submitted } = world(on)
  await $.session.start(START)
  const { text, context } = await $.command.run({
    command: 'notes-verifier',
    args: 'mvnw needs maven installed',
    ...RUN,
  })

  expect(text).toBeUndefined()
  expect(submitted).toContain('Check the note.')
  expect(context?.join('\n')).toContain('<nota>\nmvnw needs maven installed\n</nota>')
})

test('falls back to the last pasted block when the command is bare', async ($, on) => {
  world(on)
  await $.session.start(START)
  const { context } = await $.command.run({ command: 'notes-verifier', args: '', ...RUN })

  expect(context?.join('\n')).toContain('last block of text the person pasted')
})

test('the instructions carry the rules that were agreed', () => {
  const rules = instructions('')

  expect(rules).toContain('Never print a line that is right')
  expect(rules).toContain('Do not read files')
  expect(rules).toContain('●●● you lean towards wrong without being certain')
  expect(rules).toContain('No mark on a wrong line')
  expect(rules).toContain('the language the note is written in')
})
