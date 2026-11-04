import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { ModelChoice, Review, Verdict } from '../types'
import { MODEL_CHOICES, SYSTEM, buildPrompt, parseReview } from './review'

const PANE = 'self-critique'

const review = atom({ plugin: 'self-critique', key: 'review' } as const, null)
const isRunning = atom({ plugin: 'self-critique', key: 'isRunning' } as const, false)
const error = atom({ plugin: 'self-critique', key: 'error' } as const, null)
const modelChoice = atom({ plugin: 'self-critique', key: 'modelChoice' } as const, 'haiku')
const isAuto = atom({ plugin: 'self-critique', key: 'isAuto' } as const, false)

const VERDICT_COLOR: Record<Verdict, string> = {
  Strong: 'green',
  Mixed: 'yellow',
  Weak: 'red',
}

type Turn = { ask: string; answer: string }

const lastTurn = async ($: EngineInterface, answer?: string): Promise<Turn | null> => {
  const messages = await $.session.messages()
  const said = (one: (typeof messages)[number]) => one.text.trim()
  let end = -1

  messages.forEach((one, index) => {
    if (one.role === 'assistant' && said(one) !== '') end = index
  })

  const given = answer === undefined ? '' : answer.trim()
  const spoken = given !== '' ? given : (messages[end]?.text.trim() ?? '')

  if (spoken === '') return null

  let asked = ''

  messages.slice(0, end === -1 ? messages.length : end).forEach(one => {
    if (one.role === 'user' && said(one) !== '') asked = said(one)
  })

  return { ask: asked === '' ? '(the opening of the session)' : asked, answer: spoken }
}

const ask = async ($: EngineInterface, choice: ModelChoice, prompt: string) =>
  choice === 'session'
    ? await $.model.fork({ prompt: SYSTEM + '\n\n' + prompt })
    : await $.model.complete({ model: choice, system: SYSTEM, prompt, maxTokens: 4096 })

const REASONS: Record<string, string> = {
  'nothing-to-fork': 'There is nothing in this session to review yet.',
  'empty-reply': 'The reviewer answered with nothing.',
  aborted: 'The review was cut short.',
}

const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
let frame = 0

const run = async ($: EngineInterface, answer?: string) => {
  if (await read($, isRunning)) return

  await update($, isRunning, () => true)
  await update($, error, () => null)
  await update($, review, () => null)

  const spin = $.clock.every(100, () => {
    frame = (frame + 1) % SPINNER.length
    $.ui.status((SPINNER[frame] ?? '') + ' reviewing the last response')
    $.ui.invalidate('ui.render')
  })

  try {
    const turn = await lastTurn($, answer)

    if (turn === null) {
      await update($, error, () => 'There is no answer to review yet.')

      return
    }

    const choice = await read($, modelChoice)
    const reply = await ask($, choice, buildPrompt(turn.ask, turn.answer))

    if (!reply.isAnswered) {
      const said =
        reply.reason === 'api-error'
          ? 'The review request failed' + (reply.status === null ? '.' : ' (' + reply.status + ').')
          : (REASONS[reply.reason] ?? 'The reviewer gave no answer.')

      await update($, error, () => said)

      return
    }

    const label = MODEL_CHOICES.find(one => one.id === choice)?.label ?? choice
    const parsed = parseReview(reply.text, label, await $.clock.now())

    if ('error' in parsed) {
      await update($, error, () => parsed.error)

      return
    }

    await update($, review, () => parsed.review)
  } catch (thrown) {
    await update($, error, () => (thrown instanceof Error ? thrown.message : String(thrown)))
  } finally {
    spin.cancel()
    $.ui.status(undefined)
    await update($, isRunning, () => false)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'critique',
      description: 'Review the last response in a pane',
    })

    return next(e)
  })

  on('command.run', { command: 'critique' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Self-critique', columns: 76 })
    void run($)

    return { text: 'Reviewing the last response.' }
  })

  on('turn.complete', async ($, e, next) => {
    const ran = await next(e)

    if (e.agentId === undefined && e.reason === 'answer' && (await read($, isAuto))) {
      void (async () => {
        await $.ui.open({ id: PANE, title: 'Self-critique', columns: 76 })
        await run($, e.answer)
      })()
    }

    return ran
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const found = await read($, review)
    const running = await read($, isRunning)
    const failed = await read($, error)
    const choice = await read($, modelChoice)
    const auto = await read($, isAuto)
    const spinner = SPINNER[frame] ?? ''

    return (
      <Box flexDirection="column">
        <Box>
          {running && <Text color="cyan">{spinner} </Text>}
          <Button
            key="rerun"
            label={running ? 'Reviewing' : 'Rerun'}
            hotkey="r"
            variant="primary"
            onPress={() => void run($)}
          />
          <Text> </Text>
          <Button
            key="auto"
            label={auto ? 'Auto on' : 'Auto off'}
            hotkey="a"
            dimColor={!auto}
            onPress={() => update($, isAuto, one => !one)}
          />
        </Box>
        <Box>
          <Text dimColor>Model </Text>
          {MODEL_CHOICES.map(one => (
            <Box>
              <Button
                key={'model-' + one.id}
                label={one.label}
                variant={one.id === choice ? 'primary' : 'secondary'}
                dimColor={one.id !== choice}
                onPress={() => update($, modelChoice, () => one.id)}
              />
              <Text> </Text>
            </Box>
          ))}
        </Box>

        <Box marginTop={1} flexDirection="column">
          {running && <Text color="cyan">{spinner} Reading the last response</Text>}
          {!running && failed !== null && <Text color="red">{failed}</Text>}
          {!running && found === null && failed === null && (
            <Text dimColor>Nothing reviewed yet.</Text>
          )}
          {found !== null && (
            <Box flexDirection="column">
              <Box>
                <Text bold color={VERDICT_COLOR[found.verdict]}>
                  {found.verdict}
                </Text>
                <Text dimColor> reviewed by {found.model}</Text>
              </Box>
              <Text wrap="wrap">{found.summary}</Text>

              <Box flexDirection="column" marginTop={1}>
                <Text bold>Strengths</Text>
                {found.strengths.length === 0 && <Text dimColor>None worth naming.</Text>}
                {found.strengths.map(said => (
                  <Text wrap="wrap">- {said}</Text>
                ))}
              </Box>

              <Box flexDirection="column" marginTop={1}>
                <Text bold>Flaws</Text>
                {found.flaws.length === 0 && <Text dimColor>None found.</Text>}
                {found.flaws.map((flaw, index) => (
                  <Box flexDirection="column" marginTop={index === 0 ? 0 : 1}>
                    <Text wrap="wrap" color="red">
                      - {flaw.title}
                    </Text>
                    {flaw.detail !== '' && (
                      <Text wrap="wrap" dimColor>
                        {'  '}
                        {flaw.detail}
                      </Text>
                    )}
                    {flaw.fix !== '' && (
                      <Button
                        key={'fix-' + index}
                        label="Make this fix"
                        onPress={() => {
                          void $.ui.close({ id: PANE })
                          void $.prompt.submit({ text: flaw.fix })
                        }}
                      />
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    )
  })
}
