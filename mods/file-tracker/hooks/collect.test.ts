import { expect, test } from 'claude-code/testing'

import { entriesOf, folderOf, shellBefore } from './collect'
import type { Before, World } from './collect'

const OUT = 'C:\\temp\\fuori\\a.txt'
const DIR = 'C:\\temp\\fuori\\sotto'
const patch = [{ oldStart: 0, oldLines: 0, newStart: 1, newLines: 1, lines: ['+ciao'] }]

const worldOf = (there: Map<string, string>, covered: string[] = [], folders: string[] = []): World => ({
  exists: async path => there.has(path) || folders.includes(path),
  isFolder: async path => folders.includes(path),
  read: async path => there.get(path) ?? null,
  covered: async path => covered.includes(path),
  now: async () => 7,
  cwd: async () => 'C:\\lavoro',
})

const was = (path: string, exists: boolean, text: string | null = null, isFolder = false): Before =>
  new Map([[path, { exists, isFolder, text }]])

test('una Write su un file nuovo: una riga creato, con la patch', async () => {
  const got = await entriesOf(worldOf(new Map()), new Map(), 'Write', {
    type: 'create',
    filePath: OUT,
    structuredPatch: patch,
  })

  expect(got.length).toBe(1)
  expect(got[0]).toEqual({ path: OUT, kind: 'created', at: 7, patch: ['+ciao'], isFolder: false })
})

test('una Write su un file che esisteva: una riga modificato', async () => {
  const got = await entriesOf(worldOf(new Map([[OUT, 'ciao']])), new Map(), 'Write', {
    type: 'update',
    filePath: OUT,
    structuredPatch: patch,
  })

  expect(got[0].kind).toBe('modified')
})

test('una Edit: una riga modificato, con la patch del risultato', async () => {
  const got = await entriesOf(worldOf(new Map([[OUT, 'ciao']])), new Map(), 'Edit', {
    filePath: OUT,
    structuredPatch: patch,
  })

  expect(got[0].kind).toBe('modified')
  expect(got[0].patch).toEqual(['+ciao'])
})

test('un file coperto da git: nessuna riga', async () => {
  const got = await entriesOf(worldOf(new Map(), [OUT]), new Map(), 'Write', {
    type: 'create',
    filePath: OUT,
    structuredPatch: patch,
  })

  expect(got).toEqual([])
})

test('un tool che non scrive file: nessuna riga', async () => {
  const got = await entriesOf(worldOf(new Map()), new Map(), 'Read', { filePath: OUT })

  expect(got).toEqual([])
})

test('un risultato senza percorso: nessuna riga', async () => {
  const got = await entriesOf(worldOf(new Map()), new Map(), 'Write', { type: 'create' })

  expect(got).toEqual([])
})

test('un file che c era e adesso non c e: cancellato, senza patch', async () => {
  const got = await entriesOf(worldOf(new Map()), was(OUT, true, 'ciao'), 'Bash', {})

  expect(got).toEqual([{ path: OUT, kind: 'deleted', at: 7, patch: null, isFolder: false }])
})

test('un file creato dalla shell: il diff c e, tutto aggiunto', async () => {
  const got = await entriesOf(worldOf(new Map([[OUT, 'uno\ndue\n']])), was(OUT, false, null), 'Bash', {})

  expect(got[0].kind).toBe('created')
  expect(got[0].patch).toEqual(['+uno', '+due'])
})

test('un file cambiato dalla shell: il diff mostra cosa e cambiato', async () => {
  const got = await entriesOf(
    worldOf(new Map([[OUT, 'uno\ntre\n']])),
    was(OUT, true, 'uno\ndue\n'),
    'Bash',
    {},
  )

  expect(got[0].kind).toBe('modified')
  expect(got[0].patch).toEqual([' uno', '-due', '+tre'])
})

test('un file che la shell ha lasciato uguale: nessuna riga', async () => {
  const got = await entriesOf(worldOf(new Map([[OUT, 'uno\n']])), was(OUT, true, 'uno\n'), 'Bash', {})

  expect(got).toEqual([])
})

test('un file illeggibile toccato dalla shell: la riga c e, il diff no', async () => {
  const world: World = { ...worldOf(new Map([[OUT, 'x']])), read: async () => null }
  const got = await entriesOf(world, was(OUT, true, null), 'Bash', {})

  expect(got[0].kind).toBe('modified')
  expect(got[0].patch).toBe(null)
})

test('un file che non c era e non c e: nessuna riga', async () => {
  const got = await entriesOf(worldOf(new Map()), was(OUT, false, null), 'Bash', {})

  expect(got).toEqual([])
})

test('prima del comando legge esistenza e contenuto dei percorsi leggibili', async () => {
  const before = await shellBefore(worldOf(new Map([[OUT, 'ciao']])), 'Bash', `rm -f ${OUT}`)

  expect([...before.entries()]).toEqual([[OUT, { exists: true, isFolder: false, text: 'ciao' }]])
})

test('un file troppo grosso non viene tenuto in memoria', async () => {
  const big = 'x'.repeat(400001)
  const before = await shellBefore(worldOf(new Map([[OUT, big]])), 'Bash', `rm -f ${OUT}`)

  expect(before.get(OUT)).toEqual({ exists: true, isFolder: false, text: null })
})

test('un percorso relativo viene letto dalla cartella della sessione', async () => {
  const before = await shellBefore(worldOf(new Map([['C:\\lavoro\\a.txt', 'x']])), 'Bash', 'rm -f a.txt')

  expect([...before.keys()]).toEqual(['C:\\lavoro\\a.txt'])
})

test('un comando illeggibile: niente da guardare', async () => {
  const before = await shellBefore(worldOf(new Map([[OUT, 'x']])), 'Bash', 'rm -rf $DIR/*.tmp')

  expect(before.size).toBe(0)
})

test('un tool che non e una shell: niente da guardare', async () => {
  const before = await shellBefore(worldOf(new Map([[OUT, 'x']])), 'Write', `rm -f ${OUT}`)

  expect(before.size).toBe(0)
})

test('un percorso con ./ dentro diventa lo stesso percorso di una scrittura', async () => {
  const before = await shellBefore(worldOf(new Map([['C:\\lavoro\\a.txt', 'x']])), 'Bash', 'rm ./a.txt')

  expect([...before.keys()]).toEqual(['C:\\lavoro\\a.txt'])
})

test('un percorso con .. viene risolto', async () => {
  const before = await shellBefore(worldOf(new Map()), 'Bash', 'rm C:\\lavoro\\sotto\\..\\a.txt')

  expect([...before.keys()]).toEqual(['C:\\lavoro\\a.txt'])
})

test('le barre miste diventano barre di Windows', async () => {
  const before = await shellBefore(worldOf(new Map()), 'Bash', 'rm C:/lavoro/a.txt')

  expect([...before.keys()]).toEqual(['C:\\lavoro\\a.txt'])
})

test('un percorso di Git Bash diventa un percorso di Windows', async () => {
  const before = await shellBefore(worldOf(new Map()), 'Bash', 'rm -f /c/Users/x/a.txt')

  expect([...before.keys()]).toEqual(['C:\\Users\\x\\a.txt'])
})

test('anche il percorso di una scrittura viene normalizzato', async () => {
  const got = await entriesOf(worldOf(new Map()), new Map(), 'Write', {
    type: 'create',
    filePath: 'C:/lavoro/./a.txt',
    structuredPatch: [],
  })

  expect(got[0].path).toBe('C:\\lavoro\\a.txt')
})

test('la cartella di un file e il pezzo prima del nome', async () => {
  expect(folderOf('C:\\a\\b.txt')).toBe('C:\\a')
})

test('la cartella di un file nella radice del disco e la radice', async () => {
  expect(folderOf('C:\\nota.txt')).toBe('C:\\')
})

test('la cartella di un file nella radice unix e la radice', async () => {
  expect(folderOf('/nota.txt')).toBe('/')
})

test('un nome senza cartella da la cartella corrente', async () => {
  expect(folderOf('nota.txt')).toBe('.')
})

test('una cartella cancellata porta il segno di cartella', async () => {
  const got = await entriesOf(worldOf(new Map()), was(DIR, true, null, true), 'Bash', {})

  expect(got[0].kind).toBe('deleted')
  expect(got[0].isFolder).toBe(true)
})

test('prima del comando una cartella non viene letta come testo', async () => {
  const before = await shellBefore(worldOf(new Map(), [], [DIR]), 'Bash', `rm -rf ${DIR}`)

  expect(before.get(DIR)).toEqual({ exists: true, isFolder: true, text: null })
})
