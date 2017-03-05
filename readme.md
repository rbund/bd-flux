[![Build Status](https://travis-ci.org/rbund/bd-flux.svg?branch=master)](https://travis-ci.org/rbund/bd-flux)
[![GitHub tag](https://img.shields.io/npm/v/bd-flux.svg)](https://www.npmjs.com/package/bd-flux)

bd-flux
=======

(c) 2017 R�diger Bund

Lizenz siehe BSL.TXT oder auch http://www.bundnetz.de/BSL.TXT

(For non German speaking ppl: no English documentation yet)

Was ist bd-flux?
----------------
bd-flux bietet eine L�sung f�r zwei Probleme, es erm�glicht

1. die Steuerung des Kontrollflusses von Javascript-Programmen
2. einen extrem vereinfachten Umgang mit Funktionen die Callbacks bed�rfen

Was unterscheidet bd-flux von anderen Bibliotheken?
---------------------------------------------------
Im unterschied zur anderen Bibliotheken 

1. ist bd-flux ein Leichtgewicht, ca. 2K reiner Code ohne Kommentare
2. hat bd-flux keine Abh�ngigkeiten
3. unterst�tzt bd-flux den Umgang mit Callbacks (Scoped Callbacks)


Schnelleinstieg - Beispiel
--------------------------
Grob gesagt erm�glicht bd-flux die Definition von Programmbl�cken, die
nacheinander zur Ausf�hrung gebracht werden. Dies ist notwendig, wenn ein
Programmblock Ergebnisse aus dem vorherigen ben�tigt. Die Besonderheit von
bd-flux liegt darin, dass vor Ausf�hrung des n�chsten Blockes auch alle im 
aktuellen Block ausgel�sten Callbacks abgewartet wird.

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

Bei Ausf�hrung dieses Programmes wird zuerst die Funktion `first()` aufgerufen.
Diese wiederum ruft die Funktion `simCallback()` auf, die nach zwei Sekunden
"zur�ckruft". Inzwischen wird die Funktion `first()`beendet und die Funktion
`second()` vom Hauptprogramm aufgerufen. In dieser wird der Wert der Variablen
`mymessage` auf der Konsole ausgegeben. Zu diesem Zeitpunkt ist der Wert auf
"I'm undefined" gesetzt. Nach zwei Sekunden wird die Callback-Funktion in
`first()` angesprungen und der Wert von `mymessage` auf "Hello world" gesetzt,
jedoch zu sp�t f�r die Ausgabe in `second()`.


Nun das Beispiel �bertragen auf bd-flux:


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
zur�ckgegeben. Der Aufruf hat den gleiche Effekt wie `new fl()`.
Mit der Methode `run()` werden Funktionen angegeben, die sequentiell ausgef�hrt
werden sollen, gleichzeitig wird mit der ausf�hrung gestartet.
Nun wird der erste definierte Programmblock mit der Funktion `first()`
ausgef�hrt. Als einziger Parameter wird ein Datenobjekt �bergeben. Dieses
Datenobjekt wird von Funktion zu Funktion weitergereicht und ggf. gef�llt.
Initial ist nur eine Variable enthalten, n�mlich eine Referenz auf das aktive
bd-flux Objekt. Der Schl�ssel f�r das Object ist `__fl`. Als erstes setzt
die Funktion `first()` den Wert der Variablen `data.result` auf den Wert der
Variablen `mymessage`. Als n�chstes wird die Funktion `simCallback()` aufgerufen, 
als Callback jedoch wird `data.__fl().cber()` �bergeben. Diese Funktion erstellt
eine Callback-Funktion mit zwei Parametern, den ersten f�r einen Fehler (__e__rror),
den zweiten f�r ein Ergebnis (__r__esult) im Erfolgsfall.
Vor der Ausf�hrung `second()` wird nun jedoch auf den Aufruf der
Callback-Funktion gewartet. Das Callback-Ergebnis wird im Datenobjekt abgelegt,
bei einem `cber()` standardm��ig unter den Schl�sseln `error` und `result`.
Da nach Aufruf der Callback-Funktion auf keine weiteren Callbacks gewartet wird,
gilt der Block nun als abgeschlossen und die Ausf�hrung der zweiten Funktion
startet.
In diesem wird der Wert der Variablen `data.result` ausgegeben, der nun korrekt
den Wert "Hello world" beinhaltet.


Referenz
--------
Alle hier genannten Funktion sind Methoden eines bd-flux Objektes. 
Parameter in spitzen Klammern sind optional.


		ex(funktion<, funktion><,funktion><,...>)

definiert welche Funktionen in welcher Reihenfolge ausgef�hrt werden sollen.
`ex()` kann mehrmalig aufgerufen werden, wobei die in nachfolgenden Aufrufen
genannten Funktionen den vorherigen angeh�ngt werden.

**Kaskadierung**

Aufrufe von `ex()` k�nnen kaskadiert werden. Ein Beispiel:

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
		
Startet die Ausf�hrung. Optional k�nnen analog zu `ex()` auszuf�hrende Funktionen
benannt oder hinzugef�gt werden.

		
		d(<schl�ssel><wert>)

`d()` arbeitet je nach Parameteranzahl unterschiedlich. Bei keinem Parameter wird
als Ergebnis das Datenobjekt zur�ckgegeben. Bei Angabe nur eines Parameters wird
dieser als Schl�ssel interpretiert und der dazu gespeicherte Wert aus dem
Datenobjekt zur�ckgegeben. Bei zwei der mehr Parametern werden (momentan) nur die
ersten zwei ber�cksichtigt, der erste als Schl�ssel und der zweite als Wert. Dieses
Paar wird im Datenobjekt abgelegt.


		cb(<name><,name><,name><,...>)
		
Gibt eine Callback-Funktion zur�ck, die die ihr �bergebenen Parameter im Datenobjekt
speichert. Die �bergebenen Parameter <name> werden als Schl�ssel f�r das Datenobjekt
interpretiert. Die Callback-Funktion �bernimmt die Zuordnung der Ergebnisse zu den 
evtl. zuvor angegebenen Schl�sseln. Dabei gibt es zwei Szenarien:
1. Es wurde ein Schl�ssel f�r mehrere Ergebnisse angegeben
2. Es wurde f�r f�r jedes Ergebnis ein Schl�ssel angegeben
Fall 1 tritt dann ein, wenn mehrere Ergebnisse aber genau nur ein Schl�ssel
vorhanden ist. In dem Fall werden alle Ergebnisse als Array zum Schl�ssel im
Datenobjekt abgelegt. Gibt es nur einen Schl�ssel und nur ein Ergebnis, so wird das
eine Ergebnis direkt zum Schl�ssel gespeichert. Wenn es mehrere Schl�ssel gibt,
so werden die Ergebnisse in der gleichen Reihenfolge der Schl�ssel zugeordnet.
�bersch�ssige Ergebnisse, f�r die kein Schl�ssel definiert wurde, werden ignoriert.
Falls mehr Schl�ssel als Ergebnisse vorhanden sind, werden die Werte der �bersch�ssigen
Schl�ssel mit `undefined` gef�llt.

		
		cber(<name>)
		
Gibt eine Callback-Funktion zur�ck, die zwei Parameter aufnimmt, den ersten f�r den
Fehler- und den zweiten f�r den Erfolgsfall. Optional kann der Schl�ssel, unter dem
das Ergebnis im Erfolgsfall im Datenobjekt gespeichert wird, angegeben werden.
Sollte dieser nicht agegeben sein, so wird der Schl�ssel auf "result" gesetzt.
Ist ein Fehler aufgetreten, so wird dieser mit dem Schl�ssel `error` im Datenobjekt
abgelegt. Wenn der Fehler nicht gesetzt ist, ist vom Erfolgsfall auszugehen und das
Ergebnis wird wie zuvor definiert abgespeichert.


    sjob(array, funktion, resultkey)
    pjob(array, funktion, resultkey)

Um eine Datenreihe, repr�sentiert durch einen Array, mit nur einer Funktion
abzuarbeiten, werden zwei Methoden zur Verf�gung gestellt, die "job"-Methoden.
Sie unterscheiden sich darin, dass eine die Daten sequentiell, also nacheinander
abarbeitet, w�hrend die zweite dies parallel tut. Der benannten Funktion werden
zwei Parameter �bergeben, der erste ist das array-Element, der zweite wie zuvor
das Datenobjekt. Die Ergebnisse der Abarbeitung liegen unter dem im `resultkey`
spezifizierten Schl�ssel im Datenobjekt als Objekt.

WICHTIG: das Ergebnis ist nicht als Ergebnis eines R�ckgabewertes zu verstehen,
sondern eine Sammlung der Datenobjekte jeder Ausf�hrung der Iterationsfunktion.
Die Ergebnisse m�ssen in der Iterationsfunktion im �bergebenen Datenobjekt
abgelegt werden! Das klingt komisch, hat aber den Vorteil, dass in der
Iteration auf Callbacks gewartet und eigene Abl�ufe von bd-flux Objekten
ausgef�hrt werden kann.

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
speziell z.B. w�hrend der Ausf�hrung von jobs.
Dies ist jederzeit m�glich indem eine neue Instanz eines bd-flux Objektes
erstellt wird. Wird der Ablauf einer neuen Instanz gestartet, l�uft er "unabh�ngig"
vom aktuellen, d.h. potentiell parallel ab. Kniffliger ist es, den neuen Ablauf mit
dem aktuellen zu synchronisieren. Hierf�r ist die Methode `sub()` gedacht. Sie
erstellt ein neues bd-flux Objekt und gibt dieses zur�ck. Die aktuelle Funktion wird
allerdings erst dann abgeschlossen, wenn zuvor der per `sub()` angeforderte neue Ablauf
ausgef�hrt wurde.




(Fortsetzung folgt)