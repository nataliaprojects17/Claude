import { expect, test } from 'claude-code/testing'

import { changes, printed, rootsOf, snapshot } from './sweep'
import type { Found, Listing, Snapshot } from './sweep'

const tree = (what: Record<string, Found[]>): Listing => async path => {
  const found = what[path]
  if (found === undefined) throw new Error(`niente ${path}`)

  return found
}

const file = (name: string, mtimeMs: number): Found => ({ name, kind: 'file', mtimeMs })
const dir = (name: string): Found => ({ name, kind: 'dir', mtimeMs: 0 })

const snap = (seen: Record<string, number>, full = true): Snapshot => ({
  seen: new Map(Object.entries(seen)),
  full,
})

test('il giro elenca i file di una cartella', async () => {
  const got = await snapshot(tree({ 'C:\\x': [file('a.txt', 5)] }), ['C:\\x'])

  expect(got.seen.get('C:\\x\\a.txt')).toBe(5)
  expect(got.full).toBe(true)
})

test('il giro scende nelle sottocartelle fino alla profondita data', async () => {
  const list = tree({
    'C:\\x': [dir('uno')],
    'C:\\x\\uno': [dir('due')],
    'C:\\x\\uno\\due': [file('fondo.txt', 9)],
  })

  expect((await snapshot(list, ['C:\\x'], 3)).seen.has('C:\\x\\uno\\due\\fondo.txt')).toBe(true)
  expect((await snapshot(list, ['C:\\x'], 2)).seen.has('C:\\x\\uno\\due\\fondo.txt')).toBe(false)
})

test('il giro non entra in node_modules', async () => {
  const got = await snapshot(
    tree({ 'C:\\x': [dir('node_modules')], 'C:\\x\\node_modules': [file('tanto.js', 1)] }),
    ['C:\\x'],
  )

  expect(got.seen.size).toBe(0)
})

test('una cartella che non si legge non ferma il giro', async () => {
  const got = await snapshot(tree({ 'C:\\x': [file('a.txt', 5)] }), ['C:\\vietata', 'C:\\x'])

  expect(got.seen.size).toBe(1)
})

test('oltre il tetto il giro si dichiara monco', async () => {
  const got = await snapshot(tree({ 'C:\\x': [file('a.txt', 1), file('b.txt', 2)] }), ['C:\\x'], 3, 1)

  expect(got.full).toBe(false)
})

test('un file che prima non c era e creato', async () => {
  const got = changes(snap({}), snap({ 'C:\\x\\a.txt': 50 }), 10, 70)

  expect(got).toEqual([
    { path: 'C:\\x\\a.txt', kind: 'created', at: 70, patch: null, isFolder: false },
  ])
})

test('un file piu vecchio della chiamata non e una notizia', async () => {
  expect(changes(snap({}), snap({ 'C:\\x\\a.txt': 5 }), 10, 70)).toEqual([])
})

test('un file con la data cambiata e modificato', async () => {
  const got = changes(snap({ 'C:\\x\\a.txt': 20 }), snap({ 'C:\\x\\a.txt': 50 }), 10, 70)

  expect(got[0].kind).toBe('modified')
})

test('un file che il comando non ha toccato resta fuori', async () => {
  expect(changes(snap({ 'C:\\x\\a.txt': 20 }), snap({ 'C:\\x\\a.txt': 20 }), 10, 70)).toEqual([])
})

test('un file sparito e cancellato', async () => {
  const got = changes(snap({ 'C:\\x\\a.txt': 20 }), snap({}), 10, 70)

  expect(got[0]).toEqual({
    path: 'C:\\x\\a.txt',
    kind: 'deleted',
    at: 70,
    patch: null,
    isFolder: false,
  })
})

test('con un elenco monco nessuno viene dato per cancellato', async () => {
  expect(changes(snap({ 'C:\\x\\a.txt': 20 }), snap({}, false), 10, 70)).toEqual([])
})

test('un percorso stampato si riconosce dalle barre', async () => {
  expect(printed('scritto tools/out/report.csv')).toEqual(['tools/out/report.csv'])
})

test('un nome con estensione vale anche senza barre', async () => {
  expect(printed('ho scritto report.csv')).toEqual(['report.csv'])
})

test('la punteggiatura intorno al percorso non entra', async () => {
  expect(printed("salvato in 'C:\\x\\a.txt'.")).toEqual(['C:\\x\\a.txt'])
})

test('un indirizzo http non e un file', async () => {
  expect(printed('http://localhost:8081/api/x.json')).toEqual([])
})

test('una parola qualunque non e un percorso', async () => {
  expect(printed('tutto bene, nessun errore')).toEqual([])
})

test('le radici partono dalla cartella di lavoro', async () => {
  expect(rootsOf([], 'C:\\lavoro')).toEqual(['C:\\lavoro'])
})

test('un percorso relativo porta la sua cartella sotto quella di lavoro', async () => {
  expect(rootsOf(['out/report.csv'], 'C:\\lavoro')).toEqual(['C:\\lavoro', 'C:\\lavoro\\out'])
})

test('un percorso assoluto porta la sua cartella', async () => {
  expect(rootsOf(['D:\\altro\\a.txt'], 'C:\\lavoro')).toEqual(['C:\\lavoro', 'D:\\altro'])
})
