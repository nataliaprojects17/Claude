export type Gauge = { percent: number; tokens: number; window: number }

export type Handoff = { path: string; at: number }

declare module 'claude-code' {
  interface PluginState {
    'context-gauge': {
      gauge: Gauge | null
      isHidden: boolean
      threshold: number
      note: string | null
      handoff: Handoff | null
      isBusy: boolean
      armedAt: number
      isSeeded: boolean
    }
  }
}
