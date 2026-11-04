declare module 'claude-code' {
  interface PluginState {
    'prompt-enhancer': { original: string | null; isWorking: boolean }
  }
}
