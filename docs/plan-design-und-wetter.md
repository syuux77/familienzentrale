# Plan: gemeinsames Design und Wetter-Baustein

Stand: 12.11.2026 · Status: Entwurf, Version 2. Nichts davon ist live. Die Geschmacksfragen werden nach dem gemeinsamen Gespräch entschieden.

- Entwürfe Version 2 mit klickbarem Prototyp (privat): https://claude.ai/artifact/EkmezUXkwRXoSKkeWsTGXw
- Leitfaden zum Anklicken, Version 1 (privat): https://claude.ai/artifact/NjNWS4X2QHnQY7d2VwMNoh. Die Etappe „Startseite am Wand-iPad“ zeigt dort noch das Querformat.

## 0. Entscheidungen (13.11.2026)

- Look **Kräftig**, Schrift **Modern** (Manrope, selbst gehostet), Kinder-Animationen vorerst **ohne Ton**.
- Alles aus Version 2 ist abgenommen (Hochformat, Tagesphasen mit Kita-Zeit, Tagesmaximum, Tagesstimmung, Kalender nur Anzeige, Statistik).
- Tageszeit nur **angedeutet**: Himmelsverlauf oben auf dem Bildschirm (Sonnenaufgang rötlich, tagsüber hellblau, Sonnenuntergang rosa, nachts dunkelblau) plus leichter Nachtschleier. Die kräftige Farbwelt bleibt unverändert; die bisherige Umfärbung nach Tagesphase entfällt.
- **Wetter im Hintergrund** der Startseite, ganz leicht: Sonnenschein, ziehende Wolken, Regen, Schnee, Nebel, seltenes Aufhellen bei Gewitter. Still bei „Bewegung reduzieren“.
- **Wetter-Ansicht beim Antippen** von Symbol oder Temperatur: Stundenverlauf, Regenradar (RainViewer auf OpenStreetMap, frei für private Nutzung mit Quellenangabe; Ausweichlösung DWD-Radar als offener Kartendienst), nächste Tage, Wind, Sonne.
- **Wetterdaten**: immer Jetzt, Höchst/Tiefst, Regen ob und ab wann, gefühlte Temperatur. Nur wenn wichtig: DWD-Warnung, Regen in den nächsten 2 Stunden, UV ab Stufe 3. Weg: Pollen, Luftqualität.
- **Gerichte** (Vorschlag im Entwurf, wartet auf Freigabe): Spalte „Kategorie“ mit Ernährung (genau eine: Fleisch, Fisch, Vegetarisch), Gerichtart (1–2: Nudeln, Kartoffeln, Reis, Suppe & Eintopf, Ofen & Auflauf, Pizza & Flammkuchen, Pfanne & Wok, Abendbrot, Süßes, Bestellt) und optional Fleischsorte (Schwein, Rind, Geflügel, Hackfleisch, Wurst). Reiter „Essen-Listen“ bekommt dafür die Gruppen `ernaehrung`, `gericht`, `fleischsorte`. „Merkmale“ mit genau einer Zeitstufe (schnell bis 20 Min., normal 20–45 Min., aufwendig) plus Zusätze „Ruby hilft mit“, „reicht für Reste“. Geschrieben wird erst zusammen mit dem Update.
- Statistik Essen zusätzlich: Anteil Zeitaufwand und Anteil Fleisch/Fisch/vegetarisch über 4 Wochen.

## 1. Rahmen

- Kostenlos wie bisher: GitHub Pages, Google-Tabelle, Apps Script, kein eigener Server.
- Weiterentwicklung nur mit Claude. Deshalb soll alles in kleinen, klar getrennten Dateien liegen und eine Musterseite haben, die man ansehen und fotografieren kann.
- Wand-iPad: 11 Zoll, iPadOS 17 oder neuer, **im Hochformat** (820 × 1180 Punkte). Moderne CSS-Technik (Container Queries, `:has()`, `color-mix()`, Web Animations) ist erlaubt.
- Zwei Handys: Christian und Lisa. Das Handy weiß, wem es gehört: Beim ersten Öffnen nach dem Update fragt es einmal „Wer bist du?“ und speichert die Antwort auf dem Gerät (`fz.person`). Keine neuen Links nötig; umstellbar auf der Eltern-Seite.
- Daten: Die Google-Tabelle bleibt die Datenbasis, alle bisherigen Einträge bleiben erhalten. Neu sind nur Spalten (`Max pro Tag`, `Tagesart`) und der Reiter `Stimmung`. Die Statistik rechnet rückwirkend mit den vorhandenen Einträgen aus „Erledigt“ und „Bewertungen“.
- Bearbeiten bleibt: Haushaltsaufgaben und Gerichte (mit Kategorie und Merkmalen) lassen sich wie bisher am Handy anlegen und ändern, am Wand-iPad hinter der Eltern-PIN. Vor dem Umbau werden Kategorien und Merkmale in der Tabelle gemeinsam bereinigt.
- Handy: Nachschauen, Abhaken, Planen und Pflegen. Das Handy ist das Werkzeug, die Wand ist der Überblick.
- Kinderseite: zunächst für ein Kind (4 Jahre, liest noch nicht). Mehrere Kinder sollen später ohne Umbau möglich sein. Das Essen bewerten Christian, Lisa und Ruby schon heute am nächsten Morgen.
- Inhalte: Wetter, Kalender (nur Anzeige), Haushalt, Essen, Kinderseite. Dahinter ein Statistik-Dashboard für Haushalt (ohne Uhrzeit-Auswertung) und Essen, dazu die neue Tagesstimmung.

## 2. Was die Recherche ergeben hat

**Familien-Apps allgemein**
- Gängig sind Farben pro Person, eine klare Trennung von Terminen, Aufgaben und Essen sowie eine Übersicht auf einem Bildschirm (Skylight, Hearth, FamilyWall, Maple).
- Selbstgebaute Wand-Dashboards (Home-Assistant-Community, Projekte wie Beacon, FamQuest, LX Family) kommen am besten an, wenn sie ruhig wirken und „nicht wie ein Kontrollraum“ aussehen. FamQuest wurde nach eigener Aussage mit Claude Code anhand einer schriftlichen Spezifikation gebaut.

**Lesen aus der Entfernung**
- Nur wenige große Elemente zeigen. Fette Schrift wirkt stärker als nur größere Schrift. Schrift für große Bildschirme gegenüber dem Schreibtisch um 25 bis 50 % vergrößern.
- Längen und Positionen statt Winkel: keine Tortendiagramme.

**Haushalt**
- Tody ordnet nach Räumen und zeigt den Zustand als Balken, der mit der Zeit voller wird. Fällig wird eine Aufgabe nach Bedarf, nicht nach starrem Datum.
- Fairness: „fair“ heißt nicht immer 50/50. Manche Apps verzichten bewusst auf Punktestände (FairShare), andere gewichten nach Aufwand (FairPlay). Geistige Arbeit wie Planen und Erinnern zählt mit.

**Essen**
- Wochenpläne in Tabellen-Optik wirken „zu sehr nach Excel“. Bilder und eine klare Heute-Ansicht kommen besser an.
- Ein Gericht tauschen, ohne den Plan zu zerstören, gilt als besonders angenehm (Mise). Der Weg vom Plan zur Einkaufsliste ist ein häufiger Wunsch.

**Kinder (3 bis 5 Jahre)**
- Tippflächen mindestens 2 × 2 cm (Nielsen Norman Group). Das sind am iPad etwa 105 CSS-Pixel, für Erwachsene etwa 52.
- Nur Tippen, kein Wischen oder Zoomen. Keine Bedienelemente am unteren Rand, denn Kinder legen dort das Handgelenk ab (Sesame Workshop).
- Sofortige Rückmeldung auf jede Berührung, Töne bestätigen zusätzlich.
- Bild-Tagespläne in fester Reihenfolge, mit einem sichtbaren Ort für „fertig“.
- Größere Erfolge verdienen größere Feiern (Toca Boca). Kleine Rückmeldung pro Aufgabe, große Feier am Ende.

**Claude Design**
- Seit April 2026 verfügbar. Tester loben klickbare Prototypen und die Möglichkeit, ein Element zu markieren und zu kommentieren. Die Übergabe an Claude Code gilt als schwächer als angekündigt.
- Reddit-Threads zu Familien-Dashboards mit Claude Design habe ich nicht gefunden, nur allgemeine Tests auf YouTube und in Blogs. Der Leitfaden übernimmt die Idee, dass man klickt, statt zu beschreiben.

## 2b. Version 2: Vergleichsprodukte und neue Anforderungen

### Was Familienplaner heute machen

| Produkt | Stärken | Was fehlt oder kostet |
| --- | --- | --- |
| Skylight | Kalender-Displays 10–27″, Farbe pro Profil, Aufgaben, Sterne, Essensplan, KI-Import | Essen, Belohnungen, KI nur im Plus-Abo (ca. 39–79 $/Jahr) |
| Hearth Display | 27″, Termine in Spalten je Person, Routinen mit Sternen und Serien, „Today's Feelings“ (16 Gefühle, Auswertung 90 Tage) | ca. 699 $ plus ca. 86 $/Jahr, ohne Abo nur Kalender |
| Cozi | Klassiker: Kalender, Listen, Essensplan | Gratis nur mit Werbung und 30 Tagen Kalender-Vorschau |
| FamilyWall | Breitester Umfang inkl. Standort und Finanzen | Google-Sync nur Premium |
| TimeTree | Bester kostenloser Kalender, Chat pro Termin | Nur Kalender |
| Nori | Hub, App und Web mit KI, Kalender, Aufgaben, Essen, Belohnungen | KI-Abo, Angaben fast nur vom Anbieter |
| DAKboard, Mango | Software für eigene Bildschirme, Hoch- und Querformat | Erweiterte Funktionen im Abo |
| Beacon (Open Source) | Wand-Dashboard mit Bestenliste, Layout mit einer Spalte für Tablets im Hochformat | Braucht Home Assistant |
| Sweepy | Haushaltspunkte 1–3 nach Aufwand, Bestenliste | Haushalt allein |
| Brili, Charty | Bild-Routinen für Kinder, aktuelle Aufgabe im Ablauf, verschiedene Feier-Stile | Kinder allein |
| Daylio, Exist | Stimmung in 5 Stufen, Jahr in Pixeln, Zusammenhänge mit Wetter | Statistik im Abo |

**Folgerungen**
- Alle bauen auf Kalender, Aufgaben, Essen und Listen. Die Einkaufsliste bleibt ein spätes Update.
- Statistik ist die Lücke der Wand-Geräte. Ein Dashboard für Haushalt, Essen und Stimmung ist das, was die Familienzentrale von den Kaufprodukten abhebt.
- Feste Personenfarben überall (Kalender, Haushalt, Statistik), immer mit Namen daneben. Christian blau `#2a78d6`, Lisa grün `#1baf7a` (Text auf Hell `#14946a`), Kinder orange `#eb6834`, Familie violett `#6250d6`. Die Kombination ist mit dem Farbprüfer auf Farbsehschwächen getestet.
- Abwechslung beim Feiern der Kinder bestätigt Charty. Gefühle als Schritt der Routine bestätigt Hearth.
- Fast alle sperren die spannenden Funktionen hinter Abos. Kostenlos bleibt Pflicht.

### Tagesphasen mit Kita-Zeit

| Tagesart | Ablauf |
| --- | --- |
| Zuhause-Tag | Nacht · Morgen 06:00–08:30 · Vormittag 08:30–12:00 · Leisezeit 12:00–14:30 · Nachmittag 14:30–17:00 · Abend 17:00–21:00 · Nacht |
| Kita-Tag | Nacht · Morgen 06:00–08:00 · Kita 08:00–15:00 · Nachmittag 15:00–17:00 · Abend 17:00–21:00 · Nacht |

- Ob Kita-Tag ist, entscheidet wie heute `FZ.dayInfo()` aus den Eltern-Einstellungen (`kita_tage`, Feiertage Sachsen, `zuhause_bis`).
- Reiter „Tagesphasen“ bekommt die Spalte `Tagesart` (`kita`, `zuhause`, `beide`). `FZ.phasen(datum)` liefert die passende Liste. Die bisherigen zwei „Tagsüber“-Zeilen werden zu Vormittag und Nachmittag.
- Zeitstrahl als Baustein: an der Wand groß mit Namen, am Handy schmal, auf der Kinderseite als Bildleiste.
- Kinderaufgaben bekommen die Phasen `vormittag`, `leise`, `kita`, `nachmittag`. Während der Kita-Zeit zeigt die Kinderseite keine Aufgaben, sondern „Du bist in der Kita, Abholen um 15 Uhr“ mit einem Stundenbalken.
- Der Ruhezustand am Wand-iPad folgt den neuen Phasen (Kinderseite morgens und abends).

### Tagesmaximum für wiederholbare Aufgaben

- Reiter „Haushalt“: neue Spalte `Max pro Tag` ersetzt `Mehrfach`. Leer bedeutet 1. Bestehende Aufgaben mit „Mehrfach: ja“ bekommen beim Umstellen 3.
- Heutige Erledigungen werden aus dem Reiter „Erledigt“ gezählt (`Aufgaben-ID`, Datum von `Zeitpunkt`). Ist das Maximum erreicht, verschwindet die Aufgabe für heute aus Start, Haushalt und Handy und erscheint morgen wieder.
- Anzeige mit Punkte-Zähler (●●○ 2/3), bei Erreichen kurz „Für heute geschafft“.
- An der Wand zwei große Knöpfe C und L je Aufgabe, damit die Punkte bei der richtigen Person landen. Am Handy reicht ein Tipp.

### Tagesstimmung

- Neuer Reiter `Stimmung`: Datum, Person, Wert 1–5, Notiz.
- Gefragt wird ab Beginn der Abendphase an Wand und Handy, nachholbar am nächsten Morgen.
- Auswertung als Jahr in Pixeln und Wochenschnitt. Zusammenhänge mit Wetter, Anzahl Termine, Haushaltspunkten und Essen erscheinen erst ab etwa 30 Tagen Daten.

### Kalender (nur Anzeige)

- Angelegt wird weiter im Google Kalender. Die Zentrale zeigt eine Wochenleiste mit Punkten je Tag und darunter die Tage als Liste, an der Wand 7 Tage, am Handy bis 4 Wochen.
- Die Personenfarbe kommt aus einem Kalender pro Person oder aus einem Stichwort im Titel. Das wird im Apps Script eingestellt.

### Statistik

| Bereich | Kennzahlen |
| --- | --- |
| Haushalt | Punkte pro Woche gestapelt Christian/Lisa (12 Wochen), Verteilung in %, Serie (Tage mit allen Tagesaufgaben), „bleibt liegen“ (Ø Tage überfällig), häufigste Aufgaben, Wochentage. Keine Auswertung nach Uhrzeit. |
| Essen | Hitliste (Ø 1–3 mit Anzahl), Flops, Ø je Person, Einigkeit der drei, Abwechslung, Verlauf pro Woche |
| Stimmung | Jahr in Pixeln, Wochenschnitt je Person, Zusammenhänge ab 30 Tagen, beste Wochentage |

Diagramme: eine Achse pro Diagramm, Personenfarben fest, Werte als Beschriftung, Hinweis beim Darüberfahren oder Antippen.

## 3. Teil A: Design-System

### Dateien

```
design/
  tokens.css        Farben (Look, Tagesphasen, Personen), Schriften, Abstände, Radien, Schatten, Bewegung
  basis.css         Reset, Typografie, Fokus, reduzierte Bewegung
  bausteine.css     Karte, Liste, Häkchen, Chip, Knopf, Sheet, Toast, Leiste, Fortschritt
  layout-wand.css   Raster für das Wand-iPad im Querformat, ohne Scrollen
  layout-handy.css  Raster und Daumen-Bedienung fürs Handy
  kinder.css        eigene Welt der Kinderseite
  schriften/        selbst gehostete Schriften, damit kein Abruf bei Google-Servern nötig ist
  index.html        Musterseite mit allen Bausteinen in beiden Layouts
```

Jede Seite bindet nur noch diese Dateien ein und behält höchstens wenige eigene Regeln. Die heute pro Seite eingebauten 100 bis 200 CSS-Regeln entfallen.

### Gerät, Look und Tageszeit als Attribute

`core.js` setzt beim Start am `<html>`-Element:

- `data-geraet="wand" | "handy"` aus dem Einrichtungs-Link, wie heute. Ein Handy im Querformat bleibt `handy`.
- `data-phase="morgen" | "tag" | "leise" | "abend" | "nacht"` aus den Tagesphasen, wie heute.
- `data-look="…"` aus der Einstellung `look`, damit sich der Look später in der Tabelle umstellen lässt.

Das CSS wählt alles über diese Attribute. Die Seiten selbst kennen keine Farben mehr.

### Größenregeln

| | Wand-iPad | Handy |
| --- | --- | --- |
| Grundschrift | mindestens 20 px | 16 bis 17 px |
| Kennzahlen (Temperatur, Punkte) | mindestens 56 px | 28 bis 34 px |
| Uhrzeit | mindestens 120 px | 40 px |
| Tippfläche Erwachsene | mindestens 52 px | mindestens 44 px |
| Tippfläche Kinderseite | mindestens 105 px | entfällt |
| Scrollen | nie auf der Startseite | normal |

Testgrößen: Wand 820 × 1180 im Hochformat (iPad 11"), zur Sicherheit auch 1024 × 1366. Handy: 390 × 844. Im Hochformat gilt: oben das Jetzt (Uhr, Wetter, Zeitstrahl), darunter Listen in voller Breite.

### Aufräumen

- `haushalt/` und `essen/` enthalten eigene Kopien von Hilfsfunktionen, die `core.js` schon bereitstellt (`pad`, `iso`, `addDays`, `esc`, `parse` …). Diese Kopien fallen weg.
- Die Wetter-Abrufe in `index.html` und `kinder/index.html` fallen weg (siehe Teil B).

## 4. Teil B: Wetter-Baustein

### Ziel

Ein einziges Modul `wetter.js` lädt die Daten, speichert sie zwischen und zeichnet überall denselben Baustein in drei Größen:

- **klein**: Symbol, Temperatur, Höchst- und Tiefstwert. Für die Leiste und das Handy.
- **mittel**: dazu Text, Regen, eventuell Stundenleiste und Warnung. Für die Startseite am Handy.
- **groß**: alles Ausgewählte, für die Startseite am Wand-iPad.

Die Kinderseite nutzt dieselben Daten für die Karte „Heute anziehen“.

### Datenquellen (kostenlos, ohne Schlüssel)

| Daten | Quelle | Aufruf (beim Bau gegen die Doku prüfen) |
| --- | --- | --- |
| Jetzt, Stunden, 7 Tage, UV, Sonne, Wind | Open-Meteo Forecast | `api.open-meteo.com/v1/forecast` mit `current`, `hourly`, `daily`, `forecast_days=7`, `timezone=Europe/Berlin` |
| Regen in 15-Minuten-Schritten | Open-Meteo (DWD-Modell ICON-D2, nur Mitteleuropa) | `minutely_15=precipitation` |
| Pollen, Luftqualität | Open-Meteo Air Quality (CAMS Europa) | `air-quality-api.open-meteo.com/v1/air-quality` mit `hourly=alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,european_aqi` |
| Amtliche Warnungen | Bright Sky (DWD-Daten als JSON) | `api.brightsky.dev/alerts?lat=…&lon=…`: Endpunkt und Felder vor dem Bau prüfen |

Hinweise:
- Laut Open-Meteo stellt der DWD seine ICON-Modelle nach dem 30.11.2026 auf neue Raster um, und die Sichtweite entfällt. Deshalb kein fest eingestelltes Modell (Standard „best_match“ lassen) und keine Sichtweite verwenden.
- Quellenangabe ist Pflicht: „Daten: Open-Meteo, CAMS, Deutscher Wetterdienst“ klein auf der Eltern-Seite und im großen Baustein.
- Pollen gibt es nur in der Saison. Außerhalb zeigt der Baustein „keine Belastung“ oder blendet den Teil aus.

### Datenmodell

```js
FZ.wetter.daten = {
  stand: "2026-11-10T07:40",            // Zeitpunkt des Abrufs
  ort: "Zuhause",
  jetzt:   { t, gefuehlt, code, tag, wind, boeen },
  stunden: [{ zeit, t, gefuehlt, regenP, regenMm, code, uv }],   // heute und morgen
  minuten: [{ zeit, mm }],                                        // die nächsten 2 Stunden
  tage:    [{ datum, code, max, min, regenP, aufgang, untergang, uvMax }],
  pollen:  { erle, birke, graeser, beifuss },                     // Stufe 0 bis 3
  luft:    { index, stufe },
  warnungen: [{ titel, text, stufe, von, bis }]
};
```

### Verhalten

- Ein Abruf für alle Seiten. Gespeichert in `localStorage` unter `fz.wetter2`, neu geladen alle 15 Minuten (Einstellung `wetter_minuten`), Warnungen alle 10 Minuten.
- Ohne Verbindung bleiben die letzten Werte stehen, mit „Stand 07:40“. An der Wand erscheint keine Fehlermeldung.
- Wettercodes werden an einer Stelle in Symbol und Text übersetzt (heute `wmo()` auf der Startseite).
- Die Anzieh-Regeln wandern aus `kinder/index.html` als `FZ.wetter.anziehen(datum)` in das Modul. Sie bleiben gleich (gefühlte Temperatur 7 bis 17 Uhr, Regen, Schnee) und lassen sich dann für sich allein prüfen.

### Schnittstelle

```js
FZ.wetter.on(fn);                                   // fn(daten) bei neuen Daten
FZ.wetter.baustein(el, { groesse: "gross", teile: ["stunden", "warnung", "woche"] });
FZ.wetter.anziehen("2026-11-10");                   // → ["Matschhose", "Mütze"]
```

### Neue Einstellungen (Reiter „Einstellungen“)

| Schlüssel | Beispiel | Zweck |
| --- | --- | --- |
| `wetter_ort` | Zuhause | Anzeigename |
| `wetter_lat`, `wetter_lon` | 50.83 / 12.92 | Standort, bisher fest im Code |
| `wetter_minuten` | 15 | Abstand zwischen zwei Abrufen |
| `wetter_teile_wand` | stunden, warnung, woche | Inhalt des großen Bausteins |
| `wetter_teile_handy` | stunden, warnung | Inhalt des mittleren Bausteins |

## 5. Teil C: Kinderseite

- **Eigene Welt** (Wiese, Weltraum, Unterwasser oder bunt) mit eigener, runder Schrift. Klar anders als die Eltern-Seiten.
- **Aufgaben** als große Bildkarten, Abenteuerweg oder Sticker-Album, je nach Wahl. Feste Reihenfolge, sichtbarer Fortschritt, keine Bedienelemente am unteren Rand.
- **Animations-Pool** in `kinder/effekte.js`. Pro abgehakter Aufgabe wird zufällig eine Animation aus der Auswahl gezeigt, nie zweimal hintereinander dieselbe. Kandidaten: Sterne, Seifenblasen, hüpfendes Tier, Regenbogen, Ballons, Blumen, Rakete, Herzen, Stern-Stempel, Zauberstab. Im Leitfaden laufen sie alle schon.
- **Endbonus**, wenn alle Aufgaben einer Tageszeit geschafft sind: Konfetti mit Pokal (wie heute), Feuerwerk, Tier-Parade, Raketenstart zum Mond oder Überraschungs-Sticker. Bei mehreren gewählten wechseln sie sich ab.
- **Töne** über die Web Audio API, im Gerät erzeugt, ohne Audiodateien. Einstellung `kinder_toene` = `an` | `bonus` | `aus`, umschaltbar auf der Eltern-Seite.
- **„Bewegung reduzieren“**: Heute zeigt die App dann gar keine Animation. Künftig gibt es eine ruhige Ersatz-Variante (Stern blendet weich ein, kurzer Ton), damit das Kind trotzdem eine Rückmeldung bekommt.
- **Mehrere Kinder, später**: Spalte `Kind` im Reiter „Kinderaufgaben“ (leer bedeutet für alle) und Einstellung `kinder` mit Name, Farbe und Symbol pro Kind. Die Kinderseite zeigt eine Auswahl erst ab zwei Kindern. Erledigt-Vermerke wandern dann in einen eigenen Reiter „Kinder-Erledigt“ (Datum, Kind, Aufgabe). Bis dahin bleibt alles wie heute.

## 6. Teil D: Haushalt und Essen

Die Struktur folgt der Wahl im Leitfaden. Unabhängig davon gilt:

- **Haushalt**: am Handy schnell abhaken mit „Rückgängig“-Hinweis, Formulare als Sheet von unten. An der Wand nur die heute fälligen Aufgaben, groß und ohne Bearbeiten. Fairness-Anzeige wie gewählt, sonst keine.
- **Essen**: Heute-Ansicht zuerst, Woche Donnerstag bis Mittwoch wie bisher, Gericht tauschen mit einem Tipp. Bewertungen mit Smileys bleiben. Die Einkaufsliste wäre eine neue Funktion mit eigenem Reiter und kommt nur, wenn sie gewählt wird.

## 7. Reihenfolge der Umsetzung

Jede Etappe ist für sich nutzbar und geht einzeln live, erst nach dem gemeinsamen Gespräch.

0. **Sicherheitsnetz**: Demo-Modus (`#demo`) und Bildschirmfotos aller Seiten für Wand (hoch) und Handy.
1. **Design-Grundlage**: `design/` mit Tokens, Basis, Bausteinen und Musterseite. `core.js` setzt die Attribute.
2. **Tagesphasen mit Kita-Zeit**: neues Phasenmodell, Spalte `Tagesart`, Zeitstrahl-Baustein.
3. **Wetter-Baustein**: `wetter.js`, neue Einstellungen.
4. **Startseite und Haushalt**: Hochformat, Tagesmaximum, C/L-Knöpfe an der Wand.
5. **Essen und Bewertung**: Heute-Karte, Morgen-Bewertung zu dritt, Hitliste.
6. **Kinderseite**: Bild-Zeitleiste, Karten im Hochformat, wechselnde Animationen, Endbonus.
7. **Tagesstimmung und Statistik**: Reiter `Stimmung`, Statistik-Bildschirm auf Wand und Handy.
8. **Kalender**: Wochenleiste, Personenfarben, Liste.
9. **Eltern-Seite und Aufräumen**: neue Schalter, altes CSS entfernen, README.

Später: Einkaufsliste, Fotomodus im Ruhezustand, Familien-Jahresrückblick im Dezember, mehrere Kinder, Kinder-Stimmung, Punkte nach Aufwand.

## 8. Offene Entscheidungen (im Leitfaden)

Grundstimmung, Farben nach Tageszeit, Schrift, Startseite Wand, Startseite Handy, Haushalt ordnen, Fairness-Anzeige, Wochenplan, Extras beim Essen, Wetterdaten, Stundenverlauf, Wettersymbole, Welt der Kinderseite, Aufgaben-Darstellung, Animationen, Endbonus, Töne, Bewegung auf Eltern-Seiten.

## Quellen

- Nielsen Norman Group, Kinder und Motorik: https://www.nngroup.com/articles/children-ux-physical-development/
- UX Matters, Design für Kinder: https://www.uxmatters.com/mt/archives/2014/07/design-for-kids-digital-products-for-playing-and-learning.php
- Toca Boca und Rückmeldung: https://kat-reilly.squarespace.com/journal/2017/2/7/a-feedback-lesson-from-toca-boca
- Visuelle Tagespläne für Vorschulkinder: https://www.childcareed.com/a/how-can-visual-schedules-help-preschool-classrooms-run-more-smoothly.html
- Tody (Räume und Zustandsbalken): https://mobilesyrup.com/2019/07/14/tody-cleaning-review/
- Fairness im Haushalt: https://www.mother.ly/uncategorized/6-tips-for-dividing-family-chores-fairly-and-finally-ending-the-resentment/ · https://peerpush.com/p/fairshare
- Essensplanung, UX-Fallstudie: https://uxdesign.cc/ux-case-study-designing-a-better-meal-planning-experience-96a96ef8d3c3 · https://screensdesign.com/showcase/mise-meal-planner
- Große Bildschirme und Lesbarkeit: https://www.klipfolio.com/articles/best-practices-large-screen-wallboard-tv-dashboard
- Wand-Dashboards der Home-Assistant-Community: https://community.home-assistant.io/t/are-we-thinking-about-wall-tablets-the-wrong-way/1019690 · https://community.home-assistant.io/t/famquest-self-hosted-fridge-display-for-kids-routines-not-an-ha-integration-built-with-claude-code/1027051
- Skylight und Hearth im Vergleich: https://wetried.it/compare/skylight-calendar-max-vs-hearth-display/
- Claude Design: https://www.anthropic.com/news/claude-design-anthropic-labs · https://www.macstories.net/stories/hands-on-with-anthropic-labs-claude-design-preview/
- Open-Meteo (DWD-Modelle, 15 Minuten, Luftqualität): https://open-meteo.com/en/docs/dwd-api · https://open-meteo.com/en/docs/air-quality-api
- Bright Sky: https://brightsky.dev/
- Vergleiche 2026: https://familymind.ai/blog/best-family-organization-apps · https://familycockpit.com/ratgeber/familien-apps-im-vergleich · https://wenndannda.com/blog/familienkalender-app-vergleich-2026
- Skylight: https://cybernews.com/reviews/skylight-calendar-review/ · Hearth: https://dakboard.com/c/comparisons/dakboard-vs-hearth/ · Today's Feelings: https://hearth.zendesk.com/hc/en-us/articles/42665254423443-Today-s-Feelings
- Beacon (Hochformat): https://beacon-family-docs.netlify.app/docs/features/dashboard/
- Daylio: https://daylio.net/ · Exist (Wetter und Stimmung): https://exist.io/blog/weather-in-exist/
- Brili: https://www.commonsensemedia.org/app-reviews/brili-routines · Charty: https://www.educationalappstore.com/app/charty
- Mehrfach-Aufgaben: https://lunatask.app/docs/features/habits · https://griply.app/help/features/habits
- Sweepy: https://sweepy.com/ · Family Feasts: https://apps.apple.com/gb/app/family-feasts/id6471382642
