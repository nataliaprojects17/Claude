import { expect, mock, test } from 'claude-code/testing'
import type { Engine, MockClock, Mounted } from 'claude-code/testing'
import type { On } from 'claude-code'

const PANE_PROPS = {
  title: 'Plan progress',
  isFocused: false,
  bodyColumns: 60,
  placement: 'inline' as const,
  scroll: { offset: 0, bodyRows: 30 },
  maxRows: 30,
  view: {},
}

/** The world beneath the mod: a clock, a store, and a bottom for every event it passes on. */
function world(on: On, entries?: Readonly<Record<string, unknown>>, mandati?: string[]): MockClock {
  const orologio = mock.clock(on, { now: 1_000_000 })
  mock.store(on, entries)
  mock.env(on, {})
  on('prompt.submit', ($, e) => (mandati?.push(e.text), { text: e.text }))
  on('tool.call', () => ({ result: {} as never }))
  on('turn.complete', ($, e) => ({ text: e.answer }))
  on('session.id', () => ({ value: 'this-session' }))
  on('session.cwd', () => ({ value: 'C:/GIT/Projects/APSS_Trento/Motore_Tariffe_SDO' }))
  on('ui.open', () => ({ value: { isPlaced: true as const } }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })

  return orologio
}

const AVVIO = {
  cwd: 'C:/GIT/Projects/APSS_Trento/Motore_Tariffe_SDO',
  surface: 'terminal' as const,
  isInteractive: true,
}

const UN_ORA = 60 * 60 * 1000

function pane($: Engine): Promise<Mounted<'terminal', 'Pane'>> {
  return $.ui.mount({
    plugin: 'plan-progress',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'plan-progress',
    props: PANE_PROPS,
    viewport: { columns: 160, rows: 40 },
  })
}

async function texts(ui: Mounted<'terminal', 'Pane'>): Promise<string> {
  const found = await ui.findAll({ type: 'Text' })

  return found.map(one => one.text ?? '').join('\n')
}

const TYPED = { wait: false, origin: { kind: 'composer' as const } }

const TODOS = {
  todos: [
    { content: 'Read the tariff tables', status: 'completed' as const, activeForm: 'Reading' },
    { content: 'Write the engine', status: 'in_progress' as const, activeForm: 'Writing' },
    { content: 'Check against MOS', status: 'pending' as const, activeForm: 'Checking' },
  ],
}

test('the pane draws the goal, the checklist and a third of the bar', async ($, on) => {
  world(on)
  await $.prompt.submit({ text: 'Build the SDO tariff engine', ...TYPED })
  await $.tool.call({ tool: 'TodoWrite', ...TODOS })

  const drawn = await texts(await pane($))

  expect(drawn).toContain('Build the SDO tariff engine')
  expect(drawn).toContain('Read the tariff tables')
  expect(drawn).toContain('Write the engine')
  expect(drawn).toContain('33%')
  expect(drawn).toContain('1/3 done')
})

test('a write moves the phase on and a read does not pull it back', async ($, on) => {
  world(on)
  await $.prompt.submit({ text: 'Fix the rounding', ...TYPED })
  await $.tool.call({ tool: 'Read', file_path: 'C:/tmp/a.java' })

  const ui = await pane($)

  expect(await texts(ui)).toContain('researching')

  await $.tool.call({ tool: 'Write', file_path: 'C:/tmp/a.java', content: 'x' })

  expect(await texts(ui)).toContain('building')

  await $.tool.call({ tool: 'Read', file_path: 'C:/tmp/b.java' })

  expect(await texts(ui)).toContain('building')
})

test('a test command and a review skill name their own phases', async ($, on) => {
  world(on)
  await $.prompt.submit({ text: 'Make it green', ...TYPED })
  await $.tool.call({ tool: 'Bash', command: 'mvn -q test' })

  const ui = await pane($)

  expect(await texts(ui)).toContain('testing')

  await $.tool.call({ tool: 'Skill', skill: 'code-review' })

  expect(await texts(ui)).toContain('auditing')
})

test('the All tasks view is reachable and says when nothing else runs', async ($, on) => {
  world(on)
  await $.prompt.submit({ text: 'Anything', ...TYPED })

  const ui = await pane($)
  await ui.press({ key: 'all' })

  expect(await texts(ui)).toContain('No other session is running a goal.')
})

test('the All tasks view lists another session from the store', async ($, on) => {
  world(on, {
    'run:other-session': {
      id: 'other-session',
      label: 'Motore_Tariffe_SDO',
      goal: 'Pareggiare al centesimo con MOS',
      phase: 'testing',
      done: 4,
      total: 6,
      startedAt: 400_000,
      updatedAt: 999_000,
      isDone: false,
    },
  })
  await $.prompt.submit({ text: 'Anything', ...TYPED })

  const ui = await pane($)
  await ui.press({ key: 'all' })
  const drawn = await texts(ui)

  expect(drawn).toContain('Motore_Tariffe_SDO')
  expect(drawn).toContain('Pareggiare al centesimo con MOS')
  expect(drawn).toContain('67%')
})

test('the run ends when every task is done', async ($, on) => {
  world(on)
  await $.prompt.submit({ text: 'Two steps', ...TYPED })
  await $.tool.call({
    tool: 'TodoWrite',
    todos: [
      { content: 'One', status: 'completed' as const, activeForm: 'One' },
      { content: 'Two', status: 'completed' as const, activeForm: 'Two' },
    ],
  })
  await $.turn.complete({
    answer: 'done',
    durationMs: 1000,
    isAborted: false,
    turnId: 't1',
    reason: 'answer',
  })

  const drawn = await texts(await pane($))

  expect(drawn).toContain('finished')
  expect(drawn).toContain('100%')
})

test('il keep-warm non manda niente mentre la sessione lavora', async ($, on) => {
  const mandati: string[] = []
  const orologio = world(on, undefined, mandati)

  await $.session.start(AVVIO)
  await $.prompt.submit({ text: 'Un lavoro vero', ...TYPED })
  await orologio.advance(30 * 60 * 1000)

  expect(mandati).toEqual(['Un lavoro vero'])
})

test('il keep-warm manda un turno quando la sessione resta ferma', async ($, on) => {
  const mandati: string[] = []
  const orologio = world(on, undefined, mandati)

  await $.session.start(AVVIO)
  await orologio.advance(UN_ORA)

  expect(mandati).toHaveLength(1)
  expect(mandati[0]).toContain('Keep-warm')
})

test('spento nelle opzioni, il keep-warm non manda niente', { options: { keepWarm: false } }, async ($, on) => {
  const mandati: string[] = []
  const orologio = world(on, undefined, mandati)

  await $.session.start(AVVIO)
  await orologio.advance(UN_ORA * 3)

  expect(mandati).toEqual([])
})

const BANDA = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 12,
  bodyColumns: 80,
  scroll: { offset: 0, bodyRows: 12 },
  view: {},
}

test('ridurre chiude la pane e lascia una pastiglia che la riapre', async ($, on) => {
  const chiuse: string[] = []
  world(on)
  on('ui.close', ($$, e) => (chiuse.push(e.id), { value: undefined }))
  await $.prompt.submit({ text: 'Build the SDO tariff engine', ...TYPED })
  await $.tool.call({ tool: 'TodoWrite', ...TODOS })

  const banda = await $.ui.mount({
    plugin: 'plan-progress',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: BANDA,
  })

  expect(await banda.find({ key: 'restore-plan' })).toBeUndefined()

  const ui = await pane($)
  await ui.press({ key: 'minimize' })

  expect(chiuse).toEqual(['plan-progress'])
  expect(await banda.find({ key: 'restore-plan' })).toBeDefined()

  await banda.press({ key: 'restore-plan' })

  expect(await banda.find({ key: 'restore-plan' })).toBeUndefined()
})
