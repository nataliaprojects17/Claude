---
name: writing-fluent
description: |
  Usala ogni volta che scrivi o riscrivi un testo destinato a una persona, in qualunque
  lingua, cioè un documento, una mail, un messaggio di commit, la descrizione di una merge
  request, un commento nel codice o una risposta lunga. Serve quando il testo è corretto ma
  suona a macchina, quando le frasi incollano più concetti con due punti, punto e virgola,
  virgole o trattini, quando ogni passaggio arriva con un «quindi» o un «so», o quando
  l'utente chiede un testo più scorrevole, più umano, più leggibile.
---

# Writing fluent

Una frase porta un concetto. Se ne porta due, li lega una congiunzione.

Tutto il resto di questa skill discende da quella riga. Il testo deve essere chiaro e
leggibile ad alta voce la prima volta, senza tornare indietro. Le regole valgono in
qualunque lingua, e gli esempi qui sotto sono in italiano perché è la lingua in cui sono
nati.

## I tre strati, in quest'ordine

1. **REQUIRED:** `humanizer` toglie i tic da AI, cioè le contrapposizioni «non X ma Y», le
   chiusure a effetto, le triadi, i grassetti decorativi, le parole gonfie. Vale in ogni
   lingua.
2. Quando scrivi in italiano, la sezione A di `references/italiano.md` dentro la skill
   `unmask-ai` copre la punteggiatura sbagliata.
3. Questa skill decide come stanno insieme i concetti dentro la frase. È il passo che resta
   da fare anche quando la punteggiatura è formalmente corretta.

Leggili, non ricopiarli qui.

## Le regole

### 1. Un concetto per frase, due al massimo

Due concetti stanno insieme solo se una congiunzione dice che rapporto hanno. Da tre in su la
frase va chiusa, perché la congiunzione lega i concetti ma non li riduce.

> Le tariffe si arrotondano al centesimo in lettura, i coefficienti no, il risultato nemmeno.

→ Le tariffe si arrotondano al centesimo in lettura mentre i coefficienti e il risultato no.

La congiunzione non è il premio e il punto non è la resa. Sono i due modi di tenere insieme i
concetti, e si sceglie contandoli. Due concetti vicini vogliono la congiunzione mentre tre o
più vogliono il punto. Quando chiudi, il connettivo non sparisce ma si sposta in apertura della frase nuova,
dove dice lo stesso rapporto con più aria. La regola 8 fa questo con il contrasto.

> Se Solventum non risponde la singola chiamata torna un errore e quel ricovero non viene
> tariffato mentre il motore resta in piedi e continua a rispondere alle altre richieste.

→ Se Solventum non risponde la singola chiamata torna un errore e quel ricovero non viene
tariffato. Tuttavia, il motore resta in piedi e continua a rispondere alle altre richieste.

Una catena di quattro concetti non si salva con tre congiunzioni, perché chi legge arriva in
fondo senza sapere più da dove era partito.

### 2. Le frasi corte si legano, non si impilano

Spezzare è il rimedio al periodo che non finisce mai, e diventa il difetto opposto quando
ogni concetto si chiude da solo. Cinque frasi corte di fila suonano a macchina quanto una
frase lunga che incolla cinque concetti. Quando due frasi corte parlano della stessa cosa,
legale con la congiunzione che dice come stanno insieme.

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

## Controllo finale

Rileggi il testo ad alta voce e fermati su ogni frase.

- Quanti concetti porta? Più di due vuol dire chiuderla e spostare il connettivo in apertura
  della frase dopo.
- Quante frasi corte di fila ci sono? Più di tre vuol dire legarne qualcuna.
- C'è un `:` o un `;` o un trattino? Riscrivi la frase.
- Ogni virgola spiega quello che c'è prima, o introduce qualcosa di nuovo?
- Quante volte compare la parola della conseguenza? Più di una ogni pagina è troppo.
- Le frasi hanno tutte la stessa lunghezza? Alterna corto e lungo.
- C'è un limite detto con il solo presente? Mettici il verbo, cioè «non si può» oppure
  «bisogna».
- I titoli nominano una cosa, o raccontano una frase? Due o tre parole bastano.
- Il paragrafo apre con l'azione, o con la descrizione del meccanismo?
- C'è una perifrasi al posto del termine, o un «alcuni» che non conta niente?
- È un documento tecnico? Allora niente «qualcuno», e le istruzioni all'infinito.
- Leggendo ad alta voce il testo va avanti da solo, o si inceppa a ogni punto?

## Dove non vale

Codice, comandi, percorsi, URL, YAML e tabelle restano come sono. I nomi congelati da fuori
non si toccano, cioè i campi di un contratto, le tabelle e le colonne di un modello dati, le
sigle. Un elenco puntato vero resta un elenco, e i due punti che lo aprono restano. Dentro
una citazione la punteggiatura è di chi parla.
