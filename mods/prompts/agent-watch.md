Build me a Claude Code mod (use the plugin-authoring skill), saved in
~/.claude/mods/agent-watch and installed for my user so it's active in every
session.

WHAT IT DOES
A side pane that follows the subagents of the session: one card each, split
between running and finished, with type, model, effort, a stopwatch, tokens,
context share and the last few things each one did.

THE PANE
Titled "Subagents". It seats itself at the start of a session and on every
prompt I send, and it comes back up on its own whenever an agent is spawned,
even if I had closed or minimised it. It never asks twice: if it is already
placed, leave it where it is.

THE TOTALS
Two boxes at the top, each a rounded dim frame with a dim heading and the
value in bold under it:
- "Token agenti" — every token spent by every subagent of the session,
  context and output together, counted as the turns go by. It keeps counting
  across the whole session and is not reset by clearing the finished list.
- "Tempo totale" — the sum of how long each card has been alive, running ones
  counted up to now.
Under 36 columns of body width the two boxes are dropped for a single dim
line: "Token agenti 12k · Tempo totale 4:31", joined with " · ". Never let
the layout go below 24 columns of usable width.

THE TABS
Two of them, side by side: "Attivi · N" and "Finiti · N", N being how many
cards are in each. The chosen one is bold with an inverted-text foreground on
a filled background — the Claude accent for "Attivi", amber for "Finiti" —
and the other one is dim. A card counts as finished once it is completed,
failed or killed; everything else is active.
On "Finiti", and only when there is at least one finished card, a dim
"[ svuota ]" on the right of the tabs. Pressing it drops the finished cards
for good: they do not come back if the agent is still around. Remember up to
200 dropped ids. If nothing active is left after that, the pane closes.
When the chosen tab has no cards, show one dim line instead: "Nessun subagent
attivo." or "Nessun subagent finito."

A CARD
Every line of a card starts with "▌ " in the card's own colour. The colour
rotates by position down the list through red, green, blue, magenta, cyan,
yellow, then starts over.

1. The title in bold — the agent's name, or failing that the description it
   was spawned with, or failing that its type — followed by a dim "▸" closed
   and "▾" open. Pressing the title opens and closes the card. On the far
   right of the same line, the status mark in the status colour.
2. Dim, on the left: "<type> · <model>", plus " · <effort>" when the effort
   is known. On the right, also dim: "42k tok · 2:17" — total tokens and the
   stopwatch.
3. In the status colour and bold: "<status word> · N step". If the agent
   reports progress, a dim " · 3/8" after it, with "?" for the total when
   only the done count is known.
4. Then the recent actions (below).
Open, two more dim lines: "contesto 42k (37%) · 5 tool", and the spawn
description on its own line when there is one and it isn't already the title.
Every card closes with a rule of "─" in the card's colour, indented by two,
running the width of the pane.
Truncate anything too long to the line, with "…" as the last character.

STATUS
Each status has a mark, a word and a colour, and all three must agree:
- completed → "✓", "Fatto", green;
- failed → "✗", "Fallito", red;
- killed → "⊘", "Interrotto", red;
- pending → "◌", "In coda", amber;
- waiting or idle → "◐", "In attesa", amber;
- anything else, running included → "●", "In corso", the Claude accent.

NUMBERS
- Time as "m:ss", and "h:mm:ss" once it passes an hour, seconds rounded.
- Tokens plain under a thousand, "42k" rounded from a thousand up, "1.4M"
  with one decimal from a million up.
- The model name comes from its id: drop a leading "claude-", capitalise the
  first word, keep only the purely numeric parts after it joined by dots —
  "claude-opus-5" reads "Opus 5". With no id at all, "modello ignoto".
- The context share is the agent's current context against the main context
  window, rounded to a whole percent. Read that window size once, when the
  mod wakes up. If it isn't known, or the agent has no context yet, show "—".

RECENT ACTIONS
One line per tool call, newest last. Two of them on a closed card, up to
twelve on an open one. Each line is a verb plus what it acted on. The verb is
in the present while the call runs and in the past once it returns, and the
line is rewritten in place — it doesn't become a second line:
Read → Reading/Read, Write → Writing/Wrote, Edit and NotebookEdit →
Editing/Edited, Bash and PowerShell → Running/Ran, Grep → Searching/Searched,
Glob → Looking for/Found, WebFetch → Fetching/Fetched, WebSearch →
Searching/Searched, Agent → Spawning/Spawned, Skill → Using/Used.
Any other tool uses its own name as the verb, unchanged, in both tenses; an
MCP tool uses only the last segment of its name.
What it acted on is the first of these the call carries: a file path — shown
as its last two segments only, joined with "/" — from file_path, path or
notebook_path; otherwise the first line of command, pattern, query, url,
description, skill or prompt, in that order. If none of them is there, the
verb stands alone.

MINIMISING
A "_" button in the top left of the pane, also reachable by pressing "m".
It closes the pane and leaves a single mark above the prompt: "[_] Subagents"
in the Claude accent. Pressing that brings the pane back exactly as I left
it — same tab, same cards open, same counters. Nothing of mine above the
prompt while the pane is up, and nothing once it is restored.

The band above the prompt is shared: several mods draw into it. Ask the chain
for what the others have drawn and put your own row above it, keeping theirs.
Never return your row alone — whatever sits below you in the chain disappears,
and something down there is usually the only way to bring a pane back. When you
have nothing to show, return the others' rows untouched rather than nothing.
Keep the keys of your buttons unique enough to survive sharing a band.

WHEN THERE'S NOTHING
A pane with no cards at all, neither active nor finished, has nothing to say:
it closes itself, but only once the drawing is over, never in the middle of
it. An agent the mod never saw start — one already running when it wakes up —
still gets a card, taken from whatever the session knows about it. For agents
it does know, what the session reports now wins over what it had recorded:
status, type, description and name. A running agent that reappears already
finished gets its end time stamped at that moment.

LIMITS AND REFRESH
Keep the sixty most recent agents and drop the oldest beyond that. Keep the
last twelve actions per agent. Redraw once a second, and only while at least
one card is not finished — a pane of finished cards sits still.

WHAT IT DOESN'T DO
It doesn't show what an agent answered, and it has no way to stop one, talk
to one or start one. It is a window, not a remote control.

ALSO
- /agent-watch, described as "Show the subagents of this session in a pane",
  opens it and undoes the minimising; it answers "Subagents pane opened." or,
  when the pane can't be placed, "Subagents pane is waiting: <reason>";
- the screen text is in Italian where it's quoted above, and stays that way;
- a spawn, a tool call or a draw that goes wrong must never take the session
  down with it — swallow it and carry on;
- tests for a spawned agent going active then finished, expanding on a press
  and being cleared; for a step recording model, effort and context tokens;
  for the empty pane closing itself; for the mark above the prompt appearing
  only once minimised; and for a new agent reopening a minimised pane;
  validate it before telling me it's done.

THE MODULE LAYOUT
One module, hooks/register.tsx. types/index.d.ts declares the `agent-watch`
state: `rows` (the cards), `open` (which ids are expanded), `window` (the
context window read once), `cleared` (the dropped ids), `tab`, `spent` (the
running token total) and `minimized`. The test file is tests/pane.test.ts and
it drives the mod through `$` and `on` alone, so the inside is yours.
