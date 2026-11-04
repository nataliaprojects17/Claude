Build me a Claude Code mod (use the plugin-authoring skill), saved in
~/.claude/mods/design-chooser and installed for my user so it's active in every session.

WHAT IT DOES
When Claude asks me to choose a design direction, the options arrive as words only,
and I have to ask separately for an image or an HTML page before I can decide.
This mod shows each option as a visual mockup in the browser, where I choose by
clicking.

WHEN IT STARTS
- When Claude is about to ask me to choose a visual design direction for something
  I'll look at: a web page, a mobile app, an app screen, a component.
- When I ask myself to see style or design options.
- Not for choices that aren't visual: those stay in the terminal.

A ROUND
- A browser tab opens by itself with one mockup per option (2 to 4), side by side,
  each with a short title. Generic sample content is enough to judge the style.
  Web options look like a page, mobile options like a phone screen. Each can be
  seen at full size, as often as I like and in any order: every option opens its
  own mockup, never the one I looked at before or a blank one.
- The full-size view closes with Esc, a ✕ button or a click outside it. Esc works
  even after I've clicked inside the mockup.
- I can select any number of options and write an optional comment.
- Three actions:
  - Choose this one (exactly one selected): it goes back to Claude as my answer.
    With a comment, Claude first redraws that option with the change and shows it
    again, and I confirm in another round.
  - Mix the selected (two or more): Claude draws combinations of them.
  - Show new ones (keeps the selected ones): the selected options stay, the rest
    are replaced with new directions. With nothing selected, the whole set is new.
- The comment counts for every action.
- Each round replaces the previous one in the same tab, until I choose. My answer
  reaches Claude as if I'd typed it; the terminal shows that a round is open.

ALSO
- the page is only reachable from this machine;
- the page's server never outlives the mod: after /reload-plugins the next round
  runs on a new server with the current code, and closing the session stops it.
  On Windows `node` can be a Volta shim that runs the real node through cmd.exe,
  and a reload kills only the shim, so the server has to notice it was orphaned
  and exit by itself. Checking the parent pid doesn't work there;
- tests for the answers each action sends and for ignoring presses from an old
  round; validate it before telling me it's done. Try the full-size view and
  the server shutdown for real (a headless browser, a killed shim), not only
  in unit tests.

THE MODULE LAYOUT
Two pieces: hooks/register.tsx, and server/server.cjs, which the mod spawns
as `node ${$.plugin.root}/server/server.cjs <dir> <key>` to serve the
mockups to the browser. It keeps nothing in `$.state`, so there is no
types/index.d.ts. The test file is tests/design-chooser.test.ts and it
drives the mod through `$` and `on` alone, so the inside is yours.
