import type { ModelUsage, On, RenderElement } from 'claude-code'
import { expect, test } from 'claude-code/testing'

import { briefFor, strip } from '../hooks/register'

const PLUGIN = 'prompt-enhancer'
const START = { cwd: '/repo', surface: 'terminal', isInteractive: true } as const
const BAND = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 10,
  bodyColumns: 80,
  scroll: { offset: 0, bodyRows: 10 },
  view: {},
} as const

const owner = (): RenderElement => ({ type: 'Text', children: [''] })

const USAGE = {
  input_tokens: 0,
  output_tokens: 0,
  cache_read_input_tokens: 0,
  cache_creation_input_tokens: 0,
} as ModelUsage

const world = (on: On, draft: string) => {
  const box = { text: draft, cursor: draft.length }
  const sent: string[] = []
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('ui.render', () => owner())
  on('prompt.read', () => ({ value: box }))
  on('prompt.fill', ($, e) => {
    box.text = e.mode === 'append' ? box.text + e.text : e.text
    box.cursor = box.text.length
    return { isFilled: true, text: box.text, cursor: box.cursor }
  })
  on('prompt.submit', ($, e) => (sent.push(e.text), { text: e.text }))
  return { box, sent }
}

const band = ($: { ui: { mount: Function } }) =>
  $.ui.mount({ plugin: PLUGIN, surface: 'terminal', component: 'AbovePrompt', requestId: 'band', props: BAND })

test('the brief asks for the prompt alone, in the draft language', () => {
  const brief = briefFor('aggiungi un pulsante')

  expect(brief).toContain('no code fence')
  expect(brief).toContain('in the language the draft is written in')
  expect(brief).toContain('aggiungi un pulsante')
})

test('a fenced reply loses its fence', () => {
  expect(strip('```md\nciao\n```')).toBe('ciao')
  expect(strip('  ciao  ')).toBe('ciao')
})

test('the band shows Enhance and Send, and no Ripristina yet', async ($, on) => {
  world(on, 'una bozza')
  await $.session.start(START)
  const drawn = await band($)

  expect((await drawn.find({ key: 'enhance' }))?.text).toContain('Enhance')
  expect(await drawn.find({ key: 'send' })).toBeDefined()
  expect(await drawn.find({ key: 'restore-prompt' })).toBeUndefined()
})

test('Enhance replaces the draft and offers to put it back', async ($, on) => {
  const { box } = world(on, 'aggiungi un pulsante')
  on('model.fork', () => ({ value: { isAnswered: true, text: '```\nla riscrittura\n```', usage: USAGE } }))
  await $.session.start(START)

  const drawn = await band($)
  await drawn.press({ key: 'enhance' })

  expect(box.text).toBe('la riscrittura')
  expect(await drawn.find({ key: 'restore-prompt' })).toBeDefined()

  await drawn.press({ key: 'restore-prompt' })
  expect(box.text).toBe('aggiungi un pulsante')
  expect(await drawn.find({ key: 'restore-prompt' })).toBeUndefined()
})

test('a session with nothing to fork rewrites on its own', async ($, on) => {
  const { box } = world(on, 'aggiungi un pulsante')
  on('model.fork', () => ({ value: { isAnswered: false, reason: 'nothing-to-fork' } }))
  on('model.complete', () => ({ value: { isAnswered: true, text: 'la riscrittura a freddo', usage: USAGE } }))
  await $.session.start(START)

  await (await band($)).press({ key: 'enhance' })

  expect(box.text).toBe('la riscrittura a freddo')
})

test('a fork that fails for another reason leaves the draft alone', async ($, on) => {
  const { box } = world(on, 'aggiungi un pulsante')
  on('model.fork', () => ({ value: { isAnswered: false, reason: 'empty-reply', usage: USAGE } }))
  await $.session.start(START)

  await (await band($)).press({ key: 'enhance' })

  expect(box.text).toBe('aggiungi un pulsante')
})

test('Send submits the draft and empties the box', async ($, on) => {
  const { box, sent } = world(on, 'la riscrittura')
  await $.session.start(START)

  await (await band($)).press({ key: 'send' })

  expect(sent).toEqual(['la riscrittura'])
  expect(box.text).toBe('')
})

test('each button carries its icon and its own color', async ($, on) => {
  world(on, 'una bozza')
  on('model.fork', () => ({ value: { isAnswered: true, text: 'la riscrittura', usage: USAGE } }))
  await $.session.start(START)
  const drawn = await band($)

  expect((await drawn.find({ key: 'enhance' }))?.text).toContain('✦')
  expect((await drawn.find({ key: 'send' }))?.text).toContain('➤')

  await drawn.press({ key: 'enhance' })
  expect((await drawn.find({ key: 'restore-prompt' }))?.text).toContain('↩')

  const colors = (el: RenderElement | undefined): unknown[] =>
    (el?.children ?? []).flatMap(child =>
      typeof child === 'string' ? [] : [(child.props as { color?: string }).color, ...colors(child)],
    )

  expect(colors(await drawn.find({ key: 'enhance' }))).toContain('suggestion')
  expect(colors(await drawn.find({ key: 'send' }))).toContain('success')
  expect(colors(await drawn.find({ key: 'restore-prompt' }))).toContain('warning')
})
