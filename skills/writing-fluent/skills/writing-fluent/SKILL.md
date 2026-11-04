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

Due concetti stanno insieme solo se una congiunzione dice che rapporto hanno. Cerca prima la
congiunzione, perché il punto è l'ultima risorsa. Quando non ne trovi una che regga il
rapporto, allora i concetti sono due frasi.

> Le tariffe si arrotondano al centesimo in lettura, i coefficienti no, il risultato nemmeno.

→ Le tariffe si arrotondano al centesimo in lettura mentre i coefficienti e il risultato no.

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

## Con cosa si legano i concetti

Rapporto | Italiano | English
---|---|---
aggiunta | e · anche · inoltre | and · also · besides
contrasto | ma · invece · mentre · dall'altro canto | but · while · whereas · on the other hand
causa | perché · dato che · visto che | because · since · as
conseguenza | così · per questo · questo significa che | so that · which means · for this reason
precisazione | che è quella · cioè · ossia | which is the one · that is
tempo | quando · finché · dopo che · prima che | when · until · after · before
condizione | se · a meno che · purché | if · unless · as long as
alternativa | oppure · o | or · either

## Controllo finale

Rileggi il testo ad alta voce e fermati su ogni frase.

- Quanti concetti porta? Più di due vuol dire spezzarla.
- Quante frasi corte di fila ci sono? Più di tre vuol dire legarne qualcuna.
- C'è un `:` o un `;` o un trattino? Riscrivi la frase.
- Ogni virgola spiega quello che c'è prima, o introduce qualcosa di nuovo?
- Quante volte compare la parola della conseguenza? Più di una ogni pagina è troppo.
- Le frasi hanno tutte la stessa lunghezza? Alterna corto e lungo.
- Leggendo ad alta voce il testo va avanti da solo, o si inceppa a ogni punto?

## Dove non vale

Codice, comandi, percorsi, URL, YAML e tabelle restano come sono. I nomi congelati da fuori
non si toccano, cioè i campi di un contratto, le tabelle e le colonne di un modello dati, le
sigle. Un elenco puntato vero resta un elenco, e i due punti che lo aprono restano. Dentro
una citazione la punteggiatura è di chi parla.
