import { folderOf } from './collect'

export type Run = (
  argv: readonly string[],
  init?: { cwd?: string; timeoutMs?: number },
) => Promise<{ exitCode: number; stdout: string; stderr: string }>

export const gitCover = (run: Run, repos = new Map<string, Promise<boolean>>()) => {
  const isInsideRepo = (folder: string): Promise<boolean> => {
    const asked = repos.get(folder)
    if (asked !== undefined) return asked

    const asking = run(['git', 'rev-parse', '--is-inside-work-tree'], { cwd: folder, timeoutMs: 5000 })
      .then(ran => ran.exitCode === 0)
      .catch(() => false)
    repos.set(folder, asking)

    return asking
  }

  return async (path: string): Promise<boolean> => {
    const folder = folderOf(path)
    if (!(await isInsideRepo(folder))) return false

    try {
      const ran = await run(['git', 'check-ignore', '-q', '--', path], { cwd: folder, timeoutMs: 5000 })

      // 0 ignorato, 1 non ignorato, altro un errore di git: nel dubbio la riga resta.
      return ran.exitCode === 1
    } catch {
      return false
    }
  }
}
