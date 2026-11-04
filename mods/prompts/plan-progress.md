Build me a Claude Code mod (use the plugin-authoring skill), saved in
~/.claude/mods/plan-progress and installed for my user so it's active in every
session.

WHAT IT DOES
Shows me where a multi-step task has got to, while Claude is working on it: the
goal, the phase, what's ticked off, how far along and how long it's taken. And
the same for the other sessions I have running.

THE PANE
- Opens by itself once a run is multi-step: two tasks on the list, or a goal set.
- /plan-progress opens it whatever the terminal width. /plan-progress all opens
  it on the other view.
- The goal on top, then the phase, then the checklist, then the bar, then the
  buttons.

THE GOAL
Taken from ProposeGoal when a goal is set, from /goal's arguments when I type
one, and otherwise from the prompt that opened the run. One line, shortened to
160 characters. A run already open keeps the goal it had.

THE PHASE
- One of researching, planning, building, testing, auditing, with a coloured dot.
- Read off the tool calls: reads and searches say researching; plan mode and
  ProposeGoal say planning; edits say building; a Bash command that looks like a
  test run says testing; a review or security skill says auditing.
- Researching is the weak signal and must never pull the phase backwards — a
  stray read in the middle of a build leaves it on building — while build to
  test and back again moves freely.

THE CHECKLIST AND THE BAR
- One row per task, with a mark for done, in progress and pending. Done rows
  dimmed, the one in progress in bold. Cut to the rows that fit, with "n more"
  under them.
- The bar and the percentage come from the same counts, and a "done/total" line
  sits beside the buttons.

THE CLOCK
Ticks once a second while the run is open and freezes when it closes. A session
with nothing running must redraw nothing. A run closes when every task is ticked,
or when a turn ends with no tasks at all.

ALL TASKS
- From the button in the pane, or /plan-progress all.
- One block per other session: the folder it runs in, the phase, the goal, and
  its own bar with percentage and age.
- Each session writes its own key in the shared store, so two sessions never
  overwrite each other, and entries nobody has touched for a day are dropped as
  they're found. At most twenty, newest first.

MINIMIZE
- A "_" next to the engine's close mark, hotkey m.
- It closes the pane and leaves a chip above the prompt carrying the name, the
  phase and the percentage. Pressing the chip brings the pane back as it was,
  on the view it was on.
- While it's minimized nothing may reopen it behind my back: not a new prompt,
  not a new checklist. Only the chip or the command.

The band above the prompt is shared: several mods draw into it. Ask the chain
for what the others have drawn and put your own row above it, keeping theirs.
Never return your row alone — whatever sits below you in the chain disappears,
and something down there is usually the only way to bring a pane back. When you
have nothing to show, return the others' rows untouched rather than nothing.
Keep the keys of your buttons unique enough to survive sharing a band.

SOUND
- A short notification whenever Claude finishes a turn on the main loop, not on
  a subagent's.
- On Windows $.audio.play has no player and would be silent, so go through
  PowerShell and the system notification wav, with beeps as a fallback. Anywhere
  else play a wav shipped with the mod.
- A sound that fails costs a line in the debug log and never the turn.

KEEP WARM
- While the session sits idle, send a short prompt so the prompt cache doesn't
  go cold.
- Check every minute, and send only once the idle time has really passed. While
  I'm working my own turns keep it warm and the mod must send nothing.
- The turn it sends is its own: it must not open a run, move the phase or reset
  the clock.
- Three settings in /config: on or off (default on), the idle minutes before it
  fires (default 55, under the cache TTL), and the text it sends (default a line
  asking for a one-word answer).

ALSO
- everything the pane draws lives in session state, not in module variables, so
  editing the mod and reloading it loses neither the view, nor the goal, nor the
  clock;
- tests for the checklist and the bar, for the phase moving on and not back, for
  the All tasks view with and without another session, for a run ending, for
  minimize and the chip, and for the keep-warm staying quiet while I work,
  firing when I don't, and off when I turn it off;
- validate it and type-check it before telling me it's done.

THE MODULE LAYOUT
One module, hooks/register.tsx. types/index.d.ts declares the
`plan-progress` state: `run`, `view`, `now`, `others` and `minimized`. The
manifest carries three userConfig fields: `keepWarm` (boolean, default true),
`keepWarmMinutes` (number, default 55) and `keepWarmText` (string). The test
file is hooks/register.test.tsx and it drives the mod through `$` and `on`
alone, so the inside is yours.

WHAT LIVES OUTSIDE THE MOD
sounds/done.wav, the chime `$.audio.play({ asset: 'sounds/done.wav' })`
reaches for. It is a binary: no prompt rebuilds it, so carry the file.
