import type { Entry } from '../types'
import { folderOf, normalise } from './collect'

export type Found = { name: string; kind: 'file' | 'dir' | 'other'; mtimeMs: number }
export type Listing = (path: string) => Promise<readonly Found[]>
export type Snapshot = { seen: Map<string, number>; full: boolean }

// Cartelle che un programma riempie di suo e che nessuno vuole vedere elencate.
const SKIPPED = new Set([
  'node_modules',
  '.git',
  'target',
  'dist',
  'build',
  'out',
  '.venv',
  'venv',
  '__pycache__',
  '.angular',
  '.next',
  '.gradle',
  '.idea',
  '.mvn',
  'coverage',
])
const DEPTH = 3
const CAP = 4000
const ROOTS = 6
const PRINTED = 40

const join = (folder: string, name: string) =>
  folder.endsWith('\\') ? `${folder}${name}` : `${folder}\\${name}`

export const snapshot = async (
  list: Listing,
  roots: readonly string[],
  depth = DEPTH,
  cap = CAP,
): Promise<Snapshot> => {
  const seen = new Map<string, number>()
  const done = new Set<string>()
  const queue = roots.map(one => ({ path: one, left: depth }))

  while (queue.length > 0) {
    const here = queue.shift() as { path: string; left: number }
    if (done.has(here.path)) continue
    done.add(here.path)

    let found: readonly Found[]
    try {
      found = await list(here.path)
    } catch {
      continue
    }

    for (const one of found) {
      const path = join(here.path, one.name)

      if (one.kind === 'dir') {
        if (here.left > 1 && !SKIPPED.has(one.name.toLowerCase())) {
          queue.push({ path, left: here.left - 1 })
        }
        continue
      }
      if (one.kind !== 'file') continue
      // Oltre il tetto il giro si ferma: un elenco monco non puo dire chi manca.
      if (seen.size >= cap) return { seen, full: false }
      seen.set(path, one.mtimeMs)
    }
  }

  return { seen, full: true }
}

export const changes = (
  before: Snapshot,
  after: Snapshot,
  since: number,
  at: number,
): Entry[] => {
  const out: Entry[] = []

  for (const [path, mtime] of after.seen) {
    // Il giro di dopo tocca anche cartelle che quello di prima non aveva: li
    // l'unica prova che il file sia di questa chiamata e la data.
    if (mtime < since) continue

    const had = before.seen.get(path)
    if (had === undefined) {
      out.push({ path, kind: 'created', at, patch: null, isFolder: false })
      continue
    }
    if (mtime > had) out.push({ path, kind: 'modified', at, patch: null, isFolder: false })
  }

  if (before.full && after.full) {
    for (const path of before.seen.keys()) {
      if (!after.seen.has(path)) out.push({ path, kind: 'deleted', at, patch: null, isFolder: false })
    }
  }

  return out
}

const TRIM = /^[("'`[<]+|[)"'`\].,:;>]+$/g
const EXTENSION = /\.[A-Za-z0-9]{1,8}$/
const SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//

// Generosa di proposito: chi legge questi nomi li passa comunque a stat, e un
// nome che non e un file nato adesso cade li.
export const printed = (text: string): string[] => {
  const found: string[] = []

  for (const word of text.split(/[\s|]+/)) {
    const one = word.replace(TRIM, '')
    if (one === '' || one.length > 260) continue
    if (!/[\\/]/.test(one) && !EXTENSION.test(one)) continue
    if (SCHEME.test(one)) continue
    if (!found.includes(one)) found.push(one)
    if (found.length === PRINTED) break
  }

  return found
}

const isAbsolute = (path: string) =>
  /^[a-zA-Z]:[\\/]/.test(path) || path.startsWith('/') || path.startsWith('\\')

export const rootsOf = (paths: readonly string[], cwd: string): string[] => {
  const out = [normalise(cwd)]

  for (const one of paths) {
    const folder = folderOf(normalise(isAbsolute(one) ? one : `${cwd}\\${one}`))
    if (!out.includes(folder)) out.push(folder)
    if (out.length === ROOTS) break
  }

  return out
}
