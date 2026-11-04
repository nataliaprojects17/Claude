import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Idea, IdeaPriority, IdeaStatus, IdeasScope, IdeasWhere } from '../types'

const PANE = 'ideas'
const TOOL = 'mcp__ideas__park_idea'
const JUDGE_MODEL = 'haiku'
const POLL_MS = 2 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

const list = atom({ plugin: 'ideas', key: 'list' } as const, [] as Idea[])
const where = atom({ plugin: 'ideas', key: 'where' } as const, null as IdeasWhere | null)
const scope = atom({ plugin: 'ideas', key: 'scope' } as const, 'branch' as IdeasScope)
const selected = atom({ plugin: 'ideas', key: 'selected' } as const, null as string | null)
const showClosed = atom({ plugin: 'ideas', key: 'showClosed' } as const, false)
const tagFilter = atom({ plugin: 'ideas', key: 'tag' } as const, null as string | null)
const minimized = atom({ plugin: 'ideas', key: 'minimized' } as const, false)

type $ = EngineInterface

const ACTIVE: readonly IdeaStatus[] = ['open', 'sent']
const isActive = (idea: Idea) => ACTIVE.includes(idea.status)

const storeKey = (root: string) => `project:${root.replace(/\\/g, '/').toLowerCase()}`

async function git($: $, root: string, args: string[]): Promise<string | undefined> {
  try {
    const run = await $.process.run(['git', ...args], { cwd: root, timeoutMs: 10000 })
    return run.exitCode === 0 ? run.stdout.trim() : undefined
  } catch {
    return undefined
  }
}

async function locate($: $): Promise<IdeasWhere> {
  const root = await $.session.root()
  const branch = (await git($, root, ['rev-parse', '--abbrev-ref', 'HEAD'])) ?? ''
  const here = { root, branch }
  await update($, where, () => here)
  return here
}

function migrate(raw: Omit<Partial<Idea>, 'status'> & { status?: string }): Idea {
  const status = (raw.status === 'done' ? 'closed' : raw.status ?? 'open') as IdeaStatus
  return {
    ...(raw as Idea),
    code: raw.code ?? `I-${(raw.id ?? crypto.randomUUID()).slice(0, 4)}`,
    status,
    priority: raw.priority ?? 2,
    tags: raw.tags ?? [],
  }
}

async function stored($: $, here: IdeasWhere): Promise<Idea[]> {
  const value = await $.store.get(storeKey(here.root))
  return Array.isArray(value) ? value.map(migrate) : []
}

async function showCount($: $, ideas: Idea[], here: IdeasWhere) {
  const open = ideas.filter(i => isActive(i) && i.branch === here.branch).length
  $.ui.status(open === 0 ? undefined : `💡 ${open} idea${open === 1 ? '' : 's'}`)
}

// Gli atomi ripartono dall'iniziale a ogni /clear, e session.start non si
// ripete: la lista si rilegge dallo store quando la trova vuota.
async function hydrate($: $) {
  if ((await read($, list)).length > 0) return
  const here = (await read($, where)) ?? (await locate($))
  const ideas = (await stored($, here)).map(i => (i.isThinking ? { ...i, isThinking: false } : i))
  await update($, list, () => ideas)
  await showCount($, ideas, here)
}

// Re-reads the store before every change, so two sessions on one project
// do not overwrite each other's ideas.
async function change($: $, fn: (ideas: Idea[]) => Idea[]) {
  const here = (await read($, where)) ?? (await locate($))
  const next = fn(await stored($, here))
  await $.store.set(storeKey(here.root), next)
  await update($, list, () => next)
  await showCount($, next, here)
  return next
}

const patch = ($: $, id: string, fields: Partial<Idea>) =>
  change($, ideas => ideas.map(i => (i.id === id ? { ...i, ...fields } : i)))

const PRIORITY_WORDS: Record<string, IdeaPriority> = {
  '1': 1, high: 1, h: 1,
  '2': 2, normal: 2, n: 2,
  '3': 3, low: 3, l: 3,
}

// "!high #solventum retry on 503" → priority 1, tag solventum, text "retry on 503"
export function parse(input: string): { text: string; tags: string[]; priority: IdeaPriority } {
  const tags: string[] = []
  let priority: IdeaPriority = 2
  const words = input.split(/\s+/).filter(word => {
    const tag = /^#([\w-]+)$/.exec(word)
    if (tag?.[1]) {
      tags.push(tag[1].toLowerCase())
      return false
    }
    const bang = /^!(\w+)$/.exec(word)
    const level = bang?.[1] ? PRIORITY_WORDS[bang[1].toLowerCase()] : undefined
    if (level !== undefined) {
      priority = level
      return false
    }
    return true
  })
  return { text: words.join(' ').trim(), tags: [...new Set(tags)], priority }
}

const parseTags = (input: string) =>
  [...new Set(input.split(/[\s,]+/).map(t => t.replace(/^#/, '').toLowerCase()).filter(Boolean))]

async function park(
  $: $,
  input: string,
  extra: { tags?: string[]; priority?: IdeaPriority } = {},
): Promise<Idea | undefined> {
  const parsed = parse(input)
  if (parsed.text === '') return undefined
  const here = await locate($)
  const head = await git($, here.root, ['rev-parse', 'HEAD'])
  const createdAt = await $.clock.now()
  let added: Idea | undefined
  await change($, ideas => {
    const taken = new Set(ideas.map(i => i.code))
    let code = ''
    do code = `I-${crypto.randomUUID().slice(0, 4)}`
    while (taken.has(code))
    added = {
      id: crypto.randomUUID(),
      code,
      text: parsed.text,
      branch: here.branch,
      createdAt,
      status: 'open',
      priority: extra.priority ?? parsed.priority,
      tags: [...new Set([...parsed.tags, ...(extra.tags ?? [])])],
      ...(head ? { baseHead: head, checkedHead: head } : {}),
    }
    return [added, ...ideas]
  })
  return added
}

type Commit = { sha: string; subject: string; body: string; files: string }

async function commitsIn($: $, root: string, range: string): Promise<Commit[] | undefined> {
  const log = await git($, root, ['log', '--format=%h%x1f%s%x1f%b%x1e', '--name-only', range])
  if (log === undefined) return undefined
  return log
    .split('\x1e')
    .map(chunk => chunk.trim())
    .filter(Boolean)
    .map(chunk => {
      const [sha = '', subject = '', rest = ''] = chunk.split('\x1f')
      const [body = '', ...files] = rest.split('\n\n')
      return { sha, subject, body: body.trim(), files: files.join(' ').replace(/\s+/g, ' ').trim() }
    })
}

async function judge($: $, ideas: Idea[], commits: Commit[]): Promise<Set<string>> {
  const reply = await $.model.complete({
    model: JUDGE_MODEL,
    maxTokens: 200,
    system:
      'You decide whether git commits implement ideas from a backlog. Be strict: an idea counts only when ' +
      'the commits clearly carry it out, not when they merely touch the same area.',
    prompt:
      'Commits:\n' +
      commits.map(c => `- ${c.sha} ${c.subject}${c.body ? ` | ${c.body}` : ''} [files: ${c.files.slice(0, 400)}]`).join('\n') +
      '\n\nIdeas:\n' +
      ideas.map(i => `- ${i.code}: ${i.text}`).join('\n') +
      '\n\nReply with the codes of the ideas these commits implement, separated by spaces, or NONE.',
  })
  if (!reply.isAnswered) return new Set()
  const codes = new Set(ideas.map(i => i.code.toLowerCase()))
  return new Set((reply.text.match(/I-[0-9a-f]{4}/gi) ?? []).map(c => c.toLowerCase()).filter(c => codes.has(c)))
}

let isChecking = false

// Closes the ideas on this branch that commits since their last check implement:
// by their code in a commit message, or by the model's reading of the commits.
async function checkCommits($: $) {
  if (isChecking) return
  isChecking = true
  try {
    const here = await locate($)
    const head = await git($, here.root, ['rev-parse', 'HEAD'])
    if (head === undefined) return

    const pending = (await stored($, here)).filter(
      i => isActive(i) && i.branch === here.branch && i.checkedHead !== head,
    )
    const groups = new Map<string, Idea[]>()
    for (const idea of pending) {
      const from = idea.checkedHead ?? ''
      groups.set(from, [...(groups.get(from) ?? []), idea])
    }

    const closed = new Map<string, string>()
    const seen = new Set<string>()
    for (const [from, ideas] of groups) {
      ideas.forEach(i => seen.add(i.id))
      const commits = from === '' ? [] : ((await commitsIn($, here.root, `${from}..${head}`)) ?? [])
      if (commits.length === 0) continue

      const byCode = (idea: Idea) =>
        commits.find(c => `${c.subject}\n${c.body}`.toLowerCase().includes(idea.code.toLowerCase()))
      const rest: Idea[] = []
      for (const idea of ideas) {
        const commit = byCode(idea)
        if (commit) closed.set(idea.id, `${commit.sha} ${commit.subject}`)
        else rest.push(idea)
      }
      if (rest.length === 0) continue

      const implemented = await judge($, rest.slice(0, 30), commits.slice(0, 30))
      const latest = commits[0]
      for (const idea of rest) {
        if (implemented.has(idea.code.toLowerCase()) && latest) {
          closed.set(idea.id, `${latest.sha} ${latest.subject}`)
        }
      }
    }

    if (seen.size === 0) return
    await change($, ideas =>
      ideas.map(i => {
        if (!seen.has(i.id)) return i
        const by = closed.get(i.id)
        return by && isActive(i)
          ? { ...i, status: 'implemented' as const, closedBy: by, checkedHead: head }
          : { ...i, checkedHead: head }
      }),
    )
    if (closed.size > 0) {
      $.ui.toast(`✓ ${closed.size} idea${closed.size === 1 ? '' : 's'} implemented by the latest commits: /ideas to review`)
    }
  } finally {
    isChecking = false
  }
}

// At most once a day per branch, a toast about open ideas parked at least `days` ago.
async function remind($: $, days: number) {
  if (!(days > 0)) return
  const here = (await read($, where)) ?? (await locate($))
  const now = await $.clock.now()
  const key = `reminded:${storeKey(here.root)}|${here.branch}`
  if (now - Number((await $.store.get(key)) ?? 0) < DAY_MS) return
  const old = (await read($, list)).filter(
    i => isActive(i) && i.branch === here.branch && now - i.createdAt >= days * DAY_MS,
  )
  if (old.length === 0) return
  await $.store.set(key, now)
  const on = here.branch ? ` on ${here.branch}` : ''
  $.ui.toast(
    `💡 ${old.length} idea${old.length === 1 ? '' : 's'} parked ${days}+ days ago${on} still open: /ideas`,
  )
}

async function openShelf($: $) {
  await hydrate($)
  const opened = await $.ui.open({ id: PANE, title: 'Ideas', focus: true, closeOnEscape: true })
  if (!opened.isPlaced) $.ui.toast('ideas: widen the terminal to see the shelf')
  await update($, minimized, () => false)
  await checkCommits($)
}

// Out of the way, not away: the shelf closes and leaves a chip above the prompt.
// Everything it was showing lives in state, so it comes back as it was.
async function minimize($: $) {
  await update($, minimized, () => true)
  await $.ui.close({ id: PANE })
}

function framed(idea: Idea) {
  const on = idea.branch === '' ? '' : ` while on branch ${idea.branch}`
  return `An idea I parked earlier${on} (${idea.code}):\n\n${idea.text}\n\nWhat do you think of it, and how would you approach it?`
}

async function send($: $, idea: Idea) {
  await $.prompt.submit({ text: framed(idea), asUser: true })
  await patch($, idea.id, { status: 'sent' })
  $.ui.toast('Sent to Claude: it runs once the current turn ends')
}

async function draft($: $, idea: Idea) {
  const filled = await $.prompt.fill({ text: framed(idea), mode: 'replace' })
  if (!filled.isFilled) {
    $.ui.toast('ideas: the prompt box is busy, try again in a moment')
    return
  }
  await $.ui.close({ id: PANE })
}

// Asks a fork of the conversation, so the main thread never sees the question.
async function quickTake($: $, idea: Idea) {
  await patch($, idea.id, { isThinking: true })
  const reply = await $.model.fork({
    prompt:
      'The user parked this idea for later, without interrupting the current work:\n\n' +
      `"${idea.text}"\n\n` +
      'In at most five short lines of plain text: is it worth doing, how does it relate ' +
      'to what we are working on now, and what would the first step be?',
  })
  const take = reply.isAnswered
    ? reply.text.trim()
    : reply.reason === 'nothing-to-fork'
      ? 'No conversation yet to think against: ask again after the first reply.'
      : `No answer (${reply.reason}).`
  await patch($, idea.id, { isThinking: false, take, isTakeHidden: false })
}

function age(ms: number) {
  const minutes = Math.floor(ms / 60000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

const firstLine = (text: string, room: number) => {
  const line = text.split('\n')[0] ?? ''
  return line.length > room ? `${line.slice(0, Math.max(1, room - 1))}…` : line
}

const LABEL_TEXT = 'New idea › '
const LABEL = LABEL_TEXT.length

// Le colonne si tengono allineate a mano: un Button prende solo stringhe e Text,
// non una Box, quindi flexGrow qui dentro non c'e'.
const CODE = 8
const META = 12
const padEnd = (text: string, width: number) => text.padEnd(width)
const padStart = (text: string, width: number) => firstLine(text, width).padStart(width)

const MARK: Record<IdeaStatus, string> = { open: '•', sent: '→', implemented: '✓', closed: '✓', rejected: '✗' }
const MARK_COLOR: Record<IdeaStatus, string> = {
  open: 'suggestion',
  sent: 'claude',
  implemented: 'success',
  closed: 'success',
  rejected: 'error',
}
const PRIORITY_LABEL: Record<IdeaPriority, string> = { 1: 'high', 2: 'normal', 3: 'low' }
const PRIORITY_COLOR: Record<IdeaPriority, string> = { 1: 'error', 2: 'suggestion', 3: 'subtle' }

// Due caratteri sempre: lo stato quando c'e' qualcosa da dire, altrimenti la
// priorita'. Larga due anche da vuota, o la colonna del testo balla.
const gutter = (idea: Idea) => {
  if (!isActive(idea)) return `${MARK[idea.status]} `
  if (idea.status === 'sent') return `${MARK.sent} `
  return idea.priority === 1 ? '▌ ' : idea.priority === 3 ? '↓ ' : '  '
}
const nextPriority = (p: IdeaPriority): IdeaPriority => (p === 1 ? 2 : p === 2 ? 3 : 1)

const byPriority = (a: Idea, b: Idea) =>
  Number(isActive(b)) - Number(isActive(a)) || a.priority - b.priority || b.createdAt - a.createdAt

export const register: Register = (on, options) => {
  const reminderDays = Number(options.reminderDays ?? 7)

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'idea',
      description: 'Park an idea on this project and branch without stopping Claude (no text: open the shelf)',
      argumentHint: '[!high|!low] [#tag] [idea]',
      immediate: true,
    })
    await $.command.register({
      name: 'ideas',
      description: 'Open the ideas shelf for this project and branch',
      immediate: true,
    })
    await $.tool.register({
      name: 'park_idea',
      description:
        "Park a side idea on the user's ideas shelf for this project and branch instead of acting on it now. " +
        'Use when the user says to park, shelve or save something for later, or when you spot a worthwhile tangent ' +
        'that is outside the current task. One or two sentences, self-contained.',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The idea, self-contained' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Short topic tags, optional' },
          priority: { type: 'string', enum: ['high', 'normal', 'low'] },
        },
        required: ['text'],
      },
      isDeferred: false,
    })

    await hydrate($)
    $.clock.every(POLL_MS, () => void checkCommits($))
    await remind($, reminderDays)

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    $.clock.after(0, () => void hydrate($).then(() => checkCommits($)).then(() => remind($, reminderDays)))
    return next(e)
  })

  on('command.run', { command: 'idea' }, async ($, e) => {
    if (e.args.trim() === '') {
      await openShelf($)
      return {}
    }
    const idea = await park($, e.args)
    if (idea === undefined) $.ui.toast('ideas: an idea needs some text')
    else $.ui.toast(`💡 Parked ${idea.code}${idea.branch ? ` on ${idea.branch}` : ''}`)
    return {}
  })

  on('command.run', { command: 'ideas' }, async $ => {
    await openShelf($)
    return {}
  })

  on('tool.call', { tool: TOOL }, async ($, e) => {
    const input = e as { text?: unknown; tags?: unknown; priority?: unknown }
    const tags = Array.isArray(input.tags) ? input.tags.filter((t): t is string => typeof t === 'string') : []
    const priority = typeof input.priority === 'string' ? PRIORITY_WORDS[input.priority] : undefined
    const idea = await park($, typeof input.text === 'string' ? input.text : '', {
      tags: parseTags(tags.join(' ')),
      ...(priority ? { priority } : {}),
    })
    if (idea === undefined) return { deny: 'An idea needs some text.' }
    $.ui.toast(`💡 Claude parked ${idea.code}`)
    return { result: `Parked as ${idea.code}${idea.branch ? ` on branch ${idea.branch}` : ''}.` }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const rest = await next(e)
    if (!(await read($, minimized)) || e.props.hasSurvey) return rest

    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        <Box paddingX={1}>
          <Button key="restore-ideas" onPress={() => void openShelf($)}>
            <Text color="ide">[_] Ideas</Text>
          </Button>
        </Box>
        {rest}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const els = $.ui.resolve(e)
    const { Box, Text, Button } = els
    const chip = (key: string, text: string, color: string, onPress: () => unknown) => (
      <Button key={key} plain onPress={() => void onPress()}>
        <Text color={color} bold>
          {text}
        </Text>
      </Button>
    )
    const Input = 'Input' in els ? els.Input : undefined

    const here = await read($, where)
    const wide = await read($, scope)
    const withClosed = await read($, showClosed)
    const tag = await read($, tagFilter)
    const picked = await read($, selected)
    const now = await $.clock.now()

    const inView = (await read($, list)).filter(
      i => wide === 'project' || here === null || i.branch === here.branch,
    )
    // Un chip serve a raggruppare: un tag portato da una sola idea non filtra niente
    // e ruba una riga al pannello. Resta quello selezionato, altrimenti non si toglie.
    const counted = new Map<string, number>()
    for (const idea of inView.filter(i => withClosed || isActive(i)))
      for (const t of new Set(idea.tags)) counted.set(t, (counted.get(t) ?? 0) + 1)
    const tags = [...counted.keys()].filter(t => (counted.get(t) ?? 0) >= 2 || t === tag).sort()
    const shown = inView
      .filter(i => (withClosed || isActive(i)) && (tag === null || i.tags.includes(tag)))
      .sort(byPriority)
    const room = Math.max(10, e.props.bodyColumns - 24)
    const option = (value: IdeasScope, text: string) => (
      <Button key={`scope-${value}`} plain onPress={() => update($, scope, () => value)}>
        {wide === value ? (
          <Text color="ide" bold underline>
            {text}
          </Text>
        ) : (
          <Text dimColor>{text}</Text>
        )}
      </Button>
    )

    return (
      <Box flexDirection="column">
        <Box>
          <Button key="minimize" hotkey="m" onPress={() => void minimize($)}>
            <Text dimColor>_</Text>
          </Button>
        </Box>
        {Input && (
          <Box flexDirection="column">
            <Input
              key="new"
              label={LABEL_TEXT}
              placeholder="type here, Enter parks it"
              submitLabel="park"
              autoFocus
              onSubmit={text => void park($, text)}
            />
            <Box paddingLeft={LABEL}>
              <Text color="subtle">!high · !low · #tag</Text>
            </Box>
          </Box>
        )}
        <Box gap={1} marginTop={1}>
          {option('branch', here?.branch || 'this branch')}
          {option('project', 'whole project')}
          <Button key="show-closed" plain onPress={() => update($, showClosed, v => !v)}>
            <Text color="subtle">{withClosed ? '◉ hide closed' : '○ show closed'}</Text>
          </Button>
          <Box flexGrow={1} />
          <Text bold color="claude">
            {shown.length} idea{shown.length === 1 ? '' : 's'}
          </Text>
        </Box>
        {tags.length > 0 && (
          <Box gap={1} flexWrap="wrap">
            <Button key="tag-all" plain onPress={() => update($, tagFilter, () => null)}>
              <Text color={tag === null ? 'ide' : 'subtle'} bold={tag === null}>
                all
              </Text>
            </Button>
            {tags.map(t => (
              <Button
                key={`tag-${t}`}
                plain
                onPress={() => update($, tagFilter, current => (current === t ? null : t))}
              >
                <Text color={tag === t ? 'ide' : 'subtle'} bold={tag === t}>
                  #{t}
                </Text>
              </Button>
            ))}
          </Box>
        )}

        {shown.length === 0 && (
          <Text dimColor>Nothing here. Type above, or run /idea &lt;text&gt; at any time.</Text>
        )}

        {shown.map(idea => (
          <Box key={`row-${idea.id}`} flexDirection="column">
            <Button
              key={`idea-${idea.id}`}
              plain
              dimColor={!isActive(idea)}
              onPress={() => update($, selected, s => (s === idea.id ? null : idea.id))}
            >
              <Text color="subtle">{padEnd(idea.code, CODE)}</Text>
              <Text color={isActive(idea) ? PRIORITY_COLOR[idea.priority] : MARK_COLOR[idea.status]} bold>
                {gutter(idea)}
              </Text>
              <Text bold={picked === idea.id} strikethrough={idea.status === 'rejected'}>
                {padEnd(firstLine(idea.text, room), room)}
              </Text>
              <Text color="subtle">
                {padStart(wide === 'project' ? idea.branch : age(now - idea.createdAt), META)}
              </Text>
            </Button>

            {picked === idea.id && (
              <Box flexDirection="column" paddingLeft={CODE + 2} marginBottom={1}>
                <Text wrap="wrap">{idea.text}</Text>
                {idea.status === 'implemented' && idea.closedBy && (
                  <Text color="success">✓ Implemented by {idea.closedBy}</Text>
                )}
                {idea.status === 'closed' && <Text color="success">✓ Closed</Text>}
                {idea.status === 'rejected' && <Text color="error">✗ Rejected</Text>}
                {idea.isThinking && <Text color="claude" italic>✻ Claude is thinking it over…</Text>}
                <Box gap={1}>
                  {idea.tags.length > 0 && <Text color="ide">{idea.tags.map(t => `#${t}`).join(' ')}</Text>}
                  <Text color="subtle">
                    {age(now - idea.createdAt)}
                    {idea.branch ? ` · ${idea.branch}` : ''}
                  </Text>
                </Box>
                {idea.take && !idea.isThinking && (
                  <Box flexDirection="column" marginTop={1}>
                    <Button
                      key={`fold-${idea.id}`}
                      plain
                      onPress={() => patch($, idea.id, { isTakeHidden: !idea.isTakeHidden })}
                    >
                      <Text color="claude" bold>
                        {idea.isTakeHidden ? '▸' : '▾'} ✻ Quick take
                      </Text>{' '}
                      <Text color="subtle">
                        {idea.isTakeHidden ? firstLine(idea.take, Math.max(10, room - 20)) : 'hide'}
                      </Text>
                    </Button>
                    {!idea.isTakeHidden && (
                      <Box paddingLeft={2}>
                        <Text color="claude" wrap="wrap">
                          {idea.take}
                        </Text>
                      </Box>
                    )}
                  </Box>
                )}
                {Input && (
                  <Input
                    key={`tags-${idea.id}`}
                    label="tags "
                    value={idea.tags.join(' ')}
                    placeholder="space separated"
                    submitLabel="save"
                    onSubmit={value => void patch($, idea.id, { tags: parseTags(value) })}
                  />
                )}
                <Box gap={1} flexWrap="wrap" marginTop={1}>
                  {isActive(idea) && chip(`send-${idea.id}`, '➤ Send', 'claude', () => send($, idea))}
                  {isActive(idea) && chip(`draft-${idea.id}`, '✎ Edit', 'ide', () => draft($, idea))}
                  {chip(`take-${idea.id}`, idea.take ? '✻ New take' : '✻ Quick take', 'planMode', () =>
                    idea.isThinking ? undefined : quickTake($, idea),
                  )}
                  {chip(`priority-${idea.id}`, `⚑ ${PRIORITY_LABEL[idea.priority]}`, PRIORITY_COLOR[idea.priority], () =>
                    patch($, idea.id, { priority: nextPriority(idea.priority) }),
                  )}
                  {isActive(idea)
                    ? [
                        chip(`close-${idea.id}`, '✓ Close', 'success', () => patch($, idea.id, { status: 'closed' })),
                        chip(`reject-${idea.id}`, '✗ Reject', 'warning', () => patch($, idea.id, { status: 'rejected' })),
                      ]
                    : chip(`reopen-${idea.id}`, '↺ Reopen', 'ide', async () => {
                        const head = here ? await git($, here.root, ['rev-parse', 'HEAD']) : undefined
                        await change($, ideas =>
                          ideas.map(({ closedBy, ...i }) =>
                            i.id === idea.id
                              ? { ...i, status: 'open' as const, ...(head ? { checkedHead: head } : {}) }
                              : { ...i, ...(closedBy ? { closedBy } : {}) },
                          ),
                        )
                      })}
                  {chip(`delete-${idea.id}`, '⌫ Delete', 'error', async () => {
                    await change($, ideas => ideas.filter(i => i.id !== idea.id))
                    await update($, selected, () => null)
                  })}
                </Box>
              </Box>
            )}
          </Box>
        ))}
      </Box>
    )
  })
}
