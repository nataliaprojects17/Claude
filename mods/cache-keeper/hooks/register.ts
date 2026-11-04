import { atom, read, update } from 'claude-code'
import type { EngineInterface, ModelUsage, Register, Timer } from 'claude-code'

import type { Measured, Warmth } from '../types'

const MINUTE = 60000
// The shortest prompt-cache TTL the API offers. A prefix lost sooner than
// this did not expire, it was rewritten: a tool list that finished
// connecting, a skill that loaded, a compaction. Reading that as the window
// would narrow it to a figure no TTL can produce.
const SHORTEST_TTL_MS = 5 * MINUTE
const DEFAULT_WINDOW_MS = 60 * MINUTE
const DEFAULT_WARN_MS = 5 * MINUTE
const DEFAULT_PINGS = 6

const KEY_WINDOW = 'windowMs'
const KEY_WARN = 'warnMs'
const KEY_MEASURED = 'measured'
const KEY_AUTO = 'isAuto'

type Price = { input: number; output: number; read: number }

const PRICES: readonly (readonly [string, Price])[] = [
  ['claude-fable-5-1', { input: 10, output: 50, read: 0.25 }],
  ['claude-mythos-5-1', { input: 10, output: 50, read: 0.25 }],
  ['claude-fable-5', { input: 10, output: 50, read: 1 }],
  ['claude-mythos-5', { input: 10, output: 50, read: 1 }],
  ['claude-opus-5-5', { input: 4, output: 20, read: 0.2 }],
  ['claude-opus-5', { input: 5, output: 25, read: 0.5 }],
  ['claude-opus-4-8', { input: 5, output: 25, read: 0.5 }],
  ['claude-opus-4-7', { input: 5, output: 25, read: 0.5 }],
  ['claude-opus-4-6', { input: 5, output: 25, read: 0.5 }],
  ['claude-sonnet-5-5', { input: 2, output: 10, read: 0.2 }],
  ['claude-sonnet-5', { input: 2, output: 10, read: 0.2 }],
  ['claude-sonnet-4-6', { input: 3, output: 15, read: 0.3 }],
  ['claude-haiku-5-5', { input: 0.1, output: 0.5, read: 0.01 }],
  ['claude-haiku-4-5', { input: 1, output: 5, read: 0.1 }],
]

const warmth = atom({ plugin: 'cache-keeper', key: 'warmth' } as const, null)
const windowMs = atom({ plugin: 'cache-keeper', key: 'windowMs' } as const, DEFAULT_WINDOW_MS)
const warnMs = atom({ plugin: 'cache-keeper', key: 'warnMs' } as const, DEFAULT_WARN_MS)
const isAuto = atom({ plugin: 'cache-keeper', key: 'isAuto' } as const, true)
const autoUntil = atom({ plugin: 'cache-keeper', key: 'autoUntil' } as const, 0)
const pingsLeft = atom({ plugin: 'cache-keeper', key: 'pingsLeft' } as const, DEFAULT_PINGS)
const measured = atom(
  { plugin: 'cache-keeper', key: 'measured' } as const,
  { warmMs: 0, coldMs: 0 } as Measured,
)
const isBusy = atom({ plugin: 'cache-keeper', key: 'isBusy' } as const, false)

const priceOf = (model: string): Price | null => {
  for (const [id, price] of PRICES) {
    if (model.startsWith(id)) return price
  }

  return null
}

const money = (usd: number) => {
  if (usd <= 0) return '$0'
  if (usd < 0.01) return '<$0.01'

  return usd < 100 ? `$${usd.toFixed(2)}` : `$${Math.round(usd)}`
}

const span = (ms: number) => {
  if (ms <= 0) return 'now'
  if (ms < MINUTE) return `${Math.round(ms / 1000)}s`
  const minutes = Math.round(ms / MINUTE)

  return minutes < 90 ? `${minutes}m` : `${(minutes / 60).toFixed(1)}h`
}

// A cold reading under the shortest TTL cannot be an expiry, so it is not a
// window: a store carrying one from before is read as no reading at all.
const coldOf = (seen: Measured) => (seen.coldMs >= SHORTEST_TTL_MS ? seen.coldMs : 0)

// The window as it stands: what was configured, narrowed by what the session
// has actually seen the cache survive (and not survive).
const effectiveWindow = (configured: number, seen: Measured) => {
  const cold = coldOf(seen)
  if (cold > 0 && cold < configured) return cold
  if (seen.warmMs > configured) return seen.warmMs

  return configured
}

const isMeasured = (configured: number, seen: Measured) => {
  const cold = coldOf(seen)

  return (cold > 0 && cold < configured) || seen.warmMs > configured
}

// A write costs 2x the input price on the hour-long cache, 1.25x on the
// five-minute one; a read is what the warm prefix costs instead.
const reheatCost = (held: Warmth, window: number) => {
  const price = priceOf(held.model)
  if (price === null) return null
  const write = window > 5 * MINUTE ? 2 : 1.25

  return (held.prefixTokens / 1e6) * (price.input * write - price.read)
}

// Keeping warm pays until the pings have cost what one cold restart would:
// a read against a write, which is 19 pings on Opus 5, 39 on Opus 5.5. Past
// that, letting it die is the cheaper move, so auto stops.
const breakEven = (model: string, window: number) => {
  const price = priceOf(model)
  if (price === null) return DEFAULT_PINGS
  const write = window > 5 * MINUTE ? 2 : 1.25

  return Math.max(1, Math.min(80, Math.floor((price.input * write - price.read) / price.read)))
}

const spentOn = (used: ModelUsage, model: string) => {
  const price = priceOf(model)
  if (price === null) return null

  return (
    (used.cache_read_input_tokens / 1e6) * price.read +
    (used.cache_creation_input_tokens / 1e6) * price.input * 2 +
    (used.input_tokens / 1e6) * price.input +
    (used.output_tokens / 1e6) * price.output
  )
}

let timer: Timer | null = null
let stepAt = 0
let stateFor = { id: '', path: '' }

const windowNow = async ($: EngineInterface) =>
  effectiveWindow(await read($, windowMs), await read($, measured))

// What the status line reads. It holds no countdown of its own: the script
// derives the remaining time from lastAt and windowMs, so the figure stays
// live between writes.
// One file per session, so two open terminals never overwrite each other.
// The id is asked for on every write and the path reused only while it still
// matches: /clear hands the session a new id without firing session.start
// again, and a path held from before would leave the status line reading a
// file nobody writes.
const whereState = async ($: EngineInterface) => {
  const id = await $.session.id()
  if (stateFor.id === id) return stateFor.path

  const home = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME')) ?? ''
  const sep = home.includes('\\') ? '\\' : '/'
  const path = [home.replace(/[\\/]$/, ''), '.claude', 'cache-keeper', `${id}.json`].join(sep)
  stateFor = { id, path }

  return path
}

const publish = async ($: EngineInterface) => {
  const held = await read($, warmth)
  if (held === null) return

  const state = {
    lastAt: held.lastAt,
    windowMs: await windowNow($),
    warnMs: await read($, warnMs),
    pingsLeft: await read($, pingsLeft),
    isAuto: await read($, isAuto),
    updatedAt: await $.clock.now(),
  }

  try {
    await $.fs.write(await whereState($), JSON.stringify(state))
  } catch (cause) {
    // Swallowing this once cost an afternoon of looking at an empty folder.
    $.ui.log(`cache-keeper: could not write its state file: ${String(cause)}`)
  }
}

const arm = async ($: EngineInterface) => {
  timer?.cancel()
  timer = null

  const held = await read($, warmth)
  if (held === null) return

  const window = await windowNow($)
  const warn = await read($, warnMs)
  const now = await $.clock.now()
  const wait = Math.max(1000, held.lastAt + window - warn - now)

  timer = $.clock.after(wait, () => void onCooling($))
}

const keepWarm = async ($: EngineInterface) => {
  if (await read($, isBusy)) return
  await update($, isBusy, () => true)
  try {
    const reply = await $.model.fork({ prompt: 'Reply with the single word: ok' })
    const now = await $.clock.now()

    if (!reply.isAnswered && reply.reason === 'nothing-to-fork') return

    const used: ModelUsage | null = 'usage' in reply ? reply.usage : null
    if (!reply.isAnswered && reply.reason === 'api-error') {
      $.ui.toast(`Cache Keeper: the ping failed (${reply.error}).`)

      return
    }

    const held = await read($, warmth)
    const model = held?.model ?? (await $.session.model())
    const served = used === null ? 0 : used.cache_read_input_tokens + used.cache_creation_input_tokens
    const prefix = served > 0 ? served : (held?.prefixTokens ?? 0)

    await update($, warmth, () => ({ lastAt: now, prefixTokens: prefix, model }))
    await update($, pingsLeft, left => Math.max(0, left - 1))

    // A routine ping says nothing: it is meant to happen while nobody looks.
    // A miss is worth hearing, because the thing it was protecting is gone.
    if (used !== null && used.cache_read_input_tokens < prefix / 2) {
      const spent = spentOn(used, model)
      $.ui.toast(
        `Cache Keeper: the ping missed — the cache had already gone cold${
          spent === null ? '' : ` (${money(spent)})`
        }.`,
        { timeoutMs: 10000 },
      )
    }
  } catch (cause) {
    $.ui.toast(`Cache Keeper: the ping failed: ${String(cause)}`)
  } finally {
    await update($, isBusy, () => false)
    await arm($)
    await publish($)
  }
}

const onCooling = async ($: EngineInterface) => {
  const held = await read($, warmth)
  if (held === null) return

  const now = await $.clock.now()
  const until = await read($, autoUntil)
  const budget = await read($, pingsLeft)
  const auto = await read($, isAuto)
  const isRunning = auto && (until === 0 || now < until)

  if (isRunning && budget > 0) {
    await keepWarm($)

    return
  }

  // Only speak when nothing can be done automatically. While auto is running
  // a warning would announce a problem it is about to solve itself.
  const window = await windowNow($)
  const remaining = held.lastAt + window - now
  const cost = reheatCost(held, window)
  const why = isRunning
    ? 'Keeping warm has cost as much as one cold restart would, so it has stopped'
    : 'Keeping warm is off'
  const text =
    cost === null
      ? `${why}. The prompt cache goes cold in ${span(remaining)}.`
      : `${why}. The prompt cache goes cold in ${span(remaining)}, and reheating it costs about ${money(cost)}.`

  $.ui.toast(text, { timeoutMs: 20000 })
  void $.ui.notify(text, { title: 'Cache Keeper' }).catch(() => undefined)
  await publish($)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const storedWindow = Number(await $.store.get(KEY_WINDOW))
    const storedWarn = Number(await $.store.get(KEY_WARN))
    const storedAuto = await $.store.get(KEY_AUTO)
    const storedSeen = (await $.store.get(KEY_MEASURED)) as Measured | undefined

    if (Number.isFinite(storedWindow) && storedWindow > 0) {
      await update($, windowMs, () => storedWindow)
    }
    if (Number.isFinite(storedWarn) && storedWarn > 0) {
      await update($, warnMs, () => storedWarn)
    }
    if (storedAuto === false) await update($, isAuto, () => false)
    if (storedSeen !== undefined && typeof storedSeen.warmMs === 'number') {
      await update($, measured, () => ({
        warmMs: storedSeen.warmMs,
        coldMs: storedSeen.coldMs,
      }))
    }

    await update($, isBusy, () => false)

    // The budget is derived from the model's own prices, not guessed.
    try {
      const model = await $.session.model()
      const window = await windowNow($)
      await update($, pingsLeft, () => breakEven(model, window))
    } catch {
      // No model to price yet; the first completed turn sets the real budget.
    }

    await $.command.register({
      name: 'cachekeeper',
      description: 'Keeping the prompt cache warm: the window, the budget, on and off.',
      argumentHint: '[off|on|window <min>|warn <min>|for <min>|budget <n>|now]',
    })

    await arm($)

    return next(e)
  })

  // Each model request of the main loop: the cache's clock runs from the
  // moment a request STARTS, generation time included.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId === undefined) stepAt = await $.clock.now()

    return yield* next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined || e.usage === undefined) return next(e)

    const used = e.usage
    const at = stepAt === 0 ? await $.clock.now() : stepAt
    const prefix = used.cache_read_input_tokens + used.cache_creation_input_tokens
    const held = await read($, warmth)

    // What this turn's hit says about the real window: the gap it crossed
    // either kept the prefix or lost it.
    if (held !== null && held.prefixTokens > 0) {
      const gap = at - held.lastAt
      const seen = await read($, measured)
      const kept = used.cache_read_input_tokens > held.prefixTokens / 2
      // A miss only says something about the window when the entry it missed
      // could have been there to begin with: same model, since cache entries
      // are model-scoped, and a gap long enough for the shortest TTL to run out.
      const couldHaveExpired = held.model === used.model && gap >= SHORTEST_TTL_MS
      const lost = couldHaveExpired && used.cache_read_input_tokens < held.prefixTokens / 10
      const after: Measured = kept
        ? { warmMs: Math.max(seen.warmMs, gap), coldMs: seen.coldMs }
        : lost
          ? { warmMs: seen.warmMs, coldMs: seen.coldMs === 0 ? gap : Math.min(seen.coldMs, gap) }
          : seen

      if (gap > MINUTE && (after.warmMs !== seen.warmMs || after.coldMs !== seen.coldMs)) {
        await update($, measured, () => after)
        await $.store.set(KEY_MEASURED, after)
      }
    }

    await update($, warmth, () => ({ lastAt: at, prefixTokens: prefix, model: used.model }))

    // The budget counts pings since your last message: coming back means the
    // session is worth keeping warm again.
    const window = await windowNow($)
    await update($, pingsLeft, () => breakEven(used.model, window))
    await arm($)
    await publish($)

    return next(e)
  })

  on('command.run', { command: 'cachekeeper' }, async ($, e) => {
    const said = e.args.trim().toLowerCase()
    const [word, rest] = [said.split(/\s+/)[0] ?? '', said.split(/\s+/)[1] ?? '']
    const minutes = Number.parseInt(word === 'for' || word === 'budget' ? rest : rest, 10)

    if (word === '') {
      const configured = await read($, windowMs)
      const seen = await read($, measured)
      const window = effectiveWindow(configured, seen)
      const auto = await read($, isAuto)
      const budget = await read($, pingsLeft)
      const how = isMeasured(configured, seen) ? 'measured in this session' : 'assumed'

      return {
        text:
          `Cache window ${span(window)} (${how}). ` +
          (auto
            ? `Keeping it warm, ${budget} pings left before that costs as much as one cold restart. ` +
              'Turn it off with /cachekeeper off.'
            : 'Keeping it warm is off. Turn it on with /cachekeeper on.'),
      }
    }

    if (word === 'off') {
      await update($, isAuto, () => false)
      await $.store.set(KEY_AUTO, false)
      await arm($)
      await publish($)

      return { text: 'Keeping the cache warm is off.' }
    }

    if (word === 'on') {
      const held = await read($, warmth)
      const window = await windowNow($)
      await update($, isAuto, () => true)
      await update($, autoUntil, () => 0)
      if (held !== null) await update($, pingsLeft, () => breakEven(held.model, window))
      await $.store.set(KEY_AUTO, true)
      await arm($)
      await publish($)

      return { text: `Keeping the cache warm, ${await read($, pingsLeft)} pings.` }
    }

    if (word === 'now') {
      void $.clock.after(0, () => void keepWarm($))

      return { text: 'Pinging the cache.' }
    }

    if (word === 'for') {
      if (!Number.isFinite(minutes) || minutes < 1 || minutes > 600) {
        return { text: 'Give how many minutes to keep it warm for, 1 to 600.' }
      }
      const now = await $.clock.now()
      await update($, isAuto, () => true)
      await update($, autoUntil, () => now + minutes * MINUTE)
      await arm($)
      await publish($)

      return { text: `Keeping the cache warm for the next ${minutes}m.` }
    }

    if (word === 'window') {
      if (!Number.isFinite(minutes) || minutes < 1 || minutes > 240) {
        return { text: 'Give the window in minutes, 1 to 240.' }
      }
      await update($, windowMs, () => minutes * MINUTE)
      await $.store.set(KEY_WINDOW, minutes * MINUTE)
      await arm($)
      await publish($)

      return { text: `Cache window set to ${minutes}m.` }
    }

    if (word === 'warn') {
      if (!Number.isFinite(minutes) || minutes < 1 || minutes > 60) {
        return { text: 'Give the warning in minutes, 1 to 60.' }
      }
      await update($, warnMs, () => minutes * MINUTE)
      await $.store.set(KEY_WARN, minutes * MINUTE)
      await arm($)
      await publish($)

      return { text: `A ping now happens ${minutes}m before the cache would go cold.` }
    }

    if (word === 'budget') {
      if (!Number.isFinite(minutes) || minutes < 0 || minutes > 100) {
        return { text: 'Give a number of pings, 0 to 100.' }
      }
      await update($, pingsLeft, () => minutes)
      await publish($)

      return { text: `Keeping warm has ${minutes} pings left.` }
    }

    return { text: 'Try: off, on, now, for <min>, window <min>, warn <min>, budget <n>.' }
  })
}
