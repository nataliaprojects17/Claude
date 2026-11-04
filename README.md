# Claude Code skills and mods

Two writing skills and fourteen mods for Claude Code, kept here so they can be installed on
another machine.

A skill is a set of instructions Claude reads when a task matches it. A mod changes the
interface itself, drawing panes, bands above the prompt and buttons, through the plugin
hook API.

## Skills

| Skill | What it does |
|---|---|
| `unmask-ai` | Judges how much a text, a document or a slide reads as written by an AI, says where it shows and corrects it. Reads md, txt, docx, pptx, pdf and html, and covers Italian and English. |
| `writing-fluent` | Rewrites a text so it reads aloud the first time without going back. One concept per sentence, and two only when a conjunction says how they relate. |

They work together because `writing-fluent` calls `humanizer` first, then the Italian
punctuation reference inside `unmask-ai`.

To install them, copy the folders where Claude Code looks for skills.

```sh
cp -r skills/unmask-ai skills/writing-fluent ~/.claude/skills/
```

## Mods

| Mod | What it does |
|---|---|
| `agent-watch` | A side pane following the session's subagents, with cards for the running and the finished ones, their type, model and effort, a stopwatch, tokens, context and the last actions of each. |
| `cache-keeper` | How long the prompt cache stays warm, what the session has cost, and a button that keeps it warm. |
| `collision-guard` | Warns when another session open on the same project has already written the file you are about to change, and keeps a band with what the others are doing. |
| `context-gauge` | Context fill above the prompt, a warning as it climbs, and a handoff into a fresh session. |
| `design-chooser` | When Claude asks for a design direction, shows each option as a mockup in the browser, where you choose, mix or ask for new ones. |
| `file-tracker` | The inventory of touched files that git does not show, with created, modified or deleted beside each one. |
| `ideas` | A shelf of ideas per project and branch. Park one with `/idea` without stopping the turn, then review them and send them to Claude from `/ideas`. |
| `minimize-panes` | Adds a minimize button to every pane. The window closes and leaves a button above the prompt that brings it back as it was. |
| `notes-verifier` | Checks a pasted note claim by claim and reports only the lines that are wrong and the ones it could not check. |
| `plan-progress` | A pane for a multi-step task, with the goal, the phase, the checklist, a progress bar and the clock, plus every session's runs and a chime when a turn ends. |
| `prompt-enhancer` | Two buttons above the prompt. Enhance rewrites the draft in place with the skills, the project facts, the decisions to settle and what done looks like, while Send submits it. |
| `self-critique` | Reviews Claude's last response in a pane, with a verdict, what held up, what did not, and a button that sends the fix. |
| `state-assumptions` | Asks Claude to list its assumptions and shows them in a band above the prompt, where each one can be rejected or changed. |

### Installing them

This repository is itself a plugin marketplace called `natalija-mods`, declared in
`.claude-plugin/marketplace.json` at the root, so Claude Code can add it straight from
GitHub without a clone.

```
/plugin marketplace add nataliaprojects17/Claude
/plugin install agent-watch@natalija-mods
```

Install the ones you want one at a time, always with the `@natalija-mods` suffix. Later
`/plugin marketplace update natalija-mods` pulls whatever changed here. After editing a mod,
run `/reload-plugins` to pick the change up without restarting the session.

### The prompts folder

`mods/prompts` holds one markdown file per mod, which is the prompt the mod was built from.
Nothing installs from there and no `plugin.json` sits in it, because the manifest lists the
thirteen mods beside it instead.

### The types appear on their own

Each mod has a `tsconfig.json` pointing at `.claude-plugin/types`, which is not in this
repository. Claude Code writes those declarations itself every time it loads a mod from a
folder you own, and writes them again after an update. This means the folder fills in on
first load and the tests and the typecheck work from then on.

They are left out on purpose. The plugin hook API is early access and can change between
releases, so a copy committed here would go stale and would describe a different API from
the one on the machine running it. The declarations in use when these mods were written came
from Claude Code 2.1.296.
