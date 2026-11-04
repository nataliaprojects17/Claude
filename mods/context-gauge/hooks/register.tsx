import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Gauge, Handoff } from '../types'

const WATCH = 70
const WARN = 85
const DEFAULT_THRESHOLD = 80
const STORE_KEY = 'threshold'
const RETRY_MS = 120000
const FRESH_MS = 300000

const gauge = atom({ plugin: 'context-gauge', key: 'gauge' } as const, null)
const isHidden = atom({ plugin: 'context-gauge', key: 'isHidden' } as const, false)
const threshold = atom({ plugin: 'context-gauge', key: 'threshold' } as const, DEFAULT_THRESHOLD)
const note = atom({ plugin: 'context-gauge', key: 'note' } as const, null)
const handoff = atom({ plugin: 'context-gauge', key: 'handoff' } as const, null)
const isBusy = atom({ plugin: 'context-gauge', key: 'isBusy' } as const, false)
const armedAt = atom({ plugin: 'context-gauge', key: 'armedAt' } as const, 0)
const isSeeded = atom({ plugin: 'context-gauge', key: 'isSeeded' } as const, false)

const ASK = [
  'Write a handoff for the next session, which starts knowing none of this conversation.',
  'Markdown, under 400 lines. Drop any heading you have nothing to put under.',
  'Open with one `# ` line naming the work in a few words, then the headings below,',
  'and write nothing else before it.',
  '',
  '## Goal',
  'What we are solving here, and why.',
  '',
  '## Where we are',
  'The state as it stands, around twenty bullets.',
  'Say of each whether it was verified or is only assumed.',
  '',
  '## What we tried',
  'Every approach in the order it was taken, the ones that failed included,',
  'each with what went wrong, so none of them is tried again.',
  '',
  '## Decisions',
  'What was chosen and what was rejected, the reason for both, so neither is reopened.',
  '',
  '## Evidence',
  'The numbers, errors and output as they actually read. Quote them, do not summarise them.',
  '',
  '## What the person asked for',
  'Their corrections, preferences and constraints, in their own words.',
  '',
  '## Files',
  'The paths that matter, one line each on what they hold.',
  '',
  '## Quick start',
  'The exact commands that get the work running again, ready to paste.',
  '',
  '## Next',
  'The steps you would take now, in order.',
  '',
  'Write only what this conversation says. Do not guess at the rest.',
].join('\n')

const day = (ms: number) => {
  const two = (n: number) => String(n).padStart(2, '0')
  const d = new Date(ms)

  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`
}

const slug = (text: string) => {
  const title = text.split('\n').find(one => one.startsWith('# ')) ?? ''
  const words = title
    .replace(/^#\s*/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .split('-')
    .filter(one => one !== '')
    .slice(0, 5)

  return words.length === 0 ? 'session' : words.join('-')
}

const repoState = async ($: EngineInterface) => {
  const ask = async (argv: readonly string[]) => {
    try {
      const ran = await $.process.run(argv, { timeoutMs: 10000 })

      return ran.exitCode === 0 ? ran.stdout.trim() : ''
    } catch {
      return ''
    }
  }

  const [branch, log, tree, diff] = await Promise.all([
    ask(['git', 'rev-parse', '--abbrev-ref', 'HEAD']),
    ask(['git', 'log', '--oneline', '-15']),
    ask(['git', 'status', '--short']),
    ask(['git', 'diff', '--stat', 'HEAD']),
  ])

  const parts = [
    branch === '' ? '' : `branch: ${branch}`,
    log === '' ? '' : `last commits:\n${log}`,
    tree === '' ? '' : `working tree:\n${tree}`,
    diff === '' ? '' : `uncommitted, by file:\n${diff}`,
  ].filter(one => one !== '')

  return parts.join('\n\n')
}

const earlier = async ($: EngineInterface, dir: string) => {
  try {
    const held = await $.fs.list(dir)
    const seqs = held
      .map(one => Number(/^HANDOFF_(\d+)_/.exec(one.name)?.[1]))
      .filter(one => Number.isFinite(one))
    const last = [...held].map(one => one.name).sort().at(-1)

    return { seq: seqs.length === 0 ? 1 : Math.max(...seqs) + 1, last }
  } catch {
    return { seq: 1, last: undefined }
  }
}

const writeHandoff = async ($: EngineInterface): Promise<Handoff | null> => {
  await update($, isBusy, () => true)
  await update($, note, () => 'writing the handoff, this takes a moment')
  try {
    const root = await $.session.root()
    const sep = root.includes('\\') ? '\\' : '/'
    const dir = [root.replace(/[\\/]$/, ''), '.claude', 'handoffs'].join(sep)
    const [state, chain] = await Promise.all([repoState($), earlier($, dir)])

    const asked = [
      ASK,
      state === ''
        ? ''
        : 'The repository as it stands, read from disk just now. Use it for Files and\n'
          + 'Quick start, and say where it disagrees with the conversation:\n\n'
          + state,
      chain.last === undefined
        ? ''
        : `The previous handoff in that folder is ${chain.last}. This one carries on `
          + 'from it: point back to it rather than repeating what it already says.',
    ]
      .filter(one => one !== '')
      .join('\n\n')

    const reply = await $.model.fork({ prompt: asked })
    if (!reply.isAnswered) {
      const why =
        reply.reason === 'nothing-to-fork'
          ? 'nothing to hand off yet'
          : `the handoff failed (${reply.reason})`
      await update($, note, () => why)

      return null
    }

    const text = reply.text.trim()
    const at = await $.clock.now()
    const seq = String(chain.seq).padStart(3, '0')
    const path = [dir, `HANDOFF_${seq}_${slug(text)}_${day(at)}.md`].join(sep)
    await $.fs.write(path, `${text}\n`)

    if (!(await $.fs.exists(path))) {
      await update($, note, () => `nothing landed at ${path}`)

      return null
    }

    const headings = (text.match(/^## /gm) ?? []).length
    const isThin = headings < 4 || text.length < 600
    const made: Handoff = { path, at }
    await update($, handoff, () => made)
    await update($, note, () =>
      isThin ? 'handoff saved, but it came out thin' : 'handoff saved',
    )

    return made
  } catch (cause) {
    await update($, note, () => `the handoff failed: ${String(cause)}`)

    return null
  } finally {
    await update($, isBusy, () => false)
  }
}

const runClear = async ($: EngineInterface) => {
  await update($, gauge, () => null)
  await update($, armedAt, () => 0)
  try {
    await $.command.run({ command: 'clear' })

    return true
  } catch {
    await $.prompt.fill({ text: '/clear' })
    $.ui.toast('Press Enter to clear.')

    return false
  }
}

const limitOf = async ($: EngineInterface) => {
  if (await read($, isSeeded)) return read($, threshold)

  const stored = Number(await $.store.get(STORE_KEY))
  const limit = Number.isFinite(stored) && stored >= 0 ? stored : DEFAULT_THRESHOLD
  await update($, threshold, () => limit)
  await update($, isSeeded, () => true)

  return limit
}

const freshWithHandoff = async ($: EngineInterface) => {
  const held = await read($, handoff)
  const isFresh = held !== null && (await $.clock.now()) - held.at < FRESH_MS
  const made = isFresh ? held : await writeHandoff($)
  if (made === null) return

  const cleared = await runClear($)
  if (!cleared) return

  await update($, handoff, () => null)
  await update($, note, () => null)
  await $.prompt.fill({
    text:
      `Read ${made.path} — the handoff from the session I just closed — ` +
      'and pick up from the steps it lists under Next.',
  })
}

const freshAlone = async ($: EngineInterface) => {
  await update($, note, () => null)
  await update($, handoff, () => null)
  await runClear($)
}

export const register: Register = on => {
  let triedAt = 0

  on('session.start', async ($, e, next) => {
    await update($, isSeeded, () => false)

    if (await read($, isBusy)) {
      await update($, isBusy, () => false)
      await update($, note, () => 'the handoff was cut short by a reload')
    }

    await $.command.register({
      name: 'autohandoff',
      description: 'Set the context percentage at which a handoff is written for you.',
      argumentHint: '[percent|off]',
    })
    await $.command.register({
      name: 'handoff',
      description: 'Write a handoff of this session; "now" also clears into a fresh one.',
      argumentHint: '[now]',
    })

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    const { percent, tokens, window } = e.context
    if (percent === undefined || tokens === undefined) return next(e)

    const live: Gauge = { percent, tokens, window }
    await update($, gauge, () => live)

    const limit = await limitOf($)
    const armed = await read($, armedAt)
    const since = (await $.clock.now()) - triedAt
    const isPast = limit > 0 && percent >= limit
    if (isPast && percent >= armed + 10 && since > RETRY_MS) {
      triedAt = await $.clock.now()
      $.ui.toast(`Context at ${percent}% — writing a handoff.`)
      void $.clock.after(0, () => {
        void writeHandoff($)
          .then(made => (made === null ? undefined : update($, armedAt, () => percent)))
          .catch(() => undefined)
      })
    }

    return next(e)
  })

  on('command.run', { command: 'autohandoff' }, async ($, e) => {
    const said = e.args.trim().toLowerCase()

    if (said === '') {
      const limit = await limitOf($)

      return {
        text:
          limit > 0
            ? `A handoff is written for you once the context passes ${limit}%.`
            : 'Automatic handoff is off.',
      }
    }

    if (said === 'off' || said === '0') {
      await update($, threshold, () => 0)
      await update($, isSeeded, () => true)
      await $.store.set(STORE_KEY, 0)

      return { text: 'Automatic handoff is off.' }
    }

    const wanted = Number.parseInt(said.replace('%', ''), 10)
    if (!Number.isFinite(wanted) || wanted < 10 || wanted > 99) {
      return { text: 'Give a percentage between 10 and 99, or "off".' }
    }

    await update($, threshold, () => wanted)
    await update($, isSeeded, () => true)
    await update($, armedAt, () => 0)
    await $.store.set(STORE_KEY, wanted)

    return { text: `A handoff will be written once the context passes ${wanted}%.` }
  })

  on('command.run', { command: 'handoff' }, async ($, e) => {
    const made = await writeHandoff($)
    if (made === null) {
      return { text: (await read($, note)) ?? 'No handoff was written.' }
    }

    if (e.args.trim().toLowerCase() === 'now') {
      void $.clock.after(50, () => void freshWithHandoff($))

      return { text: `Handoff written to ${made.path}. Clearing into a fresh session.` }
    }

    return { text: `Handoff written to ${made.path}.` }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const rest = await next(e)
    if (e.props.hasSurvey || (await read($, isHidden))) return rest

    const shown = await read($, gauge)
    const line = await read($, note)
    const percent = shown?.percent ?? 0
    const caution =
      percent >= WARN
        ? 'long context — answers drift and detail gets dropped'
        : percent >= WATCH
          ? 'getting long — quality starts to slip around here'
          : null
    if (caution === null && line === null) return rest

    const { Box, Button, Text } = $.ui.resolve(e)
    const busy = await read($, isBusy)
    const level = percent >= WARN ? 'error' : 'warning'

    return (
      <Box flexDirection="column">
        <Box>
          {caution !== null && (
            <Text color={level} bold>
              {caution}{' '}
            </Text>
          )}
          {line !== null && (
            <Text dimColor>
              {caution === null ? '' : '· '}
              {line}{' '}
            </Text>
          )}
          {busy && <Text dimColor>· working </Text>}
          <Button key="handoff" onPress={() => void freshWithHandoff($)}>
            <Text color="success">💾 Save &amp; start new</Text>
          </Button>
          <Button key="fresh" onPress={() => void freshAlone($)}>
            <Text color="error">❌ Drop &amp; start new</Text>
          </Button>
          <Button key="hide" dimColor onPress={() => update($, isHidden, () => true)}>
            ✕ Hide
          </Button>
        </Box>
        {rest}
      </Box>
    )
  })
}
