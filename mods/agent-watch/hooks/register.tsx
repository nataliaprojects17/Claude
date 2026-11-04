import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { AgentRow } from '../types'

const PANE = 'agent-watch'

const rows = atom({ plugin: 'agent-watch', key: 'rows' } as const, [] as AgentRow[])
const open = atom({ plugin: 'agent-watch', key: 'open' } as const, [] as string[])
const window_ = atom({ plugin: 'agent-watch', key: 'window' } as const, 0)
const cleared = atom({ plugin: 'agent-watch', key: 'cleared' } as const, [] as string[])
const tab = atom({ plugin: 'agent-watch', key: 'tab' } as const, 'attivi')
const spent = atom({ plugin: 'agent-watch', key: 'spent' } as const, 0)
const minimized = atom({ plugin: 'agent-watch', key: 'minimized' } as const, false)

const LIMIT = 60
const TRAIL = 12
const ACCENTS = ['red', 'green', 'blue', 'magenta', 'cyan', 'yellow']

let tick: { cancel: () => void } | undefined
let isReady = false
let isSeated = false

const blank = (id: string, now: number): AgentRow => ({
  id,
  type: 'agent',
  description: '',
  startedAt: now,
  status: 'running',
  steps: 0,
  toolCalls: 0,
  trail: [],
  contextTokens: 0,
  totalTokens: 0,
  outputTokens: 0,
})

const sound = (one: AgentRow): AgentRow => ({
  ...one,
  trail: Array.isArray(one.trail) ? one.trail : [],
  steps: one.steps ?? 0,
  toolCalls: one.toolCalls ?? 0,
  contextTokens: one.contextTokens ?? 0,
  totalTokens: one.totalTokens ?? 0,
  outputTokens: one.outputTokens ?? 0,
  description: one.description ?? '',
  type: one.type ?? 'agent',
})

const touch = async ($: EngineInterface, id: string, fn: (row: AgentRow) => AgentRow) => {
  const now = await $.clock.now()
  await update($, rows, list => {
    const seen = list.some(one => one.id === id)
    const all = seen ? list : [...list, blank(id, now)]

    return all.map(one => (one.id === id ? fn(sound(one)) : one)).slice(-LIMIT)
  })
}

const VERBS: Record<string, [string, string]> = {
  Read: ['Reading', 'Read'],
  Write: ['Writing', 'Wrote'],
  Edit: ['Editing', 'Edited'],
  NotebookEdit: ['Editing', 'Edited'],
  Bash: ['Running', 'Ran'],
  PowerShell: ['Running', 'Ran'],
  Grep: ['Searching', 'Searched'],
  Glob: ['Looking for', 'Found'],
  WebFetch: ['Fetching', 'Fetched'],
  WebSearch: ['Searching', 'Searched'],
  Agent: ['Spawning', 'Spawned'],
  Skill: ['Using', 'Used'],
}

const subject = (args: Record<string, unknown>): string | undefined => {
  for (const key of ['file_path', 'path', 'notebook_path']) {
    const found = args[key]
    if (typeof found === 'string' && found.length > 0) {
      return found.split(/[\\/]/).filter(Boolean).slice(-2).join('/')
    }
  }
  for (const key of ['command', 'pattern', 'query', 'url', 'description', 'skill', 'prompt']) {
    const found = args[key]
    if (typeof found === 'string' && found.length > 0) return found.split('\n')[0] ?? found
  }

  return undefined
}

const phrase = (tool: string, args: Record<string, unknown>, isDone: boolean) => {
  const short = tool.startsWith('mcp__') ? (tool.split('__').pop() ?? tool) : tool
  const pair = VERBS[tool]
  const verb = pair ? (isDone ? pair[1] : pair[0]) : short
  const what = subject(args)

  return what ? `${verb} ${what}` : verb
}

const progressOf = (args: Record<string, unknown>) => {
  const done = args.done
  const total = args.total
  if (typeof done !== 'number') return undefined

  return {
    done,
    total: typeof total === 'number' ? total : undefined,
    note: typeof args.note === 'string' ? args.note : undefined,
  }
}

const cut = (text: string, room: number) =>
  text.length <= room ? text : `${text.slice(0, Math.max(1, room - 1))}…`

const clock = (ms: number) => {
  const whole = Math.max(0, Math.round(ms / 1000))
  const hours = Math.floor(whole / 3600)
  const minutes = Math.floor((whole % 3600) / 60)
  const seconds = String(whole % 60).padStart(2, '0')
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`

  return `${minutes}:${seconds}`
}

const tokens = (count: number) => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${Math.round(count / 1000)}k`

  return String(count)
}

const modelName = (id: string | undefined) => {
  if (!id) return 'modello ignoto'
  const parts = id.replace(/^claude-/, '').split('-')
  const head = parts[0] ?? id
  const rest = parts.slice(1).filter(one => /^\d+$/.test(one))
  const family = head.charAt(0).toUpperCase() + head.slice(1)

  return rest.length > 0 ? `${family} ${rest.join('.')}` : family
}

const isOver = (status: string) =>
  status === 'completed' || status === 'failed' || status === 'killed'

const mark = (status: string) => {
  if (status === 'completed') return '✓'
  if (status === 'failed') return '✗'
  if (status === 'killed') return '⊘'
  if (status === 'pending') return '◌'
  if (status === 'waiting' || status === 'idle') return '◐'

  return '●'
}

const word = (status: string) => {
  if (status === 'completed') return 'Fatto'
  if (status === 'failed') return 'Fallito'
  if (status === 'killed') return 'Interrotto'
  if (status === 'pending') return 'In coda'
  if (status === 'waiting' || status === 'idle') return 'In attesa'

  return 'In corso'
}

const colour = (status: string) => {
  if (status === 'completed') return 'success'
  if (status === 'failed' || status === 'killed') return 'error'
  if (status === 'waiting' || status === 'idle' || status === 'pending') return 'warning'

  return 'claude'
}

const seat = async ($: EngineInterface) => {
  if (isSeated) return

  const already = await $.ui.panes().catch(() => [])
  if (already.some(one => one.id === PANE && one.isPlaced)) {
    isSeated = true

    return
  }

  const opened = await $.ui.open({ id: PANE, title: 'Subagents' })
  if (opened.isPlaced) isSeated = true
}

// Da parte, non via: il pane si chiude e lascia un segno sopra il prompt. Le righe
// stanno negli atom, quindi torna come l'avevi lasciato.
const riduci = async ($: EngineInterface) => {
  await update($, minimized, () => true)
  await $.ui.close({ id: PANE })
}

// Il pane torna su da solo quando c'e di nuovo qualcosa da guardare, anche se
// era stato ridotto o chiuso.
const mostra = async ($: EngineInterface) => {
  const already = await $.ui.panes().catch(() => [])
  if (!already.some(one => one.id === PANE && one.isPlaced)) {
    const opened = await $.ui.open({ id: PANE, title: 'Subagents' })
    if (opened.isPlaced) isSeated = true
  }
  await update($, minimized, () => false)
}

const ready = async ($: EngineInterface) => {
  if (!isReady) {
    isReady = true

    await $.command.register({
      name: 'agent-watch',
      description: 'Show the subagents of this session in a pane',
    })

    const usage = await $.session.usage().catch(() => undefined)
    const limit = usage?.context.window ?? 0
    if (limit > 0) await update($, window_, () => limit)

    tick?.cancel()
    tick = $.clock.every(1000, () => {
      void read($, rows).then(list => {
        if (list.some(one => !isOver(one.status))) $.ui.invalidate('ui.render')
      })
    })
  }

  await seat($)
  $.ui.invalidate('ui.render')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await ready($)

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    await ready($)

    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const sotto = await next(e)
    const giu = await read($, minimized)
    if (!giu) return sotto

    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        <Box paddingX={1}>
          <Button key="restore-subagents" onPress={() => void mostra($)}>
            <Text color="claude">[_] Subagents</Text>
          </Button>
        </Box>
        {sotto}
      </Box>
    )
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'agent-watch' }, async $ => {
    const opened = await $.ui.open({ id: PANE, title: 'Subagents' })
    if (opened.isPlaced) isSeated = true
    await update($, minimized, () => false)

    return {
      text: opened.isPlaced
        ? 'Subagents pane opened.'
        : `Subagents pane is waiting: ${opened.reason}`,
    }
  })

  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    if (!started.agentId) return started

    const now = await $.clock.now()
    const id = started.agentId
    await update($, rows, list =>
      [
        ...list.filter(one => one.id !== id),
        {
          ...blank(id, now),
          type: e.subagentType,
          description: e.description ?? '',
          parentId: e.parentAgentId,
          model: started.model ?? e.model,
          status: 'running',
        },
      ].slice(-LIMIT),
    )
    await mostra($)

    return started
  }).catch(($, e, next) => next(e))

  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined) return yield* next(e)

    const id = e.agentId
    await touch($, id, one => ({
      ...one,
      model: e.model,
      effort: e.effort === undefined ? one.effort : String(e.effort),
      steps: one.steps + 1,
      status: 'running',
    }))

    const answered = yield* next(e)
    const used = answered.usage
    if (used) {
      const context =
        used.input_tokens + used.cache_read_input_tokens + used.cache_creation_input_tokens
      await touch($, id, one => ({
        ...one,
        model: used.model,
        contextTokens: context,
        totalTokens: one.totalTokens + context + used.output_tokens,
        outputTokens: one.outputTokens + used.output_tokens,
      }))
      await update($, spent, sum => sum + context + used.output_tokens)
    }

    return answered
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) return next(e)

    const now = await $.clock.now()
    await touch($, e.agentId, one => ({
      ...one,
      endedAt: now,
      runningTool: undefined,
      status: e.isAborted ? 'killed' : e.reason === 'answer' ? 'completed' : 'failed',
    }))

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    if (e.agentId === undefined) return next(e)

    const id = e.agentId
    const args = e as unknown as Record<string, unknown>
    const step = e.tool.includes('savvy-progress') ? progressOf(args) : undefined

    await touch($, id, one => ({
      ...one,
      toolCalls: one.toolCalls + 1,
      runningTool: e.tool,
      trail: [...one.trail, phrase(e.tool, args, false)].slice(-TRAIL),
      progress: step ?? one.progress,
      status: 'running',
    }))

    const ran = await next(e)
    await touch($, id, one => ({
      ...one,
      runningTool: one.runningTool === e.tool ? undefined : one.runningTool,
      trail: [...one.trail.slice(0, -1), phrase(e.tool, args, true)],
    }))

    return ran
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const room = Math.max(24, e.props.bodyColumns)
    const list = (await read($, rows)).map(sound)
    const shown = await read($, open)
    const limit = await read($, window_)
    const hidden = await read($, cleared)
    const page = await read($, tab)
    const spend = await read($, spent)
    const live = await $.agent.list().catch(() => [])
    const now = await $.clock.now()

    const gone = new Set(hidden)
    const known = new Set(list.map(one => one.id))
    const all: AgentRow[] = [
      ...list.map(one => {
        const found = live.find(other => other.id === one.id)
        if (!found) return one

        return {
          ...one,
          status: found.status,
          type: found.type || one.type,
          description: found.description || one.description,
          name: found.name,
          endedAt: isOver(found.status) ? (one.endedAt ?? now) : undefined,
        }
      }),
      ...live
        .filter(one => !known.has(one.id))
        .map(one => ({
          ...blank(one.id, now),
          type: one.type,
          description: one.description,
          name: one.name,
          parentId: one.parentId,
          status: one.status,
        })),
    ].filter(one => !gone.has(one.id))

    const active = all.filter(one => !isOver(one.status))
    const over = all.filter(one => isOver(one.status))

    // Un pannello senza subagent non ha niente da dire. La chiusura aspetta la
    // fine del disegno: una ui.close mentre il disegno gira non e sua da fare.
    if (active.length === 0 && over.length === 0) {
      $.clock.after(0, () => void $.ui.close({ id: PANE }))
    }
    const elapsedAll = all.reduce((sum, one) => sum + ((one.endedAt ?? now) - one.startedAt), 0)

    const toggle = (id: string) =>
      update($, open, ids => (ids.includes(id) ? ids.filter(one => one !== id) : [...ids, id]))

    const tile = (head: string, value: string) => (
      <Box
        flexDirection="column"
        key={head}
        borderStyle="round"
        borderDimColor
        paddingX={1}
        flexGrow={1}
      >
        <Text dimColor>{head}</Text>
        <Text bold>{value}</Text>
      </Box>
    )

    const totals: ReadonlyArray<readonly [string, string]> = [
      ['Token agenti', tokens(spend)],
      ['Tempo totale', clock(elapsedAll)],
    ]

    const show = page === 'finiti' ? over : active
    const pick = (which: string) => update($, tab, () => which)
    const wipe = async () => {
      await update($, cleared, ids => [...new Set([...ids, ...over.map(one => one.id)])].slice(-200))
      if (active.length === 0) await $.ui.close({ id: PANE })
    }

    const leaf = (which: string, text: string) => (
      <Button key={`tab-${which}`} plain onPress={() => pick(which)}>
        <Text
          bold={page === which}
          dimColor={page !== which}
          backgroundColor={page === which ? (which === 'finiti' ? 'warning' : 'claude') : undefined}
          color={page === which ? 'inverseText' : undefined}
        >
          {` ${text} `}
        </Text>
      </Button>
    )

    const card = (one: AgentRow, index: number) => {
      const accent = ACCENTS[index % ACCENTS.length] ?? 'cyan'
      const isOpen = shown.includes(one.id)
      const elapsed = clock((one.endedAt ?? now) - one.startedAt)
      const title = one.name ?? (one.description || one.type)
      const right = `${tokens(one.totalTokens)} tok · ${elapsed}`
      const percent =
        limit > 0 && one.contextTokens > 0
          ? `${Math.round((one.contextTokens / limit) * 100)}%`
          : '—'
      const doing = one.trail.slice(isOpen ? -TRAIL : -2)
      const rule = '─'.repeat(Math.max(4, room - 2))

      return (
        <Box flexDirection="column" key={one.id}>
          <Box flexDirection="row">
            <Text color={accent}>{'▌ '}</Text>
            <Button key={`row-${one.id}`} plain onPress={() => toggle(one.id)}>
              <Text bold>{cut(title, Math.max(8, room - 12))}</Text>
              <Text dimColor>{isOpen ? ' ▾' : ' ▸'}</Text>
            </Button>
            <Box flexGrow={1} />
            <Text color={colour(one.status)}>{mark(one.status)}</Text>
          </Box>

          <Box flexDirection="row">
            <Text color={accent}>{'▌ '}</Text>
            <Text dimColor>
              {cut(
                `${one.type} · ${modelName(one.model)}${one.effort ? ` · ${one.effort}` : ''}`,
                Math.max(8, room - right.length - 5),
              )}
            </Text>
            <Box flexGrow={1} />
            <Text dimColor>{right}</Text>
          </Box>

          <Box flexDirection="row">
            <Text color={accent}>{'▌ '}</Text>
            <Text color={colour(one.status)} bold>
              {`${word(one.status)} · ${one.steps} step`}
            </Text>
            {one.progress !== undefined && (
              <Text dimColor>{` · ${one.progress.done}/${one.progress.total ?? '?'}`}</Text>
            )}
          </Box>

          {doing.map((line, at) => (
            <Box flexDirection="row" key={`${one.id}-trail-${at}`}>
              <Text color={accent}>{'▌ '}</Text>
              <Text>{cut(line, Math.max(8, room - 4))}</Text>
            </Box>
          ))}

          {isOpen && (
            <Box flexDirection="column">
              <Box flexDirection="row">
                <Text color={accent}>{'▌ '}</Text>
                <Text dimColor>
                  {cut(
                    `contesto ${tokens(one.contextTokens)} (${percent}) · ${one.toolCalls} tool`,
                    Math.max(8, room - 4),
                  )}
                </Text>
              </Box>
              {one.description.length > 0 && (
                <Box flexDirection="row">
                  <Text color={accent}>{'▌ '}</Text>
                  <Text dimColor>{cut(one.description, Math.max(8, room - 4))}</Text>
                </Box>
              )}
            </Box>
          )}

          <Text color={accent}>{`  ${rule}`}</Text>
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        <Box>
          <Button key="minimize" hotkey="m" onPress={() => void riduci($)}>
            <Text dimColor>_</Text>
          </Button>
        </Box>
        {room >= 36 ? (
          <Box flexDirection="row" gap={1}>
            {totals.map(([head, value]) => tile(head, value))}
          </Box>
        ) : (
          <Text dimColor>{totals.map(([head, value]) => `${head} ${value}`).join(' · ')}</Text>
        )}

        <Box flexDirection="row" gap={1}>
          {leaf('attivi', `Attivi · ${active.length}`)}
          {leaf('finiti', `Finiti · ${over.length}`)}
          <Box flexGrow={1} />
          {page === 'finiti' && over.length > 0 && (
            <Button key="wipe" plain onPress={wipe}>
              <Text dimColor>{'[ svuota ]'}</Text>
            </Button>
          )}
        </Box>

        {show.length === 0 && (
          <Text dimColor>
            {page === 'finiti' ? 'Nessun subagent finito.' : 'Nessun subagent attivo.'}
          </Text>
        )}
        {show.map(card)}
      </Box>
    )
  })
}
