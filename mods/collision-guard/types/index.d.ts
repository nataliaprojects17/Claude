export type Toccata = { azione: 'scritto'; quando: number }

export type Rivendicazione = {
  sessione: string
  radice: string
  lavoro: string
  stato: 'in corso' | 'finito'
  battito: number
  file: Record<string, Toccata>
}

declare module 'claude-code' {
  interface PluginState {
    'collision-guard': { altre: Rivendicazione[] }
  }
}
