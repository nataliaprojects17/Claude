import type { EngineInterface, Register } from 'claude-code'

type $ = EngineInterface

const TOOL = 'mcp__design-chooser__show_design_options'

type Target = 'web' | 'mobile'
type Option = { id: string; title: string; description?: string; html: string; kept?: boolean }
type Screen = { round: number; question: string; target: Target; options: Option[] }
type Action = 'choose' | 'mix' | 'more'
type Act = { round: number; action: Action; picked: string[]; comment: string }

type Server = { url: string; dir: string }

let server: Promise<Server> | undefined
let current: Screen | undefined

const DESCRIPTION =
  "Shows design options as visual mockups in the user's browser, where they pick, mix or ask for new ones. " +
  'Use it instead of describing the options in text (and instead of AskUserQuestion) whenever you are about to ask ' +
  'the user to choose a visual design direction for something they will look at: a web page, an app or mobile ' +
  'screen, a dashboard, a component. Use it too when the user asks to see style or design options. ' +
  'Not for choices that are not visual (a library, a database, an API shape).\n\n' +
  'Each option is one complete, self-contained HTML document drawn at the target size (web 1280x800, mobile 390x844) ' +
  'with generic sample content (placeholder brand, headline, text, buttons): enough to judge the style. ' +
  'Inline CSS, no scripts. Make the options clearly different from each other; 3 is a good number.\n\n' +
  'After calling it, end your turn: the user answers from the browser and the answer arrives as their next message. ' +
  'It asks for one of: going on with one option; redrawing one option with a change; mixing several options; ' +
  'or new options that keep some ids. To keep an option from the previous round, pass its id again without html.'

const SCHEMA = {
  type: 'object',
  properties: {
    question: { type: 'string', description: 'The question, e.g. "Which visual style for the landing page?"' },
    target: { type: 'string', enum: ['web', 'mobile'] },
    options: {
      type: 'array',
      minItems: 1,
      maxItems: 4,
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Short and stable: a, b, c… A new option takes an id not used before.' },
          title: { type: 'string', description: 'Two or three words, e.g. "Minimal"' },
          description: { type: 'string', description: 'One short line on what sets it apart' },
          html: { type: 'string', description: 'The mockup as a full HTML document; leave it out to keep the same id from the previous round' },
        },
        required: ['id', 'title'],
      },
    },
  },
  required: ['question', 'target', 'options'],
} as const

async function tempDir($: $) {
  const tmp = (await $.env.get('TEMP')) ?? (await $.env.get('TMPDIR')) ?? '/tmp'
  return `${tmp.replace(/\\/g, '/')}/claude-design-chooser/${crypto.randomUUID()}`
}

// Starts the page server once and keeps it for the session; reads each press from its output.
function start($: $): Promise<Server> {
  return new Promise((resolve, reject) => {
    void (async () => {
      const dir = await tempDir($)
      const key = crypto.randomUUID().replace(/-/g, '')
      let isReady = false
      let buffer = ''
      try {
        const child = $.process.spawn({ argv: ['node', `${$.plugin.root}/server/server.cjs`, dir, key] })
        for await (const { stream, text } of child) {
          if (stream !== 'stdout') continue
          buffer += text
          let end
          while ((end = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, end).trim()
            buffer = buffer.slice(end + 1)
            const message = parseLine(line)
            if (message?.type === 'ready' && typeof message.url === 'string') {
              isReady = true
              resolve({ url: message.url, dir })
            } else if (message?.type === 'act') {
              await answer($, message as unknown as Act)
            }
          }
        }
      } catch (error) {
        if (!isReady) reject(error)
      }
      server = undefined
      if (!isReady) reject(new Error('the page server stopped before it was ready'))
    })()
  })
}

function parseLine(line: string): Record<string, unknown> | undefined {
  try {
    const value = JSON.parse(line)
    return value && typeof value === 'object' ? value : undefined
  } catch {
    return undefined
  }
}

const name = (option: Option | undefined, id: string) =>
  option ? `${option.id.toUpperCase()} (${option.title})` : id.toUpperCase()

export function message(screen: Screen, act: Act): string | undefined {
  const byId = new Map(screen.options.map(o => [o.id, o]))
  const picked = act.picked.filter(id => byId.has(id))
  const names = picked.map(id => name(byId.get(id), id))
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : (names[0] ?? '')
  const comment = act.comment.trim()
  const round = `Design options, round ${screen.round}`
  const asked = `"${screen.question}"`

  if (act.action === 'choose') {
    if (picked.length !== 1) return undefined
    return comment === ''
      ? `${round} (${asked}): I choose ${list}. Go on with it.`
      : `${round} (${asked}): I like ${list}, with this change: ${comment}\n` +
          `Redraw ${list} with the change and show it to me again with show_design_options, under the same id.`
  }
  if (act.action === 'mix') {
    if (picked.length < 2) return undefined
    return (
      `${round} (${asked}): mix ${list}.${comment ? ` ${comment}` : ''}\n` +
      'Draw 2 or 3 combinations and show them with show_design_options, with new ids.'
    )
  }
  if (act.action === 'more') {
    const steer = comment ? ` ${comment}` : ''
    return picked.length === 0
      ? `${round} (${asked}): none of these.${steer}\nShow me new directions with show_design_options, with new ids.`
      : `${round} (${asked}): keep ${list} and replace the others with new directions.${steer}\n` +
          `Show them with show_design_options: pass ${picked.join(', ')} again without html, and the new ones with new ids.`
  }
  return undefined
}

async function answer($: $, act: Act) {
  const screen = current
  if (!screen || act.round !== screen.round || !Array.isArray(act.picked)) return
  const text = message(screen, { ...act, comment: typeof act.comment === 'string' ? act.comment : '' })
  if (text === undefined) return
  const isFinal = act.action === 'choose' && act.comment.trim() === ''
  $.ui.status(isFinal ? undefined : '🎨 Claude is drawing the next design round')
  await $.prompt.submit({ text, asUser: true })
}

type Input = { question?: unknown; target?: unknown; options?: unknown }

export function build(input: Input, previous: Screen | undefined): Screen | string {
  if (typeof input.question !== 'string' || input.question.trim() === '') return 'question is missing'
  const target: Target = input.target === 'mobile' ? 'mobile' : 'web'
  if (!Array.isArray(input.options) || input.options.length === 0 || input.options.length > 4) {
    return 'options must hold 1 to 4 options'
  }
  const before = new Map((previous?.options ?? []).map(o => [o.id, o]))
  const options: Option[] = []
  for (const raw of input.options as Record<string, unknown>[]) {
    const id = typeof raw?.id === 'string' ? raw.id.trim().toLowerCase() : ''
    const title = typeof raw?.title === 'string' ? raw.title.trim() : ''
    if (id === '' || title === '') return 'every option needs an id and a title'
    if (options.some(o => o.id === id)) return `option id ${id} appears twice`
    const description = typeof raw.description === 'string' ? raw.description.trim() : undefined
    const html = typeof raw.html === 'string' && raw.html.trim() !== '' ? raw.html : undefined
    const kept = before.get(id)
    if (html === undefined && kept === undefined) return `option ${id} has no html and was not in the previous round`
    options.push({
      id,
      title,
      ...(description ? { description } : {}),
      html: html ?? kept!.html,
      ...(html === undefined ? { kept: true } : {}),
    })
  }
  return { round: (previous?.round ?? 0) + 1, question: input.question.trim(), target, options }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.tool.register({ name: 'show_design_options', description: DESCRIPTION, inputSchema: SCHEMA, isDeferred: false })
    return next(e)
  })

  on('tool.call', { tool: TOOL }, async ($, e) => {
    const screen = build(e as Input, current)
    if (typeof screen === 'string') return { deny: `show_design_options: ${screen}.` }
    try {
      server ??= start($)
      const { url, dir } = await server
      current = screen
      await $.fs.write(`${dir}/screen.json`, JSON.stringify(screen))
      $.ui.status(`🎨 Design options in the browser · round ${screen.round}`)
      return {
        result:
          `Shown in the user's browser as round ${screen.round} (${url}). ` +
          'End your turn now with one short line saying the options are in the browser; ' +
          "do not describe them again or ask anything else. The user's answer arrives as their next message.",
      }
    } catch (error) {
      server = undefined
      return {
        deny:
          `show_design_options could not open the browser view (${error instanceof Error ? error.message : String(error)}). ` +
          'Ask the question in text instead.',
      }
    }
  })
}
