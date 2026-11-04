import { expect, test } from 'claude-code/testing'

import { drop, dropKind, fold } from './ledger'
import type { Entry } from '../types'

const event = (path: string, kind: Entry['kind'], at: number, patch: string[] | null = null): Entry =>
  ({ path, kind, at, patch, isFolder: false })

test('un file creato e poi modificato resta creato', async () => {
  const one = fold([], event('/a', 'created', 1))
  const two = fold(one, event('/a', 'modified', 2))

  expect(two.length).toBe(1)
  expect(two[0].kind).toBe('created')
})

test('un file creato e poi cancellato sparisce del tutto', async () => {
  const one = fold([], event('/a', 'created', 1))
  const two = fold(one, event('/a', 'deleted', 2))

  expect(two.length).toBe(0)
})

test('un file che c era e che viene cancellato resta come cancellato', async () => {
  const one = fold([], event('/a', 'modified', 1))
  const two = fold(one, event('/a', 'deleted', 2))

  expect(two.length).toBe(1)
  expect(two[0].kind).toBe('deleted')
})

test('di un file cancellato non si tiene la patch', async () => {
  const one = fold([], event('/a', 'modified', 1, ['+ ciao']))
  const two = fold(one, event('/a', 'deleted', 2))

  expect(two[0].patch).toBe(null)
})

test('un file cancellato e poi ricreato torna creato', async () => {
  const one = fold([], event('/a', 'deleted', 1))
  const two = fold(one, event('/a', 'created', 2))

  expect(two.length).toBe(1)
  expect(two[0].kind).toBe('created')
})

test('due modifiche allo stesso file restano una riga sola con l ultima patch', async () => {
  const one = fold([], event('/a', 'modified', 1, ['+ prima']))
  const two = fold(one, event('/a', 'modified', 2, ['+ dopo']))

  expect(two.length).toBe(1)
  expect(two[0].patch).toEqual(['+ dopo'])
})

test('un evento senza patch non cancella la patch che c era', async () => {
  const one = fold([], event('/a', 'modified', 1, ['+ prima']))
  const two = fold(one, event('/a', 'modified', 2, null))

  expect(two[0].patch).toEqual(['+ prima'])
})

test('l ultimo toccato sta in cima', async () => {
  const one = fold([], event('/a', 'modified', 1))
  const two = fold(one, event('/b', 'modified', 2))
  const three = fold(two, event('/a', 'modified', 3))

  expect(three.map(x => x.path)).toEqual(['/a', '/b'])
})

test('file diversi restano righe diverse', async () => {
  const one = fold([], event('/a', 'created', 1))
  const two = fold(one, event('/b', 'deleted', 2))

  expect(two.length).toBe(2)
})

test('un file visto esce dalla lista', async () => {
  const list = fold(fold([], event('/a', 'modified', 1)), event('/b', 'deleted', 2))

  expect(drop(list, '/a').map(x => x.path)).toEqual(['/b'])
})

test('vedere un percorso che non c e lascia la lista com era', async () => {
  const list = fold([], event('/a', 'modified', 1))

  expect(drop(list, '/z')).toEqual(list)
})

test('un file visto e poi toccato di nuovo torna in lista da zero', async () => {
  const list = fold([], event('/a', 'created', 1, ['+ prima']))
  const back = fold(drop(list, '/a'), event('/a', 'modified', 2, ['+ dopo']))

  expect(back.length).toBe(1)
  expect(back[0].kind).toBe('modified')
  expect(back[0].patch).toEqual(['+ dopo'])
})

test('visto un gruppo intero escono solo le righe di quel tipo', async () => {
  const list = [event('/a', 'created', 1), event('/b', 'modified', 2), event('/c', 'modified', 3)]

  expect(dropKind(list, 'modified').map(x => x.path)).toEqual(['/a'])
})

test('vedere un gruppo che non c e lascia la lista com era', async () => {
  const list = [event('/a', 'created', 1)]

  expect(dropKind(list, 'deleted')).toEqual(list)
})
