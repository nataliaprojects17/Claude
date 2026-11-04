import { atom, read, update } from 'claude-code'
import type { EngineInterface, PluginOptions, Register } from 'claude-code'

import type { Phase, Run, RunRecord, Task, View } from '../types'

const PANE = 'plan-progress'
const STORE_PREFIX = 'run:'
const STALE_MS = 24 * 60 * 60 * 1000
const GOAL_LIMIT = 160

const EMPTY_RUN: Run = {
  goal: null,
  phase: 'researching',
  tasks: [],
  startedAt: 0,
  finishedAt: null,
}

const run = atom({ plugin: 'plan-progress', key: 'run' } as const, EMPTY_RUN)
const view = atom({ plugin: 'plan-progress', key: 'view' } as const, 'current' as View)
const now = atom({ plugin: 'plan-progress', key: 'now' } as const, 0)
const others = atom({ plugin: 'plan-progress', key: 'others' } as const, [] as RunRecord[])
const minimized = atom({ plugin: 'plan-progress', key: 'minimized' } as const, false)

const PHASES: Record<Phase, { label: string; color: string }> = {
  researching: { label: 'researching', color: 'suggestion' },
  planning: { label: 'planning', color: 'planMode' },
  building: { label: 'building', color: 'claude' },
  testing: { label: 'testing', color: 'warning' },
  auditing: { label: 'auditing', color: 'permission' },
}

const READING = ['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch', 'ToolSearch', 'NotebookRead']
const WRITING = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit']
const PLANNING = ['EnterPlanMode', 'ExitPlanMode', 'ProposeGoal']
const WINDOWS_CHIME =
  "$p = Join-Path $env:WINDIR 'Media/Windows Notify System Generic.wav';" +
  " if (-not (Test-Path $p)) { $p = Join-Path $env:WINDIR 'Media/notify.wav' };" +
  ' if (Test-Path $p) { (New-Object Media.SoundPlayer $p).PlaySync() }' +
  ' else { [console]::beep(880, 120); [console]::beep(1320, 140) }'

const IS_TEST = /\b(tests?|spec|jest|vitest|pytest|mocha|rspec|phpunit|go test|cargo test|gradle test|dotnet test)\b/i
const IS_AUDIT = /review|audit|security|lint|verification/i

/** The phase a tool call puts the run in, or null when the call says nothing. */
function phaseFor(e: { tool: string } & Record<string, unknown>): Phase | null {
  const tool = String(e.tool)

  if (tool === 'Bash') {
    return IS_TEST.test(String(e.command ?? '')) ? 'testing' : null
  }
  if (tool === 'Skill' || tool === 'SlashCommand') {
    return IS_AUDIT.test(String(e.skill ?? e.command ?? '')) ? 'auditing' : null
  }
  if (tool === 'Agent') {
    const kind = String(e.subagent_type ?? '')
    if (kind === 'Plan') return 'planning'
    if (IS_AUDIT.test(kind)) return 'auditing'
    if (kind === 'Explore') return 'researching'

    return null
  }
  if (PLANNING.includes(tool)) return 'planning'
  if (WRITING.includes(tool)) return 'building'
  if (READING.includes(tool)) return 'researching'

  return null
}

/** Researching is the weak signal: it never pulls the run back out of a later phase. */
function nextPhase(current: Phase, seen: Phase): Phase {
  return seen === 'researching' ? current : seen
}

function counted(tasks: readonly Task[]): { done: number; total: number } {
  return { done: tasks.filter(one => one.status === 'completed').length, total: tasks.length }
}

function elapsed(ms: number): string {
  const all = Math.max(0, Math.floor(ms / 1000))
  const s = all % 60
  const m = Math.floor(all / 60) % 60
  const h = Math.floor(all / 3600)

  if (h > 0) return h + 'h ' + String(m).padStart(2, '0') + 'm ' + String(s).padStart(2, '0') + 's'
  if (m > 0) return m + 'm ' + String(s).padStart(2, '0') + 's'

  return s + 's'
}

function bar(done: number, total: number, width: number): string {
  const room = Math.max(4, width)
  const filled = total === 0 ? 0 : Math.round((done / total) * room)

  return '█'.repeat(filled) + '░'.repeat(room - filled)
}

function percent(done: number, total: number): number {
  return total === 0 ? 0 : Math.round((done / total) * 100)
}

function shorten(text: string, limit: number): string {
  const line = text.replace(/\s+/g, ' ').trim()

  return line.length <= limit ? line : line.slice(0, limit - 1) + '…'
}

function isMultiStep(state: Run): boolean {
  return state.tasks.length >= 2 || state.goal !== null
}

function mark(status: Task['status']): string {
  if (status === 'completed') return '✓'

  return status === 'in_progress' ? '▸' : '○'
}

let sessionId = ''
let ticker: { cancel: () => void } | null = null
let warmer: { cancel: () => void } | null = null
let lastTurnAt = 0

async function idOf($: EngineInterface): Promise<string> {
  if (sessionId === '') sessionId = await $.session.id()

  return sessionId
}

/** Writes this session's run to the shared store, so other sessions can list it. */
async function publish($: EngineInterface, state: Run): Promise<void> {
  if (state.startedAt === 0) return

  const counts = counted(state.tasks)
  const where = await $.session.cwd()
  const record: RunRecord = {
    id: await idOf($),
    label: where.split(/[\\/]/).filter(Boolean).pop() ?? 'session',
    goal: state.goal,
    phase: state.phase,
    done: counts.done,
    total: counts.total,
    startedAt: state.startedAt,
    updatedAt: await $.clock.now(),
    isDone: state.finishedAt !== null,
  }

  await $.store.set(STORE_PREFIX + record.id, record)
}

/** Every session's run but this one, the stale entries dropped as they are found. */
async function collect($: EngineInterface): Promise<RunRecord[]> {
  const mine = await idOf($)
  const cutoff = (await $.clock.now()) - STALE_MS
  const found: RunRecord[] = []

  for (const key of await $.store.keys()) {
    if (!key.startsWith(STORE_PREFIX)) continue
    const record = (await $.store.get(key)) as RunRecord | undefined
    if (record === undefined || record.updatedAt < cutoff) {
      await $.store.delete(key)
      continue
    }
    if (record.id !== mine) found.push(record)
  }

  return found.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 20)
}

async function chime($: EngineInterface): Promise<void> {
  try {
    if ((await $.env.get('OS')) === 'Windows_NT') {
      await $.process.run(
        [
          'powershell',
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          WINDOWS_CHIME,
        ],
        { timeoutMs: 8000 },
      )

      return
    }
    await $.audio.play({ asset: 'sounds/done.wav' })
  } catch (error) {
    $.ui.log('plan-progress: the chime did not play (' + String(error) + ')', { to: 'debug' })
  }
}

/** Un turno che abbiamo mandato noi: non apre un run e non muove il pannello. */
function isOurs(origin: { kind: string; name?: string } | undefined): boolean {
  return origin?.kind === 'plugin' && origin.name === 'plan-progress'
}

/** Manda un turno quando la sessione e' ferma da piu' dell'attesa, e mai mentre si lavora. */
function startWarmer($: EngineInterface, options: PluginOptions): void {
  if (warmer !== null || options.keepWarm !== true) return

  const minuti = Number(options.keepWarmMinutes)
  const attesa = Math.max(1, Number.isFinite(minuti) ? minuti : 55) * 60_000
  const testo = String(options.keepWarmText ?? '').trim()
  if (testo === '') return

  warmer = $.clock.every(60_000, async () => {
    const at = await $.clock.now()
    if (lastTurnAt === 0 || at - lastTurnAt < attesa) return

    lastTurnAt = at
    void $.prompt.submit({ text: testo })
  })
}

/** One write a second while a run is open: the clock the pane draws. */
function startTicker($: EngineInterface): void {
  if (ticker !== null) return
  ticker = $.clock.every(1000, async () => {
    const state = await read($, run)
    if (state.startedAt === 0 || state.finishedAt !== null) {
      ticker?.cancel()
      ticker = null

      return
    }
    const at = await $.clock.now()
    await update($, now, () => at)
  })
}

/** Via di mezzo, non via del tutto: la pane si chiude e sopra il prompt resta una pastiglia. */
async function minimize($: EngineInterface): Promise<void> {
  await update($, minimized, () => true)
  await $.ui.close({ id: PANE })
}

async function restore($: EngineInterface): Promise<void> {
  await update($, minimized, () => false)
  await $.ui.open({ id: PANE, title: 'Plan progress' })
}

async function showAll($: EngineInterface): Promise<void> {
  await update($, view, () => 'all' as View)
  const found = await collect($)
  await update($, others, () => found)
}

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    sessionId = ''
    lastTurnAt = await $.clock.now()
    startWarmer($, options)
    await $.command.register({
      name: 'plan-progress',
      description: 'Open the plan progress pane',
      argumentHint: '[all]',
    })

    return next(e)
  })

  on('command.run', { command: 'plan-progress' }, async ($, e) => {
    const wantsAll = e.args.trim().toLowerCase().startsWith('all')

    await update($, view, () => (wantsAll ? 'all' : 'current') as View)
    await restore($)
    if (wantsAll) await showAll($)

    return { text: wantsAll ? 'Plan progress: all tasks.' : 'Plan progress opened.' }
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.isMeta === true || isOurs(e.origin)) return next(e)

    const state = await read($, run)
    const at = await $.clock.now()
    const isOpen = state.startedAt !== 0 && state.finishedAt === null
    const typed =
      e.command === undefined
        ? shorten(e.text, GOAL_LIMIT)
        : e.command.name === 'goal' && e.command.args.trim() !== ''
          ? shorten(e.command.args, GOAL_LIMIT)
          : state.goal

    await update($, run, held =>
      isOpen
        ? { ...held, goal: held.goal ?? typed }
        : {
            goal: typed,
            phase: 'researching' as Phase,
            tasks: [] as Task[],
            startedAt: at,
            finishedAt: null,
          },
    )
    startTicker($)
    lastTurnAt = at
    if (!(await read($, minimized))) void $.ui.open({ id: PANE, title: 'Plan progress' })

    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', async ($, e, next) => {
    const call = e as unknown as { tool: string } & Record<string, unknown>
    const seen = phaseFor(call)

    if (call.tool === 'ProposeGoal') {
      const condition = shorten(String(call.condition ?? ''), GOAL_LIMIT)
      if (condition !== '') await update($, run, held => ({ ...held, goal: condition }))
    }

    if (call.tool === 'TodoWrite') {
      const at = await $.clock.now()
      const tasks = ((call.todos as Task[] | undefined) ?? []).map(one => ({
        content: one.content,
        status: one.status,
      }))
      const after = await update($, run, held => ({
        ...held,
        tasks,
        startedAt: held.startedAt === 0 ? at : held.startedAt,
        finishedAt: null,
      }))

      startTicker($)
      const giu = await read($, minimized)
      if (isMultiStep(after) && !giu) void $.ui.open({ id: PANE, title: 'Plan progress' })
      await publish($, after)
    }

    if (seen !== null) {
      await update($, run, held => ({ ...held, phase: nextPhase(held.phase, seen) }))
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)

    const state = await read($, run)
    const at = await $.clock.now()
    const counts = counted(state.tasks)
    const isOver = state.startedAt !== 0 && counts.done === counts.total
    const after = isOver
      ? await update($, run, held => ({ ...held, finishedAt: at }))
      : state

    lastTurnAt = at
    await publish($, after)
    if ((await read($, view)) === 'all') {
      const found = await collect($)
      await update($, others, () => found)
    }
    void chime($)

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const sotto = await next(e)
    if (!(await read($, minimized)) || e.props.hasSurvey) return sotto

    const { Box, Button, Text } = $.ui.resolve(e)
    const state = await read($, run)
    const counts = counted(state.tasks)

    return (
      <Box flexDirection="column">
        <Box paddingX={1}>
          <Button key="restore-plan" onPress={() => void restore($)}>
            <Text color="ide">{'[_] Plan progress'}</Text>
            {state.startedAt !== 0 && (
              <Text dimColor>
                {'  '}
                {state.finishedAt === null ? PHASES[state.phase].label : 'finished'}
                {counts.total === 0 ? '' : '  ' + percent(counts.done, counts.total) + '%'}
              </Text>
            )}
          </Button>
        </Box>
        {sotto}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const which = await read($, view)
    const width = Math.max(20, e.props.bodyColumns)
    const giu = (
      <Box>
        <Button key="minimize" hotkey="m" onPress={() => void minimize($)}>
          <Text dimColor>_</Text>
        </Button>
      </Box>
    )

    if (which === 'all') {
      const list = await read($, others)

      return (
        <Box flexDirection="column">
          {giu}
          <Box>
            <Button
              key="current"
              plain
              dimColor
              onPress={() => update($, view, () => 'current' as View)}
            >
              Current
            </Button>
            <Text dimColor> | </Text>
            <Text bold>All tasks</Text>
          </Box>
          <Box marginTop={1} flexDirection="column">
            {list.length === 0 && <Text dimColor>No other session is running a goal.</Text>}
            {list.map(one => (
              <Box key={one.id} flexDirection="column" marginBottom={1}>
                <Text wrap="truncate-end">
                  <Text color={PHASES[one.phase].color}>{'●'}</Text>
                  <Text bold>{' ' + one.label + ' '}</Text>
                  <Text dimColor>{one.isDone ? 'finished' : PHASES[one.phase].label}</Text>
                </Text>
                <Text dimColor wrap="truncate-end">
                  {one.goal ?? 'no goal'}
                </Text>
                <Text dimColor tabular>
                  {bar(one.done, one.total, Math.max(8, width - 22)) +
                    ' ' +
                    percent(one.done, one.total) +
                    '% ' +
                    elapsed(one.updatedAt - one.startedAt)}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
      )
    }

    const state = await read($, run)

    if (state.startedAt === 0) {
      return (
        <Box flexDirection="column">
          {giu}
          <Text dimColor>Nothing running yet.</Text>
          <Box marginTop={1}>
            <Button key="all" plain dimColor onPress={() => showAll($)}>
              All tasks
            </Button>
          </Box>
        </Box>
      )
    }

    const ticked = await read($, now)
    const counts = counted(state.tasks)
    const since = (state.finishedAt ?? Math.max(ticked, state.startedAt)) - state.startedAt
    const phase = PHASES[state.phase]
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 11)
    const shown = state.tasks.slice(0, room)

    return (
      <Box flexDirection="column">
        {giu}
        <Text wrap="wrap">{state.goal ?? 'No goal set.'}</Text>
        <Box marginTop={1}>
          <Text color={phase.color}>{'●'}</Text>
          <Text>{' ' + (state.finishedAt === null ? phase.label : 'finished')}</Text>
          <Text dimColor tabular>{'   ' + elapsed(since)}</Text>
        </Box>
        <Box marginTop={1} flexDirection="column">
          {shown.length === 0 && <Text dimColor>No checklist yet.</Text>}
          {shown.map((task, index) => (
            <Text
              key={String(index)}
              dimColor={task.status === 'completed'}
              bold={task.status === 'in_progress'}
              wrap="truncate-end"
            >
              {mark(task.status) + ' ' + task.content}
            </Text>
          ))}
          {state.tasks.length > shown.length && (
            <Text dimColor>{state.tasks.length - shown.length + ' more'}</Text>
          )}
        </Box>
        <Box marginTop={1}>
          <Text tabular>
            {bar(counts.done, counts.total, Math.max(8, width - 6)) +
              ' ' +
              String(percent(counts.done, counts.total)).padStart(3) +
              '%'}
          </Text>
        </Box>
        <Box marginTop={1}>
          <Button key="all" plain dimColor onPress={() => showAll($)}>
            All tasks
          </Button>
          <Text dimColor>{'   ' + counts.done + '/' + counts.total + ' done'}</Text>
        </Box>
      </Box>
    )
  })
}
