export type Assumption = { id: string; text: string }
export type Answer = { isRejected: boolean; note: string }

declare module 'claude-code' {
  interface PluginState {
    'state-assumptions': {
      items: Assumption[]
      answers: Record<string, Answer>
      editing: string | null
      isOpen: boolean
      expanded: string[]
    }
  }
}
