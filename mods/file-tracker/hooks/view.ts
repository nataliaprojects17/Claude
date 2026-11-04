import type { Entry, Kind } from '../types'

export type Colour = 'green' | 'yellow' | 'red'

export type Row = { path: string; hasDetail: boolean; isFolder: boolean }

export type Section = {
  kind: Kind
  title: string
  icon: string
  color: Colour
  rows: Row[]
}

export type Line = { text: string; color: Colour | null }

const SAID: Record<Kind, { one: string; many: string; icon: string; color: Colour }> = {
  created: { one: 'creato', many: 'creati', icon: '✚', color: 'green' },
  modified: { one: 'modificato', many: 'modificati', icon: '✎', color: 'yellow' },
  deleted: { one: 'cancellato', many: 'cancellati', icon: '✖', color: 'red' },
}

const ORDER: Kind[] = ['created', 'modified', 'deleted']

export const folderIcon = '🗀'

const titleOf = (kind: Kind, count: number) =>
  `${SAID[kind].many.charAt(0).toUpperCase()}${SAID[kind].many.slice(1)} (${count})`

export const summaryText = (list: readonly Entry[]): string =>
  ORDER.map(kind => {
    const count = list.filter(one => one.kind === kind).length

    return count === 0 ? null : `${count} ${count === 1 ? SAID[kind].one : SAID[kind].many}`
  })
    .filter(one => one !== null)
    .join(' · ')

export const bandParts = (list: readonly Entry[]): Line[] => {
  if (list.length === 0) return []
  const files = list.length === 1 ? '1 file' : `${list.length} file`
  const head: Line = { text: `📒 ${files} fuori dal repo`, color: null }

  const counts = ORDER.map(kind => {
    const count = list.filter(one => one.kind === kind).length
    if (count === 0) return null
    const said = count === 1 ? SAID[kind].one : SAID[kind].many

    return { text: `${SAID[kind].icon}  ${count} ${said}`, color: SAID[kind].color }
  }).filter(one => one !== null)

  return [head, ...counts]
}

// Tre schede su una riga sola: sotto una certa larghezza restano icona e numero.
export const tabLabel = (kind: Kind, count: number, columns: number): string =>
  columns < 60 ? `${SAID[kind].icon}  ${count}` : `${SAID[kind].icon}  ${SAID[kind].many} ${count}`

export const dismissKey = 'd'

// Il pulsante vale per la scheda aperta, quindi il tipo non entra nel testo. La
// lettera nemmeno: la mostra il Button, come fa gia Chiudi.
export const dismissLabel = (): string => '× tutto'

export const dismissAllKey = 'a'

export const dismissAllLabel = (columns: number): string =>
  columns < 60 ? '× tutte' : '× tutte le schede'

export const activeTab = (list: readonly Entry[], chosen: Kind | null): Kind | null => {
  const full = ORDER.filter(kind => list.some(one => one.kind === kind))
  if (chosen !== null && full.includes(chosen)) return chosen

  return full[0] ?? null
}

export const sectionsOf = (list: readonly Entry[]): Section[] =>
  ORDER.map(kind => {
    const mine = list.filter(one => one.kind === kind)

    return {
      kind,
      title: titleOf(kind, mine.length),
      icon: SAID[kind].icon,
      color: SAID[kind].color,
      rows: mine.map(one => ({ path: one.path, hasDetail: one.patch !== null, isFolder: one.isFolder === true })),
    }
  }).filter(one => one.rows.length > 0)

export const detailOf = (one: Entry): Line[] => {
  if (one.patch === null) {
    const text =
      one.kind === 'deleted'
        ? 'Cancellato: del contenuto non si tiene copia.'
        : 'Nessun diff: il contenuto non era leggibile, o era troppo grande.'

    return [{ text, color: null }]
  }

  return one.patch.map(text => ({
    text,
    color: text.startsWith('+') ? 'green' : text.startsWith('-') ? 'red' : null,
  }))
}

export const nameOf = (path: string): string => {
  const cut = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'))

  return cut < 0 ? path : path.slice(cut + 1)
}
