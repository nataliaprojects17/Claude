Build me a Claude Code mod (use the plugin-authoring skill), saved in
~/.claude/mods/ideas and installed for my user so it's active in every session.

WHAT IT DOES
A shelf for side ideas that come up while Claude is working. I park an idea in a
second without interrupting the current turn, and come back to it later. Ideas are
kept per project and remember the branch they were parked on.

PARKING AN IDEA
- /idea <text> parks it immediately, even while Claude is busy, with no row in
  the transcript, only a short confirmation.
- In the text, #word adds a tag and !high / !low sets the priority.
- Claude can park one too, through a tool, when I tell it "park this" or when it
  notices a worthwhile tangent outside the current task.
- Each idea gets a short code (e.g. I-3f2a) so it can be referred to.

THE SHELF
- /ideas (or /idea with no text) opens it in a side pane.
- No frames anywhere: no border around the field, no rule above the list, no box
  around the open idea, no filled chips on the buttons. Indentation and colour
  carry the structure.
- A "_" button, hotkey m, closes the pane and leaves a button above the prompt
  that brings it back as it was.

  The band above the prompt is shared: several mods draw into it. Ask the chain
  for what the others have drawn and put the button above it, keeping theirs.
  Never return the button alone — whatever sits below in the chain disappears,
  and something down there is usually the only way to bring a pane back. While
  the shelf is up, return the others' rows untouched rather than nothing. Keep
  the button's key unique enough to survive sharing a band.
- At the top: a field to park a new idea directly. It must read as a field you
  can type in, not as a title. A label before it that stays while you type, and
  under it, aligned to the field, the modifiers it takes: !high, !low, #tag.
  They go on their own line, not in the placeholder, or a narrow pane cuts them.
- Below it: a switch between "this branch" and "whole project". Both options
  are always visible, the chosen one clearly highlighted. Next to it: show/hide
  closed ideas, tag filters, and the number of ideas in view.
- A tag filter appears only when at least two ideas in view carry that tag,
  plus whichever one is selected, so it can always be cleared. A tag on a single
  idea filters nothing and costs a row.
- One row per idea, in columns that line up: the code, then two characters that
  carry the status when there is one and the priority otherwise, then the first
  line of the text, then age — or the branch, in whole-project view. High
  priority first. The tags are not on the row: a variable number of them in
  the tail makes every row a different length and the columns stop lining up.
- Selecting a row opens it under the text column, with its full text, its tags,
  age and branch, and the actions:
  - Send to Claude: sends it as my message, once the current turn ends.
  - Edit in prompt: puts it in the prompt box for me to change first.
  - Quick take: asks a fork of the conversation, in a few lines, whether it's
    worth doing, how it relates to the current work and what the first step is.
    The main conversation never sees it. The answer stays on the idea, can be
    folded, and can be asked again.
  - Change priority, edit tags.
  - Close, Reject, Reopen, Delete.

KEEPING IT TIDY
- After commits, close the open ideas on the branch that the new commits
  implement: by their code in a commit message, or by asking a small model to
  judge, strictly. Tell me with a toast which ones were closed.
- At most once a day, remind me of open ideas on the branch parked more than N
  days ago (N configurable, 0 turns it off).
- Show the count of open ideas on the branch in the status line.

ALSO
- two sessions on the same project must not overwrite each other's ideas;
- tests for parking, filters, the scope switch, closing by commit and the
  reminder; validate it before telling me it's done.

THE MODULE LAYOUT
One module, hooks/register.tsx. types/index.d.ts declares the `ideas` state:
`list`, `where`, `scope`, `selected`, `showClosed`, `tag` and `minimized`.
The manifest carries one userConfig field, `reminderDays` (a number). The
test file is tests/ideas.test.tsx and it drives the mod through `$` and `on`
alone, so the inside is yours.
