// bd-flux
// =======
// (c) 2017 Rüdiger Bund
// Lizenz/License: BSL.TXT / http://www.bundnetz.de/BSL.TXT
//
//
// bd-flux soll wohl im Browser als auch in Node.js verwendbar sein.
// Daher ist sowohl auf eine möglichst kompatible Notation (kein ES5/6)
// und die globale Definition für die Browser-nutzung geachtet. Die
// nun folgende Definition hat bei der Nutzung von `require` keine
// Bedeutung, doch wird dadurch die globale variable `fl` im Browser
// registriert.
var fl = (function() {

  "use strict"; // jdi-disable-line

// Private Klassenvariablen und -funktionen
// ----------------------------------------


// ### Allgemeine Hilfsfunktionen ###
// gibt es nur eine zum Erstellen einer Array-Kopie. Diese wird später gebraucht um eine
// Kopie für das `argument`-Objekt zu erstellen. Mir ist durchaus klar, dass dies auch
// mit Methoden der Array-Klasse mit weniger Quelltext möglich wäre, jedoch ist dies
// performanter (keine Relevanz hier) und ein Hinweis auf meinen Wunsch, Makros in
// Javascript einzuführen! :)
  function copyArray(arr) { var i = 0, len = arr.length, res = new Array(len); for(; i < len; i++) res[i] = arr[i]; return(res); } // macro

// ### Klassenspezfische Hilfsfunktionen ###
// sind Funktionen oder Funktionsteile, die in Methoden mehrfach gebraucht werden.

// Die Funktion `next()` ruft die nächste Funktion aus dem Funktionsspeicher auf, wenn
// die aktuelle abgeschlossen ist. Geprüft wird dies immer dann, wenn entweder die
// Hauptroutine durchlaufen oder ein Callback "zurückgerufen" wurde.
// Abgeschlossen ist eine Funktion dann, wenn die Hauptroutine der Funktion
// durchlaufen wurde (markiert durch `closed`) _und_
// wenn auf keine weiteren Callbacks zu warten ist (bedeutet, wenn der
// Zähler der von `callbackcounter` gleich 0 ist.
  function next($this) {
    if ($this.closed && $this.callbackcounter === 0) {
      if ($this.rindex < $this.queue.length) {
        $this.callbackcounter = 0;
        $this.closed = false;
        $this.depth++;
        $this.windex = $this.rindex+1;
        $this.queue[$this.rindex++]($this.data);
        $this.closed = true;
        next($this);
        $this.depth--;
      }
    }
  }

// Die Funktion `cb_start()` wird bei Anforderung einer Callback-Funktion aufgerufen.
// Auch wenn sie momentan noch unscheibar ist, so halte ich es für besser diese
// für den späteren Gebrauch zu kapseln. Die Callback-Funktionen sollen keine
// Kenntnisse über die Verwaltung der Callbacks haben.
  function cb_start($this) {
    $this.callbackcounter++;
  }
// Das Gleiche gilt für `cb_end()`.
  function cb_end($this) {
    $this.callbackcounter--;
    next($this);
  }

// MERKE: Beschreibung mergeJobData

  function mergeJobData(targetdata, targetkey, sourcedata, id) {
    var target = targetdata[targetkey];
    if (!target) { target = {}; targetdata[targetkey] = target; }
    for (var key in sourcedata) {
      if (! target[key]) target[key] = [];
      if (id !== undefined) target[key][id] = sourcedata[key];
      else target[key].push(sourcedata[key]);
    }
  }

// Der Klassenprototyp
// -------------------
// Der Prototyp einer Klasse stellt i.d.R. Methoden bereit, die alle
// Instanzen der Klasse gemein haben. Instanzvariablen werden hingegen
// üblicherweise im Konstruktor erstellt.
  var $proto = {
// Eine der wichtigsten Funktionen dieser Bibliothek ist es, eine auszuführende
// Funktion im Funktionsspeicher einzustellen. Dies wird durch die Methode `ex()`
// realisiert. `ex` steht dabei für "execute".
// Alle Parameter werden in der Reihenfolge der Übergabe angenommen,
// darauf geprüft ob sie Funktionen sind,
// und im Funktionsspeicher eingestellt.

    ex : function() {
      for (var i = 0; i < arguments.length; i++) {
        if (typeof arguments[i] !== 'function') throw new TypeError(arguments[i] + ' is not a function');
        this.queue.splice(this.windex++,0,arguments[i]);
      }
      return(this);
    },


// Um eine Datenreihe, repräsentiert durch einen Array, mit nur einer Funktion
// abzuarbeiten, werden zwei Methoden zur Verfügung gestellt, die "job"-Methoden.
// Sie unterscheiden sich darin, dass eine die Daten sequentiell, also
// nacheinander abarbeitet, während die zweite dies parallel tut.
// Technisch gesehen wird für die Bearbeitung in der Iteration eine neue Instanz
// von bd-flux erstellt.

// MERKE: Beschreibung für sjob, pjob

    // seriell
    sjob : function(data_array, fn, reskey, noclear) {
      var boss = new $constructor(0), $this = this;
      for (var i = 0; i < data_array.length; i++) {
        boss.ex(
          (function(work, proc) {
            var worker = function(d) {
              proc(work, d);
            };
            return(worker);
          })(data_array[i],fn),
          (function(id) {
          return(
            function(d) {
              mergeJobData($this.data, reskey, d, id);
              if (!noclear) d.__fl.data = { "__fl": d.__fl };
            });
          })(i)
        );
      }
      var waiter = this.cb();
      boss.run(function(d) { delete $this.data[reskey].__fl; waiter(); });
      return(this);
    },
    // parallel
    pjob : function(data_array, fn, reskey) {
      var boss = new $constructor(), $this = this;

      for (var i = 0; i < data_array.length; i++) {
          (function(work, proc, id, cb) {
              var iboss = new $constructor();
              iboss.run(
                function(d) { proc(work, d); },
                function(d) { mergeJobData($this.data, reskey, d, id); cb(); }
              );
          })(data_array[i],fn, i, boss.cb());
      }
      var waiter = this.cb();
      boss.run(function(d) { delete $this.data[reskey].__fl; waiter(); });
      return(this);
    },

// Es kommt vor, dass es sinnvoll ist im aktuellen Ablauf einen neuen zu erstellen,
// speziell z.B. während der Ausführung von jobs (siehe oben).
// Dies ist jederzeit möglich indem eine neue Instanz eines bd-flux Objektes
// erstellt wird. Wird dieser Ablauf gestartet, läuft er "unabhängig" vom aktuellen,
// d.h. potentiell parallel ab. Kniffliger ist es, den neuen Ablauf mit dem aktuellen
// zu synchronisieren. Hierfür ist die Methode `sub()` gedacht. Sie erstellt ein
// neues bd-flux Objekt und gibt dieses zurück. Die aktuelle Funktion wird allerdings
// erst dann abgeschlossen, wenn zuvor der per `sub()` angeforderte neue Ablauf
// ausgeführt wurde.

    sub : function() {
      var flow = new $constructor();
      var cb = this.cb();
      flow.ex( function() { cb(); });
      flow.windex--; // hmmm a bit hacky...
      return(flow);
    },

// Eine weitere essentielle Funktion ist die Kapselung von Callbacks.
// Ohne diese Kapselung ist unbekannt, ob die ausgeführte Funktion tatsächlich
// beendet ist und das ganze Modell wäre hinfällig.
// Generell kann zwischen zwei Arten von Callbacks unterschieden werden, einer
// generischen, die die übergebenen Parameter einfach weiterreicht, und der
// "klassischen", die zwei Parameter, den ersten zur Fehlerindikation und den
// zweiten als Ergebnis im Erfolgsfall, übergeben bekommt.
// Für beide Arten stellt bd-flux Methoden bereit, um diese einfach zu kapseln.
// Zuerst die generische:
// Die übergebenen Parameter werden als Schlüssel für das Datenobjekt
// interpretiert. Damit dies möglich ist, müssen die Argument in den Scope der
// zurückgegebenen Callback-Funktion übernommen werden.
// Die Callback-Funktion übernimmt die Zuordnung der Ergebnisse zu den evtl. zuvor
// angegebenen Schlüsseln. Dabei gibt es zwei Szenarien:
// 1. Es wurde ein Schlüssel für mehrere Ergebnisse angegeben
// 2. Es wurde für für jedes Ergebnis ein Schlüssel angegeben
// Fall 1 tritt dann ein, wenn mehrere Ergebnisse aber genau nur ein Schlüssel
// vorhanden ist. In dem Fall werden alle Ergebnisse als Array zum Schlüssel im
// Datenspeicher abgelegt. Gibt es nur einen Schlüssel und nur ein
// Ergebnis, so wird das eine Ergebnis direkt zum Schlüssel zugeordnet.
// Wenn es mehrere Schlüssel gibt, so werden die Ergebnisse in der gleichen
// Reihenfolge der Schlüssel zugeordnet. Überschüssige Ergebnisse, für die kein
// Schlüssel definiert wurde, werden ignoriert. Falls mehr Schlüssel als
// Ergebnisse vorhanden sind, werden die Werte der überschüssigen Schlüssel mit
// `undefined` gefüllt.

    cb: function() {
      var args = arguments, $this = this;
      cb_start(this);
      return( function() {
        if (args.length == 1) $this.data[args[0]] = arguments.length == 1 ? arguments[0] : copyArray(arguments);
        else for (var i = 0; i < args.length; i++) $this.data[args[i]] = i < arguments.length ? arguments[i] : undefined;
        cb_end($this);
      });
    },

// Hier nun die Kapselung des "klassischen" Falles: ein Callback
// mit genau zwei Parametern, der erste im Fehler- und der zweite im
// Erfolgsfall. Optional kann der Schlüssel, unter dem das Ergebnis
// im Erfolgsfall im Datenobjekt gespeichert wird, angegeben
// werden. Sollte dieser nicht agegeben sein, so wird der Schlüssel auf
// "result" gesetzt.
// Ist ein Fehler aufgetreten, so wird dieser mit dem
// Schlüssel `error` im Datenspeicher abgelegt.
// Wenn der Fehler nicht gesetzt ist, ist vom Erfolgsfall auszugehen
// das das Ergebnis wird wie zuvor definiert abgespeichert.

    cber: function(resultkey) {
      var reskey = resultkey || "result", $this = this;
      cb_start($this);
      return(function(e,r) {
        if (e) $this.data.error = e;
        else $this.data[reskey] = r;
        cb_end($this);
      });
    },

// Durch die Kapselung der auszuführenden Funktionen mittels der Methode
// `ex()` ist zwar bekannt, wann diese abgeschlossen sind, dies gilt
// jedoch nicht für den Aufrufer. Es muss der "Startschuss" gegeben
// werden, wann mit der Ausführung losgelegt werden soll. Dafür ist
// die Methode `run()` vorhanden. Zusätzlich können hier analog zur
// Methode `ex()` Funktionen angegeben werden, die auszuführen sind.
// Hintergrund ist, dass es ggf. ausreicht nur `run()` aufzurufen.

    run: function() {
      this.ex.apply(this, arguments);
      this.closed = true;
      next(this);
    },

// Als Letztes kommt eine Methode zum Datenabruf bzw. -setzen in den
// Datenspeicher, die Methode `d()` (wie "Daten").
// Sie arbeitet je nach Parameteranzahl unterschiedlich.
// Bei keinem Parameter wird als Ergebnis das Datenspeicherobjekt
// zurückgegeben.
// Bei Angabe nur eines Parameters wird dieser als Schlüssel
// interpretiert und der dazu gespeicherte Wert aus dem
// Datenspeicher zurückgegeben.
// Bei zwei der mehr Parametern werden (momentan) nur die die ersten zwei
// berücksichtigt, der erste als Schlüssel und der zweite als Wert. Dieses
// Paar wird im Datenspeicherobjekt abgelegt.

    d: function() {
      switch (arguments.length) {
        case 0: return(this.data);
        case 1: return(this.data[arguments[0]]);
        default: this.data[arguments[0]] = arguments[1];
      }
      return(this);
    }
  };
// Rein technisch: setzen des Prototypen, zuvor wurde dieser nur definiert.
  $constructor.prototype = $proto;

// Der Konstruktor
// -------------------
  function $constructor() {
    if (! (this instanceof $constructor)) return new $constructor();
// - der Funktionsspeicher der aufzurufenden Funktionen
    this.queue = [];
// - der Leseindex des Funktionsspeichers, der die als nächstes auszuführenden Funktion markiert
    this.rindex = 0;
// - der Schreibindex des Funktionsspeichers, der die Stelle markiert wo weitere Funktionen eingefügt werden
    this.windex = 0;
// - der Zähler für die angeforderten aber noch nicht aufgerufenen Callbacks
    this.callbackcounter = 0;
// - der Datenspeicher für Variablen, der für alle Funktionen zur Verfügung steht
    this.data = {__fl: this};
// - ein Indikator, ob die Hauptroutine der Funktion bereits ausgeführt wurde
//   (und somit "nur" noch auf Callbacks zu warten ist)
    this.closed = false;
// - ein Zähler für die Aufruftiefe der Funktionen untereinander, zum späteren Gebrauch
    this.depth = 0;

  }
// **Ende** - die zuvor definierte Klasse wird zurückgegeben
  return($constructor);
})();


// Unterstützung für `require` i.d.R. im Node.js-Umfeld. Hier wird das zuvor erstelle
// Objekt exportiert.
if (typeof require !== "undefined" && typeof module !== "undefined") module.exports = fl;