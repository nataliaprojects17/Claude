import { expect, test } from 'claude-code/testing'

import type { Rivendicazione } from '../types'
import { VITA, cernita, scontri } from './vive'

const una = (sessione: string, radice: string, battito: number, file = {}): Rivendicazione => ({
  sessione,
  radice,
  lavoro: '',
  stato: 'in corso',
  battito,
  file,
})

test('la propria rivendicazione non si conta', async () => {
  const { tenute } = cernita([['claim:io', una('io', '/p', 1000)]], 'io', '/p', 1000)

  expect(tenute.length).toBe(0)
})

test('una sessione viva sullo stesso progetto si tiene', async () => {
  const { tenute } = cernita([['claim:altra', una('altra', '/p', 1000)]], 'io', '/p', 1000)

  expect(tenute.length).toBe(1)
})

test('oltre la vita del battito la chiave si butta', async () => {
  const { tenute, morte } = cernita(
    [['claim:altra', una('altra', '/p', 1000)]],
    'io',
    '/p',
    1000 + VITA + 1,
  )

  expect(tenute.length).toBe(0)
  expect(morte).toEqual(['claim:altra'])
})

test('una sessione su un altro progetto si ignora ma non si cancella', async () => {
  const { tenute, morte } = cernita([['claim:altra', una('altra', '/altro', 1000)]], 'io', '/p', 1000)

  expect(tenute.length).toBe(0)
  expect(morte.length).toBe(0)
})

test('una chiave che non ha la forma giusta si butta', async () => {
  const { morte } = cernita([['claim:rotta', { ciao: 1 }]], 'io', '/p', 1000)

  expect(morte).toEqual(['claim:rotta'])
})

test('lo scontro e solo sul file chiesto', async () => {
  const tenute = [una('altra', '/p', 1000, { 'a.txt': { azione: 'scritto', quando: 900 } })]

  expect(scontri(tenute, 'a.txt').length).toBe(1)
  expect(scontri(tenute, 'b.txt').length).toBe(0)
})

test('gli scontri arrivano dal piu recente', async () => {
  const tenute = [
    una('vecchia', '/p', 1000, { 'a.txt': { azione: 'scritto', quando: 100 } }),
    una('nuova', '/p', 1000, { 'a.txt': { azione: 'scritto', quando: 900 } }),
  ]

  expect(scontri(tenute, 'a.txt')[0]?.chi.sessione).toBe('nuova')
})
