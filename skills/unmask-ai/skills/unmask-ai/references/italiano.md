# Segnali in italiano

Punteggiatura, lessico e struttura. Ogni voce dice se è una **prova** o un **indizio**.
Una prova basta da sola, perché chi scrive a mano quella cosa non la fa quasi mai.
Un indizio conta solo quando ne trovi altri nello stesso punto, perché una persona può
averlo fatto apposta.

---

## A. Punteggiatura

È il gruppo che si nota di più in italiano, e quello che `humanizer` non copre.
Il modello incolla le frasi invece di chiuderle. Una persona mette il punto.

### 1. Due punti dentro la frase — prova

Due punti che reggono una frase intera, o che annunciano una cosa ovvia.
Tienili solo davanti a un elenco vero o a una citazione.

> Il programma fa una cosa sola: rinomina i file.

→ Il programma rinomina i file.

> C'è un problema: il servizio ignora il campo data.

→ Il servizio ignora il campo data.

> La regola è semplice: chi ordina prima delle dieci riceve il giorno stesso.

→ Chi ordina prima delle dieci riceve il giorno stesso.

### 2. Punto e virgola come connettore — prova

Il punto e virgola separa due frasi autonome. Mettici un punto.
Sopravvive solo dentro un elenco di voci lunghe che contengono già delle virgole.

> Il prezzo si legge in tabella; lo sconto si applica dopo.

→ Il prezzo si legge in tabella. Lo sconto si applica dopo.

### 3. Virgola che incolla due frasi — prova

Due proposizioni complete tenute insieme da una virgola, senza congiunzione.

> Il servizio non tiene memoria, ogni chiamata viene ricalcolata.

→ Il servizio non tiene memoria. Ogni chiamata viene ricalcolata.

### 4. Trattini lunghi e lineette — prova

Il trattino lungo, quello medio e il doppio trattino usati per legare due pezzi di frase.
In italiano si usano pochissimo. Mettici un punto, una virgola o una parentesi.
Lascia stare i trattini dentro codice, comandi, percorsi e URL.

> La nuova versione — uscita a luglio — cambia tre comandi.

→ La nuova versione, uscita a luglio, cambia tre comandi.

### 5. Inciso che poteva essere una frase — indizio

Una precisazione infilata tra virgole o parentesi invece di stare per conto suo.
Conta quando ce n'è più d'una nello stesso paragrafo.

> Il file, che va salvato in UTF-8 e non in ANSI come dice la guida, viene letto
> comunque.

→ Il file viene letto comunque. Va salvato in UTF-8, non in ANSI come dice la guida.

### 6. Frasi lunghe tutte uguali — indizio

Periodi sopra le trenta parole, con due o tre subordinate, uno dietro l'altro.
Una scrittura vera alterna lungo e corto. Quando tre frasi di fila hanno la stessa
lunghezza, il ritmo è a macchina.

### 7. Elenco dentro la frase — indizio

Tre o quattro cose in fila dentro una frase, con le virgole e la «e» alla fine, dove
bastava nominarne una oppure fare un elenco puntato.

---

### 8. Concetti incollati dalla punteggiatura — indizio da solo, prova in gruppo

Una frase che porta tre o più concetti tenuti insieme da virgole, da un punto e virgola o dai
due punti, dove ognuno poteva stare per conto suo. Non è la singola virgola, è il non chiudere
mai. Si scrive una frase, una cosa. Conta quando la frase lunga non è un caso, cioè quando nello
stesso paragrafo ce n'è più d'una.

Vale anche quando la punteggiatura è corretta. Le regole 1, 2 e 3 guardano il segno sbagliato.
Questa guarda quanti concetti stanno dentro una frase sola.

> Il motore legge la tabella una volta al giorno, la tiene in memoria fino al giorno dopo,
> quindi accenderne una vale dal giorno seguente; gli importi, invece, stanno nel codice.

→ Il motore legge la tabella una volta al giorno e la tiene in memoria fino al giorno dopo.
Accenderne una vale dal giorno seguente. Gli importi stanno nel codice.

---

## B. Lessico

### 9. Verbi che evitano «è», «ha», «fa» — indizio da solo, prova in gruppo

rappresenta · costituisce · si configura come · funge da · si pone come ·
risulta essere · va a costituire · si caratterizza per · presenta ·
si contraddistingue per · annovera · vanta · dispone di

> Il modulo rappresenta il cuore del calcolo e presenta tre componenti.

→ Il modulo fa il calcolo. Ha tre componenti.

### 10. Parole da AI — prova in gruppo

Il segnale è la densità, non la singola parola.

fondamentale · cruciale · chiave (aggettivo) · strategico · robusto (fuori dal tecnico) ·
solido · efficiente · efficace · innovativo · all'avanguardia · significativo ·
rilevante · peculiare · versatile · scalabile (fuori dal tecnico) · ottimizzare ·
valorizzare · garantire · assicurare · abilitare · agevolare · approfondire · esplorare ·
delineare · evidenziare · sottolineare · declinare · l'ecosistema · il panorama ·
la sinergia · il valore aggiunto · la value proposition

### 11. Perifrasi al posto della preposizione — indizio

al fine di → per · in merito a → su · per quanto concerne → su · nell'ambito di → in ·
a livello di → (taglia) · in termini di → (taglia) · mediante l'utilizzo di → con ·
è in grado di → può · ha la possibilità di → può · risulta possibile → si può ·
si rende necessario → serve

### 12. «permette di» e «consente di» a raffica — indizio

Due o tre nello stesso paragrafo. Scrivi cosa fa la cosa.

> Il codice permette di identificare la pratica e consente di ritrovarla nei log.

→ Con quel codice ritrovi la pratica nei log.

### 13. Gerundio appiccicato in coda — prova

garantendo · assicurando · permettendo · consentendo · evidenziando · sottolineando ·
favorendo · valorizzando · andando a · contribuendo a

La frase dice un fatto, poi un gerundio ci attacca un significato che nessuno ha misurato.

> I prezzi stanno in tabella, garantendo la massima flessibilità.

→ I prezzi stanno in tabella. Si cambiano senza rilasciare il servizio.

### 14. Annunci prima del punto — prova

è importante sottolineare che · occorre precisare che · è bene ricordare che ·
va detto che · giova ricordare · in questo senso · a tal proposito · come anticipato ·
entriamo nel dettaglio · vediamo nel dettaglio · facciamo un passo indietro

Taglia l'annuncio, tieni il punto.

### 15. Riformulazioni che non riformulano — indizio

in altre parole · vale a dire · ovvero (ripetuto) · di fatto · in sostanza ·
sostanzialmente · a tutti gli effetti · per così dire · diciamo che

Quando la frase dopo dice la stessa cosa della frase prima, togline una.

---

## C. Struttura

### 16. «Non X, ma Y» — prova

non si tratta di X, ma di Y · non solo X, ma anche Y · non è X, è Y · più che X, è Y ·
non tanto X quanto Y · e la versione spezzata su due frasi («Questo non vuol dire X.
Vuol dire Y.»)

La metà negativa nega una cosa che nessuno aveva detto, e fa sembrare più grande la metà
positiva. Tienilo solo quando la negazione corregge davvero una convinzione di chi legge.

### 17. Triadi — prova quando se ne contano due o tre nello stesso testo

Tre aggettivi, tre esempi, tre bullet, tre card. Controlla che ogni elemento porti
un'idea diversa dagli altri. Quando il terzo è lì per far numero, togli il terzo.

> Una soluzione semplice, veloce e sicura.

→ Si configura in dieci minuti e non chiede password nel file.

### 18. Chiusura che ripete — prova

Un paragrafo di una riga che riassume il paragrafo di sopra, oppure la stessa chiusura
alla fine di ogni sezione.

in conclusione · in definitiva · in sintesi · tirando le somme ·
un passo avanti importante · le prospettive sono promettenti · la strada è tracciata ·
non resta che · il futuro di X passa da qui

Finisci sull'ultimo fatto concreto.

### 19. Sezioni di prammatica — prova

«Sfide e prospettive», «Criticità e opportunità», «Punti di forza e di debolezza»,
«Conclusioni e sviluppi futuri», quando dentro non c'è niente di concreto.

### 20. Titolo ripetuto nella prima riga — prova

Un titolo seguito da una frase che dice la stessa cosa del titolo.

> ## Le eccezioni
>
> Le eccezioni sono i casi particolari.
>
> Un ordine sopra i mille euro passa dal responsabile.

→ Togli la riga di mezzo.

### 21. Esordio in scena — prova

vediamo insieme · scopriamo come · partiamo da · facciamo chiarezza · addentriamoci ·
in questo documento andremo a · prima di tutto, un po' di contesto

### 22. Litigare con nessuno — prova

non si tratta di dire che · sia chiaro · per carità · qualcuno potrebbe obiettare che ·
si potrebbe pensare di · un approccio alternativo sarebbe quello di

Il testo risponde a un'obiezione che non c'è, o scarta un'opzione che nessuno aveva
proposto. Di solito è un avanzo di una stesura precedente.

### 23. Qualificatori impilati — indizio

potenzialmente · eventualmente · in alcuni casi potrebbe · verosimilmente ·
tendenzialmente · in linea di massima, quando ce ne sono due o tre nella stessa frase.

### 24. Passivo e soggetto che sparisce — indizio

«Viene effettuato il calcolo» invece di «il motore calcola».
«È stato deciso» invece di «abbiamo deciso» oppure «il cliente ha deciso».
Nei verbali e nelle norme il passivo è normale. Altrove di' chi fa la cosa.

### 25. Virgolette curve — indizio

Le virgolette curve dove chi scrive o il formato di destinazione usa quelle dritte.
Quasi tutti gli editor le curvano da sole, quindi da sole non dicono niente.

### 26. Avanzi di chat — prova

Certo! · Ottima domanda · Spero sia utile · Fammi sapere se · Vuoi che ·
Ecco a te · Ecco una panoramica di · Posso approfondire se serve

È il segnale più sicuro di tutti, e il più facile da non vedere quando è incastrato in
mezzo a del contenuto vero.
