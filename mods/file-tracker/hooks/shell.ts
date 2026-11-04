type Token = { text: string; isOp: boolean }

const BREAKS = new Set([';', '&&', '||', '|', '\n'])
const UNSAFE = /[*?[\]$%`]/
const MOVES = new Set(['cd', 'chdir', 'pushd', 'popd', 'set-location', 'push-location', 'pop-location'])
const ALL_ARGS = new Set(['rm', 'touch', 'mv'])
const LAST_ARG = new Set(['cp'])
const CMDLETS = new Set([
  'remove-item',
  'new-item',
  'set-content',
  'add-content',
  'out-file',
  'copy-item',
  'move-item',
])
const NAMED = new Set(['-path', '-literalpath', '-filepath', '-destination'])
const SWITCHES = new Set(['-recurse', '-force', '-confirm', '-whatif', '-nonewline', '-append', '-passthru'])

const tokenise = (line: string): Token[] => {
  const out: Token[] = []
  let at = 0

  while (at < line.length) {
    const here = line[at]

    if (here === ' ' || here === '\t' || here === '\r') {
      at += 1
      continue
    }
    if (here === '\n') {
      out.push({ text: '\n', isOp: true })
      at += 1
      continue
    }
    if (here === '"' || here === "'") {
      const end = line.indexOf(here, at + 1)
      if (end === -1) return []
      out.push({ text: line.slice(at + 1, end), isOp: false })
      at = end + 1
      continue
    }
    if (here === '>' || here === ';' || here === '|' || here === '&') {
      const pair = line.slice(at, at + 2)
      const text = pair === '>>' || pair === '||' || pair === '&&' ? pair : here
      out.push({ text, isOp: true })
      at += text.length
      continue
    }

    let end = at
    while (end < line.length && !' \t\r\n">;|&'.includes(line[end])) end += 1
    out.push({ text: line.slice(at, end), isOp: false })
    at = end
  }

  return out
}

const segmentsOf = (tokens: readonly Token[]): Token[][] => {
  const out: Token[][] = [[]]

  for (const one of tokens) {
    if (one.isOp && BREAKS.has(one.text)) {
      out.push([])
      continue
    }
    out[out.length - 1].push(one)
  }

  return out.filter(one => one.length > 0)
}

const isFile = (text: string) => text !== '' && !text.endsWith('/') && !text.endsWith('\\')

const fromCmdlet = (args: readonly Token[]): string[] => {
  const found: string[] = []
  let at = 0

  while (at < args.length) {
    const one = args[at]
    if (!one.text.startsWith('-')) {
      found.push(one.text)
      at += 1
      continue
    }

    const name = one.text.toLowerCase()
    const value = args[at + 1]
    const takesValue = value !== undefined && !value.text.startsWith('-') && !SWITCHES.has(name)
    if (NAMED.has(name) && takesValue) found.push(value.text)
    at += takesValue ? 2 : 1
  }

  return found
}

const pathsIn = (segment: readonly Token[]): string[] => {
  const comment = segment.findIndex(one => !one.isOp && one.text.startsWith('#'))
  const live = comment === -1 ? segment : segment.slice(0, comment)

  if (live.some(one => UNSAFE.test(one.text) || one.text.startsWith('~'))) return []

  const found: string[] = []

  live.forEach((one, at) => {
    const next = live[at + 1]
    if (one.isOp && (one.text === '>' || one.text === '>>') && next !== undefined && !next.isOp) {
      found.push(next.text)
    }
  })

  const words = live.filter(one => !one.isOp)
  const name = (words[0]?.text ?? '').toLowerCase()
  const args = words.slice(1)
  const plain = args.filter(one => !one.text.startsWith('-')).map(one => one.text)

  if (ALL_ARGS.has(name)) {
    found.push(...plain)
  } else if (LAST_ARG.has(name)) {
    // L'origine di una copia viene solo letta: conta dove finisce.
    const last = plain[plain.length - 1]
    if (last !== undefined) found.push(last)
  } else if (CMDLETS.has(name)) {
    found.push(...fromCmdlet(args))
  }

  return found.filter(isFile)
}

export const candidates = (command: string): string[] => {
  const tokens = tokenise(command)
  // Un cd sposta il terreno per tutto quello che segue, anche nei pezzi dopo.
  if (tokens.some(one => !one.isOp && MOVES.has(one.text.toLowerCase()))) return []

  const found = segmentsOf(tokens).flatMap(pathsIn)

  return [...new Set(found)]
}
