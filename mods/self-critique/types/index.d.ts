export type Verdict = 'Strong' | 'Mixed' | 'Weak'

export type Flaw = {
  title: string
  detail: string
  fix: string
}

export type Review = {
  verdict: Verdict
  summary: string
  strengths: string[]
  flaws: Flaw[]
  model: string
  reviewedAt: number
}

export type ModelChoice = 'session' | 'opus' | 'sonnet' | 'haiku'

declare module 'claude-code' {
  interface PluginState {
    'self-critique': {
      review: Review | null
      isRunning: boolean
      error: string | null
      modelChoice: ModelChoice
      isAuto: boolean
    }
  }
}
