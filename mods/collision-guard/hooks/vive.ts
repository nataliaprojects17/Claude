import type { Rivendicazione } from '../types'

// Quanto una rivendicazione sopravvive al suo ultimo battito. Serve solo alle sessioni
// morte male: quelle che chiudono bene cancellano la propria chiave da sole.
export const VITA = 90_000

export const sana = (letta: unknown): letta is Rivendicazione => {
  if (letta === null || typeof letta !== 'object') return false
  const forse = letta as Partial<Rivendicazione>

  return (
    typeof forse.sessione === 'string' &&
    typeof forse.radice === 'string' &&
    typeof forse.battito === 'number' &&
    typeof forse.file === 'object' &&
    forse.file !== null
  )
}

export type Cernita = { tenute: Rivendicazione[]; morte: string[] }

// Divide quello che il deposito tiene in rivendicazioni ancora buone e chiavi da buttare.
// Le sessioni su un altro progetto non sono morte: non sono affar nostro, e restano dove sono.
export const cernita = (
  depositate: ReadonlyArray<readonly [string, unknown]>,
  mia: string,
  radice: string,
  ora: number,
): Cernita => {
  const tenute: Rivendicazione[] = []
  const morte: string[] = []

  for (const [chiave, letta] of depositate) {
    if (!sana(letta)) {
      morte.push(chiave)
      continue
    }
    if (letta.sessione === mia) continue
    if (ora - letta.battito > VITA) {
      morte.push(chiave)
      continue
    }
    if (letta.radice !== radice) continue

    tenute.push(letta)
  }

  return { tenute, morte }
}

export type Scontro = { chi: Rivendicazione; quando: number }

export const scontri = (tenute: readonly Rivendicazione[], file: string): Scontro[] =>
  tenute
    .map(una => ({ chi: una, quando: una.file[file]?.quando ?? 0 }))
    .filter(uno => uno.quando > 0)
    .sort((uno, altro) => altro.quando - uno.quando)
