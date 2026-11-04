import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Rivendicazione } from '../types'
import { chiave, percorsiDi, ripulisci } from './percorsi'
import { domanda, nome } from './testo'
import { cernita, sana, scontri } from './vive'

const altre = atom({ plugin: 'collision-guard', key: 'altre' } as const, [] as Rivendicazione[])

const PREFISSO = 'claim:'
const BATTITO = 15_000

let mia: Rivendicazione | undefined
let radice = ''
let tick: { cancel: () => void } | undefined

const salva = async ($: EngineInterface) => {
  if (mia === undefined) return

  mia = { ...mia, battito: await $.clock.now() }
  await $.store.set(PREFISSO + mia.sessione, mia)
}

const raccogli = async ($: EngineInterface) => {
  if (mia === undefined) return []

  const chiavi = (await $.store.keys()).filter(una => una.startsWith(PREFISSO))
  const depositate: Array<readonly [string, unknown]> = []
  for (const una of chiavi) depositate.push([una, await $.store.get(una)] as const)

  const { tenute, morte } = cernita(depositate, mia.sessione, radice, await $.clock.now())
  for (const una of morte) await $.store.delete(una)

  return tenute
}

const aggiorna = async ($: EngineInterface) => {
  const tenute = await raccogli($)
  await update($, altre, () => tenute)

  return tenute
}

const segna = async ($: EngineInterface, percorsi: readonly string[]) => {
  if (mia === undefined || percorsi.length === 0) return

  const ora = await $.clock.now()
  const file = { ...mia.file }
  for (const percorso of percorsi) file[chiave(radice, percorso)] = { azione: 'scritto', quando: ora }

  mia = { ...mia, file }
  await salva($)
}

const differenza = async ($: EngineInterface, file: string) => {
  const uscita = await $.process
    .run(['git', 'diff', '--stat', '--', file], { cwd: radice })
    .catch(() => undefined)
  const riga = uscita?.stdout.trim().split('\n')[0] ?? ''

  return riga.includes('|') ? riga.trim() : ''
}

// Il freno: niente se nessun altro ha scritto quel file, altrimenti la domanda a quattro
// risposte. Torna il rifiuto da dare al modello, o undefined per lasciar passare.
const proteggi = async ($: EngineInterface, percorso: string) => {
  const file = chiave(radice, percorso)
  const trovati = scontri(await aggiorna($), file)
  if (trovati.length === 0) return undefined

  const ora = await $.clock.now()
  const risposta = await $.ui
    .ask(domanda(file, trovati, ora, await differenza($, file)), {
      options: ['Procedi', 'Sposta in un worktree', 'Annulla'],
      header: 'Collisione',
    })
    .catch(() => 'Annulla')

  if (risposta === 'Procedi') return undefined
  if (risposta === 'Annulla') {
    return { deny: `collision-guard: scrittura su ${file} annullata, ci sta lavorando un'altra sessione.` }
  }
  if (risposta === 'Sposta in un worktree') {
    return {
      deny: `collision-guard: ${file} e in mano a un'altra sessione. Proponi un git worktree per questo lavoro e aspetta.`,
    }
  }

  return { deny: `collision-guard: ${risposta}` }
}

const apre = async ($: EngineInterface) => {
  const sessione = await $.session.id()
  // Un ricaricamento a caldo riporta qui con la sessione gia aperta: quello che aveva
  // rivendicato resta suo, altrimenti il reload la farebbe sparire agli occhi delle altre.
  const prima = await $.store.get(PREFISSO + sessione)

  mia = {
    sessione,
    radice: await $.session.root(),
    lavoro: '',
    stato: 'finito',
    battito: await $.clock.now(),
    file: sana(prima) ? ripulisci(prima.file) : {},
  }
  radice = mia.radice

  await salva($)
  await aggiorna($)

  tick?.cancel()
  tick = $.clock.every(BATTITO, () => {
    void salva($).then(() => aggiorna($))
  })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await apre($)

    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.end', async ($, e, next) => {
    tick?.cancel()
    tick = undefined
    await $.store.delete(PREFISSO + e.sessionId).catch(() => undefined)

    return next(e)
  }).catch(($, e, next) => next(e))

  on('prompt.submit', async ($, e, next) => {
    if (mia === undefined) await apre($)
    if (mia !== undefined) {
      mia = { ...mia, lavoro: e.text.trim().split('\n')[0]?.slice(0, 70) ?? '', stato: 'in corso' }
      await salva($)
    }
    await aggiorna($)

    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined && mia !== undefined) {
      mia = { ...mia, stato: 'finito' }
      await salva($)
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Edit' }, async ($, e, next) => {
    const fermo = await proteggi($, e.file_path)
    if (fermo !== undefined) return fermo

    const fatto = await next(e)
    if (fatto.deny === undefined && fatto.isError !== true) await segna($, [e.file_path])

    return fatto
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'Write' }, async ($, e, next) => {
    const fermo = await proteggi($, e.file_path)
    if (fermo !== undefined) return fermo

    const fatto = await next(e)
    if (fatto.deny === undefined && fatto.isError !== true) await segna($, [e.file_path])

    return fatto
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'NotebookEdit' }, async ($, e, next) => {
    const fermo = await proteggi($, e.notebook_path)
    if (fermo !== undefined) return fermo

    const fatto = await next(e)
    if (fatto.deny === undefined && fatto.isError !== true) await segna($, [e.notebook_path])

    return fatto
  }).catch(($, e, next) => next(e))

  // Bash frena come gli altri, sui percorsi che il comando dichiara. Il percorso qui si
  // indovina, ma un percorso indovinato male non combacia con nessuna rivendicazione, e la
  // domanda non parte: il rischio e di lasciar passare una scrittura, non di bloccarla.
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const percorsi = percorsiDi(e.command)
    for (const percorso of percorsi) {
      const fermo = await proteggi($, percorso)
      if (fermo !== undefined) return fermo
    }

    const fatto = await next(e)
    if (fatto.deny === undefined && fatto.isError !== true) await segna($, percorsi)

    return fatto
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const tenute = await read($, altre)
    if (tenute.length === 0 || e.props.hasSurvey) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const sotto = await next(e)

    return (
      <Box flexDirection="column">
        {tenute.map(una => (
          <Box key={una.sessione} flexDirection="row">
            <Text color={una.stato === 'in corso' ? 'claude' : 'success'}>
              {una.stato === 'in corso' ? '● ' : '✓ '}
            </Text>
            <Text dimColor>
              {`${nome(una.sessione)} · ${una.stato} · ${una.lavoro.length > 0 ? una.lavoro : 'non ha ancora chiesto niente'}`}
            </Text>
          </Box>
        ))}
        {sotto}
      </Box>
    )
  }).catch(($, e, next) => next(e))
}
