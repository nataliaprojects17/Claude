export type AgentProgress = { done: number; total?: number; note?: string }

export type AgentRow = {
  id: string
  type: string
  description: string
  name?: string
  parentId?: string
  startedAt: number
  endedAt?: number
  status: string
  model?: string
  effort?: string
  steps: number
  toolCalls: number
  runningTool?: string
  trail: string[]
  contextTokens: number
  totalTokens: number
  outputTokens: number
  progress?: AgentProgress
}

declare module 'claude-code' {
  interface PluginState {
    'agent-watch': {
      rows: AgentRow[]
      open: string[]
      window: number
      cleared: string[]
      tab: string
      spent: number
      minimized: boolean
    }
  }
}
