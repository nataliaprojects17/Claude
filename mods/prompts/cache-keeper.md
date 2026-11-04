Build me a Claude Code mod (use the plugin-authoring skill), saved in
~/.claude/mods/cache-keeper and installed for my user so it's active in every session.

WHAT IT DOES
Keeps the prompt cache warm by itself, and shows me how long it has left in my
status line. No band above the prompt, no buttons: the case this exists for is
me being away from the keyboard, so anything I have to press is useless.

WHERE IT SHOWS
In my status line (~/.claude/statusline.js), on the row that already has the
context fill and my 5h and 7d windows:

  🔥 cache 47m

Claude Code feeds that script a fixed JSON payload with no cache field in it, so
the mod writes ~/.claude/cache-keeper/<session-id>.json holding lastAt, the
window, the warning, the pings left and whether it's on. The script reads the
file matching its own session_id and does the countdown itself, so the figure
stays live between writes, and two open terminals never overwrite each other.
No file, no segment — never a made-up zero.

Two things that cost an afternoon when I got them wrong, so get them
right the first time. Resolve the path lazily, the first time something needs
to write it, NOT in session.start: /reload-plugins re-reads an installed mod
without firing session.start again, so a path set only there stays empty after
every reload and nothing is ever written. And never swallow the write error —
log it. A silent catch here looks exactly like a mod that is working fine, and
the only symptom is an empty folder.

Four stages, each its own mark and colour:

  🔥 cache 47m    green, warm
  ⏳ cache 12m    amber, cooling, from 3x the warning
  ⚠ cache 3m     red, about to go
  🧊 cache cold   grey, not red: the prefix is gone, nothing left to save

A dim "off" after it when I've turned the pinging off.

THE PING
Use $.model.fork, not a submitted prompt: it re-sends the session's own prefix
so the API serves it from cache and the TTL resets, and nothing lands in my
transcript. The prompt is a placeholder — "Reply with the single word: ok" —
because a request needs something new at the end to be valid; keep the reply
tiny and don't ask for a tool, since forks deny every tool.

ALWAYS ON, WITH A DERIVED LEASH
Ping automatically, five minutes before the window closes, with no asking.

The leash isn't about money, it's about my 5h and 7d windows: every ping is a
real request against them, and a session left open over a weekend would ping a
hundred times unattended. Derive it, don't guess. A ping costs a cache read
over the prefix; a cold restart costs a cache write, roughly twenty times more.
So the budget is (write - read) / read pings — 19 on Opus 5, 39 on Opus 5.5 —
after which letting it die is the cheaper move and it stops. Refill the budget
on every real turn: coming back means the session is worth keeping warm again.

WHEN TO SPEAK
Never for a routine ping: it's meant to happen while nobody looks. Speak only
when nothing can be done automatically — the budget is spent, the ping failed,
or I turned it off. Then a toast and a native desktop notification saying what
a reheat will cost. A warning raised while the thing is about to fix the
problem itself is noise.

Say so too when a ping misses, because what it was protecting is gone.

THE CACHE WINDOW
There's no API field for it. Assume 60 minutes, then MEASURE it: every turn
that crosses a gap says whether the prefix survived. Keep the longest gap that
stayed warm and the shortest that went cold, persist both across sessions, and
narrow the countdown to what's actually been seen. Tell me which number I'm
looking at, assumed or measured in this session.

Anchor the countdown at the START of the last model request, not its end: the
cache's clock runs during generation too.

ALSO
- /cachekeeper with no arguments: a plain-language report that names the
  command to turn it off;
- /cachekeeper off and on, now, for <min>, window <min>, warn <min>,
  budget <n>;
- settings persist across sessions;
- tests for the derived budget, the automatic ping, the budget running out,
  the refill on a real turn, off, the state file, and one that completes a turn
  WITHOUT session.start ever running, to hold the lazy path honest;
- validate and type-check it before telling me it's done.

THE MODULE LAYOUT
One module, hooks/register.ts. types/index.d.ts declares the `cache-keeper`
state: `warmth`, `windowMs`, `warnMs`, `isAuto`, `autoUntil`, `pingsLeft`,
`measured` and `isBusy`. The test files are tests/keeper.test.ts and
tests/measure.test.ts, and both drive the mod through `$` and `on` alone, so
the inside is yours.

WHAT LIVES OUTSIDE THE MOD
The status-line segment is not the mod's: ~/.claude/statusline.js does the
countdown itself, reading ~/.claude/cache-keeper/<session-id>.json for the
session whose id it was handed. The mod writes that file; the script renders
it. Moving the mod to another machine without that script gives you a mod
that works and shows nothing.
