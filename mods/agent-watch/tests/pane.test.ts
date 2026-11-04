import { expect, mock, test } from 'claude-code/testing'

const PANE = 'agent-watch'

const SPAWN = {
  tool_use_id: 'tu1',
  provider: { plugin: 'engine', tier: 'core' },
  parentModel: 'claude-opus-5',
  background: true,
  fork: false,
} as const

const PROPS = {
  title: 'Subagents',
  isFocused: false,
  bodyColumns: 60,
  placement: 'dock' as const,
  scroll: { offset: 0, bodyRows: 30 },
  view: {},
}

test('a spawned agent shows active, then finished, and expands on a press', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  on('ui.render', async () => ({}) as never)
  on('ui.close', async () => ({ value: undefined }) as never)
  on('agent.spawn', async () => ({ agentId: 'a1', model: 'claude-opus-5' }))
  on('turn.complete', async (_$, e) => ({ text: e.answer, usage: e.usage }))

  await $.agent.spawn({
    ...SPAWN,
    prompt: 'Read the tariffario.',
    description: 'read tariffario',
    subagentType: 'Explore',
  })

  const ui = await $.ui.mount({
    plugin: 'agent-watch',
    surface: 'terminal',
    component: 'Pane',
    requestId: PANE,
    props: PROPS,
  })

  expect(await ui.find({ type: 'Text', text: /Attivi · 1/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Finiti · 0/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /read tariffario/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Opus 5/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /In corso/ })).toBeDefined()

  expect(await ui.find({ type: 'Text', text: /contesto/ })).toBeUndefined()
  await ui.press({ key: 'row-a1' })
  expect(await ui.find({ type: 'Text', text: /contesto/ })).toBeDefined()

  await $.turn.complete({
    answer: 'done',
    durationMs: 1200,
    isAborted: false,
    turnId: 't1',
    agentId: 'a1',
    reason: 'answer',
    usage: {
      model: 'claude-opus-5',
      input_tokens: 1000,
      output_tokens: 200,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
    },
  })

  expect(await ui.find({ type: 'Text', text: /Finiti · 1/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Attivi · 0/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Nessun subagent attivo/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /read tariffario/ })).toBeUndefined()

  await ui.press({ key: 'tab-finiti' })
  expect(await ui.find({ type: 'Text', text: /read tariffario/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Fatto/ })).toBeDefined()

  await ui.press({ key: 'wipe' })
  expect(await ui.find({ type: 'Text', text: /Finiti · 0/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Nessun subagent finito/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /read tariffario/ })).toBeUndefined()

  await ui.unmount()
})

test('un pannello senza subagent si chiude da se', async ($, on) => {
  const closed: string[] = []
  const clock = mock.clock(on, { now: 1_000_000 })
  on('ui.render', async () => ({}) as never)
  on('ui.close', async (_$, e) => (closed.push(e.id), { value: undefined }) as never)

  await $.ui.mount({
    plugin: PANE,
    surface: 'terminal',
    component: 'Pane',
    requestId: PANE,
    props: PROPS,
  })
  await clock.advance(1)

  expect(closed).toEqual([PANE])
})

test('a step records the model, the effort and the context tokens', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  on('ui.render', async () => ({}) as never)
  on('agent.spawn', async () => ({ agentId: 'a2', model: 'claude-opus-5' }))
  on('turn.step', async function* () {
    return {
      turnId: 't2',
      index: 0,
      answer: 'ok',
      toolUses: [],
      serverToolUses: [],
      stopReason: 'end_turn' as const,
      usage: {
        model: 'claude-opus-5',
        input_tokens: 10_000,
        output_tokens: 500,
        cache_read_input_tokens: 30_000,
        cache_creation_input_tokens: 2_000,
      },
    }
  })

  await $.agent.spawn({
    ...SPAWN,
    prompt: 'Count.',
    description: 'count',
    subagentType: 'Plan',
  })

  for await (const _ of $.turn.step({
    turnId: 't2',
    index: 0,
    model: 'claude-opus-5',
    effort: 'high',
    messageCount: 4,
    agentId: 'a2',
  })) {
    // the stream carries no chunks here
  }

  const ui = await $.ui.mount({
    plugin: 'agent-watch',
    surface: 'terminal',
    component: 'Pane',
    requestId: PANE,
    props: PROPS,
  })

  expect(await ui.find({ type: 'Text', text: /Plan · Opus 5 · high/ })).toBeDefined()

  await ui.press({ key: 'row-a2' })
  expect(await ui.find({ type: 'Text', text: /contesto 42k/ })).toBeDefined()

  await ui.unmount()
})

const BAND = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 10,
  bodyColumns: 80,
  scroll: { offset: 0, bodyRows: 10 },
  view: {},
}

const band = ($: { ui: { mount: Function } }) =>
  $.ui.mount({ plugin: 'agent-watch', surface: 'terminal', component: 'AbovePrompt', requestId: 'band', props: BAND })

const pane = ($: { ui: { mount: Function } }) =>
  $.ui.mount({ plugin: 'agent-watch', surface: 'terminal', component: 'Pane', requestId: PANE, props: PROPS })

test('niente sopra il prompt finche il pane non e ridotto', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  on('ui.render', async () => ({ type: 'Box', children: [] }) as never)

  const chips = await band($)

  expect(await chips.findAll({ type: 'Button' })).toHaveLength(0)
})

test('ridurre chiude il pane e lascia il segno che lo riapre', async ($, on) => {
  const closed: string[] = []
  const opened: string[] = []
  mock.clock(on, { now: 1_000_000 })
  on('ui.render', async () => ({ type: 'Box', children: [] }) as never)
  on('ui.close', async (_$, e) => (closed.push(e.id), { value: undefined }) as never)
  on('ui.open', async (_$, e) => (opened.push(e.id), { value: { isPlaced: true } }) as never)

  const ui = await pane($)
  await ui.press({ key: 'minimize' })
  expect(closed).toEqual([PANE])

  const chips = await band($)
  expect((await chips.find({ key: 'restore-subagents' }))?.text).toContain('Subagents')
  await chips.press({ key: 'restore-subagents' })
  expect(opened).toEqual([PANE])
  await chips.unmount()

  const again = await band($)
  expect(await again.findAll({ type: 'Button' })).toHaveLength(0)
  await again.unmount()
})

test('un agente che parte riapre il pane ridotto', async ($, on) => {
  const opened: string[] = []
  mock.clock(on, { now: 1_000_000 })
  on('ui.render', async () => ({ type: 'Box', children: [] }) as never)
  on('ui.close', async () => ({ value: undefined }) as never)
  on('ui.open', async (_$, e) => (opened.push(e.id), { value: { isPlaced: true } }) as never)
  on('agent.spawn', async () => ({ agentId: 'a3', model: 'claude-opus-5' }))

  const ui = await pane($)
  await ui.press({ key: 'minimize' })
  await ui.unmount()

  await $.agent.spawn({
    ...SPAWN,
    prompt: 'Read the delibera.',
    description: 'read delibera',
    subagentType: 'Explore',
  })

  expect(opened).toEqual([PANE])

  const chips = await band($)
  expect(await chips.findAll({ type: 'Button' })).toHaveLength(0)
  await chips.unmount()
})
