import { expect, test } from 'claude-code/testing'

import { diffOf } from './diff'

test('un file nuovo: tutte righe aggiunte', async () => {
  expect(diffOf('', 'uno\ndue\n')).toEqual(['+uno', '+due'])
})

test('una riga cambiata: la vecchia e la nuova', async () => {
  expect(diffOf('uno\ndue\n', 'uno\ntre\n')).toEqual([' uno', '-due', '+tre'])
})

test('una riga aggiunta in fondo', async () => {
  expect(diffOf('uno\n', 'uno\ndue\n')).toEqual([' uno', '+due'])
})

test('una riga tolta', async () => {
  expect(diffOf('uno\ndue\n', 'due\n')).toEqual(['-uno', ' due'])
})

test('due contenuti uguali: niente', async () => {
  expect(diffOf('uno\n', 'uno\n')).toEqual([])
})

test('niente da confrontare: niente', async () => {
  expect(diffOf('', '')).toEqual([])
})

test('il diff viene tagliato alle duecento righe', async () => {
  const after = Array.from({ length: 500 }, (_, at) => `riga ${at}`).join('\n')
  const got = diffOf('', after)

  expect(got.length).toBe(201)
  expect(got[200]).toBe('  ... altre 300 righe')
})

test('le barre di a capo di Windows non diventano differenze', async () => {
  expect(diffOf('uno\r\ndue\r\n', 'uno\ndue\n')).toEqual([])
})
