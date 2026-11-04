import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { MinimizedPane } from '../types'

const minimized = atom({ plugin: 'minimize-panes', key: 'minimized' } as const, [])

const hide = async ($: EngineInterface, pane: MinimizedPane) => {
  await update($, minimized, list => [...list.filter(one => one.id !== pane.id), pane])
  await $.ui.close({ id: pane.id })
}

const restore = async ($: EngineInterface, pane: MinimizedPane) => {
  const opened = await $.ui.open({ id: pane.id, title: pane.title })
  if (!opened.isPlaced) {
    $.ui.toast(`minimize-panes: ${pane.title} non entra nello schermo`)
    return
  }
  await forget($, pane.id)
}

const forget = ($: EngineInterface, id: string) =>
  update($, minimized, list => (list.some(one => one.id === id) ? list.filter(one => one.id !== id) : list))

// Un pannello che si riduce da solo non ne vuole un secondo bottone: si riconosce
// dal Button di chiave "minimize" nell'albero che disegna. L'elemento e' dato puro,
// con children accanto a props e non dentro.
const reducesItself = (node: unknown): boolean => {
  if (Array.isArray(node)) return node.some(reducesItself)
  if (node === null || typeof node !== 'object') return false
  const element = node as { type?: string; props?: { key?: unknown }; children?: unknown }
  if (element.type === 'Button' && element.props?.key === 'minimize') return true
  return reducesItself(element.children)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await update($, minimized, () => [])

    return next(e)
  })

  on('ui.open', async ($, e, next) => {
    const opened = await next(e)
    await forget($, e.id)

    return opened
  })

  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    const tree = await next(e)
    if (reducesItself(tree)) return tree

    const { Box, Button } = $.ui.resolve(e)
    const pane: MinimizedPane = { id: e.requestId, title: e.props.title }

    return (
      <Box flexDirection="column">
        <Box>
          <Button key={`minimize:${pane.id}`} label="_" hotkey="m" onPress={() => hide($, pane)} />
        </Box>
        {tree}
      </Box>
    )
  })

  // La banda sopra il prompt e una sola: la riga delle ridotte sta sopra quello
  // che disegnano gli altri mod, non al posto loro.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const rest = await next(e)
    const list = await read($, minimized)
    if (list.length === 0) return rest

    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        <Box>
          <Text dimColor>Ridotte </Text>
          {list.map(pane => (
            <Button key={`restore:${pane.id}`} label={`[ ] ${pane.title}`} onPress={() => restore($, pane)} />
          ))}
        </Box>
        {rest}
      </Box>
    )
  })
}
