---
name: unmask-ai
description: |
  Giudica quanto un testo, un documento o una slide sembra scritto da un'AI, dice dove si
  vede e lo corregge. Usala quando l'utente passa un file (md, txt, docx, pptx, pdf, html)
  o del testo e chiede un verdetto, chiede se "si capisce che è AI", o vuole che un
  materiale suoni scritto a mano prima di darlo a un cliente. Copre italiano e inglese, la
  punteggiatura, la struttura del documento e il lato visivo, cioè grassetti, riquadri,
  tabelle, emoji, colori. Usala anche prima di scrivere, quando il documento per il cliente
  non esiste ancora e va fissata la scaletta con i pesi delle sezioni.
argument-hint: <file o testo> [--scaletta] [--campione <percorso>] [--model sonnet|opus|haiku|fable]
---

# Smaschera AI

Il giudizio lo dà sempre un subagent, mai tu.

Serve a questo. Il documento da giudicare di solito l'hai scritto tu, in questa stessa
conversazione. Chi ha scritto una cosa non vede più i propri tic, e sa già cosa voleva dire,
quindi legge quello che intendeva invece di quello che c'è sulla pagina. Un subagent parte
da zero, vede solo il file, e legge come leggerà il cliente.

Tu fai tre cose. Lanci il subagent, riporti quello che torna, e chiedi all'utente cosa
correggere.

Correggere è un giro a due, e sta nei passi dal 5 al 9. Uno corregge, un altro guarda cosa si
è perso per strada, e si mettono d'accordo prima che l'originale venga toccato. Una
riscrittura che toglie i segnali toglie spesso anche le spigolosità, e chi l'ha scritta non
è la persona giusta per accorgersene.

## Prima di scrivere, la scaletta

Questa parte non giudica niente e non lancia nessun subagent. Serve quando il documento non
esiste ancora, perché c'è un segnale che dopo non si corregge più.

Le sezioni tutte della stessa lunghezza. Una persona scrive tre paragrafi sulla cosa che le
ha fatto perdere due giorni e una riga su tutto il resto, e un modello distribuisce uguale
perché non ha perso due giorni su niente. Quel difetto sta nella forma del documento, non
nelle frasi, quindi nessuna riscrittura lo sistema. O lo si decide prima, o il documento va
rifatto.

Prima di scrivere, porta all'utente una scaletta e basta. Niente prosa.

- chi legge, e cosa sa già
- le sezioni nell'ordine in cui staranno
- per ognuna, cosa deve lasciare a chi legge, in mezza riga
- per ognuna, quante righe le dai
- cosa resta fuori apposta

I pesi devono essere diversi sul serio. Una o due sezioni si prendono il documento, e
qualcuna si chiude in una riga. Una scaletta dove tutte le sezioni hanno lo stesso budget è
il difetto di prima, scritto prima.

Di' qual è la sezione che porta il documento, e perché quella. Se non sai dirlo, il
documento non è ancora pronto per essere scritto, e la domanda giusta all'utente è cosa
vuole che resti in testa a chi legge.

L'utente approva o sposta i pesi. Si scrive dopo, dentro quei budget.

## Come si lancia

### 1. Leggi gli argomenti

Il primo argomento è il file o il testo da giudicare.

`--model` sceglie il modello. I valori sono `sonnet`, `opus`, `haiku`, `fable`.
**Senza `--model`, usa `sonnet`.**

`--campione` è il percorso di un file o di una cartella di testi scritti a mano.

### 2. Trova il campione

Il campione calibra il giudizio. Cercalo in quest'ordine e fermati al primo che dà qualcosa.

**Te l'hanno dato.** `--campione`, oppure un percorso nominato nella richiesta.

**Sta nel progetto.** La cartella `.claude/campione/` nella radice del progetto. Dentro ci
sta qualunque formato, e può esserci un `registro.txt` con una riga sul registro, per
esempio «testo normativo, il passivo è normale». Cartella assente o vuota, vai avanti.

**L'hai chiesto una volta.** Guarda nella memoria del progetto se c'è già un campione
annotato. Se non c'è, chiedi all'utente, in una riga, se in giro esiste qualcosa scritto a
mano su cui tararti, e di' che va bene anche roba del cliente invece che sua. Quello che
risponde scrivilo in memoria, così il giro dopo non lo richiedi.

Non è detto che il campione buono l'abbia scritto l'utente. Chi non scrive nella propria
lingua madre non è il metro giusto per sé stesso, e il bersaglio è che il documento stia
bene in mezzo agli altri documenti di quel contesto.

Se nessuno dei tre dà niente, si va avanti lo stesso e il verdetto lo dirà.

### 3. Lancia il subagent, modo verdetto

Strumento `Agent`, `subagent_type: "general-purpose"`, `model` quello del passo 1.
Mai `fork`, perché il fork eredita la tua conversazione e ricasca nel problema detto
all'inizio.

Prompt, riempiendo le parentesi quadre.

```
Giudica quanto questo materiale sembra scritto da un'AI.

Materiale: [percorso assoluto del file, oppure il testo]

Leggi prima questi quattro file, in quest'ordine, e segui la procedura alla lettera.
  [BASE]/procedura.md
  [BASE]/references/italiano.md
  [BASE]/references/visivo.md
  [BASE]/references/voce.md

Lavori in modo verdetto. Non toccare nessun file. Restituisci i quattro blocchi del
formato, cioè le due righe del verdetto, il riepilogo per categoria con sotto la
tabella della voce, la lista dei problemi divisa in due tabelle, e le prove dei
segnali dal 75% in su. Nient'altro.

[Il campione trovato al passo 2, con il percorso e la riga sul registro se c'è.
 Altrimenti scrivi: Nessun campione, giudica con le regole.]
```

`[BASE]` è la cartella di questa skill, quella indicata come base directory quando la skill
parte.

### 4. Riporta e chiedi

Riporta il verdetto che torna, intero. Le tabelle sono il punto della skill, e si riportano
come tabelle. Non schiacciarle in paragrafi per far stare tutto in meno righe, perché un
segnale scritto in prosa non si legge e non si ritrova nel documento. Dodici tabelle sono
dodici tabelle.

**Le intestazioni si ricopiano parola per parola.** Sono lunghe apposta, perché chi legge il
verdetto non sa niente di questa skill e deve capire ogni colonna da lì. «Segno di voce,
cioè una traccia che dietro c'è una persona» accorciato in «Segno di voce» lascia davanti a
una tabella di sei righe senza dire che cosa sta misurando, e nemmeno che è la riga che dice
se dietro al documento c'è qualcuno. Lo stesso vale per «Sa di AI della categoria, cioè
quello del tipo che pesa di più» e per «Tipi di segnale diversi trovati qui», che serve a
non farli leggere come un conteggio di ripetizioni. Se la tabella viene larga, viene larga.

Le due righe del verdetto si riportano tutte e due. Un documento pulito con la voce debole
non è un documento promosso, ed è l'esito più frequente su un testo già riscritto una volta.

Poi chiedi cosa correggere. Tre modi.

Correggo tutto. Correggo solo le prove. Mi dici tu quali.

Sui segni di voce che mancano, non promettere di aggiungerli tu. Una scelta, un dubbio o una
data li sa solo l'utente, quindi quelli si girano a lui come domande.

### 5. Fai la copia di lavoro

Copia il materiale accanto all'originale, con `-lavorazione` attaccato al nome. Da qui in
avanti si scrive solo lì. L'originale resta fermo finché il giro non è chiuso, perché la
revisione del passo 7 ha bisogno di due versioni da mettere a confronto.

### 6. Lancia il correttore

Solo dopo che l'utente ha risposto. Stesso tipo di agente, stesso modello.

```
Correggi questo materiale. I segnali sono già stati trovati, tu li applichi.

Originale: [percorso assoluto]
Copia di lavoro: [percorso assoluto, quella del passo 5]

Leggi prima [BASE]/procedura.md e segui le regole del passo 5 di quel file.

Segnali da correggere:
[l'elenco scelto dall'utente, con dove sta ognuno e come si corregge]

L'utente ha scelto quali segnali sistemare. Il «come si corregge» l'ha scritto chi ha
dato il verdetto, non lui, quindi è una proposta e non un ordine. Se quella riscrittura
perde qualcosa, trovane un'altra che tolga il segnale e tenga il fatto, e dillo.

Lavori in modo correzione. Scrivi solo sulla copia di lavoro, mai sull'originale, e
dentro ci va solo la versione finale.

Restituisci una tabella sola, con una riga per ogni segnale che ti ho dato, con gli
stessi numeri e nello stesso ordine. In «fatto» scrivi `sì`, `sì, con una variante`,
oppure `no`. Dove hai fatto una variante, di' in che cosa si discosta e perché. Dove
hai scritto `no`, di' se non si poteva fare oppure se era già a posto.

| N. | Che cosa non va | Fatto? | Che cosa è successo |
|---|---|---|---|
| 1 | Triangolo ⚠️ a inizio paragrafo | sì | tolti tutti e 5 |
| 3 | Trattini lunghi | sì, con una variante | 6 e non 7, in §4 ce n'era uno solo. Dove l'inciso aveva già virgole ho messo parentesi |

Sotto la tabella, se il conteggio che ti ho dato non torna con quello che hai trovato
nel file, dillo. Il verdetto sbaglia spesso la posizione e il numero di volte, e tu
hai il file davanti.
```

### 7. Lancia il revisore

Un secondo subagent, stesso tipo, stesso modello. Non è il correttore, ed è il punto.
Nessuno è un buon giudice della propria prudenza.

```
Confronta queste due versioni e dimmi solo cosa si è perso.

Originale: [percorso assoluto]
Corretto: [percorso assoluto della copia di lavoro]

Leggi prima [BASE]/procedura.md e [BASE]/references/voce.md, e segui le regole
della revisione, nel passo 5 di quel file.

Lavori in modo revisione. Non toccare nessun file. Non cercare segnali nuovi e non
proporre riscritture che non rimettano qualcosa che c'era. Restituisci una riga per
contestazione, oppure una riga che dice che non hai trovato niente.
```

### 8. Falli mettere d'accordo

Le contestazioni tornano al correttore, quello di prima, con `SendMessage`, perché ha
ancora in testa cosa ha fatto e perché.

```
La revisione contesta questi punti. Per ognuno, o correggi e dici cosa hai rimesso,
o tieni la tua versione e dici perché in una riga.

[le contestazioni, una per riga]
```

Poi rimandi al revisore la copia aggiornata insieme alle risposte del correttore, sempre con
`SendMessage`, e gli chiedi se i punti sono chiusi.

**Due giri, non di più.** Quello su cui si trovano d'accordo è chiuso e resta nella copia.
Quello che resta aperto dopo il secondo giro non lo decidi tu. Lo porti all'utente, un punto
per riga, con le due posizioni accanto.

> Sez. 4, «23.442,75465» → «23.442,75». Il revisore vuole indietro i decimali, il
> correttore dice che cinque decimali in un testo discorsivo sono illeggibili.

Un giro che si chiude con zero contestazioni è normale. Non mandarne un secondo per scrupolo.

### 9. Chiudi

Se qualcosa è rimasto aperto, prima lo decide l'utente. La sua risposta torna al correttore,
che la applica sulla copia, e il revisore non lo si chiama una terza volta. La copia resta
dov'è finché l'utente non ha risposto, anche se passa del tempo.

Quando non resta niente di aperto, scrivi la copia di lavoro sopra l'originale e cancella la
copia. Se l'utente ha chiesto un file nuovo invece, rinomina la copia come vuole lui e lascia
stare l'originale.

Poi chiudi con una tabella sola, con **tutti** i segnali del verdetto, anche quelli che
l'utente non aveva scelto. Gli stessi numeri del blocco 3, nello stesso ordine, così chi
legge ritrova le righe che aveva davanti quando ha deciso.

| N. | Che cosa non va | Fatto? | Che cosa è successo |
|---|---|---|---|
| 1 | Triangolo ⚠️ a inizio paragrafo | sì | tolti tutti e 5 |
| 3 | Trattini lunghi | sì, con una variante | 6 e non 7: in §4 ce n'era uno, non due. Dove l'inciso aveva già virgole ho messo parentesi |
| 7 | «non X, Y» | no | non l'avevi scelto |
| 9 | Il documento si annuncia | no | non l'avevi scelto |

Le tre risposte in «fatto» sono `sì`, `sì, con una variante`, oppure `no`. Quando è una
variante, l'ultima colonna dice in che cosa si discosta da quello che era stato proposto, e
perché. Quando è `no`, dice se è perché l'utente non l'aveva scelto, perché non si poteva
fare, oppure perché era già a posto.

Sotto la tabella, tre righe separate e sempre tutte e tre, anche quando sono vuote.

**Rimesso dopo la revisione.** Cosa stava per perdersi e è tornato. È l'elenco che interessa
di più. Se la revisione non ha trovato niente, scrivi che non ha trovato niente.

**Resta da decidere a te.** I punti su cui correttore e revisore non si sono messi d'accordo,
i segni di voce che mancano, e i segnali che l'utente non aveva scelto e può ancora scegliere.

**Resta da fare.** Qualunque passo saltato, compreso un passo saltato da un subagent che l'ha
dichiarato. Se non resta niente, dillo.

## Quando non lanciare niente

Se il file non esiste o il percorso è sbagliato, dillo e fermati. Non indovinare quale file
intendeva.

Se l'utente chiede una cosa che non è un giudizio, per esempio «cosa dice questo documento»,
non sei la skill giusta. Rispondi senza subagent.

La scaletta non lancia niente neanche lei. È una cosa che fai tu, parlando con l'utente, e
finisce quando lui approva i pesi.
