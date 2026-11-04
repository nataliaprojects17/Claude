import { expect, test } from 'claude-code/testing'

import { chiave, percorsiDi, ripulisci } from './percorsi'

test('la chiave e il percorso relativo alla radice', async () => {
  expect(chiave('C:/git/progetto', 'C:/git/progetto/docker-compose.yml')).toBe('docker-compose.yml')
})

test('le barre rovesciate di Windows valgono come le altre', async () => {
  expect(chiave('C:\\git\\progetto', 'C:\\git\\progetto\\docs\\DECISIONS.md')).toBe(
    'docs/DECISIONS.md',
  )
})

test('una radice scritta con altre maiuscole combacia lo stesso', async () => {
  expect(chiave('c:/GIT/progetto', 'C:/git/Progetto/a.txt')).toBe('a.txt')
})

test('un file fuori dalla radice resta per intero', async () => {
  expect(chiave('C:/git/progetto', 'C:/altro/a.txt')).toBe('C:/altro/a.txt')
})

test('la redirezione dichiara il file che scrive', async () => {
  expect(percorsiDi('echo ciao > note.txt')).toEqual(['note.txt'])
})

test('anche la redirezione in coda', async () => {
  expect(percorsiDi('cat a >> b/c.log')).toEqual(['b/c.log'])
})

test('tee e la destinazione di cp finiscono nella lista', async () => {
  expect(percorsiDi('cat a | tee -a out.txt')).toEqual(['out.txt'])
  expect(percorsiDi('cp -r src/a.ts src/b.ts')).toEqual(['src/b.ts'])
})

test('dev null e i glob non sono file rivendicabili', async () => {
  expect(percorsiDi('ls 2> /dev/null')).toEqual([])
  expect(percorsiDi('cat a > out/*.txt')).toEqual([])
})

test('lo stesso file nominato due volte si rivendica una volta sola', async () => {
  expect(percorsiDi('echo uno > a.txt; echo due >> a.txt')).toEqual(['a.txt'])
})

test('sed -i non e coperto, e si vede', async () => {
  expect(percorsiDi('sed -i s/a/b/ file.txt')).toEqual([])
})

test('il corpo di un heredoc non dichiara niente', async () => {
  const comando = ['cat > r.tsx <<EOF', 'export const f = () => {', '  return 1', '}', 'EOF'].join(
    '\n',
  )

  expect(percorsiDi(comando)).toEqual(['r.tsx'])
})

test('il delimitatore quotato chiude lo stesso', async () => {
  const comando = ["cat > a.ts <<'FINE'", 'on(x).catch(($, e, next) => next(e))', 'FINE'].join('\n')

  expect(percorsiDi(comando)).toEqual(['a.ts'])
})

test('una freccia non e una redirezione', async () => {
  expect(percorsiDi('echo const f = () => 1')).toEqual([])
  expect(percorsiDi('echo a -> b')).toEqual([])
})

test('ne un pezzo di codice avanzato dopo un maggiore', async () => {
  expect(percorsiDi('echo <Text dimColor>{nome}</Text>')).toEqual([])
})

test('la radice nuda non e un file', async () => {
  expect(percorsiDi('cp a.txt /')).toEqual([])
})

test('una mappa vecchia perde i finti percorsi e tiene i veri', async () => {
  const segno = { azione: 'scritto', quando: 1 }
  const file = { '{': segno, 'next(e))': segno, '/': segno, 'docs/DECISIONS.md': segno }

  expect(Object.keys(ripulisci(file))).toEqual(['docs/DECISIONS.md'])
})
