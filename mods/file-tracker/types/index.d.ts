export type Kind = 'created' | 'modified' | 'deleted'

export type Entry = {
  path: string
  kind: Kind
  at: number
  patch: string[] | null
  isFolder: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'file-tracker': {
      entries: Entry[]
      selected: string | null
      tab: Kind | null
      pathShown: boolean
    }
  }
}
