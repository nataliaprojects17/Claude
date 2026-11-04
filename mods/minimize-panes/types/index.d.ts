export type MinimizedPane = { id: string; title: string }

declare module 'claude-code' {
  interface PluginState {
    'minimize-panes': { minimized: MinimizedPane[] }
  }
}
