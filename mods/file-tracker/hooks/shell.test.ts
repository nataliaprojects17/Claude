import { expect, test } from 'claude-code/testing'

import { candidates } from './shell'

test('una redirezione: il percorso del file', async () => {
  expect(candidates('cat > C:/tmp/note.txt')).toEqual(['C:/tmp/note.txt'])
})

test('una redirezione in coda: il percorso del file', async () => {
  expect(candidates('echo ciao >> note.txt')).toEqual(['note.txt'])
})

test('rm con le opzioni: solo il percorso', async () => {
  expect(candidates('rm -rf cartella/file.txt')).toEqual(['cartella/file.txt'])
})

test('mv: tutti e due i percorsi', async () => {
  expect(candidates('mv a.txt b.txt')).toEqual(['a.txt', 'b.txt'])
})

test('Remove-Item con le opzioni: solo il percorso', async () => {
  expect(candidates('Remove-Item -Recurse -Force -Path C:\\x\\y.txt')).toEqual(['C:\\x\\y.txt'])
})

test('un valore di opzione non e un percorso', async () => {
  expect(candidates('Set-Content -Path C:\\x\\y.txt -Encoding utf8')).toEqual(['C:\\x\\y.txt'])
})

test('un percorso fra virgolette con spazi resta intero', async () => {
  expect(candidates('rm -f "C:/Program Files/una cosa.txt"')).toEqual(['C:/Program Files/una cosa.txt'])
})

test('un comando con cd: niente', async () => {
  expect(candidates('cd /tmp && rm a.txt')).toEqual([])
})

test('un glob: niente', async () => {
  expect(candidates('rm -rf build/*.tmp')).toEqual([])
})

test('una variabile: niente', async () => {
  expect(candidates('rm -rf $DIR/a.txt')).toEqual([])
})

test('una tilde: niente', async () => {
  expect(candidates('rm ~/a.txt')).toEqual([])
})

test('un comando qualunque: niente', async () => {
  expect(candidates('mvn -q package')).toEqual([])
})

test('piu comandi: i percorsi di quelli leggibili, gli altri lasciati stare', async () => {
  expect(candidates('mvn package; rm a.txt\nls -la')).toEqual(['a.txt'])
})

test('un pezzo illeggibile non contagia gli altri', async () => {
  expect(candidates('rm $X/a.txt && rm b.txt')).toEqual(['b.txt'])
})

test('CD maiuscolo squalifica il comando come cd minuscolo', async () => {
  expect(candidates('CD C:\\altro && rm a.txt')).toEqual([])
})

test('pushd squalifica il comando', async () => {
  expect(candidates('pushd C:\\altro; rm a.txt')).toEqual([])
})

test('un commento in coda non diventa un percorso', async () => {
  expect(candidates('rm -f target/app.jar # rigenerato, vedi README.md')).toEqual(['target/app.jar'])
})

test('di una cp conta solo la destinazione', async () => {
  expect(candidates('cp pom.xml pom.xml.bak')).toEqual(['pom.xml.bak'])
})

test('di una mv contano origine e destinazione', async () => {
  expect(candidates('mv a.txt b.txt')).toEqual(['a.txt', 'b.txt'])
})

test('una destinazione che e una cartella non entra', async () => {
  expect(candidates('cp a.txt C:\\dest\\')).toEqual([])
})

test('un cmdlet con il percorso posizionale viene letto', async () => {
  expect(candidates('Remove-Item -Recurse -Force C:\\x\\y.txt')).toEqual(['C:\\x\\y.txt'])
})

test('Out-File con il percorso posizionale viene letto', async () => {
  expect(candidates('Out-File C:\\x\\y.txt')).toEqual(['C:\\x\\y.txt'])
})

test('un percorso corto 8.3 con la tilde dentro resta leggibile', async () => {
  expect(candidates('touch C:\\Users\\NZLATK~1\\x.txt')).toEqual(['C:\\Users\\NZLATK~1\\x.txt'])
})

test('una tilde che apre il percorso squalifica lo stesso', async () => {
  expect(candidates('rm ~/a.txt')).toEqual([])
})
