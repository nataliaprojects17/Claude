Build me a Claude Code mod (use the plugin-authoring skill), saved in
~/.claude/mods/state-assumptions and installed for my user so it's active in every session.

WHAT IT DOES
1. Make Claude end every reply in which it builds or changes something with an
   "Assumptions" section: everything it decided without being told, guessed or inferred,
   numbered A1, A2… (one per line, starting with the number), plus what changes if
   one is wrong. If there are none, it says so in one line. Never in commits or files.
   When I answer about an assumption, it redoes only what depended on it.

2. Show those assumptions in a small band above the prompt, not in a side pane,
   and remove them from the reply on screen so they don't appear twice
   (they reappear in the reply when the band empties).

THE BAND
- Closed it's a single line: "▼ N assumptions to review", plus a "Dismiss" button
  that closes it without sending anything.
- Clicking the line opens the list, one row per assumption:
  [Reject] [Change]  A1 text…   ▼ more
  - Reject marks it rejected (struck through) and becomes Undo.
  - Change opens a text field where I write what to do instead.
  - long texts are cut to one line, with "more/less" to read them in full.
- At the bottom: [Send], [Clear] and a preview of what will be sent.
- Colored buttons: red for Reject, blue for Change, green for Send, gray for the rest.

The band above the prompt is shared: several mods draw into it. Ask the chain
for what the others have drawn and put your own row above it, keeping theirs.
Never return your row alone — whatever sits below you in the chain disappears,
and something down there is usually the only way to bring a pane back. When you
have nothing to show, return the others' rows untouched rather than nothing.
Keep the keys of your buttons unique enough to survive sharing a band.

SENDING
Send sends one message as if I'd typed it, e.g. "A1: no", "A2: no, use PowerShell",
"A3: count all files". Whatever I don't touch counts as accepted.

IF I FORGET
If I mark something and then write another message without pressing Send, let the
message through but warn me that I have answers not sent, and show in the band how
many are left ("· 1 not sent").

ALSO
- a /assumptions command to open and close the list;
- tests for parsing, sending and the warning; validate it before telling me it's done.

THE MODULE LAYOUT
The tests come with the prompt and import the mod's own code, so put the
pieces where they expect them. hooks/register.tsx exports `ASSUMPTIONS`,
`parseAssumptions(text)` (the list, or null), `withoutSection(text)` and
`composeReply(list, given)` beside `register`. The test file is
tests/register.test.ts.
