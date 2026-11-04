Build me a Claude Code mod (use the plugin-authoring skill), saved in
~/.claude/mods/collision-guard and installed for my user so it's active in
every session.

WHAT IT DOES
Keeps two Claude sessions open on the same project from quietly overwriting
each other. It shows me what the other sessions are doing, and stops me
before I write a file one of them has already written.

Describe it, where the installed mods are listed, as: "Avvisa quando
un'altra sessione aperta sullo stesso progetto ha gia scritto il file che
stai per modificare, e tiene una fascia con quello che le altre stanno
facendo."

THE BAND
A band above the prompt, one row per other live session on this project,
nothing at all when there is none. Never a side pane. If something else is
already claiming that space — a survey — stay out of it and show nothing
this turn.

Each row is a marker then one dim line:
- "● " in the Claude accent colour when that session is mid-turn, "✓ " in
  green when it is idle;
- then `01234567 · in corso · rewrite the tariff loader`, that is: the first
  eight characters of its session id, then its state — the words are "in
  corso" and "finito" — then the first line of the prompt it is working on,
  cut at 70 characters. A session that hasn't been asked anything yet reads
  "non ha ancora chiesto niente".

WHAT EACH SESSION PUBLISHES
Every session keeps one record of its own, readable by the others, holding:
its id, the project root, the one-line summary of its current prompt, its
state, the time of its last heartbeat, and the set of files it has written.

- It is written at session start, on every prompt I submit (state becomes
  "in corso"), when a turn finishes (state back to "finito" — only the main
  thread, a subagent finishing changes nothing), after every file it writes,
  and on a heartbeat every 15 seconds.
- The file set is never trimmed: every file the session wrote stays claimed
  for as long as the session lives.
- On a clean session end the record is deleted outright.
- On a hot reload the session finds its own record still there and keeps the
  files it had claimed, rather than starting empty and vanishing from the
  other sessions' view. It does drop entries whose path can't be a real file
  — leftovers like `{`, `next(e))` or a bare `/` — so the next heartbeat
  doesn't rewrite stale junk and collide on it forever.

WHAT COUNTS AS A COLLISION
Before a write, look at every other record and keep the ones where all of
this holds:
- it isn't mine;
- its project root is the same string as mine;
- its last heartbeat is no older than 90 seconds;
- it has an entry for the same file key.

A file key is the path relative to the project root: backslashes become
forward slashes, trailing slashes go, and the root is matched
case-insensitively, so two sessions naming the same folder differently still
agree. A file outside the root keeps its full path as the key.

That's a collision; anything else passes without a word. Records whose
heartbeat has expired, and anything in the store that isn't shaped like a
record, get deleted while we're there. Records belonging to another project
are left alone — they're not ours to clean up.

WHEN YOU'VE FOUND ONE
Ask me, with the header "Collisione" and three buttons — "Procedi",
"Sposta in un worktree", "Annulla". The question reads:

  docs/DECISIONS.md l'ha gia scritto un'altra sessione: 01234567 un minuto
  fa, in corso. Git dice docs/DECISIONS.md | 3 +++. Procedo?

One clause per colliding session, most recent write first, joined by " e ".
The ages are spelled "30 secondi fa" under a minute, "un minuto fa" then
"N minuti fa" under an hour, "un'ora fa" then "N ore fa" above it, all
rounded. The Git sentence appears only when the first line of the staged-
and-unstaged stat for that one file is a real stat line; otherwise the
question stops at "Procedo?".

- "Procedi" lets the write through unchanged.
- "Annulla" blocks it and tells you: "collision-guard: scrittura su
  docs/DECISIONS.md annullata, ci sta lavorando un'altra sessione."
- "Sposta in un worktree" blocks it and tells you: "collision-guard:
  docs/DECISIONS.md e in mano a un'altra sessione. Proponi un git worktree
  per questo lavoro e aspetta."
- If the question can't be asked at all, treat it as "Annulla".

A block is a refusal handed to you, not an error to me: you see the sentence
and decide what to do next. I'm never locked out — "Procedi" is always
there, and nothing is ever blocked without asking.

WHAT YOU WATCH
Edit, Write and NotebookEdit — on their target path — and Bash. Nothing
else; reading a file claims nothing.

For Bash the path has to be guessed from the command, so guess only what the
command plainly declares it writes:
- `>` and `>>` redirections;
- `tee`, with or without `-a`;
- the destination of `cp` and `mv`.
Strip surrounding quotes, drop duplicates, and check every one of them
before running the command — the first collision stops it.

Deliberately not covered, and it should stay that way: `sed -i`, where the
file can't be told from the script. A guessed path that's wrong simply
matches no claim and asks nothing, so the risk is letting a write through,
never blocking one that was fine.

Throw away pieces that can't be a file to claim: empty ones, anything
starting with `-`, globs, anything under `/dev/`, anything starting with
`$`, and anything containing a brace, a parenthesis, a quote, a backtick or
a comma. `=>` and `->` are not redirections, and neither is the `>` in
`<Text dimColor>`. The body of a heredoc is content, not shell — skip from
the opening `<<` or `<<-` (quoted delimiter or not) to its closing line, or
every arrow in the TypeScript I'm writing becomes a redirection.

A file is claimed only after the operation actually succeeded — not denied,
not an error.

WHAT SURVIVES
Nothing between my sessions: when the last one ends its record goes, and
there's no history of who wrote what. The point is only the sessions open
right now. Two sessions open at once are the normal case: each writes only
its own record and reads the others, so neither can lose the other's work.
A session killed badly leaves its record behind, and the 90-second
heartbeat window is what retires it.

ALSO
- no slash command, no shortcut, nothing to configure: it is either in the
  way or invisible;
- any failure inside the mod lets the operation through rather than
  blocking it;
- tests for the file key across Windows and Unix spellings, for what a Bash
  command declares it writes (heredocs, arrows, globs, /dev/null, the
  uncovered `sed -i`), for the heartbeat window and the junk-record sweep,
  for the ordering and wording of the question, and one end-to-end case
  where a redirection onto another session's file is caught; validate it
  before telling me it's done.

THE MODULE LAYOUT
The tests come with the prompt and import the mod's own code, so put the
pieces where they expect them, split across three modules under hooks/:
- percorsi.ts: `chiave(radice, percorso)`, `percorsiDi(grezzo)` and
  `ripulisci(file)`;
- vive.ts: `VITA` (90_000), `sana(letta)`, `cernita(...)` answering
  `{ tenute, morte }`, and `scontri(tenute, file)` answering
  `{ chi, quando }[]`; it also exports the types `Cernita` and `Scontro`;
- testo.ts: `nome(sessione)`, `quando(passato)` and
  `domanda(file, trovati, ora, diff)`.
types/index.d.ts exports `Toccata` and `Rivendicazione`. The test files are
hooks/percorsi.test.ts, hooks/vive.test.ts, hooks/testo.test.ts and
hooks/freno.test.ts, the last one reaching across percorsi.ts and vive.ts.
