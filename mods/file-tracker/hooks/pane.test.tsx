import type { RenderElement } from 'claude-code'
import { expect, test } from 'claude-code/testing'

const PLUGIN = 'file-tracker'
const START = { cwd: '/repo', surface: 'terminal', isInteractive: true } as const
const PANE = {
  title: 'File toccati',
  isFocused: false,
  bodyColumns: 60,
  placement: 'dock',
  scroll: { offset: 0, bodyRows: 20 },
  view: {},
} as const

const ENTRY = {
  path: 'C:\Temp\alfa.txt',
  kind: 'created',
  at: 1,
  patch: null,
  isFolder: false,
} as const

test('dismissing the last file closes the pane', async ($, on) => {
  const closed: string[] = []
  let seeded = false
  on('session.start', ($$, e) => ({ cwd: e.cwd }))
  on('command.register', ($$, e) => ({ value: { command: e.name } }))
  on('ui.close', ($$, e) => (closed.push(e.id), { value: undefined }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('state.get', ($$, e, next) =>
    e.key === 'entries' && !seeded ? { value: { value: [ENTRY], version: 1 } } : next(e),
  )
  await $.session.start(START)

  const pane = await $.ui.mount({
    plugin: PLUGIN,
    surface: 'terminal',
    component: 'Pane',
    requestId: PLUGIN,
    props: PANE,
  })
  seeded = true
  await pane.press({ key: 'dismissAll' })

  expect(closed).toEqual([PLUGIN])
})
