import { expect, test } from 'claude-code/testing'

import type { Rivendicazione } from '../types'
import { chiave, percorsiDi } from './percorsi'
import { scontri } from './vive'

const RADICE = 'C:/GIT/progetto'
const FILE = 'C:/Users/io/AppData/Local/Temp/collision-prova.txt'

const altra: Rivendicazione = {
  sessione: 'altra',
  radice: RADICE,
  lavoro: '',
  stato: 'in corso',
  battito: 1000,
  file: { [FILE]: { azione: 'scritto', quando: 900 } },
}

const toccati = (comando: string) => percorsiDi(comando).map(uno => chiave(RADICE, uno))

// Il caso vero: la seconda sessione non ha usato Edit, ha scritto con una redirezione.
test('una redirezione su un file di un altra sessione e uno scontro', async () => {
  const files = toccati(`printf 'ciao\\n' >> "${FILE}"`)

  expect(files).toEqual([FILE])
  expect(files.flatMap(uno => scontri([altra], uno)).length).toBe(1)
})

test('la stessa redirezione su un altro file non scontra niente', async () => {
  const files = toccati('printf ciao >> C:/Users/io/altro.txt')

  expect(files.flatMap(uno => scontri([altra], uno)).length).toBe(0)
})

test('un comando che non scrive non ha niente da fermare', async () => {
  expect(toccati(`cat "${FILE}"`)).toEqual([])
})
