import type { RenderElement } from 'claude-code'
import { expect, test } from 'claude-code/testing'

const PLUGIN = 'minimize-panes'
const owner = (): RenderElement => ({ type: 'Text', children: ['il contenuto del mod'] })
// Come lo disegna un mod che il minimize ce l'ha gia': plan-progress, ideas.
const its_own = ($$: { ui: { resolve: Function } }, e: unknown): RenderElement => {
  const { Box, Button, Text } = $$.ui.resolve(e)

  return Box({
    children: [
      Button({ key: 'minimize', label: '_', onPress: () => {} }),
      Text({ children: ['il contenuto del mod'] }),
    ],
  })
}
const START = { cwd: '/repo', surface: 'terminal', isInteractive: true } as const

const BAND = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 10,
  bodyColumns: 80,
  scroll: { offset: 0, bodyRows: 10 },
  view: {},
} as const

const PANE = {
  title: 'File toccati',
  isFocused: false,
  bodyColumns: 40,
  placement: 'dock',
  scroll: { offset: 0, bodyRows: 20 },
  view: {},
} as const

const band = ($: { ui: { mount: Function } }) =>
  $.ui.mount({ plugin: PLUGIN, surface: 'terminal', component: 'AbovePrompt', requestId: 'band', props: BAND })

const pane = ($: { ui: { mount: Function } }, id: string) =>
  $.ui.mount({ plugin: PLUGIN, surface: 'terminal', component: 'Pane', requestId: id, props: PANE })

test('every pane gets a minimize button', async ($, on) => {
  on('session.start', ($$, e) => ({ cwd: e.cwd }))
  on('ui.render', () => owner())
  await $.session.start(START)
  const drawn = await pane($, 'file-tracker')

  expect(await drawn.find({ key: 'minimize:file-tracker' })).toBeDefined()
})

test('a pane that reduces itself gets no second button', async ($, on) => {
  on('session.start', ($$, e) => ({ cwd: e.cwd }))
  on('ui.render', ($$, e) => its_own($$, e))
  await $.session.start(START)
  const drawn = await pane($, 'plan-progress')

  expect(await drawn.find({ key: 'minimize:plan-progress' })).toBeUndefined()
  expect(await drawn.find({ key: 'minimize' })).toBeDefined()
})

test('the band stays empty while nothing is minimized', async ($, on) => {
  on('session.start', ($$, e) => ({ cwd: e.cwd }))
  on('ui.render', () => owner())
  await $.session.start(START)
  const drawn = await band($)

  expect(await drawn.findAll({ type: 'Button' })).toHaveLength(0)
})

test('minimizing closes the pane and leaves a button that names it', async ($, on) => {
  const closed: string[] = []
  on('session.start', ($$, e) => ({ cwd: e.cwd }))
  on('ui.render', () => owner())
  on('ui.close', ($$, e) => (closed.push(e.id), { value: undefined }))
  await $.session.start(START)

  const drawn = await pane($, 'file-tracker')
  await drawn.press({ key: 'minimize:file-tracker' })

  expect(closed).toEqual(['file-tracker'])
  expect((await (await band($)).find({ key: 'restore:file-tracker' }))?.text).toContain('File toccati')
})

test('pressing the button opens the pane again and clears it from the band', async ($, on) => {
  const opened: string[] = []
  on('session.start', ($$, e) => ({ cwd: e.cwd }))
  on('ui.render', () => owner())
  on('ui.close', () => ({ value: undefined }))
  on('ui.open', ($$, e) => (opened.push(e.id), { value: { isPlaced: true } }))
  await $.session.start(START)

  const up = await pane($, 'agent-watch')
  await up.press({ key: 'minimize:agent-watch' })
  const chips = await band($)
  await chips.press({ key: 'restore:agent-watch' })

  expect(opened).toEqual(['agent-watch'])
  expect(await chips.findAll({ type: 'Button' })).toHaveLength(0)
})
