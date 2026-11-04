import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Answer, Assumption } from '../types'

export const ASSUMPTIONS = {
  id: 'state-assumptions:rule',
  scope: 'session',
  text: [
    '# Assumptions',
    'Whenever you build, change, fix or configure something (code, config, documents, commands with effects), end your reply with a short section headed "Assumptions" (in the language of the reply) listing every assumption you made along the way: anything you decided without being told, guessed instead of verifying, filled in with a default, or inferred from context. Name the assumption and, where it matters, what changes if it is wrong.',
    'Number them A1, A2, A3, ... restarting from A1 in every reply, so the person can answer about one by its number. Write each one as a list item that starts with its number, as in "- **A1.** text", one item per line. Close the section with one line telling them they can reject or change any of them by number (for example "A2: no, use PowerShell").',
    'When the person answers about an assumption (rejects it, changes it, or tells you what to do instead), treat the answer as a decision: redo the parts of the work that rested on it, leave the rest alone, and say which assumption you replaced and what changed as a result. A number refers to your most recent Assumptions section. If the answer is ambiguous, ask before redoing anything.',
    'If you made none, say so in one line. Do not skip the section because the change was small.',
    'The section belongs in your reply only: never put it in commit messages, files or documents.',
  ].join('\n\n'),
} as const

const items = atom({ plugin: 'state-assumptions', key: 'items' } as const, [])
const answers = atom({ plugin: 'state-assumptions', key: 'answers' } as const, {})
const editing = atom({ plugin: 'state-assumptions', key: 'editing' } as const, null)
const isOpen = atom({ plugin: 'state-assumptions', key: 'isOpen' } as const, false)
const expanded = atom({ plugin: 'state-assumptions', key: 'expanded' } as const, [])

const BUTTONS_WIDTH = 22

const HEADING = /^\s*(?:#{1,6}\s*|\*\*)\s*(assumptions|assunzioni|ipotesi|presupposti)\b/i
const ITEM = /^\s*(?:[-*+]\s+|\d+\.\s+)?[*_`]*(A\d+)[*_`]*[.):]?[*_`]*\s*[:.\-–—]?\s*(.*)$/

/** The A1..An list of the last Assumptions section, or null when the text has none. */
export function parseAssumptions(text: string): Assumption[] | null {
  const lines = text.split(/\r?\n/)
  let start = -1
  lines.forEach((line, i) => {
    if (HEADING.test(line)) start = i
  })
  if (start < 0) return null

  const found: Assumption[] = []
  for (const line of lines.slice(start + 1)) {
    if (/^\s*#/.test(line)) break
    const match = ITEM.exec(line)
    const last = found[found.length - 1]
    if (match?.[1]) {
      found.push({ id: match[1].toUpperCase(), text: clean(match[2] ?? '') })
    } else if (last && /^\s+\S/.test(line)) {
      last.text = `${last.text} ${clean(line)}`
    }
  }
  return found
}

/** The text without its last Assumptions section, which the band shows instead. */
export function withoutSection(text: string): string {
  const lines = text.split(/\r?\n/)
  let start = -1
  lines.forEach((line, i) => {
    if (HEADING.test(line)) start = i
  })
  if (start < 0) return text
  const after = lines.findIndex((line, i) => i > start && /^\s*#/.test(line))
  const kept = after < 0 ? lines.slice(0, start) : [...lines.slice(0, start), ...lines.slice(after)]
  return kept.join('\n').trimEnd()
}

function sameList(a: Assumption[], b: Assumption[]): boolean {
  return a.length === b.length && a.every((one, i) => one.id === b[i]?.id && one.text === b[i]?.text)
}

function clean(text: string): string {
  return text.replace(/\*\*/g, '').trim()
}

/** The reply the band sends: one line per answered assumption, as "A2: no, use PowerShell". */
export function composeReply(list: Assumption[], given: Record<string, Answer>): string {
  return list
    .map(({ id }) => {
      const answer = given[id]
      if (!answer) return null
      const note = answer.note.trim()
      if (answer.isRejected) return note ? `${id}: no, ${note}` : `${id}: no`
      return note ? `${id}: ${note}` : null
    })
    .filter((line): line is string => line !== null)
    .join('\n')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'assumptions',
      description: 'Open or close the list of assumptions to review',
    })
    return next(e)
  })

  on('command.run', { command: 'assumptions' }, async $ => {
    const wasOpen = await read($, isOpen)
    await update($, isOpen, () => !wasOpen)
    return { text: wasOpen ? 'Assumptions closed.' : 'Assumptions opened.' }
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.origin.kind === 'composer') {
      const pending = composeReply(await read($, items), await read($, answers))
      if (pending) {
        const count = pending.split('\n').length
        $.ui.toast(`${count} assumption ${count === 1 ? 'answer' : 'answers'} not sent: open the band and press Send`)
      }
    }
    return next(e)
  })

  on('prompt.compose', async ($, e, next) => {
    const composed = await next(e)
    return { sections: [...composed.sections, ASSUMPTIONS] }
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if (e.agentId || e.reason !== 'answer') return done

    const found = parseAssumptions(e.answer)
    if (found === null) return done

    await update($, items, () => found)
    await update($, answers, () => ({}))
    await update($, editing, () => null)
    await update($, isOpen, () => false)
    await update($, expanded, () => [])
    return done
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const found = parseAssumptions(e.props.text)
    if (!found || found.length === 0) return next(e)
    const list = await read($, items)
    if (!sameList(found, list)) return next(e)
    return next({ ...e, props: { ...e.props, text: withoutSection(e.props.text) } })
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const rest = await next(e)
    const list = await read($, items)
    if (e.props.hasSurvey || list.length === 0) return rest

    const given = await read($, answers)
    const open = await read($, editing)
    const opened = await read($, expanded)
    const room = Math.max(10, e.props.bodyColumns - BUTTONS_WIDTH)
    const elements = $.ui.resolve(e)
    const { Box, Text, Button } = elements
    const Input = 'Input' in elements ? elements.Input : undefined

    const setAnswer = (id: string, change: (old: Answer) => Answer) =>
      update($, answers, all => ({
        ...all,
        [id]: change(all[id] ?? { isRejected: false, note: '' }),
      }))

    const reply = composeReply(list, given)
    const answered = Object.keys(given).filter(id => composeReply(list, { [id]: given[id]! }) !== '').length

    const isListOpen = await read($, isOpen)
    const header = (
      <Box flexDirection="row">
        <Button key="review" onPress={() => update($, isOpen, now => !now)}>
          <Text color="warning" bold>
            {isListOpen ? '▲' : '▼'} {list.length} {list.length === 1 ? 'assumption' : 'assumptions'} to review
          </Text>
          {answered > 0 ? <Text color="error"> · {answered} not sent</Text> : null}
        </Button>
        <Button key="dismiss" onPress={() => update($, items, () => [])}>
          <Text color="subtle">Dismiss</Text>
        </Button>
      </Box>
    )

    if (!isListOpen)
      return (
        <Box flexDirection="column">
          {header}
          {rest}
        </Box>
      )

    const send = async () => {
      if (!reply) return
      await $.prompt.submit({ text: reply, asUser: true })
      await update($, answers, () => ({}))
      await update($, editing, () => null)
      await update($, items, () => [])
      await update($, isOpen, () => false)
    }

    return (
      <Box flexDirection="column">
        {header}
        {list.map(item => {
          const answer = given[item.id]
          const note = answer?.note.trim()
          const line = `${item.id} ${item.text}${note ? ` → ${note}` : ''}`
          const isLong = line.length + 1 > room
          const isExpanded = opened.includes(item.id)
          return (
            <Box key={item.id} flexDirection="row">
              <Button
                key={`reject-${item.id}`}
                onPress={() => setAnswer(item.id, old => ({ ...old, isRejected: !old.isRejected }))}
              >
                {answer?.isRejected ? <Text color="warning">Undo  </Text> : <Text color="error">Reject</Text>}
              </Button>
              {Input && (
                <Button
                  key={`change-${item.id}`}
                  onPress={() => update($, editing, now => (now === item.id ? null : item.id))}
                >
                  <Text color="suggestion" bold={open === item.id}>Change</Text>
                </Button>
              )}
              <Box flexShrink={1} flexGrow={1}>
                <Text wrap={isExpanded ? 'wrap' : 'truncate-end'}>
                  {' '}
                  <Text bold strikethrough={answer?.isRejected} color={answer?.isRejected ? 'error' : undefined}>
                    {item.id}
                  </Text>{' '}
                  <Text dimColor={answer?.isRejected}>{item.text}</Text>
                  {note ? <Text color="success"> → {note}</Text> : null}
                </Text>
              </Box>
              {(isLong || isExpanded) && (
                <Button
                  key={`more-${item.id}`}
                  plain
                  onPress={() =>
                    update($, expanded, ids =>
                      ids.includes(item.id) ? ids.filter(id => id !== item.id) : [...ids, item.id],
                    )
                  }
                >
                  <Text color="permission">{isExpanded ? ' ▲ less' : ' ▼ more'}</Text>
                </Button>
              )}
            </Box>
          )
        })}
        {Input && open && (
          <Input
            key={`note-${open}`}
            label={`${open}: `}
            placeholder="what to do instead, then Enter"
            submitLabel="keep"
            autoFocus
            value={given[open]?.note ?? ''}
            onSubmit={async (value: string) => {
              await setAnswer(open, old => ({ ...old, note: value }))
              await update($, editing, () => null)
            }}
          />
        )}
        <Box flexDirection="row">
          <Button key="send" onPress={send}>
            <Text color="success" bold>Send</Text>
          </Button>
          <Button key="clear" onPress={() => update($, answers, () => ({}))}>
            <Text color="subtle">Clear</Text>
          </Button>
          <Text dimColor wrap="truncate-end"> {reply ? reply.replace(/\n/g, ' · ') : 'Reject or change any of them, then Send'}</Text>
        </Box>
        {rest}
      </Box>
    )
  })
}
