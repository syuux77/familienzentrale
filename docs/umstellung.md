# Umstellung auf Version 2

Version 2 liegt auf dem Branch `claude/familienzentrale-app-improvements-hrv6u2`. Live geht sie, wenn dieser Branch in `main` übernommen wird. Gleichzeitig wird die Google-Tabelle angepasst. Alle bisherigen Einträge bleiben erhalten.

## Was in der Tabelle passiert

| Reiter | Änderung | Wirkung auf die alte App |
| --- | --- | --- |
| Haushalt | Neue Spalte **Max pro Tag**. Werte: Geschirrspüler aus- und einräumen 2, Trude Runde 3, Müll rausbringen 2, alle anderen 1. Spalte „Mehrfach“ bleibt vorerst stehen. | keine |
| Stimmung (neu) | Spalten **Datum, Person, Wert, Notiz**. Wert 1 bis 5. | keine |
| Einstellungen | Neue Zeilen **kinder_toene** = aus, **wetter_lat** = 50.83, **wetter_lon** = 12.92 | keine |
| Gerichte | Spalte **Kategorie**: Ernährung, Gerichtart, optional Fleischsorte, mit Komma getrennt. Spalte **Merkmale**: genau eine Zeitstufe, dazu optional „Ruby hilft mit“ und „reicht für Reste“. Werte siehe unten. | Die alte App würde mehrere Kategorien als eine lesen. Deshalb erst beim Livegang. |
| Essen-Listen | Spalte **Art** mit den Gruppen ernaehrung, gericht, fleischsorte, zeit, merkmal. „divers“ wird zu „Bestellt“, „moderat“ und „vegetarisch“ als Merkmal entfallen. | wie oben, erst beim Livegang |
| Info | Regeln 9 und 11 auf die neuen Gruppen und „Max pro Tag“ angepasst, Regel für „Stimmung“ ergänzt. | keine |
| Tagesphasen | Bleibt, wie es ist. Ohne Spalte „Tagesart“ nutzt die App die neue Einteilung (Zuhause-Tag mit Vormittag, Leisezeit, Nachmittag; Kita-Tag mit Kita 08:00–15:00). Wer die Zeiten ändern will, ergänzt die Spalte „Tagesart“ (kita, zuhause, beide). | keine |

Die ersten drei Zeilen sind rein ergänzend und können schon vorher eingetragen werden.

## Gerichte

| ID | Gericht | Kategorie | Merkmale |
| --- | --- | --- | --- |
| g001 | Nudeln mit Wurst | Fleisch,Nudeln,Wurst | schnell |
| g002 | Pizza (selbstgemacht) | Fleisch,Pizza & Flammkuchen,Wurst | aufwendig,Ruby hilft mit |
| g003 | Ofenkäse mit Fladenbrot | Vegetarisch,Ofen & Auflauf,Abendbrot | schnell |
| g004 | Backfisch, Kartoffeln, Rotkraut | Fisch,Kartoffeln | normal |
| g005 | Karlsbader Schnitte | Fleisch,Ofen & Auflauf,Abendbrot,Schwein | schnell |
| g006 | Brotzeit | Fleisch,Abendbrot,Wurst | schnell |
| g007 | Nudeln mit Tomate und Mozzarella | Vegetarisch,Nudeln | schnell |
| g008 | Kartoffelsuppe mit Bockwurst | Fleisch,Suppe & Eintopf,Kartoffeln,Wurst | normal,reicht für Reste |
| g009 | Nudeln mit Chorizo | Fleisch,Nudeln,Wurst | schnell |
| g010 | Beefsteak, Kartoffelbrei, Speckbohnen | Fleisch,Kartoffeln,Hackfleisch | aufwendig |
| g011 | Spätzle-Schinken-Pfanne | Fleisch,Nudeln,Pfanne & Wok,Schwein | schnell |
| g012 | Wurstgulasch mit Reis | Fleisch,Reis,Suppe & Eintopf,Wurst | normal,reicht für Reste |
| g013 | Kartoffeln, Ei, Spinat | Vegetarisch,Kartoffeln | schnell |
| g014 | Bolognese | Fleisch,Nudeln,Hackfleisch | normal,reicht für Reste |
| g015 | Bratreis (asiatisch) | Vegetarisch,Reis,Pfanne & Wok | schnell |
| g016 | Essen wird bestellt | Bestellt | |
| g017 | Hähnchen Alfredo | Fleisch,Nudeln,Geflügel | normal |
| g018 | Bayrische Brotzeit | Fleisch,Abendbrot,Wurst | schnell |

## Essen-Listen

| Art | Einträge in dieser Reihenfolge |
| --- | --- |
| ernaehrung | Fleisch, Fisch, Vegetarisch |
| gericht | Nudeln, Kartoffeln, Reis, Suppe & Eintopf, Ofen & Auflauf, Pizza & Flammkuchen, Pfanne & Wok, Abendbrot, Süßes, Bestellt |
| fleischsorte | Schwein, Rind, Geflügel, Hackfleisch, Wurst |
| zeit | schnell, normal, aufwendig |
| merkmal | Ruby hilft mit, reicht für Reste |

## Nach dem Livegang prüfen

1. Startseite am Wand-iPad: Uhr, Wetter, Zeitstrahl, Haushalt mit C/L.
2. Handys: Beim ersten Öffnen fragt jedes Handy „Wer bist du?“.
3. Eine Gassirunde abhaken: Zähler springt auf 1/3, nach der dritten verschwindet die Aufgabe.
4. Abends eine Tagesstimmung eintragen und prüfen, ob sie im Reiter „Stimmung“ ankommt. Falls nicht, muss das Apps Script den neuen Reiter kennen. Das Script liegt nicht im Repository.
5. Ein Gericht bearbeiten: Ernährung, Gerichtart, Zeitaufwand wählen, speichern, in der Tabelle prüfen.

## Testen ohne echte Daten

`node tools/test/screens.js <ordner>` startet einen kleinen Server, ersetzt Apps Script und Wetterdienste durch Beispieldaten aus `tools/test/fixture.js` und fotografiert alle Seiten als Wand-iPad (820 × 1180) und Handy (390 × 844). Am Ende steht, ob Fehler aufgetreten sind.
