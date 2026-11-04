Build me a Claude Code mod (use the plugin-authoring skill), saved in
~/.claude/mods/file-tracker and installed for my user so it's active in every session.
Not in dev-mods: my mods live in ~/.claude/mods, install from @local-mods, reload with
/reload-plugins. Adding it to the marketplace means adding an entry by hand in
~/.claude/mods/.claude-plugin/marketplace.json — that file lists every mod one by one,
and without the line the install says the plugin isn't in the marketplace.

WHAT IT DOES
Keeps, for the whole session, the inventory of the files you touched that `git status`
would NOT show me. Inside the repo I'm covered: git tells me what changed, what's new,
what's gone, whenever I want. Outside the repo I'm blind — the scratchpad, ~/.claude,
the mods, copies of files from the shared drive — and the only way to know what you did
is to scroll back through the messages, where the path is usually cut or missing.

One row per file, the whole absolute path, and a label: created, modified, deleted.
Three states, not a vague "changed": "I created esito.txt" and "I deleted esito.txt"
are very different news.

WHAT STAYS OUT
The test isn't "git tracks it", it's "would `git status` show it to me?". A new file
inside the repo is untracked, so git shows it anyway: out. A file ignored by
.gitignore is invisible to git: in. Everything outside any repo: in.
Ask git with two calls, `rev-parse --is-inside-work-tree` and `check-ignore -q --`,
with cwd the file's own folder and the path as an argument. check-ignore exits 0 for
ignored, 1 for not ignored, and anything else (128) is an error — treat only 1 as
"covered", so a git that fails leaves the row in rather than making it vanish.
Cache the rev-parse answer per folder.

Also out: files born and dead in the same session. If you made it and then deleted it,
nothing happened and I have nothing to do: the row disappears. A file that existed
before and you deleted stays, as deleted.

WHERE IT LEARNS
Two sources, and no guessing anywhere.

The results of Edit and Write. Write's result says `type: "create" | "update"` — created
versus modified comes from the engine, not from me — and both carry `structuredPatch`,
so the diff is already computed. (MultiEdit doesn't exist in this build. Don't look for it.)

Shell commands, Bash and PowerShell, but only the ones that read without ambiguity.
Don't interpret what the command will do: pull out the paths it names, then check
whether the file exists before the command runs and after it ran, and let the disk
decide the label. That way `mv` needs no rule of its own and a command that dies
halfway never invents a row.
Read: `>` and `>>`, rm, touch, mv (every non-flag argument), cp (the destination only,
the source is just read), and the cmdlets Remove-Item, New-Item, Set-Content,
Add-Content, Out-File, Copy-Item, Move-Item (positional paths plus the values of
-Path, -LiteralPath, -FilePath, -Destination; -Recurse and -Force are switches, don't
eat the path after them). Drop a whole command on a glob, a variable, a leading ~, or
a `cd` ANYWHERE in it — a cd in one segment moves the ground for the segments after.
Cut a trailing `# comment` or every word in it becomes a path, and a README.md named
in a comment shows up as modified. Skip anything ending in a separator: that's a folder.
Everything else: silence. A short list beats a list with vague rows in it.

NORMALISE THE PATHS, it's not cosmetic. The same file has to get the same key or the
ledger splits one file into two rows: one backslash, no . or .., and Git Bash's
/c/Users/... carried back to C:\Users\.... Get that wrong and `rm ./a.txt` after a
Write on the same file gives you a "created" row and a "deleted" row instead of nothing.
`/c/...` looks absolute, so it sails past an isAbsolute check and then never exists on
Windows: the whole bash half of the commands goes silently unseen.

THE DIFF, EVEN FROM THE SHELL
For Edit and Write use the result's structuredPatch. For a file a shell command touched,
read the content BEFORE the command runs and again after, and compute the diff yourself
(longest common subsequence over the lines is enough). A file made with `cat >` comes out
all green; one changed by a command shows what actually changed. Cap it: only read files
up to 400k characters, skip what doesn't read as text, cut the diff at 200 lines with a
last line saying how many are left. A command that names a file without changing it
produces an empty diff, and an empty diff means no row at all.
For a deleted file, no content: I don't want copies of files kept around just in case.
Say that in the detail, and don't blame the shell for it.

WHAT I SEE
A band above the prompt, each count in the colour of what it is:

  📒 14 file fuori dal repo · ✚  9 creati · ✎  3 modificati · ✖  2 cancellati

An empty group isn't named. A space between the icon and the number, and `1 file`,
`1 creato` in the singular. A button to open the pane, hotkey f. Also /files.

The pane: a `✖  Chiudi` button on a row of its own FIRST — on a shared row it gets cut
off at the right edge and you lose the closing bracket — then one tab per group,
`✚  creati 9`, and under 60 columns of bodyColumns just `✚  9`, or three tabs won't fit
on one line. Every tab keeps its colour always; the open one is bold and underlined, the
others are NOT dimmed to grey. Below, only that tab's files: icon in the group's colour,
two spaces, the whole path as a plain button, then a 📂 in the same colour.
If the open tab empties out, fall back to the first one that has something.

Dropping a row only forgets it — the file on disk is never touched. At the end of the
tab row, one that drops everything: `Dismiss tutto`, `× tutto` under 60 columns, hotkey
a, dimmed: it covers all three groups, so no single colour fits it. Under the tabs, one
that drops only the open tab's rows: `Dismiss`, plain `×` when narrow, hotkey d, in the
open tab's colour — the same one the tab label wears, so you can see which group you're
about to empty. Neither label spells its letter out: the hotkey sits on the Button,
exactly like `✖  Chiudi`, which has x and never says so.

Open a file and the buttons come BEFORE the content: `✖  Chiudi`, then `←  Indietro`,
`📂  Apri cartella` (hotkey c) and a `×` (hotkey d) that forgets this one file, both in
the group's colour, then the path, then the diff in red and green.
Keep a way back even when the file you were looking at has left the list, or there's a
state you can't get out of.

The pane's own ✖, the small one top right, is the engine's and sits outside the mod's
box. You can't resize it. That's why the mod draws its own.

FOUR THINGS THAT COST ME AN AFTERNOON
$.process.run waits for the command to exit and reads all of its output, and REJECTS one
still running at the timeout. explorer.exe launched that way holds the pipe, times out at
five seconds and gets killed before the window ever shows — the button looks dead. Use
`cmd.exe /c start "" <folder>`, which detaches the child and returns in about 200ms with
exit 0. And `explorer` without the `.exe` doesn't resolve from a process the way it does
from a shell. Don't bother with `/select,<path>`: as a single argv element it gets requoted
and explorer misreads it when the path has spaces.

Button has no colour prop — only variant, plain, dimColor. Colours come from a `Text`
child inside the button, which the API allows.

The engine refuses a module that assigns `$` to a variable. So anything that has to live
between calls (a cache) stays outside, and the function that uses `$` gets rebuilt on
every call.

In this build the test kit's `$` only carries agent, attribution, classic, command,
config, prompt, session, skill, telemetry, tool, turn and ui. No fs, no process, no clock,
no state — so a test can't pretend a file exists, can't read the mod's state, and can't
go through $.tool.call at all. Put every decision in pure modules with their dependencies
injected and test those; leave the hooks module as wiring. Don't find this out after
writing the tests.

ALSO
- it only watches: every hook calls next(e), nothing is denied, rewritten or delayed, and
  the tool.call body sits in a try so a slip never blocks the call;
- a denied call (`deny` in the result) means the command never ran: no row;
- a failed call still gets its paths compared — it may have deleted something anyway —
  but a failed write's result is ignored;
- tests for: the ledger's fold rules, the git filter, reading paths out of a command
  (with CD uppercase, pushd, comments, quoted paths with spaces, 8.3 short paths with a
  ~ in the middle), the labels from before/after existence, the diff and its cap, the
  band's parts, the tabs and the fallback when one empties, the two dismiss labels wide
  and narrow and the letters they answer to;
- validate it before telling me it's done.

THE MODULE LAYOUT
The tests come with the prompt and import the mod's own code, so put the
pieces where they expect them, split across six modules under hooks/:
- collect.ts: `normalise(path)`, `folderOf(path)`,
  `shellBefore(world, tool, command)` and `entriesOf(...)`, plus the types
  `World` and `Before`;
- diff.ts: `diffOf(before, after)`;
- git.ts: `gitCover(run, repos?)` and the type `Run`;
- ledger.ts: `fold(list, one)`, `drop(list, path)` and
  `dropKind(list, kind)`;
- shell.ts: `candidates(command)`;
- view.ts: `summaryText`, `bandParts`, `tabLabel`, `activeTab`, `sectionsOf`,
  `detailOf`, `nameOf`, `dismissKey`, `dismissLabel`, `dismissAllKey`,
  `dismissAllLabel` and `folderIcon`, plus the types `Colour`, `Row`,
  `Section` and `Line`.
types/index.d.ts exports `Kind` and `Entry`. One test file per module, named
after it, under hooks/, plus hooks/pane.test.tsx for the drawing.
