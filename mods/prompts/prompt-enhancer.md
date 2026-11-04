Build me a Claude Code mod (use the plugin-authoring skill), saved in
~/.claude/mods/prompt-enhancer and installed for my user so it's active in
every session.

WHAT IT DOES
Two buttons above the prompt. Enhance takes the draft I've typed and rewrites
it in place into the prompt I should have written — the skills that fit, the
facts of this project, the decisions still to settle, what done looks like.
Send submits what's in the box.

THE BAND
Always there, above the prompt, in a row with a space between the buttons.
Never a side pane, never a line in the transcript. Three buttons, each with
its own sign and colour:
- ✦ Enhance, in the suggestion colour, reachable with the "e" hotkey;
- ➤ Send, in the success colour, no hotkey;
- ↩ Ripristina, in the warning colour — only once there's an original draft
  to go back to, and gone again the moment there isn't.
While a rewrite is running the first button reads "✦ Enhance..." and goes
back to "✦ Enhance" when it's done. The buttons announce themselves as
"Enhance", "Send" and "Ripristina". When something else above the prompt is
asking me a question, stand aside and draw nothing of your own.

The band above the prompt is shared: several mods draw into it. Ask the chain
for what the others have drawn and put your own row above it, keeping theirs.
Never return your row alone — whatever sits below you in the chain disappears,
and something down there is usually the only way to bring a pane back. When you
have nothing to show, return the others' rows untouched rather than nothing.
Keep the keys of your buttons unique enough to survive sharing a band.

ENHANCING
Only when I press the button or its hotkey: never on its own, never on every
message, no length above which it fires by itself, and no slash command.
The rewriting is done by a fork of the conversation, so the main thread never
sees the asking and nothing about it reaches the transcript. The fork runs on
whatever model and effort the session would use anyway — don't pick one. It
is given no deadline: a slow rewrite is waited for.
Press it while it's already working and nothing happens — no second fork, no
queue. I can keep typing, and I can press Enter, but a message sent meanwhile
is an ordinary message: it isn't held, and the rewrite still lands in the box
when it arrives.

WHAT THE REWRITER IS TOLD
Give the fork these instructions, in this order, with the draft last:

  Rewrite the draft prompt below so that it tells you everything you would
  otherwise have to ask for.
  Answer with the rewritten prompt alone: no preamble, no explanation, no
  code fence, nothing after it.

  Keep it under twenty lines and in the language the draft is written in.
  Open with the ask itself, the draft tightened, one or two lines.
  Then, each only where it has something real to say:
  - the installed skills that fit the task, by name, taken from the skills
    this session actually lists;
  - what this project the task touches: paths, conventions and decisions you
    can see in the context, never invented;
  - two to four decisions to settle before starting, as questions;
  - one closing line on what the finished result looks like.

  Name no skill, file or convention you cannot see. A shorter rewrite beats
  a padded one.

  The draft:

Then the draft, as I typed it with the ends trimmed.
Take the answer at its word but tidy it anyway: trim it, and if it still
arrives wrapped in a fence — opening with ``` and a language word on its own
line, closing with ``` on its own line — take the fence off and trim again.

WHAT I SEE
The rewritten prompt goes straight into the box in place of mine. No preview,
no approval step, no side-by-side with the original, no diff. The box is mine
to edit from there, and nothing is sent until I send it.
My original is kept so Ripristina can put it back, exactly as I typed it, and
that button then disappears. Enhance again and the new original kept is
whatever was in the box at that moment — so a second rewrite can only be
undone back one step.
The kept original is dropped the moment I send a message, by the button or by
Enter, and it doesn't outlive the session: nothing here is remembered from
one session to the next, and there is no setting to change.

SEND
Takes what's in the box, trimmed, empties the box, forgets the kept original,
and submits it as my own message.

WHEN IT CAN'T
Always a toast, never a change to the box — on any of these the draft stays
exactly as it was:
- box empty, on Enhance or on Send: "Prompt Enhancer: la casella e vuota."
- the session has nothing to fork from yet: "Prompt Enhancer: in questa
  sessione non c'e ancora niente da cui partire." (with a curly apostrophe
  in "c'e")
- anything else that stops the fork, and a reply that comes back empty after
  trimming and unfencing: "Prompt Enhancer: la riscrittura non e riuscita
  (<reason>)." — the reason the engine gave, or "empty-reply" for the empty
  one.
Those messages stay in Italian, accents dropped, as written above. Whatever
happens, the mod must not be left looking busy: the next press works.

ALSO
- the first time the band draws in a session, log one line, "prompt-enhancer:
  the band hook ran", so I can tell the mod is loaded at all;
- tests for the brief carrying the draft and its no-fence and same-language
  rules, for the fence coming off, for the band showing Enhance and Send with
  no Ripristina until there's something to restore, for Enhance replacing the
  draft and Ripristina putting it back, for a session with nothing to fork
  leaving the draft alone, for Send submitting and emptying the box, and for
  each button's sign and colour; validate it before telling me it's done.

THE MODULE LAYOUT
The tests come with the prompt and import the mod's own code, so put the
pieces where they expect them. hooks/register.tsx exports `briefFor(draft)`
and `strip(text)` beside `register`. The test file is tests/register.test.ts.
