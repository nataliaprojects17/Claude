import type { On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const TOOL = 'mcp__design-chooser__show_design_options'
const START = { cwd: '/repo', surface: 'terminal', isInteractive: true } as const
const page = (title: string) => `<!doctype html><html><body><h1>${title}</h1></body></html>`

// A page server that says it is ready, then prints whatever the test pushes.
function world(on: On) {
  const queue: (string | null)[] = []
  let wake: (() => void) | undefined
  const push = (line: object | null) => {
    queue.push(line === null ? null : JSON.stringify(line) + '\n')
    wake?.()
  }
  const spawned: string[][] = []
  const written: { path: string; text: string }[] = []
  const status: (string | undefined)[] = []
  let onSubmit: ((text: string) => void) | undefined
  const submitted = () => new Promise<string>(resolve => (onSubmit = resolve))

  mock.env(on, { TEMP: 'C:\\Temp' })
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('tool.register', ($, e) => ({ value: { tool: `mcp__design-chooser__${e.name}` } }))
  on('process.spawn', async function* ($, e) {
    spawned.push([...e.argv])
    yield { stream: 'stdout' as const, text: '{"type":"ready","url":"http://127.0.0.1:9/?key=k"}\n' }
    for (;;) {
      while (queue.length > 0) {
        const line = queue.shift()
        if (line === null || line === undefined) return { value: { code: 0, signal: null } }
        yield { stream: 'stdout' as const, text: line }
      }
      await new Promise<void>(resolve => (wake = resolve))
    }
  })
  on('fs.write', ($, e) => {
    written.push({ path: e.path, text: e.text })
    return { value: undefined }
  })
  on('ui.status', ($, e) => {
    status.push(e.text)
    return { value: undefined }
  })
  on('prompt.submit', ($, e) => {
    onSubmit?.(e.text)
    return { text: e.text }
  })
  return { push, spawned, written, status, submitted }
}

const three = {
  question: 'Which style for the landing page?',
  target: 'web',
  options: [
    { id: 'a', title: 'Minimal', html: page('A') },
    { id: 'b', title: 'Bold', html: page('B') },
    { id: 'c', title: 'Soft', html: page('C') },
  ],
}

test('a call starts the page server once, writes the round and tells Claude to wait', async ($, on) => {
  const w = world(on)
  await $.session.start(START)

  const first = await $.tool.call({ tool: TOOL, ...three })
  expect(first.deny).toBeUndefined()
  expect(String(first.result)).toMatch(/round 1/)
  expect(String(first.result)).toMatch(/End your turn/)
  expect(w.spawned).toHaveLength(1)
  expect(w.spawned[0]?.[1]).toMatch(/server\/server\.cjs$/)

  const screen = JSON.parse(w.written.at(-1)!.text)
  expect(w.written.at(-1)!.path).toMatch(/^C:[\\/]Temp[\\/]claude-design-chooser[\\/].+[\\/]screen\.json$/)
  expect(screen.round).toBe(1)
  expect(screen.options.map((o: { id: string }) => o.id)).toEqual(['a', 'b', 'c'])

  await $.tool.call({ tool: TOOL, ...three })
  expect(w.spawned).toHaveLength(1)
  expect(JSON.parse(w.written.at(-1)!.text).round).toBe(2)
  w.push(null)
})

test('an option without html keeps the one from the previous round, marked kept', async ($, on) => {
  const w = world(on)
  await $.session.start(START)
  await $.tool.call({ tool: TOOL, ...three })

  const next = await $.tool.call({
    tool: TOOL,
    ...three,
    options: [{ id: 'b', title: 'Bold' }, { id: 'd', title: 'Retro', html: page('D') }],
  })
  expect(next.deny).toBeUndefined()
  const screen = JSON.parse(w.written.at(-1)!.text)
  expect(screen.options).toEqual([
    { id: 'b', title: 'Bold', html: page('B'), kept: true },
    { id: 'd', title: 'Retro', html: page('D') },
  ])

  const unknown = await $.tool.call({ tool: TOOL, ...three, options: [{ id: 'z', title: 'Nothing' }] })
  expect(unknown.deny).toMatch(/option z has no html/)
  w.push(null)
})

test('choosing one with no comment answers Claude and clears the status', async ($, on) => {
  const w = world(on)
  await $.session.start(START)
  await $.tool.call({ tool: TOOL, ...three })

  const text = w.submitted()
  w.push({ type: 'act', round: 1, action: 'choose', picked: ['b'], comment: '' })
  expect(await text).toMatch(/I choose B \(Bold\)\. Go on with it\./)
  expect(w.status.at(-1)).toBeUndefined()
  w.push(null)
})

test('a comment, a mix or new ones ask Claude for another round', async ($, on) => {
  const w = world(on)
  await $.session.start(START)

  const cases = [
    [{ action: 'choose', picked: ['a'], comment: 'bigger headline' }, /I like A \(Minimal\), with this change: bigger headline[\s\S]*same id/],
    [{ action: 'mix', picked: ['a', 'c'], comment: '' }, /mix A \(Minimal\) and C \(Soft\)[\s\S]*combinations/],
    [{ action: 'more', picked: ['b'], comment: 'warmer' }, /keep B \(Bold\)[\s\S]*warmer[\s\S]*pass b again without html/],
    [{ action: 'more', picked: [], comment: '' }, /none of these[\s\S]*new directions/],
  ] as const
  for (const [act, expected] of cases) {
    await $.tool.call({ tool: TOOL, ...three })
    const round = JSON.parse(w.written.at(-1)!.text).round
    const text = w.submitted()
    w.push({ type: 'act', round, ...act })
    expect(await text).toMatch(expected)
    expect(w.status.at(-1)).toMatch(/drawing the next design round/)
  }
  w.push(null)
})

test('presses from an old round, or that break the rules, are ignored', async ($, on) => {
  const w = world(on)
  await $.session.start(START)
  await $.tool.call({ tool: TOOL, ...three })
  await $.tool.call({ tool: TOOL, ...three })

  const text = w.submitted()
  w.push({ type: 'act', round: 1, action: 'choose', picked: ['a'], comment: '' })
  w.push({ type: 'act', round: 2, action: 'mix', picked: ['a'], comment: '' })
  w.push({ type: 'act', round: 2, action: 'choose', picked: ['a', 'b'], comment: '' })
  w.push({ type: 'act', round: 2, action: 'choose', picked: ['c'], comment: '' })
  expect(await text).toMatch(/round 2 .*I choose C \(Soft\)/)
  w.push(null)
})

test('a broken call is refused with the reason', async ($, on) => {
  world(on)
  await $.session.start(START)
  expect((await $.tool.call({ tool: TOOL, question: 'Which?', target: 'web', options: [] })).deny).toMatch(/1 to 4/)
  expect((await $.tool.call({ tool: TOOL, target: 'web', options: three.options })).deny).toMatch(/question/)
})
