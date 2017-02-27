bd-flux
=======

(c) 2017 Rüdiger Bund

Lizenz siehe BSL.TXT oder auch http://www.bundnetz.de/BSL.TXT

Was ist bd-flux?
----------------
bd-flux ist eine Lösung für zwei Probleme, es ermöglicht

1. die Steuerung von Javascript-Programmen zur sequentielle Programmausführung
2. einen vereinfachten Umgang mit Funktionen die Callbacks bedürfen


Schnelleinstieg
---------------
Grob gesagt ermöglicht bd-flux die Definition von Programmblöcken, die
nacheinander zur Ausführung gebracht werden. Dies ist dann notwendig, wenn ein
Programmblock Ergebnisse aus dem vorherigen benötigt. Die Besonderheit von
bd-flux liegt darin, dass vor Ausführung des nächsten Blockes auch alle im 
aktuellen Block ausgelösten Callbacks abgewartet wird.

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

Bei Ausführung dieses Programmes wird zuerst die Funktion `first()` aufgerufen.
Diese wiederum ruft die Funktion `simCallback()` auf, die nach zwei Sekunden
"zurückruft". Inzwischen wird die Funktion `first()`beendet und die Funktion
`second()` vom Hauptprogramm aufgerufen. In dieser wird der Wert der Variablen
`mymessage` auf der Konsole ausgegeben. Zu diesem Zeitpunkt ist der Wert auf
"I'm undefined" gesetzt. Nach zwei Sekunden wird die Callback-Funktion in
`first()` angesprungen und der Wert von `mymessage` auf "Hello world" gesetzt,
jedoch zu spät für die Ausgabe in `second()`.


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
zurückgegeben. Mit dem Aufruf der Funktion `fl().on()` wird eine Funktion
definiert, die bei dem Ereignis `"oncallbackresult"` aufzurufen ist. Diese
Funktion setzt bei Aufruf den ihr übergebenen Wert (`r`) in die Variable 
`mymessage`. Danach wird mit `fl().x()()` ein neuer Programmblock definiert,
wobei die Parameter in der ersten Klammer nach `fl().x` als Parameter zur
Ausführung der Funktion in der zweiten Klammer gedacht sind. Der Wert `2000`
wird also der Funktion `first` übergeben.
Als nächstes wird die Funktion `second()` als zweiter Programmblock definiert,
diesmal jedoch ohne zu übergebende Parameter. Mit `fl().close()` wird
signalisiert, das der aktuelle Block das Ausführungsende erreicht hat.
Nun wird der erste definierte Programmblock mit der Funktion `first()`
ausgeführt. In dieser wird die Funktion `simCallback()` aufgerufen, als Callback
jedoch wird `fl().cbES()` übergeben. Diese Funktion erstellt eine
Callback-Funktion mit zwei Parametern, den ersten für einen Fehler (*E*rror),
den zweiten für ein Ergebnis im Erfolgsfall (*S*uccess). Danach signalisiert
die Funktion wie zuvor schon das Hauptprogramm das Ende des aktuellen 
Programmblockes durch Aufruf von `fl().close()`.
Vor der Ausführung des zweiten Blockes wird nun jedoch auf den Aufruf der
Callback-Funktion gewartet. Diese löst (da kein Fehler sondern ein Resultat
geliefert wird) die Nachricht `"oncallbackresult"` aus und dadurch wird die
im Hauptprogramm zuvor definierte Ereignisfunktion aufgerufen. Als Parameter
wird das Ergebnis übergeben, das dann in die Variable `mymessage` geschrieben
wird. Da auf keine weiteren Callbacks gewartet wird, gilt der Block nun als
abgeschlossen und die Ausführung des zweiten Blockes startet.
In diesem wird der Wert der Variablen `mymessage` ausgegeben, der nun korrekt
den Wert "Hello world" beinhaltet.

Schnellreferenz
---------------
Alle hier genannten Funktion sind Funktionen einer Blockinstanz. Die aktuelle
Blockinstanz kann mit der Bibliotheksfunktion (im Beispiel oben: `fl()`)
abgerufen werden. Parameter in spitzen Klammern sind optional.


		x(<name><,this><,param1>...<,paramN>)(funktion)
		
definiert einen Programmblock der optional benannt werden (`<name>`: `string`)
kann. Zusätzlich kann der zu verwendende `this`-Wert angegeben werden.

> WICHTIG: ist der erste Parameter vom Typ `string`, so wird davon
> ausgegangen, dass dies der Name sein soll. Ist der erste Parameter vom Typ
> `object`,`null`,`undefined` oder `function`, so wird dieser als `this`-Wert
> übernommen. Dies gilt auch für den zweiten Parameter, wenn der erste vom Typ
> `string` war.

Ist kein Name angegeben, so wird als Name eine fortlaufende Nummer vergeben.
Die Parameter `<param1>...<,paramN>` werden der Funktion `funktion` übergeben.

		
		on(nachrichtentyp <,name> ,funktion)
		
Benennt eine Ereignisfunktion, die bei dem Ereignis `nachrichtentyp` aufgerufen
wird. Ist `name` spezifiert, so wird die Ereignisfunktion nur bei den
Ereignissen, die im Programmblock oder Callback gleichen namens ausgelöst
wurden. Aktuell sind folgende Nachrichtentypen definiert:

>MESSAGES = { 
>			RUN: 'run', ERROR: 'error', CLOSE: 'close', DONE: 'done',
>			CANCEL: 'cancel', FINAL: 'final', 
>			CALLBACKSTART: 'callbackStart', CALLBACKEND: 'callbackEnd', 
>			CALLBACKRESULT: 'callbackresult'
>		 }


		finally(funktion)
		
Benennt eine Ereignisfunktion, die aufgerufen wird wenn alle Programmblöcke
ausgeführt wurden. Als Parameter werden alle gespeicherten Daten (siehe
`setValue()`) als Objekt übergeben.

		error(fehlermeldung<,name>)

Löst einen Fehler mit Fehlermeldung aus. Die weitere Ausführung wird nicht
gestoppt. Hierfür muss ggf. `cancel()` aufgerufen werden.
		
		cancel()
		
Unterbindet die Ausführung von Programmblöcken, die im aktuellen Programmblock
definiert wurden.		
		
		close()
		
Markiert den aktuellen Programmblock als abgeschlossen.
		
		setValue(schlüssel, wert)

Speichert einen Wert in einem globalen "Speicher". Dieser ist z.Z. lediglich vom
Typ Objekt. Es wird nicht geprüft ob ein bereits vorhandener Wert überschrieben
wird.
		
		getValue(schlüssel)

Gibt einen zuvor mit `setValue()` gespeicherten Wert zurück.

		cbS(<name>)
		
Gibt eine Callback-Funktion zurück, die alle übergebenen Parameter per 
`oncallbackresult`-Nachricht meldet.
		
		cbES(<name>)
		
Gibt eine Callback-Funktion zurück, die zwei Parameter erwartet. Ist der erste
gesetzt so wird dies als Fehler gewertet und der Wert per `error`-Nachricht
gemeldet. Ist dieser nicht gesetzt, wird eine `oncallbackresult`-Nachricht
ausgelöst und darin der zweite Parameter als Ergebnis weitergegeben.
		
		cbUser(<name><,this>)(funktion)
		
Gibt eine Callback-Funktion zurück, die die benutzerspezifische Funktion
`funktion` ausführt. Die Parameter sind analog zum Aufruf von `x()`.




(Fortsetzung folgt)