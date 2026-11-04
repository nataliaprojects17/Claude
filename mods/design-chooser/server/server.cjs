// Serves the design options the mod writes to <dir>/screen.json and prints
// each button press as a JSON line on stdout, for the mod to read.
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')

const [dir, key] = process.argv.slice(2)
const screenFile = path.join(dir, 'screen.json')
const clients = new Set()
let url = ''

const say = message => process.stdout.write(JSON.stringify(message) + '\n')

function readScreen() {
  try {
    return fs.readFileSync(screenFile, 'utf8')
  } catch {
    return '{"round":0}'
  }
}

function openBrowser() {
  const [cmd, args] =
    process.platform === 'win32'
      ? ['rundll32', ['url.dll,FileProtocolHandler', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]]
  try {
    spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref()
  } catch (error) {
    say({ type: 'error', message: `could not open the browser: ${error.message}` })
  }
}

const isAllowed = req => {
  const query = new URL(req.url, 'http://x').searchParams.get('key')
  const cookie = /(?:^|;\s*)dc_key=([^;]+)/.exec(req.headers.cookie ?? '')?.[1]
  return query === key || cookie === key
}

const server = http.createServer((req, res) => {
  if (!isAllowed(req)) {
    res.writeHead(403).end('forbidden')
    return
  }
  const route = new URL(req.url, 'http://x').pathname
  if (req.method === 'GET' && route === '/') {
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'set-cookie': `dc_key=${key}; HttpOnly; SameSite=Strict; Path=/`,
    })
    res.end(PAGE)
  } else if (req.method === 'GET' && route === '/screen') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end(readScreen())
  } else if (req.method === 'GET' && route === '/events') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' })
    res.write('retry: 1000\n\n')
    clients.add(res)
    req.on('close', () => clients.delete(res))
  } else if (req.method === 'POST' && route === '/act') {
    let body = ''
    req.on('data', chunk => (body += chunk))
    req.on('end', () => {
      try {
        const act = JSON.parse(body)
        say({ type: 'act', round: act.round, action: act.action, picked: act.picked, comment: act.comment })
        res.writeHead(204).end()
      } catch {
        res.writeHead(400).end()
      }
    })
  } else {
    res.writeHead(404).end()
  }
})

fs.watchFile(screenFile, { interval: 300 }, () => {
  for (const client of clients) client.write('data: screen\n\n')
  if (clients.size === 0) openBrowser()
})

// On Windows the mod's child is a node shim (Volta) over cmd.exe over this
// process, and a reload kills only the shim: a write to the orphaned pipe fails.
process.stdout.on('error', () => process.exit(0))
setInterval(() => process.stdout.write('\n'), 2000).unref()

server.listen(0, '127.0.0.1', () => {
  url = `http://127.0.0.1:${server.address().port}/?key=${key}`
  say({ type: 'ready', url })
})

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Design options</title>
<style>
  :root { color-scheme: light dark; --accent: #6d5cff; --line: #8884; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.45 system-ui, sans-serif; background: Canvas; color: CanvasText; }
  main { max-width: 1500px; margin: 0 auto; padding: 24px; }
  .label { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; opacity: .6; }
  h1 { font-size: 22px; margin: 4px 0 18px; }
  .cards { display: grid; gap: 18px; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
  .cards.mobile { grid-template-columns: repeat(auto-fit, minmax(220px, 280px)); }
  .card { border: 2px solid var(--line); border-radius: 12px; overflow: hidden; cursor: pointer; position: relative; background: #fff1; }
  .card.selected { border-color: var(--accent); box-shadow: 0 0 0 3px #6d5cff55; }
  .frame { position: relative; overflow: hidden; background: #fff; }
  .mobile .frame { margin: 10px auto 0; width: calc(100% - 20px); border-radius: 22px; border: 6px solid #222; }
  .frame iframe { position: absolute; top: 0; left: 0; border: 0; transform-origin: 0 0; pointer-events: none; background: #fff; }
  .body { padding: 10px 12px 12px; }
  .body h3 { margin: 0 0 2px; font-size: 15px; }
  .body p { margin: 0; font-size: 13px; opacity: .75; }
  .tick { position: absolute; top: 8px; right: 8px; width: 26px; height: 26px; border-radius: 50%; background: var(--accent); color: #fff; display: none; place-items: center; font-weight: 700; z-index: 2; }
  .card.selected .tick { display: grid; }
  .kept { position: absolute; top: 8px; left: 8px; z-index: 2; font-size: 11px; background: #000a; color: #fff; padding: 2px 8px; border-radius: 10px; }
  .zoom { position: absolute; bottom: 8px; right: 8px; z-index: 2; border: 0; border-radius: 6px; padding: 3px 8px; background: #000a; color: #fff; cursor: zoom-in; }
  .controls { margin-top: 22px; display: grid; gap: 10px; }
  textarea { width: 100%; min-height: 56px; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--line); font: inherit; background: Field; color: FieldText; }
  .buttons { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
  button.act { border: 0; border-radius: 8px; padding: 9px 16px; font: inherit; font-weight: 600; cursor: pointer; background: var(--line); color: CanvasText; }
  button.act.primary { background: var(--accent); color: #fff; }
  button.act:disabled { opacity: .35; cursor: not-allowed; }
  .banner { margin-top: 16px; padding: 12px 14px; border-radius: 8px; background: #6d5cff22; display: none; }
  .waiting { text-align: center; margin-top: 18vh; opacity: .7; }
  dialog { width: 92vw; height: 90vh; padding: 0; border: 0; border-radius: 12px; }
  dialog iframe { display: block; width: 100%; height: 100%; border: 0; background: #fff; }
  dialog.mobile { width: 420px; height: 880px; max-height: 92vh; }
  dialog::backdrop { background: #000b; }
  dialog .close { position: absolute; top: 8px; right: 8px; z-index: 1; border: 0; border-radius: 6px; padding: 4px 10px; background: #000a; color: #fff; font: inherit; cursor: pointer; }
</style>
</head>
<body>
<main id="app"><p class="waiting">Waiting for Claude to draw the options…</p></main>
<dialog id="big"><button class="close" title="Close (Esc)">✕</button><iframe sandbox title="Full size preview"></iframe></dialog>
<script>
const VIEW = { web: [1280, 800], mobile: [390, 844] }
let screen = { round: 0 }
let picked = new Set()
let sent = false

const el = (tag, props = {}, ...kids) => {
  const node = Object.assign(document.createElement(tag), props)
  node.append(...kids)
  return node
}

function fit() {
  const [w, h] = VIEW[screen.target] || VIEW.web
  document.querySelectorAll('.frame').forEach(frame => {
    const scale = frame.clientWidth / w
    frame.style.height = h * scale + 'px'
    const iframe = frame.querySelector('iframe')
    iframe.style.width = w + 'px'
    iframe.style.height = h + 'px'
    iframe.style.transform = 'scale(' + scale + ')'
  })
}

function update() {
  const n = picked.size
  document.getElementById('choose').disabled = sent || n !== 1
  document.getElementById('mix').disabled = sent || n < 2
  document.getElementById('more').disabled = sent
  document.querySelectorAll('.card').forEach(card => card.classList.toggle('selected', picked.has(card.dataset.id)))
}

function render() {
  const app = document.getElementById('app')
  app.textContent = ''
  if (!screen.round) {
    app.append(el('p', { className: 'waiting', textContent: 'Waiting for Claude to draw the options…' }))
    return
  }
  const target = screen.target === 'mobile' ? 'mobile' : 'web'
  const cards = el('div', { className: 'cards ' + target })
  for (const option of screen.options) {
    const iframe = el('iframe', { title: option.title, srcdoc: option.html })
    iframe.setAttribute('sandbox', '')
    const zoom = el('button', { className: 'zoom', textContent: '⤢ full size', title: 'See it full size' })
    zoom.onclick = event => {
      event.stopPropagation()
      const big = document.getElementById('big')
      big.className = target
      const frame = el('iframe', { title: 'Full size preview', srcdoc: option.html })
      frame.setAttribute('sandbox', '')
      big.querySelector('iframe').replaceWith(frame)
      big.showModal()
      big.querySelector('.close').focus()
    }
    const card = el('div', { className: 'card' },
      el('div', { className: 'tick', textContent: '✓' }),
      option.kept ? el('div', { className: 'kept', textContent: 'kept' }) : '',
      el('div', { className: 'frame' }, iframe),
      el('div', { className: 'body' },
        el('h3', { textContent: option.id.toUpperCase() + ' · ' + option.title }),
        option.description ? el('p', { textContent: option.description }) : ''),
      zoom)
    card.dataset.id = option.id
    card.onclick = () => {
      if (sent) return
      picked.has(option.id) ? picked.delete(option.id) : picked.add(option.id)
      update()
    }
    cards.append(card)
  }
  const comment = el('textarea', { id: 'comment', placeholder: 'Comment or mix (optional), e.g. "A, but with the colors of C"' })
  const button = (id, text, title, primary) =>
    el('button', { id, className: 'act' + (primary ? ' primary' : ''), textContent: text, title, onclick: () => act(id) })
  app.append(
    el('div', { className: 'label', textContent: 'Claude asks · round ' + screen.round }),
    el('h1', { textContent: screen.question }),
    cards,
    el('div', { className: 'controls' },
      comment,
      el('div', { className: 'buttons' },
        button('choose', '✓ Choose this one', 'Select exactly one', true),
        button('mix', '⇄ Mix the selected', 'Select two or more'),
        button('more', '＋ Show new ones (keeps the selected ones)', 'Replaces the options that are not selected'))),
    el('div', { className: 'banner', id: 'banner' }))
  update()
  fit()
}

async function act(action) {
  const comment = document.getElementById('comment').value.trim()
  const ids = [...picked]
  sent = true
  update()
  const banner = document.getElementById('banner')
  try {
    const res = await fetch('/act', { method: 'POST', body: JSON.stringify({ round: screen.round, action, picked: ids, comment }) })
    if (!res.ok) throw new Error(res.status)
    banner.textContent = action === 'choose' && !comment
      ? '✓ Sent. Claude goes on with ' + ids[0].toUpperCase() + '. You can close this tab.'
      : 'Sent. Claude is drawing the next round: it appears here by itself.'
  } catch {
    sent = false
    update()
    banner.textContent = 'Could not reach Claude Code. Is the session still open?'
  }
  banner.style.display = 'block'
}

async function load() {
  const next = await (await fetch('/screen', { cache: 'no-store' })).json()
  if (next.round === screen.round && next.round !== 0) return
  screen = next
  picked = new Set()
  sent = false
  render()
}

new EventSource('/events').onmessage = load
addEventListener('resize', fit)
const big = document.getElementById('big')
big.onclick = event => event.target.id === 'big' && big.close()
big.querySelector('.close').onclick = () => big.close()
big.addEventListener('cancel', event => {
  event.preventDefault()
  big.close()
})
document.addEventListener('keydown', event => event.key === 'Escape' && big.open && big.close())
addEventListener('blur', () => big.open && setTimeout(() => big.querySelector('.close').focus()))
load()
</script>
</body>
</html>`
