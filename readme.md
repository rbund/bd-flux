bd-flux
=======

(c) 2017 R�diger Bund

Lizenz siehe BSL.TXT oder auch http://www.bundnetz.de/BSL.TXT

Was ist bd-flux?
----------------
bd-flux ist eine L�sung f�r zwei Probleme, es erm�glicht

1. die Steuerung von Javascript-Programmen zur sequentielle Programmausf�hrung
2. einen vereinfachten Umgang mit Funktionen die Callbacks bed�rfen


Schnelleinstieg
---------------
Grob gesagt erm�glicht bd-flux die Definition von Programmbl�cken, die
nacheinander zur Ausf�hrung gebracht werden. Dies ist dann notwendig, wenn ein
Programmblock Ergebnisse aus dem vorherigen ben�tigt. Die Besonderheit von
bd-flux liegt darin, dass vor Ausf�hrung des n�chsten Blockes auch alle im 
aktuellen Block ausgel�sten Callbacks abgewartet wird.

Dazu ein Beispiel:

		var mymessage = "I'm undefined";

		function simCallback(error, result, ms, callback) {
		    setTimeout(() => { callback(error, result); }, ms);
		}

		function first(waittime) {
			//console.log("waittime:", waittime);
		    simCallback(null, "Hello world", waittime, (e,r) => { mymessage = r });
		}

		function second() {
		    console.log(mymessage);
		}

		first(2000);
		second();

Bei Ausf�hrung dieses Programmes wird zuerst die Funktion `first()` aufgerufen.
Diese wiederum ruft die Funktion `simCallback()` auf, die nach zwei Sekunden
"zur�ckruft". Inzwischen wird die Funktion `first()`beendet und die Funktion
`second()` vom Hauptprogramm aufgerufen. In dieser wird der Wert der Variablen
`mymessage` auf der Konsole ausgegeben. Zu diesem Zeitpunkt ist der Wert auf
"I'm undefined" gesetzt. Nach zwei Sekunden wird die Callback-Funktion in
`first()` angesprungen und der Wert von `mymessage` auf "Hello world" gesetzt,
jedoch zu sp�t f�r die Ausgabe in `second()`.


Nun das gleiche Beispiel mit bd-flux:


		const fl = require("bd-flux");

		var mymessage = "I'm undefined";

		function simCallback(error, result, ms, callback) {
		    setTimeout(() => { callback(error, result); }, ms);
		}

		function first(waittime) {
		    //console.log("waittime:", waittime);
		    simCallback(null, "Hello world", waittime, fl().cbES());
		    fl().close();
		}

		function second() {
		    console.log(mymessage);
		    fl().close();
		}

		fl()
		.on('callbackresult', (r) => { mymessage = r; })
		.x(2000)(first)		
		.x()(second)
		.close();

Zuerst wird die Konstante `fl` auf die eingebundenen Bibliothek bd-flux gesetzt.
Mit dem Aufruf `fl()` wird der aktuelle Programmblock (analog eines "Scopes")
zur�ckgegeben. Mit dem Aufruf der Funktion `fl().on()` wird eine Funktion
definiert, die bei dem Ereignis `"oncallbackresult"` aufzurufen ist. Diese
Funktion setzt bei Aufruf den ihr �bergebenen Wert (`r`) in die Variable 
`mymessage`. Danach wird mit `fl().x()()` ein neuer Programmblock definiert,
wobei die Parameter in der ersten Klammer nach `fl().x` als Parameter zur
Ausf�hrung der Funktion in der zweiten Klammer gedacht sind. Der Wert `2000`
wird also der Funktion `first` �bergeben.
Als n�chstes wird die Funktion `second()` als zweiter Programmblock definiert,
diesmal jedoch ohne zu �bergebende Parameter. Mit `fl().close()` wird
signalisiert, das der aktuelle Block das Ausf�hrungsende erreicht hat.
Nun wird der erste definierte Programmblock mit der Funktion `first()`
ausgef�hrt. In dieser wird die Funktion `simCallback()` aufgerufen, als Callback
jedoch wird `fl().cbES()` �bergeben. Diese Funktion erstellt eine
Callback-Funktion mit zwei Parametern, den ersten f�r einen Fehler (*E*rror),
den zweiten f�r ein Ergebnis im Erfolgsfall (*S*uccess). Danach signalisiert
die Funktion wie zuvor schon das Hauptprogramm das Ende des aktuellen 
Programmblockes durch Aufruf von `fl().close()`.
Vor der Ausf�hrung des zweiten Blockes wird nun jedoch auf den Aufruf der
Callback-Funktion gewartet. Diese l�st (da kein Fehler sondern ein Resultat
geliefert wird) die Nachricht `"oncallbackresult"` aus und dadurch wird die
im Hauptprogramm zuvor definierte Ereignisfunktion aufgerufen. Als Parameter
wird das Ergebnis �bergeben, das dann in die Variable `mymessage` geschrieben
wird. Da auf keine weiteren Callbacks gewartet wird, gilt der Block nun als
abgeschlossen und die Ausf�hrung des zweiten Blockes startet.
In diesem wird der Wert der Variablen `mymessage` ausgegeben, der nun korrekt
den Wert "Hello world" beinhaltet.

Schnellreferenz
---------------
Alle hier genannten Funktion sind Funktionen einer Blockinstanz. Die aktuelle
Blockinstanz kann mit der Bibliotheksfunktion (im Beispiel oben: `fl()`)
abgerufen werden. Parameter in spitzen Klammern sind optional.


		x(<name><,this><,param1>...<,paramN>)(funktion)
		
definiert einen Programmblock der optional benannt werden (`<name>`: `string`)
kann. Zus�tzlich kann der zu verwendende `this`-Wert angegeben werden.

> WICHTIG: ist der erste Parameter vom Typ `string`, so wird davon
> ausgegangen, dass dies der Name sein soll. Ist der erste Parameter vom Typ
> `object`,`null`,`undefined` oder `function`, so wird dieser als `this`-Wert
> �bernommen. Dies gilt auch f�r den zweiten Parameter, wenn der erste vom Typ
> `string` war.

Ist kein Name angegeben, so wird als Name eine fortlaufende Nummer vergeben.
Die Parameter `<param1>...<,paramN>` werden der Funktion `funktion` �bergeben.

		
		on(nachrichtentyp <,name> ,funktion)
		
Benennt eine Ereignisfunktion, die bei dem Ereignis `nachrichtentyp` aufgerufen
wird. Ist `name` spezifiert, so wird die Ereignisfunktion nur bei den
Ereignissen, die im Programmblock oder Callback gleichen namens ausgel�st
wurden. Aktuell sind folgende Nachrichtentypen definiert:

>MESSAGES = { 
>			RUN: 'run', ERROR: 'error', CLOSE: 'close', DONE: 'done',
>			CANCEL: 'cancel', FINAL: 'final', 
>			CALLBACKSTART: 'callbackStart', CALLBACKEND: 'callbackEnd', 
>			CALLBACKRESULT: 'callbackresult'
>		 }


		finally(funktion)
		
Benennt eine Ereignisfunktion, die aufgerufen wird wenn alle Programmbl�cke
ausgef�hrt wurden. Als Parameter werden alle gespeicherten Daten (siehe
`setValue()`) als Objekt �bergeben.

		error(fehlermeldung<,name>)

L�st einen Fehler mit Fehlermeldung aus. Die weitere Ausf�hrung wird nicht
gestoppt. Hierf�r muss ggf. `cancel()` aufgerufen werden.
		
		cancel()
		
Unterbindet die Ausf�hrung von Programmbl�cken, die im aktuellen Programmblock
definiert wurden.		
		
		close()
		
Markiert den aktuellen Programmblock als abgeschlossen.
		
		setValue(schl�ssel, wert)

Speichert einen Wert in einem globalen "Speicher". Dieser ist z.Z. lediglich vom
Typ Objekt. Es wird nicht gepr�ft ob ein bereits vorhandener Wert �berschrieben
wird.
		
		getValue(schl�ssel)

Gibt einen zuvor mit `setValue()` gespeicherten Wert zur�ck.

		cbS(<name>)
		
Gibt eine Callback-Funktion zur�ck, die alle �bergebenen Parameter per 
`oncallbackresult`-Nachricht meldet.
		
		cbES(<name>)
		
Gibt eine Callback-Funktion zur�ck, die zwei Parameter erwartet. Ist der erste
gesetzt so wird dies als Fehler gewertet und der Wert per `error`-Nachricht
gemeldet. Ist dieser nicht gesetzt, wird eine `oncallbackresult`-Nachricht
ausgel�st und darin der zweite Parameter als Ergebnis weitergegeben.
		
		cbUser(<name><,this>)(funktion)
		
Gibt eine Callback-Funktion zur�ck, die die benutzerspezifische Funktion
`funktion` ausf�hrt. Die Parameter sind analog zum Aufruf von `x()`.




(Fortsetzung folgt)