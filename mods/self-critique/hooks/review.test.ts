import { expect, test } from 'claude-code/testing'

import { buildPrompt, parseReview } from './review'

const good = JSON.stringify({
  verdict: 'mixed',
  summary: 'It answered the question and skipped the tests.',
  strengths: ['Named the file and the line.', '  ', 42],
  flaws: [
    { title: 'No test', detail: 'Nothing covers the new branch.', fix: 'Write a test for the new branch.' },
    { title: '', detail: '', fix: 'ignored' },
  ],
})

test('reads a review out of a fenced reply', () => {
  const parsed = parseReview('```json\n' + good + '\n```', 'Haiku', 7)

  if ('error' in parsed) throw new Error(parsed.error)

  expect(parsed.review.verdict).toBe('Mixed')
  expect(parsed.review.model).toBe('Haiku')
  expect(parsed.review.reviewedAt).toBe(7)
  expect(parsed.review.strengths).toEqual(['Named the file and the line.'])
  expect(parsed.review.flaws.length).toBe(1)
  expect(parsed.review.flaws[0]?.fix).toBe('Write a test for the new branch.')
})

test('reads a review the model wrapped in prose', () => {
  const parsed = parseReview('Here it is:\n' + good + '\nHope that helps.', 'Opus', 1)

  expect('error' in parsed).toBe(false)
})

test('a verdict it did not spell falls to Mixed', () => {
  const parsed = parseReview(JSON.stringify({ verdict: 'ok', summary: 'Fine.' }), 'Opus', 1)

  if ('error' in parsed) throw new Error(parsed.error)

  expect(parsed.review.verdict).toBe('Mixed')
  expect(parsed.review.strengths).toEqual([])
  expect(parsed.review.flaws).toEqual([])
})

test('a reply that is not JSON comes back as an error', () => {
  const parsed = parseReview('I think the answer was pretty good.', 'Sonnet', 1)

  expect('error' in parsed).toBe(true)
})

test('an empty review comes back as an error', () => {
  const parsed = parseReview(JSON.stringify({ verdict: 'Strong' }), 'Sonnet', 1)

  expect('error' in parsed).toBe(true)
})

test('the prompt carries the ask and the answer', () => {
  const prompt = buildPrompt('fix the parser', 'I fixed it.')

  expect(prompt.includes('fix the parser')).toBe(true)
  expect(prompt.includes('I fixed it.')).toBe(true)
})
