import { test, expect } from 'claude-code/testing'

import { composeReply, parseAssumptions, withoutSection } from '../hooks/register'

test('appends the assumptions section last, as session', async ($, on) => {
  on('prompt.compose', () => ({
    sections: [{ id: 'intro', text: 'core', scope: 'shared' }],
  }))

  const { sections } = await $.prompt.compose({
    model: 'm', promptModel: 'm', surfaces: ['terminal'], tools: [], outputStyle: null, traits: [],
  })

  expect(sections.map(s => s.id)).toEqual(['intro', 'state-assumptions:rule'])
  expect(sections[1]?.scope).toBe('session')
  expect(sections[1]?.text).toContain('A1, A2')
})

test('reads the numbered list of the last Assumptions section', async () => {
  const reply = [
    'Done.',
    '',
    '## Assumptions',
    '',
    '- **A1.** A "test file" ends in `Test`.',
    '  If not, the count is 38.',
    '- **A2.** Written in Python.',
    '',
    'You can reject or change any of them by number.',
  ].join('\n')

  expect(parseAssumptions(reply)).toEqual([
    { id: 'A1', text: 'A "test file" ends in `Test`. If not, the count is 38.' },
    { id: 'A2', text: 'Written in Python.' },
  ])
  expect(parseAssumptions('No section here.')).toBeNull()
})

test('composes one line per answered assumption', async () => {
  const list = [
    { id: 'A1', text: 'x' },
    { id: 'A2', text: 'y' },
    { id: 'A3', text: 'z' },
  ]
  const reply = composeReply(list, {
    A1: { isRejected: true, note: '' },
    A2: { isRejected: true, note: 'use PowerShell' },
    A3: { isRejected: false, note: 'count all files' },
  })

  expect(reply).toBe('A1: no\nA2: no, use PowerShell\nA3: count all files')
})

const REPLY = [
  'Done.',
  '',
  '## Assumptions',
  '',
  '- **A1.** Counted only *Test.java.',
  '- **A2.** Written in Python.',
].join('\n')

test('a reply fills the band; reject, change and send answer as the person', async ($, on) => {
  const sent: string[] = []
  on('turn.complete', ($, e) => ({ text: e.answer }))
  on('ui.render', () => ({ type: 'Text', children: [''] }))
  on('prompt.submit', ($, e) => {
    sent.push(e.text)
    return { text: e.text }
  })

  await $.turn.complete({
    answer: REPLY, durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer',
  })

  const ui = await $.ui.mount({
    plugin: 'state-assumptions',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: {
      hasSurvey: false, isWorking: false, maxRows: 12, bodyColumns: 100,
      scroll: { offset: 0, bodyRows: 12 }, view: {},
    },
  })
  expect((await ui.find({ key: 'review' }))?.text).toContain('2 assumptions to review')
  expect(await ui.find({ key: 'reject-A1' })).toBeUndefined()
  await ui.press({ key: 'review' })
  expect(await ui.find({ key: 'reject-A1' })).toBeDefined()

  await ui.press({ key: 'reject-A1' })
  expect(await ui.find({ key: 'note-A2' })).toBeUndefined()
  await ui.press({ key: 'change-A2' })
  await ui.input({ key: 'note-A2', text: 'use PowerShell' })
  expect(await ui.find({ key: 'note-A2' })).toBeUndefined()
  await ui.press({ key: 'send' })

  expect(sent).toEqual(['A1: no\nA2: use PowerShell'])
  await ui.unmount()
})

test('the reply drops its Assumptions section, keeping what follows', async () => {
  const text = ['Done.', '', '## Assumptions', '', '- **A1.** x', '', '## Next', 'More.'].join('\n')
  expect(withoutSection(text)).toBe(['Done.', '', '## Next', 'More.'].join('\n'))
  expect(withoutSection(['## Assumptions', '- **A1.** x'].join('\n'))).toBe('')
})

test('a typed prompt with unsent answers raises a warning and still goes through', async ($, on) => {
  const toasts: string[] = []
  on('turn.complete', ($, e) => ({ text: e.answer }))
  on('ui.render', () => ({ type: 'Text', children: [''] }))
  on('prompt.submit', ($, e) => ({ text: e.text }))
  on('ui.toast', ($, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })

  await $.turn.complete({
    answer: REPLY, durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer',
  })
  const ui = await $.ui.mount({
    plugin: 'state-assumptions',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: {
      hasSurvey: false, isWorking: false, maxRows: 12, bodyColumns: 100,
      scroll: { offset: 0, bodyRows: 12 }, view: {},
    },
  })
  await ui.press({ key: 'review' })
  await ui.press({ key: 'reject-A1' })

  const sent = await $.prompt.submit({ text: 'now add the tests', origin: { kind: 'composer' }, wait: false })

  expect(sent.text).toBe('now add the tests')
  expect(toasts.some(t => t.includes('1 assumption answer not sent'))).toBe(true)
  await ui.unmount()
})
