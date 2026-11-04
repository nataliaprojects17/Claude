Build me a Claude Code mod (use the plugin-authoring skill), saved in
~/.claude/mods/minimize-panes and installed for my user so it's active in
every session.

WHAT IT DOES
Gives every side pane a minimize button. The pane goes away and leaves a small
button above the prompt with its name on it; pressing that button brings the
pane back as it was. It works on any pane, whoever opened it — it is not a
feature of one mod for its own window.

THE MINIMIZE BUTTON
Every pane that gets drawn, from any mod, gets one extra row at the very top,
above whatever the pane itself draws. In that row, one button, labelled with a
single underscore:

  _

The pane's own content follows underneath, untouched — the mod never rewrites
what a pane draws, it only puts a row above it. The button also answers the
hotkey "m" on the pane that has the focus. Pressing it remembers the pane's id
and the title it was opened with, then closes the pane.

With one exception: a pane that already draws its own minimize button gets
nothing. Two buttons for the same thing is confusing, and the mod's own one
knows how to bring its pane back, which this mod cannot do for it — it would
close the pane while the owner still believes it is open, and the owner would
reopen it at the next turn. The pane is recognised from the tree it draws: a
Button whose key is "minimize". Leave that tree exactly as it came.

THE BAND
A band above the prompt, shown only while something is minimized. When nothing
is, the band draws nothing at all — not an empty row, not a placeholder.

It opens with the word

  Ridotte

dimmed, followed by one button per minimized pane, each labelled with the
pane's title between empty brackets:

  Ridotte  [ ] File toccati  [ ] Subagents

Nothing else is coloured; the buttons use the normal foreground. The order is
the order in which the panes were minimized, oldest first, newest at the right
end. A pane is only ever in the band once: minimizing a pane that is already
there moves it to the end rather than adding a second button.

BRINGING ONE BACK
Pressing a button opens that pane again with the same id and the same title it
had, and the button leaves the band. The pane comes back with its content as
it was — the mod stores nothing of the pane's state, it only asks for the pane
to be opened again, and the mod that owns it keeps its own rows.

If the pane cannot be placed on screen — no room for it — leave the button in
the band and say so in a toast, exactly:

  minimize-panes: File toccati non entra nello schermo

with the pane's title in the middle. Don't retry on your own.

A pane can also come back without me touching the band: a mod can reopen its
own window, or a slash command can. Whenever a pane is opened, by anyone, drop
it from the band, so a pane is never both on screen and listed as minimized.

WHAT IT DOESN'T KEEP
Nothing survives the session. At the start of every session the band is empty,
even if I quit with three panes minimized. What happens to those panes on the
next session is up to whoever opens them, not to this mod.

AT THE EDGES
- No pane minimized: nothing above the prompt.
- A pane that closes itself while it is minimized keeps its button; pressing
  it asks for that pane to be opened again, same as any other.
- A narrow terminal: the band stays one row of buttons. Don't wrap it, don't
  shorten the titles, don't replace them with a count.

ALSO
- no slash commands, no settings, nothing to configure: the button is on every
  pane that hasn't got one already, and that's the whole of it;
- it never decides on its own that a pane should be minimized, and never
  reopens one on its own;
- the strings on screen stay in Italian exactly as written above, including
  the toast;
- tests for the button appearing on a pane, for the band staying empty while
  nothing is minimized, for minimizing closing the pane and leaving a button
  that names it, for that button reopening the pane and clearing itself from
  the band, and for a pane that draws its own minimize getting no second one;
  validate it before telling me it's done.

THE MODULE LAYOUT
One module, hooks/register.tsx. types/index.d.ts declares the
`minimize-panes` state: `minimized`, the list of panes put away. The test
file is tests/register.test.ts and it drives the mod through `$` and `on`
alone, so the inside is yours.
