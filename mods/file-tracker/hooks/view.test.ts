import { expect, test } from 'claude-code/testing'

import {
  activeTab,
  bandParts,
  detailOf,
  dismissKey,
  dismissAllKey,
  dismissAllLabel,
  dismissLabel,
  nameOf,
  sectionsOf,
  summaryText,
  tabLabel,
} from './view'
import type { Entry } from '../types'

const one = (path: string, kind: Entry['kind'], patch: string[] | null = null): Entry =>
  ({ path, kind, at: 1, patch, isFolder: false })

const MIXED = [
  one('/a', 'created'),
  one('/b', 'created'),
  one('/c', 'modified'),
  one('/d', 'deleted'),
  one('/e', 'deleted'),
  one('/f', 'deleted'),
]

test('con la lista vuota la banda non ha pezzi', async () => {
  expect(bandParts([])).toEqual([])
})

test('ogni conteggio della banda ha il colore di quello che e successo', async () => {
  expect(bandParts(MIXED)).toEqual([
    { text: '📒 6 file fuori dal repo', color: null },
    { text: '✚  2 creati', color: 'green' },
    { text: '✎  1 modificato', color: 'yellow' },
    { text: '✖  3 cancellati', color: 'red' },
  ])
})

test('un gruppo vuoto non compare nella banda', async () => {
  expect(bandParts([one('/a', 'deleted')])).toEqual([
    { text: '📒 1 file fuori dal repo', color: null },
    { text: '✖  1 cancellato', color: 'red' },
  ])
})

test('il riassunto a parole resta senza icone', async () => {
  expect(summaryText(MIXED)).toBe('2 creati · 1 modificato · 3 cancellati')
})

test('le sezioni vanno in ordine creati, modificati, cancellati', async () => {
  expect(sectionsOf(MIXED).map(s => s.title)).toEqual([
    'Creati (2)',
    'Modificati (1)',
    'Cancellati (3)',
  ])
})

test('una sezione vuota non compare', async () => {
  expect(sectionsOf([one('/a', 'modified')]).map(s => s.title)).toEqual(['Modificati (1)'])
})

test('ogni sezione ha la sua icona e il suo colore', async () => {
  const [created, modified, deleted] = sectionsOf(MIXED)

  expect([created.icon, created.color]).toEqual(['✚', 'green'])
  expect([modified.icon, modified.color]).toEqual(['✎', 'yellow'])
  expect([deleted.icon, deleted.color]).toEqual(['✖', 'red'])
})

test('con spazio la scheda porta il nome per intero', async () => {
  expect(tabLabel('deleted', 3, 100)).toBe('✖  cancellati 3')
})

test('senza spazio la scheda resta icona e numero', async () => {
  expect(tabLabel('deleted', 3, 50)).toBe('✖  3')
})

test('le tre schede strette stanno in una riga di sessanta colonne', async () => {
  const tight = (['created', 'modified', 'deleted'] as const)
    .map(kind => tabLabel(kind, 99, 50))
    .join('  ')

  expect(tight.length).toBeLessThan(30)
})

test('senza una scelta si apre la prima scheda che ha qualcosa', async () => {
  expect(activeTab(MIXED, null)).toBe('created')
})

test('senza creati si apre la prima scheda piena', async () => {
  expect(activeTab([one('/c', 'modified')], null)).toBe('modified')
})

test('la scheda scelta vince', async () => {
  expect(activeTab(MIXED, 'deleted')).toBe('deleted')
})

test('una scheda scelta che si e svuotata lascia il posto alla prima piena', async () => {
  expect(activeTab([one('/c', 'modified')], 'created')).toBe('modified')
})

test('con la lista vuota non c e nessuna scheda', async () => {
  expect(activeTab([], null)).toBe(null)
})

test('il percorso nella riga resta intero', async () => {
  const path = 'C:\\Users\\chi\\AppData\\Local\\Temp\\una cosa molto lunga\\file.txt'

  expect(sectionsOf([one(path, 'created')])[0].rows[0].path).toBe(path)
})

test('il dettaglio di una patch colora le aggiunte e le tolte', async () => {
  const got = detailOf(one('/a', 'modified', ['+ nuova', '- vecchia', '  uguale']))

  expect(got).toEqual([
    { text: '+ nuova', color: 'green' },
    { text: '- vecchia', color: 'red' },
    { text: '  uguale', color: null },
  ])
})

test('il dettaglio di un file cancellato dice che non c e contenuto', async () => {
  expect(detailOf(one('/a', 'deleted'))).toEqual([
    { text: 'Cancellato: del contenuto non si tiene copia.', color: null },
  ])
})

test('un file senza diff dice perche non ce l ha', async () => {
  expect(detailOf(one('/a', 'created'))).toEqual([
    { text: 'Nessun diff: il contenuto non era leggibile, o era troppo grande.', color: null },
  ])
})

test('il pulsante che toglie ha una lettera sola', async () => {
  expect(dismissKey).toBe('d')
})

test('il pulsante della scheda aperta dice tutto, il colore dice quale', async () => {
  expect(dismissLabel()).toBe('× tutto')
})

test('il nome del file e l ultimo pezzo del percorso', async () => {
  expect(nameOf('C:\\Users\\chi\\Temp\\prova-tracker\\alfa.txt')).toBe('alfa.txt')
})

test('il nome regge anche le barre in avanti', async () => {
  expect(nameOf('/c/Users/chi/Temp/beta.txt')).toBe('beta.txt')
})

test('un percorso senza cartelle e gia il nome', async () => {
  expect(nameOf('gamma.txt')).toBe('gamma.txt')
})

test('il pulsante che toglie tutto ha una lettera sua', async () => {
  expect(dismissAllKey).toBe('a')
  expect(dismissAllKey).not.toBe(dismissKey)
})

test('il pulsante che toglie tutto nomina le schede, per non confonderlo', async () => {
  expect(dismissAllLabel(80)).toBe('× tutte le schede')
  expect(dismissAllLabel(80)).not.toBe(dismissLabel())
})

test('stretto il pulsante che toglie tutto si accorcia', async () => {
  expect(dismissAllLabel(50)).toBe('× tutte')
})

test('una riga dice se il percorso era una cartella', async () => {
  const dir: Entry = { path: '/a/sotto', kind: 'deleted', at: 1, patch: null, isFolder: true }
  const rows = sectionsOf([dir, one('/a/b.txt', 'deleted')])[0].rows

  expect(rows.map(row => row.isFolder)).toEqual([true, false])
})
