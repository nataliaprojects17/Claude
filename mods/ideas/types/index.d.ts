export type IdeaStatus = 'open' | 'sent' | 'implemented' | 'closed' | 'rejected'

export type IdeaPriority = 1 | 2 | 3

export type Idea = {
  id: string
  code: string
  text: string
  branch: string
  createdAt: number
  status: IdeaStatus
  priority: IdeaPriority
  tags: string[]
  baseHead?: string
  checkedHead?: string
  closedBy?: string
  take?: string
  isTakeHidden?: boolean
  isThinking?: boolean
}

export type IdeasScope = 'branch' | 'project'

export type IdeasWhere = { root: string; branch: string }

declare module 'claude-code' {
  interface PluginState {
    ideas: {
      list: Idea[]
      where: IdeasWhere | null
      scope: IdeasScope
      selected: string | null
      showClosed: boolean
      tag: string | null
      minimized: boolean
    }
  }
}
