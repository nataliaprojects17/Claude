import type { Scontro } from './vive'

export const nome = (sessione: string) => sessione.slice(0, 8)

export const quando = (passato: number) => {
  const secondi = Math.max(0, Math.round(passato / 1000))
  if (secondi < 60) return `${secondi} secondi fa`

  const minuti = Math.round(secondi / 60)
  if (minuti < 60) return minuti === 1 ? 'un minuto fa' : `${minuti} minuti fa`

  const ore = Math.round(minuti / 60)

  return ore === 1 ? "un'ora fa" : `${ore} ore fa`
}

export const domanda = (file: string, trovati: readonly Scontro[], ora: number, diff: string) => {
  const righe = trovati
    .map(uno => `${nome(uno.chi.sessione)} ${quando(ora - uno.quando)}, ${uno.chi.stato}`)
    .join(' e ')
  const coda = diff.length > 0 ? ` Git dice ${diff}.` : ''

  return `${file} l'ha gia scritto un'altra sessione: ${righe}.${coda} Procedo?`
}
