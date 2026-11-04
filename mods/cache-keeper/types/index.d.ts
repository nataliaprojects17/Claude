export type Warmth = {
  lastAt: number
  prefixTokens: number
  model: string
}

export type Measured = {
  warmMs: number
  coldMs: number
}

declare module 'claude-code' {
  interface PluginState {
    'cache-keeper': {
      warmth: Warmth | null
      windowMs: number
      warnMs: number
      isAuto: boolean
      autoUntil: number
      pingsLeft: number
      measured: Measured
      isBusy: boolean
    }
  }
}
