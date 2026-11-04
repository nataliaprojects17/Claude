# Paper

I colori della sessione, su carta chiara. Stanno in tre strati e vanno messi in quest'ordine,
perche' lo strato sopra eredita lo sfondo da quello sotto.

## 1. La tavolozza del terminale

`claude-paper.windows-terminal.json` e' uno schema per Windows Terminal. Apri le impostazioni
con `Ctrl+,`, scegli «Open JSON file», aggiungi l'oggetto dentro l'array `schemes` e accendilo
per tutti i profili.

```json
"profiles": { "defaults": { "colorScheme": "Claude Paper" } }
```

Questo strato colora anche la statusline, che stampa codici ANSI e basta. Senza, la statusline
esce rossa e verde su nero.

## 2. Il mod skins e la skin paper

Il mod non e' mio, sta nel marketplace di hellosverre.

```
/plugin marketplace add hellosverre/claude-skins
/plugin install skins@hellosverre-mods
```

`paper.skin.json` tiene il blocco `custom` con la tavolozza e le parole dello spinner, e il
blocco `prefs` con il resto della configurazione. Vanno uniti dentro il file che l'installazione
crea, cioe' `~/.claude/plugins/store/skins_hellosverre-mods-*.json`. L'hash nel nome cambia da
macchina a macchina, quindi scrivi dentro il file che trovi invece di crearne uno con questo
nome, e lascia stare le chiavi `updateCheck` e `star` che sono gia' li'.

Poi riavvia e scegli la skin con `/skin paper`.

## 3. Il tema di Claude Code

In `~/.claude/settings.json` finisce questa riga.

```json
"theme": "custom:paper"
```

Non serve scriverla a mano, perche' la scrive `/skin` quando scegli la skin. Scritta prima che
il mod esista, punta a un tema che non si risolve.
