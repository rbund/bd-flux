[![Build Status](https://travis-ci.org/rbund/bd-flux.svg?branch=master)](https://travis-ci.org/rbund/bd-flux)
[![GitHub tag](https://img.shields.io/npm/v/bd-flux.svg)](https://www.npmjs.com/package/bd-flux)

bd-flux
=======

(c) 2017 Rüdiger Bund

Lizenz siehe BSL.TXT oder auch http://www.bundnetz.de/BSL.TXT

(For non German speaking ppl: no English documentation yet)

Was ist bd-flux?
----------------
bd-flux bietet eine Lösung für zwei Probleme, es ermöglicht

1. die Steuerung des Kontrollflusses von Javascript-Programmen
2. einen extrem vereinfachten Umgang mit Funktionen die Callbacks bedürfen

Was unterscheidet bd-flux von anderen Bibliotheken?
---------------------------------------------------
Im unterschied zur anderen Bibliotheken 

1. ist bd-flux ein Leichtgewicht, ca. 2K reiner Code ohne Kommentare
2. hat bd-flux keine Abhängigkeiten
3. unterstützt bd-flux den Umgang mit Callbacks (Scoped Callbacks)


Schnelleinstieg - Beispiel
--------------------------
Grob gesagt ermöglicht bd-flux die Definition von Programmblöcken, die
nacheinander zur Ausführung gebracht werden. Dies ist notwendig, wenn ein
Programmblock Ergebnisse aus dem vorherigen benötigt. Die Besonderheit von
bd-flux liegt darin, dass vor Ausführung des nächsten Blockes auch alle im 
aktuellen Block ausgelösten Callbacks abgewartet wird.

Dazu ein Beispiel:

		var mymessage = "I'm undefined";

		function simCallback(error, result, ms, callback) {
		    setTimeout(() => { callback(error, result); }, ms);
		}

		function first() {
		    simCallback(null, "Hello world", 2000, (e,r) => { mymessage = r });
		}

		function second() {
		    console.log(mymessage);
		}

		first();
		second();

Bei Ausführung dieses Programmes wird zuerst die Funktion `first()` aufgerufen.
Diese wiederum ruft die Funktion `simCallback()` auf, die nach zwei Sekunden
"zurückruft". Inzwischen wird die Funktion `first()`beendet und die Funktion
`second()` vom Hauptprogramm aufgerufen. In dieser wird der Wert der Variablen
`mymessage` auf der Konsole ausgegeben. Zu diesem Zeitpunkt ist der Wert auf
"I'm undefined" gesetzt. Nach zwei Sekunden wird die Callback-Funktion in
`first()` angesprungen und der Wert von `mymessage` auf "Hello world" gesetzt,
jedoch zu spät für die Ausgabe in `second()`.


Nun das Beispiel übertragen auf bd-flux:


		const fl = require("bd-flux");

		var mymessage = "I'm undefined";

		function simCallback(error, result, ms, callback) {
		    setTimeout(() => { callback(error, result); }, ms);
		}

		function first(data) {
        data.result = mymessage;
		    simCallback(null, "Hello world", 2000, data.__fl().cber());
		}

		function second(data) {
		    console.log(data.result);
		}

		fl().run(fist, second);

Zuerst wird die Konstante `fl` auf die eingebundenen Bibliothek bd-flux gesetzt.
Mit dem Aufruf `fl()` wird eine Instanz eines bd-flux Objektes erzeugt und
zurückgegeben. Der Aufruf hat den gleiche Effekt wie `new fl()`.
Mit der Methode `run()` werden Funktionen angegeben, die sequentiell ausgeführt
werden sollen, gleichzeitig wird mit der ausführung gestartet.
Nun wird der erste definierte Programmblock mit der Funktion `first()`
ausgeführt. Als einziger Parameter wird ein Datenobjekt übergeben. Dieses
Datenobjekt wird von Funktion zu Funktion weitergereicht und ggf. gefüllt.
Initial ist nur eine Variable enthalten, nämlich eine Referenz auf das aktive
bd-flux Objekt. Der Schlüssel für das Object ist `__fl`. Als erstes setzt
die Funktion `first()` den Wert der Variablen `data.result` auf den Wert der
Variablen `mymessage`. Als nächstes wird die Funktion `simCallback()` aufgerufen, 
als Callback jedoch wird `data.__fl().cber()` übergeben. Diese Funktion erstellt
eine Callback-Funktion mit zwei Parametern, den ersten für einen Fehler (__e__rror),
den zweiten für ein Ergebnis (__r__esult) im Erfolgsfall.
Vor der Ausführung `second()` wird nun jedoch auf den Aufruf der
Callback-Funktion gewartet. Das Callback-Ergebnis wird im Datenobjekt abgelegt,
bei einem `cber()` standardmäßig unter den Schlüsseln `error` und `result`.
Da nach Aufruf der Callback-Funktion auf keine weiteren Callbacks gewartet wird,
gilt der Block nun als abgeschlossen und die Ausführung der zweiten Funktion
startet.
In diesem wird der Wert der Variablen `data.result` ausgegeben, der nun korrekt
den Wert "Hello world" beinhaltet.


Referenz
--------
Alle hier genannten Funktion sind Methoden eines bd-flux Objektes. 
Parameter in spitzen Klammern sind optional.


		ex(funktion<, funktion><,funktion><,...>)

definiert welche Funktionen in welcher Reihenfolge ausgeführt werden sollen.
`ex()` kann mehrmalig aufgerufen werden, wobei die in nachfolgenden Aufrufen
genannten Funktionen den vorherigen angehängt werden.

**Kaskadierung**

Aufrufe von `ex()` können kaskadiert werden. Ein Beispiel:

    const fl = require("bd-flux");
    
    
    function first(data) {
      data.__fl.ex(third, fourth);
    }
    function second(data) {
      ...
    }
    function third(data) {
      ...
    }
    function fourth(data) {
     ...
    }

    fl().ex(first, second).run();
    
Bei dieser Verkettung wird zuerst `first()` aufgerufen, danach `third()`,
dann `fourth()` und zuletzt `second()`.

    
		run(<funktion><, funktion><,funktion><,...>)
		
Startet die Ausführung. Optional können analog zu `ex()` auszuführende Funktionen
benannt oder hinzugefügt werden.

		
		d(<schlüssel><wert>)

`d()` arbeitet je nach Parameteranzahl unterschiedlich. Bei keinem Parameter wird
als Ergebnis das Datenobjekt zurückgegeben. Bei Angabe nur eines Parameters wird
dieser als Schlüssel interpretiert und der dazu gespeicherte Wert aus dem
Datenobjekt zurückgegeben. Bei zwei der mehr Parametern werden (momentan) nur die
ersten zwei berücksichtigt, der erste als Schlüssel und der zweite als Wert. Dieses
Paar wird im Datenobjekt abgelegt.


		cb(<name><,name><,name><,...>)
		
Gibt eine Callback-Funktion zurück, die die ihr übergebenen Parameter im Datenobjekt
speichert. Die übergebenen Parameter <name> werden als Schlüssel für das Datenobjekt
interpretiert. Die Callback-Funktion übernimmt die Zuordnung der Ergebnisse zu den 
evtl. zuvor angegebenen Schlüsseln. Dabei gibt es zwei Szenarien:
1. Es wurde ein Schlüssel für mehrere Ergebnisse angegeben
2. Es wurde für für jedes Ergebnis ein Schlüssel angegeben
Fall 1 tritt dann ein, wenn mehrere Ergebnisse aber genau nur ein Schlüssel
vorhanden ist. In dem Fall werden alle Ergebnisse als Array zum Schlüssel im
Datenobjekt abgelegt. Gibt es nur einen Schlüssel und nur ein Ergebnis, so wird das
eine Ergebnis direkt zum Schlüssel gespeichert. Wenn es mehrere Schlüssel gibt,
so werden die Ergebnisse in der gleichen Reihenfolge der Schlüssel zugeordnet.
Überschüssige Ergebnisse, für die kein Schlüssel definiert wurde, werden ignoriert.
Falls mehr Schlüssel als Ergebnisse vorhanden sind, werden die Werte der überschüssigen
Schlüssel mit `undefined` gefüllt.

		
		cber(<name>)
		
Gibt eine Callback-Funktion zurück, die zwei Parameter aufnimmt, den ersten für den
Fehler- und den zweiten für den Erfolgsfall. Optional kann der Schlüssel, unter dem
das Ergebnis im Erfolgsfall im Datenobjekt gespeichert wird, angegeben werden.
Sollte dieser nicht agegeben sein, so wird der Schlüssel auf "result" gesetzt.
Ist ein Fehler aufgetreten, so wird dieser mit dem Schlüssel `error` im Datenobjekt
abgelegt. Wenn der Fehler nicht gesetzt ist, ist vom Erfolgsfall auszugehen und das
Ergebnis wird wie zuvor definiert abgespeichert.


    sjob(array, funktion, resultkey)
    pjob(array, funktion, resultkey)

Um eine Datenreihe, repräsentiert durch einen Array, mit nur einer Funktion
abzuarbeiten, werden zwei Methoden zur Verfügung gestellt, die "job"-Methoden.
Sie unterscheiden sich darin, dass eine die Daten sequentiell, also nacheinander
abarbeitet, während die zweite dies parallel tut. Der benannten Funktion werden
zwei Parameter übergeben, der erste ist das array-Element, der zweite wie zuvor
das Datenobjekt. Die Ergebnisse der Abarbeitung liegen unter dem im `resultkey`
spezifizierten Schlüssel im Datenobjekt als Objekt.

WICHTIG: das Ergebnis ist nicht als Ergebnis eines Rückgabewertes zu verstehen,
sondern eine Sammlung der Datenobjekte jeder Ausführung der Iterationsfunktion.
Die Ergebnisse müssen in der Iterationsfunktion im übergebenen Datenobjekt
abgelegt werden! Das klingt komisch, hat aber den Vorteil, dass in der
Iteration auf Callbacks gewartet und eigene Abläufe von bd-flux Objekten
ausgeführt werden kann.

Ein Beispiel:

    const fl = require("bd-flux");
    
    function random(x) { return(Math.floor(Math.random() * x)); }

    function test1_1(d) {
      var data = []
      for (var i = 0; i < 20; i++) data.push(i*5);
      d.a = data;
      console.log('test1_1 passed');  
    }

    function test1_2(d) {
      var a = function(v, cb) {
        setTimeout(function() {
          if (isNaN(v)) cb('error, v is not a number');
          else cb(null, v);
        }, (random(15)+1) *100);
      },
          b = function(element,d) {
            a( element * 10, d.__fl.cber('key'));
      };
      
      d.__fl.sjob(d.a, b, 'jobresult');
      console.log('test1_2 passed');
    }

    function test1_3(d) {
      console.log('test1_3, job results:', d.jobresult.key);
      console.log('1_3 passed');
    }
      
   
    fl().run(test1_1, test1_2, test1_3);
    console.log('test1 passed');

Beispielende.

		
    sub()
    
Es kommt vor, dass es sinnvoll ist im aktuellen Ablauf einen neuen zu erstellen,
speziell z.B. während der Ausführung von jobs.
Dies ist jederzeit möglich indem eine neue Instanz eines bd-flux Objektes
erstellt wird. Wird der Ablauf einer neuen Instanz gestartet, läuft er "unabhängig"
vom aktuellen, d.h. potentiell parallel ab. Kniffliger ist es, den neuen Ablauf mit
dem aktuellen zu synchronisieren. Hierfür ist die Methode `sub()` gedacht. Sie
erstellt ein neues bd-flux Objekt und gibt dieses zurück. Die aktuelle Funktion wird
allerdings erst dann abgeschlossen, wenn zuvor der per `sub()` angeforderte neue Ablauf
ausgeführt wurde.




(Fortsetzung folgt)