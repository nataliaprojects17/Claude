const CAP = 200

const linesOf = (text: string): string[] => {
  const flat = text.replace(/\r\n/g, '\n')
  const lines = flat.split('\n')
  if (lines[lines.length - 1] === '') lines.pop()

  return lines
}

// Longest common subsequence: la tabella basta perche le righe sono poche.
const commonOf = (was: readonly string[], now: readonly string[]): number[][] => {
  const table: number[][] = Array.from({ length: was.length + 1 }, () => new Array(now.length + 1).fill(0))

  for (let a = was.length - 1; a >= 0; a -= 1) {
    for (let b = now.length - 1; b >= 0; b -= 1) {
      table[a][b] = was[a] === now[b] ? table[a + 1][b + 1] + 1 : Math.max(table[a + 1][b], table[a][b + 1])
    }
  }

  return table
}

export const diffOf = (before: string, after: string): string[] => {
  const was = linesOf(before)
  const now = linesOf(after)
  const table = commonOf(was, now)
  const out: string[] = []
  let a = 0
  let b = 0

  while (a < was.length && b < now.length) {
    if (was[a] === now[b]) {
      out.push(` ${was[a]}`)
      a += 1
      b += 1
    } else if (table[a + 1][b] >= table[a][b + 1]) {
      out.push(`-${was[a]}`)
      a += 1
    } else {
      out.push(`+${now[b]}`)
      b += 1
    }
  }
  while (a < was.length) {
    out.push(`-${was[a]}`)
    a += 1
  }
  while (b < now.length) {
    out.push(`+${now[b]}`)
    b += 1
  }

  if (out.every(one => one.startsWith(' '))) return []
  if (out.length <= CAP) return out

  return [...out.slice(0, CAP), `  ... altre ${out.length - CAP} righe`]
}
