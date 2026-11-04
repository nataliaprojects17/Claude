import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

type Repo = { head: string; log: string; judged: string; judgeCalls: number; toasts?: string[] }

function world(
  on: On,
  repo: Repo = { head: 'aaa', log: '', judged: 'NONE', judgeCalls: 0 },
  entries: Record<string, unknown> = {},
) {
  mock.store(on, entries)
  const clock = mock.clock(on, { now: 1_000_000 })
  const toasts: string[] = []
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('tool.register', ($, e) => ({ value: { tool: `mcp__ideas__${e.name}` } }))
  on('session.root', () => ({ value: '/repo' }))
  on('process.run', ($, e) => {
    const args = e.argv.slice(1).join(' ')
    const stdout = args.startsWith('rev-parse --abbrev-ref')
      ? 'features/ideas\n'
      : args === 'rev-parse HEAD'
        ? `${repo.head}\n`
        : args.startsWith('log')
          ? repo.log
          : ''
    return { value: { exitCode: 0, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('model.complete', () => {
    repo.judgeCalls += 1
    return {
      value: {
        isAnswered: true,
        text: repo.judged,
        usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
      },
    }
  })
  on('ui.status', () => ({ value: undefined }))
  on('ui.toast', ($, e) => {
    toasts.push(String(e.text))
    return { value: undefined }
  })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  const closed: string[] = []
  on('ui.close', ($, e) => (closed.push(e.id), { value: undefined }))
  // Quello che il mod trova sotto di se quando lascia passare il disegno.
  on('ui.render', () => ({ type: 'Box', children: [] }))
  return Object.assign(repo, { clock, toasts, closed })
}

const PANE = {
  plugin: 'ideas',
  component: 'Pane',
  requestId: 'ideas',
  props: {
    title: 'Ideas',
    isFocused: true,
    bodyColumns: 100,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

const BAND = {
  plugin: 'ideas',
  component: 'AbovePrompt',
  requestId: 'band',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

const START = { cwd: '/repo', surface: 'terminal', isInteractive: true } as const
const RUN = { origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 160 } } as const

test('/idea parks an idea without a transcript row, and the shelf lists it', async ($, on) => {
  world(on)
  await $.session.start(START)

  const answer = await $.command.run({ command: 'idea', args: 'cache the DRG table', ...RUN })
  expect(answer.text).toBeUndefined()

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.findAll({ type: 'Button', text: /cache the DRG table/ })).toHaveLength(1)
    await ui.unmount()
  }
})

test('tags and priority come from the text, high priority sorts first, a shared tag filters', async ($, on) => {
  world(on)
  await $.session.start(START)
  await $.command.run({ command: 'idea', args: 'low thing #docs !low', ...RUN })
  await $.command.run({ command: 'idea', args: 'normal thing #solventum', ...RUN })
  await $.command.run({ command: 'idea', args: '!high urgent thing #solventum', ...RUN })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const rows = await ui.findAll({ type: 'Button', text: /thing/ })
  expect(rows.map(r => r.text)).toEqual([
    expect.stringMatching(/▌ urgent thing/),
    expect.stringMatching(/ {2}normal thing/),
    expect.stringMatching(/↓ low thing/),
  ])
  expect(rows[0]?.text).not.toMatch(/!high/)

  expect(await ui.find({ key: 'tag-docs' })).toBeUndefined()
  await ui.press({ key: 'tag-solventum' })
  expect(await ui.findAll({ type: 'Button', text: /thing/ })).toHaveLength(2)
  await ui.unmount()
})

test('the scope switch picks the branch or the whole project, and pressing the active side keeps it', async ($, on) => {
  world(on, undefined, {
    'project:/repo': [{ id: 'other', code: 'I-0001', text: 'idea from develop', branch: 'develop', createdAt: 1, status: 'open' }],
  })
  await $.session.start(START)
  await $.command.run({ command: 'idea', args: 'idea from here', ...RUN })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ key: 'scope-branch' }))?.text).toBe('features/ideas')
  const visible = async () => (await ui.findAll({ type: 'Button', text: /idea from/ })).length

  expect(await visible()).toBe(1)
  await ui.press({ key: 'scope-project' })
  expect(await visible()).toBe(2)
  await ui.press({ key: 'scope-project' })
  expect(await visible()).toBe(2)
  await ui.press({ key: 'scope-branch' })
  expect(await visible()).toBe(1)
  await ui.unmount()
})

test('close and reject hide an idea; show closed brings it back to reopen', async ($, on) => {
  world(on)
  await $.session.start(START)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.input({ key: 'new', text: 'export ideas as markdown' })
  await ui.input({ key: 'new', text: 'a bad idea' })

  for (const [text, action] of [[/export ideas/, /Close/], [/a bad idea/, /Reject/]] as const) {
    const row = await ui.find({ type: 'Button', text })
    await ui.press({ key: row!.key! })
    const button = await ui.find({ type: 'Button', text: action })
    await ui.press({ key: button!.key! })
    expect(await ui.find({ type: 'Button', text })).toBeUndefined()
  }

  await ui.press({ key: 'show-closed' })
  const bad = await ui.find({ type: 'Button', text: /a bad idea/ })
  expect(bad?.text).toMatch(/^I-[0-9a-f]{4}\s+✗/)
  await ui.press({ key: (await ui.find({ type: 'Button', text: /Reopen/ }))!.key! })
  await ui.press({ key: 'show-closed' })
  expect(await ui.find({ type: 'Button', text: /a bad idea/ })).toBeDefined()
  await ui.unmount()
})

test('a commit that names the idea code closes it without asking the model', async ($, on) => {
  const repo = world(on)
  await $.session.start(START)
  await $.command.run({ command: 'idea', args: 'retry Solventum on 503', ...RUN })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const code = /I-[0-9a-f]{4}/.exec((await ui.find({ type: 'Button', text: /retry/ }))!.text!)![0]

  repo.head = 'bbb'
  repo.log = `bbb\x1fRetry su 503 ${code}\x1f\x1e`
  await $.command.run({ command: 'ideas', args: '', ...RUN })

  expect(repo.judgeCalls).toBe(0)
  expect(await ui.find({ type: 'Button', text: /retry/ })).toBeUndefined()
  await ui.press({ key: 'show-closed' })
  const row = await ui.find({ type: 'Button', text: /retry/ })
  await ui.press({ key: row!.key! })
  expect(await ui.find({ type: 'Text', text: /Implemented by bbb Retry su 503/ })).toBeDefined()
  await ui.unmount()
})

test('new commits the model says implement an idea close it; the others stay open', async ($, on) => {
  const repo = world(on)
  await $.session.start(START)
  await $.command.run({ command: 'idea', args: 'cache the DRG table', ...RUN })
  await $.command.run({ command: 'idea', args: 'rename the tariff columns', ...RUN })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const code = /I-[0-9a-f]{4}/.exec((await ui.find({ type: 'Button', text: /cache the DRG/ }))!.text!)![0]

  repo.head = 'ccc'
  repo.log = 'ccc\x1fCache della tabella DRG\x1f\n\nbackend/DrgCache.java\x1e'
  repo.judged = code
  await $.command.run({ command: 'ideas', args: '', ...RUN })

  expect(repo.judgeCalls).toBe(1)
  expect(await ui.find({ type: 'Button', text: /cache the DRG/ })).toBeUndefined()
  expect(await ui.find({ type: 'Button', text: /rename the tariff/ })).toBeDefined()

  await $.command.run({ command: 'ideas', args: '', ...RUN })
  expect(repo.judgeCalls).toBe(1)
  await ui.unmount()
})

test('Claude can park an idea with tags and priority through its tool', async ($, on) => {
  world(on)
  await $.session.start(START)

  const ran = await $.tool.call({ tool: 'mcp__ideas__park_idea', text: 'retry Solventum on 503', tags: ['Solventum'], priority: 'high' })
  expect(ran.deny).toBeUndefined()

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const row = await ui.find({ type: 'Button', text: /retry Solventum on 503/ })
  expect(row?.text).toMatch(/▌/)
  await ui.press({ key: row!.key! })
  expect(await ui.find({ type: 'Text', text: /#solventum/ })).toBeDefined()
  await ui.unmount()
})

const NOW = 1_000_000_000_000
const DAY = 24 * 60 * 60 * 1000
const reminders = (toasts: string[]) => toasts.filter(t => t.includes('days ago'))
const repo = () => ({ head: 'aaa', log: '', judged: 'NONE', judgeCalls: 0 })

const shelf = (...ideas: [string, number, string?][]) => ({
  'project:/repo': ideas.map(([text, daysAgo, status = 'open'], n) => ({
    id: `id-${n}`,
    code: `I-000${n}`,
    text,
    branch: 'features/ideas',
    createdAt: NOW - daysAgo * DAY,
    status,
    priority: 2,
    tags: [],
  })),
})

test('a session reminds about open ideas on the branch older than the limit', async ($, on) => {
  const world_ = world(on, repo(), shelf(['old idea', 8], ['older idea', 20], ['fresh idea', 2], ['old but closed', 9, 'closed']))
  await world_.clock.set(NOW)
  await $.session.start(START)
  expect(reminders(world_.toasts)).toEqual([expect.stringMatching(/^💡 2 ideas parked 7\+ days ago on features\/ideas/)])

  await $.session.start(START)
  expect(reminders(world_.toasts)).toHaveLength(1)
})

test('the reminder waits a day after the last one', async ($, on) => {
  const remindedAt = (hoursAgo: number) => ({
    ...shelf(['old idea', 8]),
    'reminded:project:/repo|features/ideas': NOW - hoursAgo * 60 * 60 * 1000,
  })
  const world_ = world(on, repo(), remindedAt(5))
  await world_.clock.set(NOW)
  await $.session.start(START)
  expect(reminders(world_.toasts)).toHaveLength(0)
})

test('no reminder while every open idea is newer than the limit', async ($, on) => {
  const world_ = world(on, repo(), shelf(['fresh idea', 6]))
  await world_.clock.set(NOW)
  await $.session.start(START)
  expect(reminders(world_.toasts)).toHaveLength(0)
})

test('reminderDays 0 turns the reminder off', { options: { reminderDays: 0 } }, async ($, on) => {
  const world_ = world(on, repo(), shelf(['old idea', 30]))
  await world_.clock.set(NOW)
  await $.session.start(START)
  expect(reminders(world_.toasts)).toHaveLength(0)
})

test('a quick take can be folded to one line and opened again', async ($, on) => {
  world(on)
  on('model.fork', () => ({
    value: {
      isAnswered: true,
      text: 'Worth doing.\nStart from the grouper call.',
      usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
    },
  }))
  await $.session.start(START)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.input({ key: 'new', text: 'retry Solventum on 503' })
  await ui.press({ key: (await ui.find({ type: 'Button', text: /retry Solventum/ }))!.key! })
  await ui.press({ key: (await ui.find({ type: 'Button', text: /Quick take/ }))!.key! })
  expect(await ui.find({ type: 'Text', text: /Start from the grouper call/ })).toBeDefined()

  const fold = (await ui.find({ type: 'Button', text: /▾ ✻ Quick take/ }))!
  await ui.press({ key: fold.key! })
  expect(await ui.find({ type: 'Text', text: /Start from the grouper call/ })).toBeUndefined()
  expect((await ui.find({ type: 'Button', text: /▸ ✻ Quick take/ }))?.text).toMatch(/Worth doing\./)

  await ui.press({ key: fold.key! })
  expect(await ui.find({ type: 'Text', text: /Start from the grouper call/ })).toBeDefined()
  await ui.unmount()
})

test('nothing above the prompt while the shelf is not minimized', async ($, on) => {
  world(on)
  await $.session.start(START)

  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await band.findAll({ type: 'Button' })).toHaveLength(0)
  await band.unmount()
})

test('minimizing closes the shelf and leaves a chip that brings it back', async ($, on) => {
  const world_ = world(on)
  await $.session.start(START)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  await ui.press({ key: 'minimize' })
  await ui.unmount()
  expect(world_.closed).toEqual(['ideas'])

  const band = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await band.find({ key: 'restore-ideas' }))?.text).toContain('Ideas')
  await band.press({ key: 'restore-ideas' })
  await band.unmount()

  const again = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await again.findAll({ type: 'Button' })).toHaveLength(0)
  await again.unmount()
})
