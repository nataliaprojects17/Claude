import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const START = { cwd: 'C:/tmp', surface: 'terminal', isInteractive: true } as const
const RUN = {
  command: 'cachekeeper',
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 140 },
} as const

const PREFIX = 100000

// A turn that read the whole prefix back.
const warm = (turnId: string, model = 'claude-opus-5') =>
  ({
    answer: 'done',
    durationMs: 1000,
    isAborted: false,
    turnId,
    reason: 'answer',
    usage: {
      model,
      input_tokens: 0,
      output_tokens: 400,
      cache_read_input_tokens: PREFIX,
      cache_creation_input_tokens: 0,
    },
  }) as const

// A turn that found nothing in the cache: the entry expired, or the prefix was
// rewritten under it.
const cold = (turnId: string, model = 'claude-opus-5') =>
  ({
    ...warm(turnId, model),
    usage: {
      model,
      input_tokens: 0,
      output_tokens: 400,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: PREFIX,
    },
  }) as const

const bottom = (on: On) => {
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.id', () => ({ value: 'sess-1' }))
  on('session.model', () => ({ value: 'claude-opus-5' }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('turn.complete', ($, e) => ({ text: e.answer, usage: e.usage }))
  on('env.get', () => ({ value: 'C:/home' }))
  on('fs.write', () => ({ value: undefined }))
  on('ui.log', () => ({ value: undefined }))
  on('ui.notify', () => ({ value: { isSent: true, channel: 'terminal_bell' } }) as const)
}

test('a prefix lost sooner than the shortest TTL does not narrow the window', async ($, on) => {
  const clock = mock.clock(on, { now: 1_700_000_000_000 })
  mock.store(on)
  bottom(on)

  await $.session.start(START)
  await $.turn.complete(warm('t1'))

  // 61 seconds: under the 5m TTL, so the prefix was rewritten, not expired.
  await clock.advance(61610)
  await $.turn.complete(cold('t2'))

  const said = await $.command.run({ ...RUN, args: '' })
  expect(said.text).toMatch(/Cache window 60m \(assumed\)/)
})

test('a prefix lost after the shortest TTL still measures the window', async ($, on) => {
  const clock = mock.clock(on, { now: 1_700_000_000_000 })
  mock.store(on)
  bottom(on)

  await $.session.start(START)
  await $.turn.complete(warm('t1'))

  await clock.advance(10 * 60000)
  await $.turn.complete(cold('t2'))

  const said = await $.command.run({ ...RUN, args: '' })
  expect(said.text).toMatch(/Cache window 10m \(measured in this session\)/)
})

test('a miss after a model switch does not narrow the window', async ($, on) => {
  const clock = mock.clock(on, { now: 1_700_000_000_000 })
  mock.store(on)
  bottom(on)

  await $.session.start(START)
  await $.turn.complete(warm('t1'))

  // Long enough to be an expiry, but cache entries are model-scoped: this miss
  // says nothing about time.
  await clock.advance(10 * 60000)
  await $.turn.complete(cold('t2', 'claude-sonnet-5-5'))

  const said = await $.command.run({ ...RUN, args: '' })
  expect(said.text).toMatch(/Cache window 60m \(assumed\)/)
})

test('a window already poisoned in the store is read as no reading at all', async ($, on) => {
  mock.clock(on, { now: 1_700_000_000_000 })
  // What this session carried before the floor existed: 61 seconds, which no
  // TTL can produce.
  mock.store(on, { measured: { warmMs: 2326420, coldMs: 61610 } })
  bottom(on)

  await $.session.start(START)

  const said = await $.command.run({ ...RUN, args: '' })
  expect(said.text).toMatch(/Cache window 60m \(assumed\)/)
})
