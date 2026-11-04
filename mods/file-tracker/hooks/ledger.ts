import type { Entry, Kind } from '../types'

const settle = (had: Kind, next: Kind): Kind | null => {
  if (had === 'created' && next === 'deleted') return null
  if (had === 'created' && next === 'modified') return 'created'

  return next
}

export const fold = (list: readonly Entry[], one: Entry): Entry[] => {
  const had = list.find(x => x.path === one.path)
  const rest = list.filter(x => x.path !== one.path)

  if (had === undefined) {
    return [one, ...rest]
  }

  const kind = settle(had.kind, one.kind)
  if (kind === null) {
    return rest
  }

  const patch = kind === 'deleted' ? null : (one.patch ?? had.patch)

  return [{ path: one.path, kind, at: one.at, patch, isFolder: one.isFolder }, ...rest]
}

export const drop = (list: readonly Entry[], path: string): Entry[] =>
  list.filter(one => one.path !== path)

export const dropKind = (list: readonly Entry[], kind: Kind): Entry[] =>
  list.filter(one => one.kind !== kind)
