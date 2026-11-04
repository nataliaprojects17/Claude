import { expect, test } from 'claude-code/testing'

import { gitCover } from './git'
import type { Run } from './git'

const answers = (by: (argv: readonly string[]) => number): { run: Run; calls: string[][] } => {
  const calls: string[][] = []
  const run: Run = async (argv, init) => {
    calls.push([...argv, `cwd=${init?.cwd ?? ''}`])

    return { exitCode: by(argv), stdout: '', stderr: '' }
  }

  return { run, calls }
}

const INSIDE = (argv: readonly string[]) => (argv[1] === 'rev-parse' ? 0 : 1)
const INSIDE_AND_IGNORED = () => 0
const OUTSIDE = () => 128

test('dentro un repo e non ignorato: coperto da git', async () => {
  const { run } = answers(INSIDE)

  expect(await gitCover(run)('C:\\repo\\src\\a.java')).toBe(true)
})

test('dentro un repo ma ignorato da gitignore: non coperto', async () => {
  const { run } = answers(INSIDE_AND_IGNORED)

  expect(await gitCover(run)('C:\\repo\\target\\a.class')).toBe(false)
})

test('fuori da ogni repo: non coperto', async () => {
  const { run } = answers(OUTSIDE)

  expect(await gitCover(run)('C:\\temp\\a.txt')).toBe(false)
})

test('git che non parte: non coperto, e nessuna eccezione', async () => {
  const run: Run = async () => {
    throw new Error('git non trovato')
  }

  expect(await gitCover(run)('C:\\temp\\a.txt')).toBe(false)
})

test('git gira nella cartella del file', async () => {
  const { run, calls } = answers(INSIDE)
  await gitCover(run)('C:\\repo\\src\\a.java')

  expect(calls[0][calls[0].length - 1]).toBe('cwd=C:\\repo\\src')
})

test('la stessa cartella non viene chiesta due volte a git', async () => {
  const { run, calls } = answers(INSIDE)
  const covered = gitCover(run)
  await covered('C:\\repo\\src\\a.java')
  await covered('C:\\repo\\src\\b.java')

  expect(calls.filter(one => one[1] === 'rev-parse').length).toBe(1)
})

test('il percorso passa a git come argomento, non dentro il comando', async () => {
  const { run, calls } = answers(INSIDE)
  await gitCover(run)('C:\\repo\\src\\a b.java')

  const ignore = calls.find(one => one[1] === 'check-ignore')
  expect(ignore?.includes('C:\\repo\\src\\a b.java')).toBe(true)
})

test('check-ignore che va in errore: non coperto, la riga resta', async () => {
  const run: Run = async (argv) => ({
    exitCode: argv[1] === 'rev-parse' ? 0 : 128,
    stdout: '',
    stderr: '',
  })

  expect(await gitCover(run)('C:\\nota.txt')).toBe(false)
})

test('un file nella radice del disco: git gira nella radice, non su C:', async () => {
  const { run, calls } = answers(INSIDE)
  await gitCover(run)('C:\\nota.txt')

  expect(calls[0][calls[0].length - 1]).toBe('cwd=C:\\')
})

test('un file nella radice unix: git gira nella radice', async () => {
  const { run, calls } = answers(INSIDE)
  await gitCover(run)('/nota.txt')

  expect(calls[0][calls[0].length - 1]).toBe('cwd=/')
})

test('due costruzioni che condividono la cache chiedono a git una volta sola', async () => {
  const { run, calls } = answers(INSIDE)
  const shared = new Map<string, Promise<boolean>>()
  await gitCover(run, shared)('C:/repo/a.java')
  await gitCover(run, shared)('C:/repo/b.java')

  expect(calls.filter(one => one[1] === 'rev-parse').length).toBe(1)
})
