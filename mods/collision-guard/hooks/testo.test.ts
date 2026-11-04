import { expect, test } from 'claude-code/testing'

import type { Rivendicazione } from '../types'
import { domanda, nome, quando } from './testo'

const chi: Rivendicazione = {
  sessione: '0123456789abcdef',
  radice: '/p',
  lavoro: '',
  stato: 'in corso',
  battito: 0,
  file: {},
}

test('il nome di una sessione sta in otto caratteri', async () => {
  expect(nome(chi.sessione)).toBe('01234567')
})

test('sotto il minuto si contano i secondi', async () => {
  expect(quando(30_000)).toBe('30 secondi fa')
})

test('un minuto solo si dice al singolare', async () => {
  expect(quando(60_000)).toBe('un minuto fa')
})

test("oltre l'ora si contano le ore", async () => {
  expect(quando(7_200_000)).toBe('2 ore fa')
})

test('la domanda dice chi, quando e come sta', async () => {
  const testo = domanda('a.txt', [{ chi, quando: 1000 }], 61_000, '')

  expect(testo.startsWith('a.txt ')).toBe(true)
  expect(testo.includes('01234567')).toBe(true)
  expect(testo.includes('un minuto fa')).toBe(true)
  expect(testo.includes('in corso')).toBe(true)
  expect(testo.endsWith('?')).toBe(true)
})

test('il diff entra nella domanda quando git ha qualcosa da dire', async () => {
  const testo = domanda('a.txt', [{ chi, quando: 1000 }], 2000, 'a.txt | 3 +++')

  expect(testo.includes('a.txt | 3 +++')).toBe(true)
})
