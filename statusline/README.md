# Status line

Two lines under the prompt. The first says which model is answering, with its effort level in
brackets when there is one, the folder you are in and the git branch. The second is the state
of the session: how full the context is, how long the prompt cache stays warm, and the two
usage windows, the five hour one and the seven day one.

```
[Opus(high)] | 📁 Claude | 🌿 main
☀️ 12% | 🔥 cache 48m | ▰▱▱▱ 5h 18% ↻ 2h41m | ▰▰▱▱ 7d 34% ↻ 3d02h
```

The context icon follows the fill, from a sun under 40% to a storm past 70%, and the number
takes the same colour. Each usage window draws a four block bar that fills as the window does,
with the time left before it resets beside it. A segment that Claude Code has not reported yet
is left out rather than drawn empty.

The cache segment reads what the `cache-keeper` mod writes for the session and counts down
from there, so the figure keeps moving between one write and the next. Without that mod the
segment simply does not appear and the rest works as it is.

It is a Node script rather than the usual shell one so it runs on Windows without bash or jq.
It calls `git` directly, and falls back to a dash outside a repository or on a detached HEAD.

## Installing

Copy the script into your Claude folder and point `settings.json` at it.

```sh
cp statusline/statusline.js ~/.claude/statusline.js
```

```json
{
  "statusLine": {
    "type": "command",
    "command": "node \"C:/Users/<you>/.claude/statusline.js\"",
    "padding": 0
  }
}
```

Use an absolute path, because the command runs with the project as its working directory and
`~` is not expanded. On macOS and Linux write `node /Users/<you>/.claude/statusline.js`. It is
live in the next session.
