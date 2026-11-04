const dritto = (percorso: string) => percorso.replace(/\\/g, '/').replace(/\/+$/, '')

// La chiave di un file e il suo percorso relativo alla radice del progetto: le due sessioni
// girano sulla stessa cartella ma possono nominarla in modo diverso.
export const chiave = (radice: string, percorso: string) => {
  const file = dritto(percorso)
  const base = dritto(radice)

  return file.toLowerCase().startsWith(`${base.toLowerCase()}/`) ? file.slice(base.length + 1) : file
}

const nudo = (pezzo: string) => pezzo.replace(/^["']|["']$/g, '')

const vale = (pezzo: string) =>
  pezzo.length > 0 &&
  !pezzo.startsWith('-') &&
  !pezzo.includes('*') &&
  !pezzo.startsWith('/dev/') &&
  !pezzo.startsWith('$') &&
  !/[{}()"'`,]/.test(pezzo) &&
  dritto(pezzo).length > 0

// Una rivendicazione vecchia porta ancora i finti percorsi che il parser di prima
// pescava dentro gli heredoc. Si buttano quando la sessione riapre la sua mappa,
// altrimenti il battito li riscrive e le collisioni finte non finiscono mai.
export const ripulisci = <T,>(file: Record<string, T>): Record<string, T> =>
  Object.fromEntries(Object.entries(file).filter(([chiave]) => vale(chiave)))

// Il corpo di un heredoc e contenuto, non shell. Dentro ci sta il codice che si sta
// scrivendo, e ogni freccia di TypeScript passerebbe per una redirezione.
const senzaHeredoc = (comando: string) => {
  const tenute: string[] = []
  let chiude: string | undefined

  for (const riga of comando.split('\n')) {
    if (chiude !== undefined) {
      if (riga.trim() === chiude) chiude = undefined
      continue
    }

    tenute.push(riga)
    const apre = riga.match(/<<-?\s*["']?([A-Za-z_][A-Za-z0-9_]*)["']?/)
    if (apre?.[1] !== undefined) chiude = apre[1]
  }

  return tenute.join('\n')
}

// Quello che una riga di shell dichiara di scrivere. Copre la redirezione, tee e la
// destinazione di cp e mv; sed -i resta fuori, il file non si distingue dallo script.
export const percorsiDi = (grezzo: string): string[] => {
  const comando = senzaHeredoc(grezzo)
  const trovati: string[] = []

  for (const presa of comando.matchAll(/(?<![=\->])>>?\s*("[^"]+"|'[^']+'|[^\s|&;<>]+)/g)) {
    trovati.push(nudo(presa[1] ?? ''))
  }

  for (const presa of comando.matchAll(/\btee\s+(?:-a\s+)?("[^"]+"|'[^']+'|[^\s|&;<>]+)/g)) {
    trovati.push(nudo(presa[1] ?? ''))
  }

  for (const presa of comando.matchAll(
    /\b(?:cp|mv)\s+(?:-\S+\s+)*(?:"[^"]+"|'[^']+'|[^\s|&;<>]+)\s+("[^"]+"|'[^']+'|[^\s|&;<>]+)/g,
  )) {
    trovati.push(nudo(presa[1] ?? ''))
  }

  return [...new Set(trovati.filter(vale))]
}
