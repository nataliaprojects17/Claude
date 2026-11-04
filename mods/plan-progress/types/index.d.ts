export type Phase = 'researching' | 'planning' | 'building' | 'testing' | 'auditing'

export type Task = {
  content: string
  status: 'pending' | 'in_progress' | 'completed'
}

export type Run = {
  goal: string | null
  phase: Phase
  tasks: Task[]
  startedAt: number
  finishedAt: number | null
}

export type RunRecord = {
  id: string
  label: string
  goal: string | null
  phase: Phase
  done: number
  total: number
  startedAt: number
  updatedAt: number
  isDone: boolean
}

export type View = 'current' | 'all'

declare module 'claude-code' {
  interface PluginState {
    'plan-progress': {
      run: Run
      view: View
      now: number
      others: RunRecord[]
      minimized: boolean
    }
  }
}
