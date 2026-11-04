import type { Entry, Kind } from '../types'
import { candidates } from './shell'
import { diffOf } from './diff'

export type World = {
  exists: (path: string) => Promise<boolean>
  isFolder: (path: string) => Promise<boolean>
  read: (path: string) => Promise<string | null>
  covered: (path: string) => Promise<boolean>
  now: () => Promise<number>
  cwd: () => Promise<string>
}

export type Before = Map<string, { exists: boolean; isFolder: boolean; text: string | null }>

const SHELL = new Set(['Bash', 'PowerShell'])
const WRITERS = new Set(['Edit', 'Write'])
const TOO_BIG = 400000

const isAbsolute = (path: string) =>
  /^[a-zA-Z]:[\\/]/.test(path) || path.startsWith('/') || path.startsWith('\\')

// Lo stesso file deve avere sempre la stessa chiave: una barra sola, niente
// . e .., e i percorsi di Git Bash (/c/Users/...) riportati a Windows.
export const normalise = (path: string): string => {
  const drive = /^\/([a-zA-Z])\//.exec(path)
  const start = drive === null ? path : `${drive[1].toUpperCase()}:\\${path.slice(3)}`
  const parts = start.replace(/\//g, '\\').split('\\')
  const out: string[] = []

  parts.forEach((one, at) => {
    if (one === '.') return
    if (one === '' && at > 0) return
    if (one === '..' && out.length > 1) {
      out.pop()

      return
    }
    out.push(one)
  })

  return out.join('\\')
}

export const folderOf = (path: string): string => {
  const cut = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'))
  if (cut < 0) return '.'
  if (cut === 0) return path.slice(0, 1)

  const head = path.slice(0, cut)

  return /^[a-zA-Z]:$/.test(head) ? `${head}\\` : head
}

const linesOf = (patch: unknown): string[] | null => {
  if (!Array.isArray(patch)) return null
  const lines = patch.flatMap(one => (Array.isArray(one?.lines) ? (one.lines as string[]) : []))

  return lines.length > 0 ? lines : null
}

const kindAfter = (was: boolean, is: boolean): Kind | null => {
  if (!was && is) return 'created'
  if (was && !is) return 'deleted'
  if (was && is) return 'modified'

  return null
}

const textOf = async (world: World, path: string): Promise<string | null> => {
  try {
    const text = await world.read(path)

    return text === null || text.length > TOO_BIG ? null : text
  } catch {
    return null
  }
}

export const shellBefore = async (world: World, tool: string, command: string): Promise<Before> => {
  const before: Before = new Map()
  if (!SHELL.has(tool)) return before

  const cwd = await world.cwd()
  for (const name of candidates(command)) {
    const path = normalise(isAbsolute(name) ? name : `${cwd}\\${name}`)
    const exists = await world.exists(path)
    const isFolder = exists ? await world.isFolder(path) : false
    before.set(path, { exists, isFolder, text: isFolder || !exists ? null : await textOf(world, path) })
  }

  return before
}

export const entriesOf = async (
  world: World,
  before: ReadonlyMap<string, { exists: boolean; isFolder: boolean; text: string | null }>,
  tool: string,
  result: Record<string, unknown>,
): Promise<Entry[]> => {
  const at = await world.now()
  const found: Entry[] = []

  if (WRITERS.has(tool)) {
    const path = normalise(String(result.filePath ?? ''))
    if (path !== '') {
      const kind: Kind = result.type === 'create' ? 'created' : 'modified'
      found.push({ path, kind, at, patch: linesOf(result.structuredPatch), isFolder: false })
    }
  }

  for (const [path, was] of before) {
    const kind = kindAfter(was.exists, await world.exists(path))
    if (kind === null) continue
    // Di un percorso cancellato resta solo quello che se ne sapeva prima.
    if (kind === 'deleted') {
      found.push({ path, kind, at, patch: null, isFolder: was.isFolder })
      continue
    }

    const isFolder = await world.isFolder(path)
    const now = isFolder ? null : await textOf(world, path)
    const patch = now === null ? null : diffOf(was.text ?? '', now)
    // Un comando che non ha cambiato niente non e una notizia.
    if (patch !== null && patch.length === 0 && kind === 'modified') continue

    found.push({ path, kind, at, patch, isFolder })
  }

  const kept: Entry[] = []
  for (const one of found) {
    if (!(await world.covered(one.path))) kept.push(one)
  }

  return kept
}
