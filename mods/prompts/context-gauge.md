Build me a Claude Code mod (use the plugin-authoring skill), saved in
~/.claude/mods/context-gauge and installed for my user so it's active in every
session.

WHAT IT DOES
Warns me when the conversation is getting long enough that quality slips, and
writes a handoff so I can start a fresh session without losing where I was.

THE WARNING
A band above the prompt, only when there's something to say:
- from 70% of the context window: "getting long — quality starts to slip
  around here", in amber;
- from 85%: "long context — answers drift and detail gets dropped", in red.
Below those, show nothing of your own. Never a side pane.

The band above the prompt is shared: several mods draw into it. Ask the chain
for what the others have drawn and put your own row above it, keeping theirs.
Never return your row alone — whatever sits below you in the chain disappears,
and something down there is usually the only way to bring a pane back. When you
have nothing to show, return the others' rows untouched rather than nothing.
Keep the keys of your buttons unique enough to survive sharing a band.

THE HANDOFF
Written by a fork of the conversation, so the main thread never sees the
asking. Markdown, under 400 lines, opening with one `# ` line naming the work,
then these headings, dropping any it has nothing to put under:

- Goal — what we're solving, and why.
- Where we are — the state as it stands, around twenty bullets, each saying
  whether it was verified or is only assumed.
- What we tried — every approach in order, the failures included, each with
  what went wrong, so none of them is tried again.
- Decisions — what was chosen and what was rejected, and why both, so neither
  is reopened.
- Evidence — the numbers, errors and output as they actually read. Quoted,
  not summarised.
- What the person asked for — my corrections, preferences and constraints, in
  my own words.
- Files — the paths that matter, one line each.
- Quick start — the exact commands that get the work running again.
- Next — the steps you'd take now, in order.

Only what the conversation says. No guessing at the rest.

WHAT GOES IN WITH IT
Read the repository from disk at that moment — branch, last commits, working
tree, uncommitted changes by file — and use it for Files and Quick start, and
say where it disagrees with the conversation. If there's an earlier handoff in
the folder, point back to it instead of repeating it.

WHERE IT LANDS
<project root>/.claude/handoffs/HANDOFF_NNN_<slug>_<YYYY-MM-DD>.md, the number
continuing from what's already there. Check it actually landed. If it comes out
thin — few headings, too short — say so rather than call it saved.

THE BUTTONS
On the band, coloured:
- 💾 Save & start new, green: writes the handoff, clears, and puts a prompt in
  the box telling the fresh session to read the file and pick up from Next.
- ❌ Drop & start new, red: clears without writing anything.
- ✕ Hide, dim.
If /clear can't be run for me, put it in the prompt box and tell me to press
Enter.

AUTOMATIC
Once the context passes a threshold (80% by default), write the handoff for me
and say so in a toast. Don't do it again until the context has climbed another
ten points, and never twice within a couple of minutes.

ALSO
- /autohandoff <percent|off> sets or disables the threshold, and remembers it
  across sessions;
- /handoff writes one now; /handoff now also clears into a fresh session;
- if a reload interrupts a handoff mid-write, say so rather than leave it
  looking busy;
- tests for the threshold, the file naming and the clear; validate it before
  telling me it's done.

THE MODULE LAYOUT
One module, hooks/register.tsx. types/index.d.ts declares the `context-gauge`
state: `gauge`, `isHidden`, `threshold`, `note`, `handoff`, `isBusy`,
`armedAt` and `isSeeded`. The test file is hooks/gauge.test.tsx and it drives
the mod through `$` and `on` alone, so the inside is yours.
