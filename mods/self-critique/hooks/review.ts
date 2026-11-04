import type { Flaw, ModelChoice, Review, Verdict } from '../types'

export const MODEL_CHOICES: readonly { id: ModelChoice; label: string }[] = [
  { id: 'session', label: 'Session' },
  { id: 'opus', label: 'Opus' },
  { id: 'sonnet', label: 'Sonnet' },
  { id: 'haiku', label: 'Haiku' },
]

export const SYSTEM = [
  'You review one response an AI coding assistant just gave, as a demanding senior colleague would.',
  'Judge what the response actually did against what was asked: correctness, completeness, unfounded claims, work left out, scope it widened on its own.',
  'Be concrete and never praise to be kind: a response with nothing wrong gets no flaws.',
  '',
  'Answer with one JSON object and nothing else, no prose around it, no code fence:',
  '{"verdict":"Strong|Mixed|Weak","summary":"...","strengths":["..."],"flaws":[{"title":"...","detail":"...","fix":"..."}]}',
  '',
  'Strong: does the job, nothing material wrong. Mixed: does the job with real gaps. Weak: wrong, or it did not do what was asked.',
  '',
  'This is read in a narrow pane, so write bullets, not prose. Every field is one line:',
  '- "summary": one line, at most 15 words.',
  '- each strength: a phrase, at most 10 words, no full sentence.',
  '- "title": at most 6 words. "detail": one line, at most 20 words.',
  '- "fix": one imperative order to the assistant, at most 25 words; it is sent as a prompt.',
  'At most three strengths and three flaws, the ones that matter. Drop the rest.',
].join('\n')

export const buildPrompt = (ask: string, answer: string): string =>
  [
    'What the person asked:',
    '<ask>',
    ask.slice(-4000),
    '</ask>',
    '',
    'What the assistant answered:',
    '<answer>',
    answer.slice(-12000),
    '</answer>',
    '',
    'Review the answer. JSON only.',
  ].join('\n')

const unfence = (text: string): string => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const body = fenced?.[1] ?? text
  const open = body.indexOf('{')
  const close = body.lastIndexOf('}')

  return open === -1 || close <= open ? body.trim() : body.slice(open, close + 1)
}

const asString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

const asVerdict = (value: unknown): Verdict => {
  const word = asString(value).toLowerCase()

  if (word.startsWith('strong')) return 'Strong'
  if (word.startsWith('weak')) return 'Weak'

  return 'Mixed'
}

const asStrengths = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(asString).filter(one => one !== '').slice(0, 3) : []

const asFlaws = (value: unknown): Flaw[] => {
  if (!Array.isArray(value)) return []

  return value
    .map((one): Flaw => {
      const row = (one ?? {}) as Record<string, unknown>

      return {
        title: asString(row.title),
        detail: asString(row.detail),
        fix: asString(row.fix),
      }
    })
    .filter(one => one.title !== '' || one.detail !== '')
    .slice(0, 3)
}

/**
 * Reads the reviewer's reply into a Review, or says why it could not.
 */
export const parseReview = (
  text: string,
  model: string,
  reviewedAt: number,
): { review: Review } | { error: string } => {
  let parsed: unknown

  try {
    parsed = JSON.parse(unfence(text))
  } catch {
    return { error: 'The reviewer did not answer with JSON.' }
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { error: 'The reviewer did not answer with JSON.' }
  }

  const row = parsed as Record<string, unknown>
  const summary = asString(row.summary)
  const strengths = asStrengths(row.strengths)
  const flaws = asFlaws(row.flaws)

  if (summary === '' && strengths.length === 0 && flaws.length === 0) {
    return { error: 'The reviewer answered with an empty review.' }
  }

  return {
    review: { verdict: asVerdict(row.verdict), summary, strengths, flaws, model, reviewedAt },
  }
}
