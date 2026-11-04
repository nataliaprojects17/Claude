import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

const COLD_MODEL = 'sonnet'

const original = atom({ plugin: 'prompt-enhancer', key: 'original' } as const, null)
const isWorking = atom({ plugin: 'prompt-enhancer', key: 'isWorking' } as const, false)

export const briefFor = (draft: string): string =>
  [
    'Rewrite the draft prompt below so that it tells you everything you would otherwise have to ask for.',
    'Answer with the rewritten prompt alone: no preamble, no explanation, no code fence, nothing after it.',
    '',
    'Keep it under ten lines and in the language the draft is written in.',
    'Open with the ask itself, the draft tightened, one or two lines.',
    'Then, each only where it has something real to say:',
    '- the installed skills that fit the task, by name, taken from the skills this session actually lists;',
    '- what this project the task touches: paths, conventions and decisions you can see in the context, never invented;',
    '- two to four decisions to settle before starting, as questions;',
    '- one closing line on what the finished result looks like.',
    '',
    'Name no skill, file or convention you cannot see. A shorter rewrite beats a padded one.',
    '',
    'The draft:',
    draft,
  ].join('\n')

export const strip = (text: string): string =>
  text
    .trim()
    .replace(/^```[a-zA-Z]*\r?\n/, '')
    .replace(/\r?\n```$/, '')
    .trim()

const sayWhy = ($: EngineInterface, reason: string) =>
  $.ui.toast(`Prompt Enhancer: la riscrittura non e riuscita (${reason}).`)

// Il fork rigioca l'ultima richiesta del thread principale: finche non ne esiste
// una, la riscrittura passa da una completion a se stante, che il contesto della
// sessione non ce l'ha.
const rewrite = async ($: EngineInterface, draft: string) => {
  const forked = await $.model.fork({ prompt: briefFor(draft) })
  if (forked.isAnswered || forked.reason !== 'nothing-to-fork') return forked

  return $.model.complete({ model: COLD_MODEL, maxTokens: 2048, prompt: briefFor(draft) })
}

const enhance = async ($: EngineInterface) => {
  if (await read($, isWorking)) return

  const draft = (await $.prompt.read()).text.trim()
  if (draft === '') {
    $.ui.toast('Prompt Enhancer: la casella e vuota.')

    return
  }

  await update($, isWorking, () => true)
  try {
    const reply = await rewrite($, draft)
    if (!reply.isAnswered) {
      sayWhy($, reply.reason)

      return
    }

    const rewritten = strip(reply.text)
    if (rewritten === '') {
      sayWhy($, 'empty-reply')

      return
    }

    await update($, original, () => draft)
    await $.prompt.fill({ text: rewritten, mode: 'replace' })
  } finally {
    await update($, isWorking, () => false)
  }
}

const restore = async ($: EngineInterface) => {
  const kept = await read($, original)
  if (kept === null) return

  await $.prompt.fill({ text: kept, mode: 'replace' })
  await update($, original, () => null)
}

const send = async ($: EngineInterface) => {
  const draft = (await $.prompt.read()).text.trim()
  if (draft === '') {
    $.ui.toast('Prompt Enhancer: la casella e vuota.')

    return
  }

  await $.prompt.fill({ text: '', mode: 'replace' })
  await update($, original, () => null)
  await $.prompt.submit({ text: draft, asUser: true })
}

let saidItRan = false

export const register: Register = on => {
  on('prompt.submit', async ($, e, next) => {
    await update($, original, () => null)

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (!saidItRan) {
      saidItRan = true
      $.ui.log('prompt-enhancer: the band hook ran')
    }
    const rest = await next(e)
    if (e.props.hasSurvey) return rest

    const { Box, Button, Text } = $.ui.resolve(e)
    const working = await read($, isWorking)
    const kept = await read($, original)

    return (
      <Box flexDirection="column">
        <Box gap={1}>
          <Button key="enhance" hotkey="e" label="Enhance" onPress={() => enhance($)}>
            <Text color="suggestion">✦ {working ? 'Enhance...' : 'Enhance'}</Text>
          </Button>
          <Button key="send" label="Send" onPress={() => send($)}>
            <Text color="success">➤ Send</Text>
          </Button>
          {kept !== null && (
            <Button key="restore-prompt" label="Ripristina" onPress={() => restore($)}>
              <Text color="warning">↩ Ripristina</Text>
            </Button>
          )}
        </Box>
        {rest}
      </Box>
    )
  })
}
