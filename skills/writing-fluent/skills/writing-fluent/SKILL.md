---
name: writing-fluent
description: |
  Usala ogni volta che scrivi o riscrivi un testo destinato a una persona, in qualunque
  lingua, cioè un documento, una mail, un messaggio di commit, la descrizione di una merge
  request, un commento nel codice o una risposta lunga. Serve quando il testo è corretto ma
  suona a macchina, quando le frasi incollano più concetti con due punti, punto e virgola,
  virgole o trattini, quando ogni passaggio arriva con un «quindi» o un «so», o quando
  l'utente chiede un testo più scorrevole, più umano, più leggibile. La stessa skill giudica
  un testo già scritto e lo corregge, cioè quando l'utente passa un file (md, txt, docx,
  pptx, pdf, html) o del testo e chiede un verdetto, chiede se «si capisce che è AI», o
  vuole che un materiale suoni scritto a mano prima di darlo a un cliente. Copre italiano e
  inglese, la punteggiatura, la struttura del documento e il lato visivo, cioè grassetti,
  riquadri, tabelle, emoji, colori. Usala anche prima di scrivere, quando il documento per
  il cliente non esiste ancora e va fissata la scaletta con i pesi delle sezioni.
argument-hint: <file o testo> [--scaletta] [--campione <percorso>] [--model sonnet|opus|haiku|fable]
---

# Writing fluent

Una frase porta un concetto. Se ne porta due, li lega una congiunzione.

Tutto il resto di questa skill discende da quella riga. Il testo deve essere chiaro e
leggibile ad alta voce la prima volta, senza tornare indietro. Le regole valgono in
qualunque lingua, e gli esempi qui sotto sono in italiano perché è la lingua in cui sono
nati.

Questa non è una skill che cerca i segnali, è una skill che insegna a scrivere in modo che
non ce ne siano. Il verdetto su un testo già scritto resta, e sta in fondo. Mail, messaggi,
commit e post hanno una forma loro, e sta in `contesti.md`.

## L'ordine del lavoro

1. I tic da AI, cioè le contrapposizioni «non X ma Y», le chiusure a effetto, le triadi, i
   grassetti decorativi e le parole gonfie, li coprono la sezione C di `references/italiano.md`
   e `references/inglese.md`. La skill `humanizer` fa la stessa cosa da fuori, quindi serve
   solo su un testo inglese lungo, e non è un passaggio obbligato.
2. Prima di scrivere si fissano la scaletta e i pesi delle sezioni, perché è l'unica cosa
   che dopo non si corregge più.
3. Mentre scrivi valgono le regole della frase, le parole da non usare e la forma del
   documento, cioè i tre blocchi qui sotto.
4. Prima di consegnare si passa il controllo finale, la prima parte sempre e la seconda
   quando quello che consegni è lungo.

Gli elenchi lunghi stanno in `references/` e si leggono quando servono. `italiano.md` per la
punteggiatura, il lessico e la struttura, `inglese.md` per le parole e le frasi fatte
inglesi, `visivo.md` per grassetti, riquadri, tabelle ed emoji, `voce.md` per quello che
manca. Leggili, non ricopiarli qui.

## Prima di scrivere, la scaletta

Si comincia da qui quando il documento non esiste ancora, perché è il difetto che dopo non
si corregge più.

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

## Quello che ci mette una persona

Un testo può non avere nessun tic da AI e lo stesso non averlo scritto nessuno. Togliere i
due punti non aggiunge niente, sposta solo il testo verso l'anonimo. Queste sei cose le
scrive chi la materia l'ha pagata di persona, e sono quelle che un modello non mette perché
non gli è mai andato storto niente.

**Scegli, e dillo.** Una strada presa e detta, senza le altre messe in fila per sicurezza.

> Entrambi gli approcci hanno vantaggi e svantaggi, la scelta dipende dalle esigenze.

→ Teniamo il primo. Il secondo chiede un servizio in più da tenere acceso, e per due
chiamate al giorno non vale.

**Dai per scontato quello che chi legge sa già.** Un modello spiega perché non sa chi ha
davanti, mentre una persona comincia dal punto in cui serve. Il paragrafo che spiega al
destinatario il suo mestiere si cancella.

**Lascia aperto quello che è aperto.** Un documento dove ogni numero ha la sua ragione è un
documento dove qualcuno ha riempito i buchi a indovinare. Il non lo so però si trova, non si
inventa, quindi vale solo dove c'era qualcosa da ammettere.

**Dai pesi diversi alle sezioni.** È la scaletta qui sopra.

**Metti il dettaglio che nessuno inventerebbe.** Una cifra con i decimali veri, una data, il
nome del file che si è rotto, una frase riportata come è stata detta.

> Il tempo di risposta è migliorato in modo significativo.

→ Da 2,4 secondi a 0,3, misurati il 14 marzo sulle stesse ottanta richieste.

**Di' chi ha fatto la cosa.** Chi ha deciso, chi ha chiesto, chi ha lanciato, e quando. È la
regola 14, quella di chi fa la cosa, vista dall'altra parte.

L'occasione viene prima di tutto. Un report di numeri non sceglie, un tracciato non ha dubbi
da dichiarare, e nessuno dei due scrive peggio per questo. I sei segni per esteso, con i
casi in cui non si applicano, stanno in `references/voce.md`.

## Quello che non si inventa

Il dettaglio vero è il segno più difficile da imitare, e per questo è anche quello che un
modello falsifica più volentieri. Un numero inventato brucia la fiducia più in fretta di una
frase vaga, perché la vaghezza si vede e la precisione finta no, finché qualcuno non va a
controllare.

Numeri, studi e statistiche solo se ci sono. Dove il numero vero non ce l'hai scrivi
«circa», «intorno a», oppure che non lo sai. Vale anche per il numero tondo messo lì per
fare effetto, cioè il «+40% di efficienza» che non ha misurato nessuno.

Le citazioni non si costruiscono. O la riporti con chi l'ha detta e dove, o la giri in
parole tue, oppure la lasci fuori.

Nomi, date e documenti per esteso. «La delibera 936-2012» batte «la normativa vigente», e
«la mail dell'11 settembre» batte «una comunicazione del cliente». Chi legge deve poter
andare a vedere.

La posizione si prende quando c'è di che prenderla. «Potenzialmente», «in alcuni casi» e
«tendenzialmente» stanno dove il dubbio è vero, e non come abitudine davanti a ogni
affermazione.

## Le regole della frase

### 1. Un concetto per frase, due al massimo

Due concetti stanno insieme solo se una congiunzione dice che rapporto hanno. Da tre in su la
frase va chiusa, perché la congiunzione lega i concetti ma non li riduce.

> Le tariffe si arrotondano al centesimo in lettura, i coefficienti no, il risultato nemmeno.

→ Le tariffe si arrotondano al centesimo in lettura mentre i coefficienti e il risultato no.

La congiunzione non è il premio e il punto non è la resa. Sono i due modi di tenere insieme i
concetti, e si sceglie contandoli. Due concetti vicini vogliono la congiunzione mentre tre o
più vogliono il punto. Quando chiudi, il connettivo non sparisce ma si sposta in apertura della frase nuova,
dove dice lo stesso rapporto con più aria. La regola 8, quella del contrasto annunciato, fa
esattamente questo.

> Se Solventum non risponde la singola chiamata torna un errore e quel ricovero non viene
> tariffato mentre il motore resta in piedi e continua a rispondere alle altre richieste.

→ Se Solventum non risponde la singola chiamata torna un errore e quel ricovero non viene
tariffato. Tuttavia, il motore resta in piedi e continua a rispondere alle altre richieste.

Una catena di quattro concetti non si salva con tre congiunzioni, perché chi legge arriva in
fondo senza sapere più da dove era partito.

### 2. Le frasi corte si legano, non si impilano

Spezzare è il rimedio al periodo che non finisce mai, e diventa il difetto opposto quando
ogni concetto si chiude da solo. Cinque frasi corte di fila suonano a macchina quanto una
frase lunga che incolla cinque concetti. La soglia è tre, cioè tre frasi di fila della
stessa lunghezza vanno variate anche quando ognuna è corretta, perché il ritmo uguale si
sente prima delle parole. Quando due frasi corte parlano della stessa cosa, legale con la
congiunzione che dice come stanno insieme.

> Il listino viene letto all'avvio. Resta in memoria per tutta la giornata. Una modifica
> vale dal giorno dopo.

→ Il listino viene letto all'avvio e resta in memoria per tutta la giornata. Questo
significa che una modifica vale dal giorno dopo.

### 3. I due punti reggono un elenco o una citazione, niente altro

> Il programma fa una cosa sola: rinomina i file.

→ Il programma rinomina i file.

### 4. Il punto e virgola diventa un punto

Sopravvive solo dentro un elenco di voci lunghe che contengono già delle virgole.

### 5. Il trattino non lega due pezzi di frase

Trattino lungo, lineetta e doppio trattino: al loro posto va un punto, una virgola, una
parentesi o una frase riscritta. I trattini dentro codice, comandi, percorsi, URL e parole
composte restano come sono.

### 6. La virgola spiega, non introduce

Una virgola va bene davanti a un inciso che chiarisce il concetto di cui si sta parlando.
Non va bene quando apre un concetto nuovo, perché quello vuole una congiunzione o un punto.

> Le giornate autorizzate (07) si sommano alla soglia del ricovero, quella oltre la quale la
> giornata si paga alla pro die.

→ Le giornate autorizzate si sommano alla soglia del ricovero che è quella oltre la quale la
giornata si paga alla pro die.

### 7. La parola della conseguenza si usa poco

Vale per «quindi» in italiano, «so» e «thus» in inglese, e per i loro equivalenti. Quando la
conseguenza è il punto della frase, aprile una frase sua.

> Il motore legge la tabella delle eccezioni una volta al giorno e la tiene in memoria fino
> al giorno dopo, quindi accenderne o spegnerne una vale dal giorno seguente.

→ Il motore legge la tabella delle eccezioni una volta al giorno e la tiene in memoria fino
al giorno dopo. Questo significa che accendere o spegnere un'eccezione vale dal giorno dopo.

### 8. Il contrasto si annuncia, non si sottintende

Quando una frase gira rispetto a quella prima, dillo con un connettivo in apertura.

> Delle eccezioni la tabella dice la loro validità e quali sono accese, mentre gli importi
> stanno nel codice.

→ Dall'altro canto, la tabella delle eccezioni dice la loro validità e quali sono accese,
mentre gli importi stanno nel codice.

### 9. Il limite si dice con il verbo, non con il presente

Il presente indicativo in italiano regge anche l'impossibilità, per questo «non si recupera»
si capisce lo stesso. Letto ad alta voce però suona come un'abitudine, cioè come una cosa
che di solito non si fa, mentre il punto è che non si può fare. Quando la frase dice un
limite o un obbligo, scrivi il verbo che lo porta.

> Se la chiave va persa non si recupera, e l'unica strada è generarne una nuova.

→ Se la chiave si perde, non si può recuperare e l'unica soluzione sarebbe generarne una
nuova.

### 10. Il titolo nomina la cosa, non la racconta

Un titolo di sezione sta in due o tre parole e nomina il contenuto. Chi cerca qualcosa
nell'indice legge i sostantivi, mentre una frase discorsiva lo costringe a leggerla tutta
per capire se è la sezione che gli serve. Vale per i titoli, non per il testo sotto.

> 3  Come gira e come si rilascia

→ 3  Esecuzione e rilascio

### 11. Prima quello che si deve fare, poi come funziona

In un documento che serve a far fare qualcosa, il paragrafo apre con l'azione e con la
condizione che la richiede. Il meccanismo viene dopo, in una frase sua, perché chi legge sta
cercando cosa deve fare e non la descrizione di come stanno le cose.

> Il database non si aggiorna in automatico. Le modifiche allo schema arrivano come script
> SQL che qualcuno esegue, dato che l'applicazione all'avvio non tocca le tabelle. Un
> rilascio che cambia lo schema diventa così una sequenza di due passi, prima lo script SQL
> e poi il jar.

→ Se il rilascio modifica lo schema del database, gli script SQL devono essere eseguiti
manualmente prima dell'aggiornamento del JAR. L'applicazione non aggiorna automaticamente il
database.

Lo stesso vale quando l'azione ha uno scopo, che si mette in apertura, cioè «Per rintracciare
nei log una chiamata segnalata, usare l'ID_RICHIESTA restituito al chiamante nella risposta».

### 12. La cosa si chiama con il suo nome

Una perifrasi al posto del termine lascia chi legge a indovinare, e il termine tecnico di
solito lo conosce già. Vale anche per il quantificatore che non dice niente, cioè «alcuni
aspetti tecnici» dove sono «gli aspetti tecnici necessari a chi deve ospitare il servizio».

> Per rispondere l'applicazione si appoggia a due cose fuori da sé. Legge tariffe,
> coefficienti ed eccezioni da un database Oracle, e chiede il DRG a Solventum che è un
> servizio esterno.

→ Per rispondere, l'applicazione utilizza due dipendenze esterne: un database Oracle, da cui
legge tariffe, coefficienti ed eccezioni, e il servizio Solventum, a cui richiede il DRG.

### 13. Nel documento tecnico il registro si alza

Vale per i documenti che vanno al cliente e per le istruzioni. Non vale per le mail, per i
messaggi di commit e per le risposte, dove il parlato è al suo posto. Il soggetto vago
diventa impersonale e l'istruzione si scrive all'infinito, come nei manuali.

> Le modifiche allo schema arrivano come script SQL che qualcuno esegue.

→ Gli script SQL devono essere eseguiti manualmente.

Lo stesso vale per il verbo del parlato, cioè «l'applicazione si appoggia a due dipendenze»
dove in un documento sta «l'applicazione utilizza due dipendenze». Alzare il registro però
non vuol dire gonfiare le parole, perché le regole da 1 a 12 valgono lì come altrove.

### 14. Chi fa la cosa si dice

Il passivo nasconde il soggetto, e nasconderlo non serve a niente quando chi legge lo sa
già. «È stato deciso» fa chiedere da chi, mentre «il cliente ha deciso» chiude la domanda.
Lo stesso vale per il verbo che gira a vuoto, cioè «viene effettuato il calcolo» dove c'è
«il motore calcola».

> In riunione è stato deciso di rimandare il rilascio.

→ Il cliente ha deciso di rimandare il rilascio.

L'impersonale resta dove lo vuole la regola 13, quella del registro, cioè nelle istruzioni
e nei documenti tecnici, perché lì chi esegue è chiunque legge e nominarlo sarebbe falso.

### 15. Il fatto al posto del giudizio

Il giudizio chi legge deve crederlo sulla fiducia, mentre il fatto lo verifica da solo.
Scrivi quello che si vede e il giudizio lascialo fare a lui. È la regola 12, quella del nome giusto, un passo più in
là, perché lì si trattava di chiamare la cosa con il suo nome e qui di mostrarla invece di
qualificarla.

> L'applicazione offre un'esperienza d'uso fluida.

→ Dal ricovero alla tariffa si passa con tre campi.

> Il tempo di risposta è migliorato in modo significativo.

→ Da 2,4 secondi a 0,3.

## Con cosa si legano i concetti

Rapporto | Italiano | English
---|---|---
aggiunta | e · anche · inoltre | and · also · besides
contrasto | ma · invece · mentre · tuttavia · dall'altro canto | but · while · whereas · however · on the other hand
causa | perché · dato che · visto che | because · since · as
conseguenza | così · per questo · questo significa che | so that · which means · for this reason
precisazione | che è quella · cioè · ossia | which is the one · that is
tempo | quando · finché · dopo che · prima che | when · until · after · before
condizione | se · a meno che · purché | if · unless · as long as
alternativa | oppure · o | or · either

## Parole e formule da non usare

Le liste stanno nei riferimenti, perché sono lunghe e cambiano. Qui c'è cosa farne.

La parola gonfia si sostituisce con il termine, non con un sinonimo meno gonfio. Il verbo
che gira intorno a «è», «ha» e «fa» torna a essere «è», «ha» e «fa». Il gerundio appiccicato
in coda diventa una frase sua. L'avanzo di chat si cancella e basta.

In italiano guarda le sezioni B e C di `references/italiano.md`, cioè le parole da AI,
«permette di» e «consente di» a raffica, le perifrasi, il «non X, ma Y», le triadi e la
chiusura che ripete quello che c'era sopra.

In inglese guarda `references/inglese.md`. Le parole sono altre, cioè delve, leverage,
seamless, robust, e le formule pure, cioè «It's worth noting that» e «Moreover». La
punteggiatura invece è la stessa, e sta nella sezione A di `italiano.md`.

## La forma del documento

Il grassetto porta il termine che chi legge deve ritrovare, e non decora la frase. Niente
etichette in grassetto con i due punti davanti a ogni voce di elenco, niente emoji in testa
alle righe, niente riquadri intorno a quello che era un paragrafo.

La tabella serve quando ci sono colonne vere, cioè quando ogni riga risponde alle stesse
domande. Un elenco travestito da tabella si vede subito. Sei tabelle in nove pagine si
vedono anche di più.

I titoli stanno in minuscolo come una frase normale, tranne la prima lettera. I paragrafi
hanno altezze diverse, perché tre righe ciascuno per tutto il documento è lo stesso difetto
dei pesi uguali, un piano più in basso.

Il paragrafo finisce dove finisce. Non gli serve una riga che riassume quello che hai
appena letto, e la sezione dopo non va annunciata da quella prima. Chiudi sull'ultimo fatto
concreto, e quando il paragrafo si ferma di colpo va bene così. La stessa chiusura in fondo
a ogni sezione è il segnale a scala più grande.

> In conclusione, la procedura resta la stessa e i tempi non cambiano.

→ I tempi restano quelli di adesso.

I paragrafi non hanno tutti lo stesso impianto. Il modello li fa uguali, cioè frase guida,
spiegazione, esempio e transizione, e li mette in fila così per pagine. Qualcuno apre con
una domanda, qualcuno dice la cosa secca senza prepararla, e qualcuno sta in una riga sola.
Nelle istruzioni invece l'attacco fisso è voluto, perché lì vale la regola 11, quella
dell'azione in apertura, e chi legge la cerca in prima riga.

L'elenco puntato si usa poco. Quando serve, le voci hanno lunghezze diverse, perché sei
righe lunghe uguali sono l'elenco di un modello. Sopra le cinque o sei voci di fila chi
legge smette di leggerle, quindi o si taglia o diventa un paragrafo. Quello che sta in una
frase si scrive in una frase.

Quello che vale qui è il documento. Mail, messaggi, commit e post hanno regole loro, e
stanno in `contesti.md`. In due parole, dove il markdown non viene reso non si scrive.

Il resto, slide e pagine comprese, sta in `references/visivo.md`.

## Controllo finale

### La frase, sempre

Rileggi ad alta voce e fermati su ogni frase.

- Quanti concetti porta? Più di due vuol dire chiuderla e spostare il connettivo in apertura
  della frase dopo.
- Quante frasi corte di fila ci sono? Più di tre vuol dire legarne qualcuna.
- Ci sono tre frasi di fila della stessa lunghezza? Spezzane o legane una, e alterna corto e
  lungo.
- C'è un `:` o un `;` o un trattino? Riscrivi la frase.
- Ogni virgola spiega quello che c'è prima, o introduce qualcosa di nuovo?
- Quante volte compare la parola della conseguenza? Più di una ogni pagina è troppo.
- C'è una terna messa in fila per abitudine? Due voci o quattro.
- C'è un limite detto con il solo presente? Mettici il verbo, cioè «non si può» oppure
  «bisogna».
- C'è una perifrasi al posto del termine, o un «alcuni» che non conta niente?
- C'è un passivo dove chi fa la cosa si sa? Mettici il soggetto, salvo che sia
  un'istruzione.
- C'è una parola gonfia o un avanzo di chat rimasto in mezzo al contenuto vero?
- C'è un giudizio dove poteva esserci il fatto che lo dimostra?
- Leggendo ad alta voce il testo va avanti da solo, o si inceppa a ogni punto?

### Il documento, quando consegni

Queste guardano il testo intero, e si fanno su un documento, una mail lunga o una pagina.
Su un messaggio di commit non servono.

- C'è una strada scelta e detta, o le alternative stanno tutte in fila?
- C'è un dettaglio che nessuno inventerebbe, cioè un numero vero, una data, un nome? Senza,
  il testo poteva scriverlo chiunque per chiunque.
- C'è un numero, una citazione o una data che non stanno nel materiale? Toglili, o scrivi da
  dove vengono.
- Un paragrafo spiega a chi legge il suo mestiere? Si cancella.
- I titoli nominano una cosa, o raccontano una frase? Due o tre parole bastano.
- Il paragrafo apre con l'azione, o con la descrizione del meccanismo?
- È un documento tecnico? Allora niente «qualcuno», e le istruzioni all'infinito.
- I paragrafi hanno tutti la stessa altezza, e le sezioni lo stesso peso?
- Un paragrafo finisce riassumendo quello di sopra, o annunciando quello sotto? Togli la
  riga e finisci sul fatto.
- I paragrafi attaccano e si sviluppano tutti allo stesso modo? Vale nei testi discorsivi,
  non nelle istruzioni.
- Grassetti, emoji, riquadri e tabelle servono, o decorano?
- Un elenco ha più di sei voci, o voci tutte della stessa lunghezza? E c'era qualcosa che
  stava in una frase?
- È una mail, un commit o un post? Allora apri `contesti.md`.

Le regole non si nominano nel testo. Niente «come da linee guida», niente nota che spiega
perché hai scritto così, e nessun accenno a questa skill. Si vede il lavoro, non chi teneva
la tastiera.

## Dove non vale

Codice, comandi, percorsi, URL, YAML e tabelle restano come sono. I nomi congelati da fuori
non si toccano, cioè i campi di un contratto, le tabelle e le colonne di un modello dati, le
sigle. Un elenco puntato vero resta un elenco, e i due punti che lo aprono restano. Dentro
una citazione la punteggiatura è di chi parla.

## Quando il testo è già scritto

Il giudizio lo dà sempre un subagent, mai tu. Il documento da giudicare di solito l'hai
scritto tu, in questa stessa conversazione, e chi ha scritto una cosa legge quello che
intendeva invece di quello che c'è sulla pagina. Un subagent parte da zero e legge come
leggerà il cliente.

La procedura sta in `giudizio.md`, nove passi, e si legge prima di lanciare qualunque cosa.
In breve: lanci il subagent in modo verdetto, riporti le tabelle intere e chiedi cosa
correggere. Poi il correttore lavora su una copia e un secondo subagent guarda cosa si è
perso per strada, perché nessuno è un buon giudice della propria prudenza. L'originale si
tocca solo alla fine.

I segnali che il verdetto cerca stanno in `procedura.md` e nei quattro `references/`, cioè
gli stessi file che valgono mentre scrivi.
