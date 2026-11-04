import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { entriesOf, folderOf, shellBefore } from './collect'
import type { Before, World } from './collect'
import { drop, dropKind, fold } from './ledger'
import { gitCover } from './git'
import { changes, printed, rootsOf, snapshot } from './sweep'
import type { Listing, Snapshot } from './sweep'
import {
  activeTab,
  bandParts,
  detailOf,
  dismissKey,
  dismissAllKey,
  dismissAllLabel,
  dismissLabel,
  folderIcon,
  nameOf,
  sectionsOf,
  tabLabel,
} from './view'
import type { Entry, Kind } from '../types'

const PANE = 'file-tracker'

export const entries = atom({ plugin: 'file-tracker', key: 'entries' } as const, [])
export const selected = atom({ plugin: 'file-tracker', key: 'selected' } as const, null)
export const tab = atom({ plugin: 'file-tracker', key: 'tab' } as const, null)
export const pathShown = atom({ plugin: 'file-tracker', key: 'pathShown' } as const, false)

// Quello che resta fra una chiamata e l'altra e la cache delle cartelle, non il $.
const repos = new Map<string, Promise<boolean>>()

const worldOf = ($: EngineInterface): World => ({
  exists: path => $.fs.exists(path),
  isFolder: path => $.fs.stat(path).then(one => one.kind === 'dir').catch(() => false),
  read: path => $.fs.read(path).then(text => (typeof text === 'string' ? text : null)),
  covered: gitCover((argv, init) => $.process.run(argv, init), repos),
  now: () => $.clock.now(),
  cwd: () => $.session.cwd(),
})

const listing = ($: EngineInterface): Listing => path => $.fs.list(path)

const EMPTY: Snapshot = { seen: new Map(), full: false }

// Quello che il comando ha stampato allarga il secondo giro, non il primo: di
// una cartella vista solo adesso vale la data, che e l'unica prova rimasta.
const swept = async (
  $: EngineInterface,
  was: Snapshot,
  roots: readonly string[],
  since: number,
  result: Record<string, unknown>,
): Promise<Entry[]> => {
  if (roots.length === 0) return []

  const said = [result.stdout, result.stderr].filter(one => typeof one === 'string').join('\n')
  const more = rootsOf(printed(said), await $.session.cwd())
  const now = await snapshot(listing($), [...new Set([...roots, ...more])])
  const covered = worldOf($).covered
  const at = await $.clock.now()

  const kept: Entry[] = []
  for (const one of changes(was, now, since, at)) {
    if (!(await covered(one.path))) kept.push(one)
  }

  return kept
}

const openPane = ($: EngineInterface) => $.ui.open({ id: PANE, title: 'File toccati', focus: true })

// process.run aspetta l'uscita e legge tutto l'output, quindi rifiuta un
// programma che resta aperto. start stacca il figlio e non tiene la pipe.
const openFolder = async ($: EngineInterface, path: string) => {
  const folder = folderOf(path)

  try {
    await $.process.run(['cmd.exe', '/c', 'start', '', folder], { timeoutMs: 5000 })
    $.ui.toast(folder)
  } catch (slip) {
    $.ui.toast(`La cartella non si e aperta: ${String(slip).slice(0, 200)}`)
  }
}

// Vedere una riga vuol dire toglierla e basta: niente memoria di cosa e stato
// visto, cosi un'altra scrittura sullo stesso percorso riapre una riga nuova
// che porta solo il diff da adesso in avanti.
// Un pannello vuoto non dice niente che la fascia non dica gia.
const closeWhenEmpty = async ($: EngineInterface) => {
  if ((await read($, entries)).length > 0) return

  await $.ui.close({ id: PANE })
}

const forget = async ($: EngineInterface, path: string) => {
  await update($, entries, list => drop(list, path))
  await update($, selected, chosen => (chosen === path ? null : chosen))
  await closeWhenEmpty($)
}

// I pulsanti di gruppo stanno in lista, dove una selezione rimasta appesa e
// comunque quella di un file che non c'e piu.
const forgetKind = async ($: EngineInterface, kind: Kind) => {
  await update($, entries, list => dropKind(list, kind))
  await update($, selected, () => null)
  await closeWhenEmpty($)
}

const forgetAll = async ($: EngineInterface) => {
  await update($, entries, () => [])
  await update($, selected, () => null)
  await closeWhenEmpty($)
}

export const register: Register = on => {
  on('tool.call', async ($, e, next) => {
    const command = String(e.command ?? '')
    const shell = e.tool === 'Bash' || e.tool === 'PowerShell'
    let before: Before = new Map()
    let was: Snapshot = EMPTY
    let roots: string[] = []
    let since = 0

    try {
      before = await shellBefore(worldOf($), e.tool, command)

      // Un interprete tiene il percorso dentro lo script, dove il comando non
      // lo dice: l'unico modo di vederlo e guardare le cartelle prima e dopo.
      if (shell) {
        since = await $.clock.now()
        roots = rootsOf(printed(command), await $.session.cwd())
        was = await snapshot(listing($), roots)
      }
    } catch {
      before = new Map()
      was = EMPTY
    }

    const ran = await next(e)

    try {
      // Un deny vuol dire che il comando non e mai partito: niente da registrare.
      if ('deny' in ran) return ran

      // Un comando fallito puo avere cancellato lo stesso: i percorsi si
      // guardano comunque, ma il risultato di una scrittura andata male no.
      const tool = ran.isError === true ? '' : e.tool
      const result = (ran.result ?? {}) as Record<string, unknown>

      if (e.tool === 'Edit' || e.tool === 'Write') {
        await $.store.set('sonda', {
          tool: e.tool,
          chiavi: Object.keys(result),
          filePath: result.filePath ?? null,
          type: result.type ?? null,
        })
      }

      const said = new Set<string>()
      for (const one of await entriesOf(worldOf($), before, tool, result)) {
        said.add(one.path)
        await update($, entries, list => fold(list, one))
      }

      for (const one of await swept($, was, roots, since, result)) {
        if (said.has(one.path)) continue
        await update($, entries, list => fold(list, one))
      }
    } catch {
      // registrare non deve mai rompere la chiamata
    }

    return ran
  })

  on('session.start', async ($, e, next) => {
    const started = await next(e)

    try {
      await $.command.register({
        name: 'files',
        description: 'I file toccati fuori dal controllo di git',
      })
    } catch {
      // senza il comando il mod si usa lo stesso, dalla banda
    }

    return started
  })

  on('command.run', { command: 'files' }, async $ => {
    try {
      const list = await read($, entries)
      if (list.length === 0) return { text: 'Nessun file toccato fuori dal repo.' }

      await openPane($)

      return { text: `${list.length} file fuori dal repo.` }
    } catch {
      return { text: 'La lista dei file toccati non e leggibile.' }
    }
  })

  // La banda sopra il prompt e una sola: la riga dei file sta sotto quello che
  // disegnano gli altri mod, attaccata al prompt, non al posto loro.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const rest = await next(e)
    try {
      const parts = bandParts(await read($, entries))
      if (parts.length === 0 || e.props.hasSurvey) return rest

      const { Box, Button, Text } = $.ui.resolve(e)

      return (
        <Box flexDirection="column">
          {rest}
          <Box gap={1} paddingX={1}>
            {parts.map((part, at) => (
              <Box key={`b${at}`} gap={1}>
                {at > 0 && <Text dimColor>·</Text>}
                <Text color={part.color ?? undefined} bold={part.color !== null}>
                  {part.text}
                </Text>
              </Box>
            ))}
            <Button key="open" hotkey="f" onPress={() => openPane($)}>
              <Text color="cyan">📂 Apri</Text>
            </Button>
          </Box>
        </Box>
      )
    } catch {
      return rest
    }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e, next) => {
    try {
      const { Box, Button, Text } = $.ui.resolve(e)
      const list = await read($, entries)
      const chosen = await read($, selected)
      const one = list.find(x => x.path === chosen)

      if (one !== undefined) {
        const mine = sectionsOf([one])[0]
        const shown = await read($, pathShown)

        return (
          <Box flexDirection="column">
            <Button key="close" hotkey="x" onPress={() => $.ui.close({ id: PANE })}>
              <Text color="red">✖  Chiudi</Text>
            </Button>
            <Box gap={2}>
              <Button key="back" onPress={() => update($, selected, () => null)}>
                <Text color={mine.color}>←  Indietro</Text>
              </Button>
              <Button key="folder" hotkey="c" onPress={() => openFolder($, one.path)}>
                <Text color={mine.color}>📂  Apri cartella</Text>
              </Button>
              <Button key="seen" hotkey={dismissKey} onPress={() => forget($, one.path)}>
                <Text color={mine.color}>×</Text>
              </Button>
            </Box>
            <Box gap={2}>
              <Text color={mine.color}>{mine.icon}</Text>
              {one.isFolder && <Text>{folderIcon}</Text>}
              <Text bold>{nameOf(one.path)}</Text>
              <Button key="path" onPress={() => update($, pathShown, shown => !shown)}>
                <Text dimColor>{shown ? '▾' : '▸'}</Text>
              </Button>
            </Box>
            {shown && (
              <Box paddingLeft={3}>
                <Text dimColor wrap="truncate-start">{one.path}</Text>
              </Box>
            )}
            {detailOf(one).map((line, at) => (
              <Text key={`l${at}`} color={line.color ?? undefined}>
                {line.text}
              </Text>
            ))}
          </Box>
        )
      }

      const sections = sectionsOf(list)
      const here = activeTab(list, await read($, tab))
      const open = sections.find(section => section.kind === here)
      const columns = e.props.bodyColumns ?? 80

      return (
        <Box flexDirection="column">
          <Button key="close" hotkey="x" onPress={() => $.ui.close({ id: PANE })}>
            <Text color="red">✖  Chiudi</Text>
          </Button>
          {sections.length === 0 && <Text dimColor>Niente toccato fuori dal repo.</Text>}
          {chosen !== null && (
            <Box gap={1}>
              <Button key="unstick" onPress={() => update($, selected, () => null)}>
                <Text color="cyan">←  Indietro</Text>
              </Button>
              <Text dimColor>il file che stavi guardando non e piu in lista</Text>
            </Box>
          )}
          {sections.length > 0 && (
            <Box gap={1}>
              {sections.map(section => (
                <Button key={`t${section.kind}`} onPress={() => update($, tab, () => section.kind)}>
                  <Text color={section.color} bold={section.kind === here} underline={section.kind === here}>
                    {tabLabel(section.kind, section.rows.length, columns)}
                  </Text>
                </Button>
              ))}
              <Button key="dismissAll" hotkey={dismissAllKey} onPress={() => forgetAll($)}>
                <Text dimColor>{dismissAllLabel(columns)}</Text>
              </Button>
            </Box>
          )}
          {here !== null && open !== undefined && (
            <Box paddingLeft={2}>
              <Button key="dismiss" hotkey={dismissKey} onPress={() => forgetKind($, here)}>
                <Text color={open.color}>{dismissLabel()}</Text>
              </Button>
            </Box>
          )}
          {open !== undefined &&
            open.rows.map((row, at) => (
              <Box key={`${open.kind}${at}`} flexDirection="column">
                <Box gap={2}>
                  <Text color={open.color}>{open.icon}</Text>
                  <Box flexGrow={1} flexShrink={1} minWidth={0} gap={1}>
                    {row.isFolder && <Text>{folderIcon}</Text>}
                    <Button
                      key={`p${open.kind}${at}`}
                      label={row.path}
                      plain
                      onPress={() => update($, selected, () => row.path)}
                    >
                      <Text bold wrap="truncate-end">{nameOf(row.path)}</Text>
                    </Button>
                  </Box>
                  <Button key={`f${open.kind}${at}`} onPress={() => openFolder($, row.path)}>
                    <Text color={open.color}>📂</Text>
                  </Button>
                  <Button key={`v${open.kind}${at}`} onPress={() => forget($, row.path)}>
                    <Text color={open.color}>×</Text>
                  </Button>
                </Box>
                <Box paddingLeft={3}>
                  <Text dimColor wrap="truncate-start">{folderOf(row.path)}</Text>
                </Box>
              </Box>
            ))}
        </Box>
      )
    } catch {
      return next(e)
    }
  })
}
