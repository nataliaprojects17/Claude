#!/usr/bin/env node
// Statusline per Claude Code — replica di statusline.sh senza bash/jq.
// Legge il JSON di stato da stdin e stampa due righe colorate.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let d = {};
  try { d = JSON.parse(raw); } catch { /* input vuoto/non valido: si usano i default */ }

  const model      = d?.model?.display_name ?? "";
  const effort     = d?.effort?.level ?? "";
  const dir        = d?.workspace?.project_dir ?? "";
  const pct        = parseInt(String(d?.context_window?.used_percentage ?? 0), 10) || 0;
  const limits     = d?.rate_limits ?? {};
  const sessionId  = d?.session_id ?? "";

  // Modello con effort opzionale: [Opus(high)] oppure [Opus]
  const modelStr = effort ? `${model}(${effort})` : model;

  // Basename della project_dir (split su / o \)
  const dirName = dir.split(/[/\\]/).filter(Boolean).pop() ?? dir;

  // Branch git: "—" se fuori da un repo o in detached HEAD.
  // git.exe e' nativo: niente fork MSYS/bash.
  let branch = "\u2014"; // —
  const cwd = dir || process.cwd();
  try {
    execSync("git rev-parse --git-dir", { cwd, stdio: "ignore" });
    const b = execSync("git branch --show-current", {
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
    }).toString().trim();
    if (b) branch = b;
  } catch { /* non e' un repo o git assente: resta "—" */ }

  // Colori ANSI
  const CYAN = "\x1b[36m", GREEN = "\x1b[32m", YELLOW = "\x1b[33m",
        RED = "\x1b[31m", DIM = "\x1b[2m", RESET = "\x1b[0m";

  // Colore contesto: stesse soglie dell'icona qui sotto.
  const ORANGE = "\x1b[38;5;208m";
  const ctx = pct >= 70 ? RED : pct >= 50 ? ORANGE : pct >= 40 ? YELLOW : GREEN;

  // Icona del contesto: piu' si riempie, piu' il tempo peggiora.
  const weather = (p) =>
    p >= 70 ? "⛈️" : p >= 50 ? "⛅" : p >= 40 ? "🌤️" : "☀️";

  // Finestre di utilizzo: barra che si riempie, stesse soglie del mod cache-keeper.
  const bar = (p) => {
    const filled = Math.max(0, Math.min(4, Math.ceil(p / 25)));
    return "▰".repeat(filled) + "▱".repeat(4 - filled);
  };
  const heat = (p) => (p >= 85 ? RED : p >= 60 ? YELLOW : GREEN);

  // Quanto manca al reset, da epoch secondi.
  const until = (sec) => {
    const ms = sec * 1000 - Date.now();
    if (!Number.isFinite(ms) || ms <= 0) return "";
    const m = Math.round(ms / 60000);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h${String(m % 60).padStart(2, "0")}m`;
    return `${Math.floor(h / 24)}d${h % 24}h`;
  };

  // Cache: il mod cache-keeper scrive lastAt e la finestra, il conto alla
  // rovescia lo fa qui, cosi' la cifra resta viva tra una scrittura e l'altra.
  const cache = () => {
    if (!sessionId) return "";
    const home = process.env.USERPROFILE || process.env.HOME || "";
    const file = path.join(home, ".claude", "cache-keeper", `${sessionId}.json`);
    let st;
    try { st = JSON.parse(fs.readFileSync(file, "utf8")); } catch { return ""; }
    const lastAt = Number(st?.lastAt), windowMs = Number(st?.windowMs);
    if (!Number.isFinite(lastAt) || !Number.isFinite(windowMs)) return "";
    const warn = Number(st?.warnMs) || 300000;
    const left = lastAt + windowMs - Date.now();

    if (left <= 0) return `${DIM}\u{1F9CA} cache cold${RESET}`;
    const mark = left <= warn ? "⚠" : left <= warn * 3 ? "⏳" : "\u{1F525}";
    const color = left <= warn ? RED : left <= warn * 3 ? YELLOW : GREEN;
    const m = Math.round(left / 60000);
    const time = m < 1 ? `${Math.round(left / 1000)}s` : m < 90 ? `${m}m` : `${(m / 60).toFixed(1)}h`;
    const off = st?.isAuto === false ? `${DIM} off${RESET}` : "";

    return `${color}${mark} cache ${time}${RESET}${off}`;
  };

  // Segmento vuoto quando la finestra non e' stata ancora riportata.
  const window = (key, label) => {
    const one = limits?.[key];
    const used = one?.used_percentage;
    if (used === undefined || used === null) return "";
    const p = Math.round(Number(used));
    const left = one?.resets_at ? until(Number(one.resets_at)) : "";
    return `${heat(p)}${bar(p)} ${label} ${p}%${RESET}${left ? `${DIM} ↻ ${left}${RESET}` : ""}`;
  };

  // Riga 1: [modello(effort)] | cartella | branch
  process.stdout.write(
    `${CYAN}[${modelStr}]${RESET} ${DIM}|${RESET} \uD83D\uDCC1 ${dirName} ${DIM}|${RESET} \uD83C\uDF3F ${branch}\n`
  );
  // Riga 2: contesto | finestra 5 ore | finestra 7 giorni
  const row2 = [
    `${ctx}${weather(pct)} ${pct}%${RESET}`,
    cache(),
    window("five_hour", "5h"),
    window("seven_day", "7d"),
  ].filter((one) => one !== "");
  process.stdout.write(`${row2.join(` ${DIM}|${RESET} `)}\n`);
});