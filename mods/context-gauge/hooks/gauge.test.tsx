import { expect, mock, test } from 'claude-code/testing'
import type { On, RenderSurface } from 'claude-code'

const SURFACES: readonly RenderSurface[] = ['terminal', 'desktop']
const START = Date.parse('2026-10-20T09:30:00Z')
const RETRY_MS = 120000
const FRESH_MS = 300000

const PROPS = {
  hasSurvey: false,
  isWorking: false,
  maxRows: 10,
  bodyColumns: 120,
  scroll: { offset: 0, bodyRows: 10, of: 1 },
  view: {},
} as const

type Kit = {
  reply?: string
  root?: string
  isLost?: boolean
  held?: string[]
  branch?: string
  written?: string[]
  asked?: string[]
  stored?: Record<string, unknown>
}

const bottom = (on: On, kit: Kit = {}) => {
  const clock = mock.clock(on, { now: START })
  mock.store(on, kit.stored ?? {})

  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))

  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)

    return <Box />
  })
  on('session.measure', ($, e) => ({ changed: e.changed }))
  on('session.root', () => ({ value: kit.root ?? '/repo' }))
  on('ui.toast', () => ({ value: undefined }))
  on('fs.exists', () => ({ value: kit.isLost !== true }))
  on('fs.list', () => ({
    value: (kit.held ?? []).map(name => ({
      name,
      kind: 'file' as const,
      size: 1,
      mtimeMs: START,
      isLink: false,
    })),
  }))
  on('fs.write', ($, e) => (kit.written?.push(e.path), { value: undefined }))
  on('process.run', ($, e) => ({
    value: {
      exitCode: kit.branch === undefined ? 1 : 0,
      stdout: e.argv.includes('--abbrev-ref') ? (kit.branch ?? '') : '',
      stderr: '',
      isStdoutTruncated: false,
      isStderrTruncated: false,
    },
  }))
  on('model.fork', ($, e) => {
    kit.asked?.push(e.prompt)

    return {
      value:
        kit.reply === undefined
          ? { isAnswered: false, reason: 'nothing-to-fork' }
          : { isAnswered: true, text: kit.reply, usage: {} as never },
    }
  })
  on('command.run', () => ({ text: '' }))
  on('prompt.fill', () => ({ isFilled: true, text: '', cursor: 0 }))

  return clock
}

const DOC = [
  '# Fix the tariff rounding',
  '',
  '## Goal',
  'Pareggiare al centesimo con MOS.',
  '',
  '## Where we are',
  'The engine rounds with BigDecimal everywhere in calcengine, verified by the tests.',
  '',
  '## What we tried',
  'A double-based pass first; it drifted by a cent on the post-acuti case and was dropped.',
  '',
  '## Decisions',
  'BigDecimal throughout, rejected double, because the error only shows at the cent.',
  '',
  '## Next',
  'Run the reconciliation over the whole sample.',
].join('\n')

const band = ($: any, surface: RenderSurface) =>
  $.ui.mount({
    plugin: 'context-gauge',
    surface,
    component: 'AbovePrompt',
    props: PROPS,
    viewport: { columns: 120, rows: 40 },
  })

const OPEN = { cwd: '/repo', surface: 'terminal', isInteractive: true } as const

const run = ($: any, command: string, args: string) =>
  $.command.run({
    command,
    args,
    origin: { kind: 'plugin', name: 'test' },
    presentation: { isFullscreen: false, columns: 120 },
  })

const measure = ($: any, percent: number, tokens: number) =>
  $.session.measure({
    context: { percent, tokens, window: 200000 },
    rateLimits: [],
    changed: ['context'],
  })

test('draws nothing before the first measurement', async ($, on) => {
  bottom(on)

  for (const surface of SURFACES) {
    const drawn = await band($, surface)
    expect(await drawn.findAll({ type: 'Button' })).toEqual([])
  }
})

test('stays out of the way below the watch mark', async ($, on) => {
  bottom(on)
  await measure($, 42, 84000)

  for (const surface of SURFACES) {
    const drawn = await band($, surface)
    expect(await drawn.findAll({ type: 'Button' })).toEqual([])
  }
})

test('warns and offers the buttons once the fill passes the watch mark', async ($, on) => {
  bottom(on)
  await measure($, 72, 144000)

  for (const surface of SURFACES) {
    const drawn = await band($, surface)
    expect(await drawn.find({ type: 'Text', text: /quality starts to slip/ })).toBeDefined()
    expect(await drawn.find({ key: 'handoff' })).toBeDefined()
    expect(await drawn.find({ key: 'fresh' })).toBeDefined()
  }
})

test('sharpens the warning past the second mark', async ($, on) => {
  bottom(on)
  await measure($, 88, 176000)

  const drawn = await band($, 'terminal')
  expect(await drawn.find({ type: 'Text', text: /answers drift/ })).toBeDefined()
})

test('hide takes the band away', async ($, on) => {
  bottom(on)
  await measure($, 72, 144000)

  const drawn = await band($, 'terminal')
  await drawn.press({ key: 'hide' })

  const again = await band($, 'terminal')
  expect(await again.findAll({ type: 'Button' })).toEqual([])
})

test('reports, sets and switches off the autohandoff threshold', async ($, on) => {
  bottom(on)

  expect((await run($, 'autohandoff', '')).text).toContain('80%')

  expect((await run($, 'autohandoff', '65')).text).toContain('65%')
  expect((await run($, 'autohandoff', '')).text).toContain('65%')

  expect((await run($, 'autohandoff', 'off')).text).toContain('off')
  expect((await run($, 'autohandoff', '')).text).toContain('off')
})

test('takes the stored threshold without waiting for a session to start', async ($, on) => {
  bottom(on, { stored: { threshold: 40 } })

  expect((await run($, 'autohandoff', '')).text).toContain('40%')
})

test('reads the threshold back from the store on every session start', async ($, on) => {
  bottom(on, { stored: { threshold: 40 } })

  await $.session.start(OPEN)
  expect((await run($, 'autohandoff', '')).text).toContain('40%')

  expect((await run($, 'autohandoff', '65')).text).toContain('65%')

  await $.session.start(OPEN)
  expect((await run($, 'autohandoff', '')).text).toContain('65%')
})

test('refuses an autohandoff percentage outside 10 to 99', async ($, on) => {
  bottom(on)

  expect((await run($, 'autohandoff', '400')).text).toContain('between')
  expect((await run($, 'autohandoff', '')).text).toContain('80%')
})

test('says so when there is nothing to hand off yet', async ($, on) => {
  bottom(on)

  const ran = await run($, 'handoff', '')
  expect(ran.text).toContain('nothing to hand off')
})

test('names the file by sequence, title and day', async ($, on) => {
  const written: string[] = []
  bottom(on, { reply: DOC, written })

  const ran = await run($, 'handoff', '')

  expect(written).toHaveLength(1)
  expect(written[0]).toMatch(/[\\/]\.claude[\\/]handoffs[\\/]HANDOFF_001_/)
  expect(written[0]).toMatch(/HANDOFF_001_fix-the-tariff-rounding_2026-10-20\.md$/)
  expect(ran.text).toContain('HANDOFF_001_fix-the-tariff-rounding')
})

test('builds the path with the separator the repository root uses', async ($, on) => {
  const written: string[] = []
  bottom(on, { reply: DOC, written, root: 'C:\\GIT\\Repo' })

  await run($, 'handoff', '')

  expect(written[0]).toBe(
    'C:\\GIT\\Repo\\.claude\\handoffs\\HANDOFF_001_fix-the-tariff-rounding_2026-10-20.md',
  )
})

test('says so when the write leaves nothing behind', async ($, on) => {
  bottom(on, { reply: DOC, isLost: true })

  const ran = await run($, 'handoff', '')
  expect(ran.text).toContain('nothing landed at')
})

test('says when the handoff came out thin', async ($, on) => {
  bottom(on, { reply: '# Thin\n\n## Goal\nnot much' })

  const ran = await run($, 'handoff', '')
  expect(ran.text).toContain('HANDOFF_001_thin')

  const drawn = await band($, 'terminal')
  expect(await drawn.find({ type: 'Text', text: /came out thin/ })).toBeDefined()
})

test('hands the repository state to the fork', async ($, on) => {
  const asked: string[] = []
  bottom(on, { reply: DOC, branch: 'develop', asked })

  await run($, 'handoff', '')

  expect(asked).toHaveLength(1)
  expect(asked[0]).toContain('branch: develop')
})

test('the automatic write runs on a timer, outside the measuring dispatch', async ($, on) => {
  const written: string[] = []
  const clock = bottom(on, { reply: DOC, written })

  await measure($, 90, 180000)
  expect(written).toHaveLength(0)

  await clock.settle()
  expect(written).toHaveLength(1)
})

test('a failed write does not block the next attempt', async ($, on) => {
  const asked: string[] = []
  const clock = bottom(on, { asked })

  await measure($, 90, 180000)
  await clock.advance(RETRY_MS + 1)

  await measure($, 91, 182000)
  await clock.settle()

  expect(asked).toHaveLength(2)
})

test('a written handoff is not written again until the fill climbs ten points', async ($, on) => {
  const asked: string[] = []
  const clock = bottom(on, { reply: DOC, asked })

  await measure($, 90, 180000)
  await clock.advance(RETRY_MS + 1)

  await measure($, 95, 190000)
  await clock.settle()

  expect(asked).toHaveLength(1)
})

test('numbers each new handoff after the ones already there', async ($, on) => {
  const written: string[] = []
  bottom(on, {
    reply: DOC,
    written,
    held: [
      'HANDOFF_001_first-go_2026-10-18.md',
      'HANDOFF_002_second-go_2026-10-19.md',
    ],
  })

  await run($, 'handoff', '')

  expect(written[0]).toMatch(/HANDOFF_003_fix-the-tariff-rounding_2026-10-20\.md$/)
})

test('points the new handoff back at the last one', async ($, on) => {
  const asked: string[] = []
  bottom(on, { reply: DOC, asked, held: ['HANDOFF_007_earlier-work_2026-10-19.md'] })

  await run($, 'handoff', '')

  expect(asked[0]).toContain('HANDOFF_007_earlier-work_2026-10-19.md')
})

test('save and start new reuses a handoff written moments ago', async ($, on) => {
  const written: string[] = []
  const clock = bottom(on, { reply: DOC, written })

  await run($, 'handoff', '')
  await measure($, 72, 144000)

  const drawn = await band($, 'terminal')
  await drawn.press({ key: 'handoff' })
  await clock.settle()

  expect(written).toHaveLength(1)
})

test('save and start new writes afresh when the held one has gone stale', async ($, on) => {
  const written: string[] = []
  const clock = bottom(on, { reply: DOC, written })

  await run($, 'handoff', '')
  await measure($, 72, 144000)
  await clock.advance(FRESH_MS + 1)

  const drawn = await band($, 'terminal')
  await drawn.press({ key: 'handoff' })
  await clock.settle()

  expect(written).toHaveLength(2)
})
