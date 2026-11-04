import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const START = { cwd: 'C:/tmp', surface: 'terminal', isInteractive: true } as const
const RUN = {
  command: 'cachekeeper',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 140 },
} as const

const USAGE = {
  model: 'claude-opus-5',
  input_tokens: 0,
  output_tokens: 400,
  cache_read_input_tokens: 90000,
  cache_creation_input_tokens: 10000,
}

const turn = {
  answer: 'done',
  durationMs: 1000,
  isAborted: false,
  turnId: 't1',
  reason: 'answer',
  usage: USAGE,
} as const

let forks = 0
let sessionId = 'sess-1'
let written: { path: string; text: string }[] = []

// The engine's own bottom for everything the mod reaches for.
const bottom = (on: On) => {
  forks = 0
  sessionId = 'sess-1'
  written = []
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.id', () => ({ value: sessionId }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('turn.complete', ($, e) => ({ text: e.answer, usage: e.usage }))
  on('env.get', () => ({ value: 'C:/home' }))
  on('fs.write', ($, e) => {
    written.push({ path: e.path, text: e.text })

    return { value: undefined }
  })
  on('model.fork', () => {
    forks += 1

    return {
      value: {
        isAnswered: true,
        text: 'ok',
        usage: {
          input_tokens: 0,
          output_tokens: 3,
          cache_read_input_tokens: 100000,
          cache_creation_input_tokens: 0,
        },
      },
    }
  })
  on('ui.log', () => ({ value: undefined }))
  on('ui.notify', () => ({ value: { isSent: true, channel: 'terminal_bell' } }) as const)
}

test('the budget is the break-even, not a guess', async ($, on) => {
  mock.clock(on, { now: 1_700_000_000_000 })
  mock.store(on)
  bottom(on)

  await $.session.start(START)

  // Opus 5: a read is x0.5 of the prefix, a cold write x10, so 19 pings.
  const said = await $.command.run({ ...RUN, args: '' })
  expect(said.text).toMatch(/19 pings left/)
  expect(said.text).toMatch(/\/cachekeeper off/)
})

test('it pings on its own before the cache goes cold', async ($, on) => {
  const clock = mock.clock(on, { now: 1_700_000_000_000 })
  mock.store(on)
  bottom(on)

  await $.session.start(START)
  await $.turn.complete(turn)
  expect(forks).toBe(0)

  // 60m window, pinged 5m before the end.
  await clock.advance(56 * 60000)
  expect(forks).toBe(1)

  // And again a window later, because the ping reset the clock.
  await clock.advance(56 * 60000)
  expect(forks).toBe(2)
})

test('it stops pinging once that has cost a cold restart', async ($, on) => {
  const clock = mock.clock(on, { now: 1_700_000_000_000 })
  mock.store(on)
  bottom(on)

  await $.session.start(START)
  await $.turn.complete(turn)
  await $.command.run({ ...RUN, args: 'budget 2' })

  await clock.advance(56 * 60000)
  await clock.advance(56 * 60000)
  expect(forks).toBe(2)

  // The budget is spent: the third window warns instead of pinging.
  await clock.advance(56 * 60000)
  expect(forks).toBe(2)
})

test('a message from me refills the budget', async ($, on) => {
  const clock = mock.clock(on, { now: 1_700_000_000_000 })
  mock.store(on)
  bottom(on)

  await $.session.start(START)
  await $.turn.complete(turn)
  await $.command.run({ ...RUN, args: 'budget 1' })

  await clock.advance(56 * 60000)
  expect(forks).toBe(1)

  await $.turn.complete({ ...turn, turnId: 't2' })
  const said = await $.command.run({ ...RUN, args: '' })
  expect(said.text).toMatch(/19 pings left/)
})

test('off stops it and says how to turn it back on', async ($, on) => {
  const clock = mock.clock(on, { now: 1_700_000_000_000 })
  mock.store(on)
  bottom(on)

  await $.session.start(START)
  await $.turn.complete(turn)

  const off = await $.command.run({ ...RUN, args: 'off' })
  expect(off.text).toMatch(/off/)

  await clock.advance(56 * 60000)
  expect(forks).toBe(0)

  const said = await $.command.run({ ...RUN, args: '' })
  expect(said.text).toMatch(/\/cachekeeper on/)
})

test('the state file the status line reads is per session', async ($, on) => {
  mock.clock(on, { now: 1_700_000_000_000 })
  mock.store(on)
  bottom(on)

  await $.session.start(START)
  await $.turn.complete(turn)

  const last = written.at(-1)
  expect(last?.path).toMatch(/cache-keeper/)
  expect(last?.path).toEndWith('sess-1.json')

  const state = JSON.parse(last?.text ?? '{}')
  expect(state.windowMs).toBe(3600000)
  expect(state.isAuto).toBe(true)
  expect(state.pingsLeft).toBe(19)
  expect(typeof state.lastAt).toBe('number')
})

test('it still writes the state file when session.start never ran', async ($, on) => {
  mock.clock(on, { now: 1_700_000_000_000 })
  mock.store(on)
  bottom(on)

  // A /reload-plugins on an installed mod re-runs register without firing
  // session.start; the path has to resolve anyway.
  await $.turn.complete(turn)

  const last = written.at(-1)
  expect(last?.path).toEndWith('sess-1.json')
})

test('a new session id takes the state file with it', async ($, on) => {
  mock.clock(on, { now: 1_700_000_000_000 })
  mock.store(on)
  bottom(on)

  await $.session.start(START)
  await $.turn.complete(turn)
  expect(written.at(-1)?.path).toEndWith('sess-1.json')

  // /clear gives the session a new id and does not fire session.start again.
  sessionId = 'sess-2'
  await $.turn.complete(turn)

  expect(written.at(-1)?.path).toEndWith('sess-2.json')
})
