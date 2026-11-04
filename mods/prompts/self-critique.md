Build me a Claude Code mod (use the plugin-authoring skill), saved in
~/.claude/mods/self-critique and installed for my user so it's active in every
session.

WHAT IT DOES
A side pane that reviews the last thing Claude said to me, as a demanding
colleague would: one verdict, one line of summary, what held up, what didn't,
and a button per flaw that sends Claude the order to put it right.

THE PANE
Titled "Self-critique", 76 columns of body width when it docks. It opens on
/critique and starts a review at once. One pane, never a second instance.

THE REVIEW
Read the transcript and take the last assistant message that has text, plus
the last prompt of mine before it — that pair is what gets judged. The answer
goes in at most 12000 characters from the end, the ask at most 4000; the tail
is what matters, not the head.

The reviewer answers with one JSON object and nothing else:

  {"verdict":"Strong|Mixed|Weak","summary":"...","strengths":["..."],
   "flaws":[{"title":"...","detail":"...","fix":"..."}]}

Strong is "does the job, nothing material wrong"; Mixed is "does the job with
real gaps"; Weak is "wrong, or it did not do what was asked". Tell it to judge
what the response actually did against what was asked — correctness,
completeness, unfounded claims, work left out, scope it widened on its own —
to be concrete, and never to praise to be kind: a response with nothing wrong
gets no flaws at all.

SHORT FORM, NOT PROSE
This is read in a narrow pane, so the prompt gives word budgets and the
reviewer keeps to them. Summary one line, at most 15 words. Each strength a
phrase of at most 10 words, not a sentence. A flaw's title at most 6 words,
its detail one line of at most 20 words. The fix is one imperative order
addressed to the assistant, at most 25 words, because it is sent as a prompt
and not as a description. At most three strengths and three flaws, the ones
that matter.

Don't trust the model to obey. Parse the reply whether it comes fenced, bare
or wrapped in prose — take the outermost braces — drop the entries that came
back empty, cut both lists to three, and fold a verdict it didn't spell into
Mixed. A reply that isn't JSON, or that parses to an empty review, is an
error on screen, never a blank pane.

THE LAYOUT
Top row: the Rerun button (hotkey "r"), then the Auto toggle (hotkey "a"),
reading "Auto on" or "Auto off" and dim while off. Second row: a dim "Model "
and the four model buttons side by side. Then a blank line, then the review.

The review itself:
- the verdict in bold, green for Strong, amber for Mixed, red for Weak, with a
  dim " reviewed by <model>" after it;
- the summary on its own wrapped line;
- "Strengths" in bold, each one a "- " bullet, or a dim "None worth naming.";
- "Flaws" in bold, each one a red "- <title>", the detail dim and indented two
  under it, then the button. A dim "None found." when there are none.

THE BUTTONS
"Make this fix" under every flaw that has one: it closes the pane and submits
the fix text to Claude as a prompt, verbatim. Rerun reviews again. The model
row picks who reviews.

THE MODEL PICKER
Four of them: Session, Opus, Sonnet, Haiku. Haiku is the default — this runs
often and the job is small. The chosen one is drawn primary, the others dim.
Buttons, not a Select, so the pane draws the same on a phone, which has no
Select. "Session" goes through the fork — the session's own model over its own
transcript, served from its prompt cache — and the other three are a plain
completion with that alias and a 4096-token cap. The pick is remembered for
the session.

THE AUTO TOGGLE
Off by default. On, every finished turn of the main loop is reviewed the
moment it ends: open the pane and review, using the answer the turn carried.
Only turns that actually answered — not an abort, not a refusal — and never a
subagent's turn. That includes the turn a "Make this fix" started, which is
the point.

WHILE IT RUNS
Say so clearly, in three places, all driven by one braille spinner stepping
every 100ms: beside the Rerun button, which reads "Reviewing"; on a line where
the review goes, "⠹ Reading the last response"; and in the status line,
"⠹ reviewing the last response", which is what I see when the pane is behind
another one. Spinner, line and status all stop when the review lands or
fails. Two reviews never run at once: a second ask while one is running is
dropped.

ONE REVIEW AT A TIME ON SCREEN
Starting a review clears the one before it along with any error. I don't want
to read a stale verdict next to a spinner and wonder which one I'm looking
at — while it works, the spinner line is all there is.

WHAT IT DOESN'T DO
It doesn't edit anything, doesn't keep a history, and doesn't carry a review
across sessions. It reads the transcript and sends me one prompt when I press
a button.

ALSO
- /critique, described as "Review the last response in a pane", opens the pane
  and starts the review; it answers "Reviewing the last response.";
- an empty transcript, a reply with no text and an API error each get their
  own line on screen, with the HTTP status when there is one;
- a review that throws must never take the session down: catch it, show the
  message, stop the spinner;
- tests for the parsing: a fenced reply, one wrapped in prose, a verdict it
  didn't spell, a reply that isn't JSON, an empty review, and the prompt
  carrying both the ask and the answer;
- validate and type-check it before telling me it's done.

THE MODULE LAYOUT
The tests come with the prompt and import the mod's own code, so put the
pieces where they expect them. hooks/review.ts holds the review's own logic
and exports `SYSTEM`, `MODEL_CHOICES`, `buildPrompt(ask, answer)` and
`parseReview(text, model, reviewedAt)`, which answers `{ review }` or
`{ error }`. types/index.d.ts exports `Verdict`, `Flaw`, `Review` and
`ModelChoice`. hooks/register.tsx holds the hooks and nothing else worth
testing. The test file is hooks/review.test.ts.
