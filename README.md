# Familienzentrale

Familien-Dashboard als Web-App für ein Wandtablet (iPad im Flur) und die Handys der Eltern.

| Seite | Pfad |
| --- | --- |
| Start „Heute“ (Uhr, Wetter, Essen, Haushalt, Termine, Bewertung) | `/` |
| Kinderseite (Tagesablauf, Abendessen) | `/kinder/` |
| Haushalt (Aufgaben, Punkte, Statistik) | `/haushalt/` |
| Essen (Wochenplan Do–Mi, Gerichte, Statistik) | `/essen/` |
| Kalender (nur Anzeige, Termine aus dem Google Kalender) | `/kalender/` |
| Statistik (Haushalt, Essen, Tagesstimmung) | `/statistik/` |
| Eltern-Seite (Zahnrad; PIN nur am Wand-iPad) | `/eltern/` |

- `design/fz.css`: gemeinsames Design (Look „Kräftig“, Schrift Manrope), Himmel nach Uhrzeit, Wetter-Hintergrund, Zeitstrahl.
- `wetter.js`: Wetter-Baustein (Open-Meteo, DWD-Warnungen über Bright Sky, Wetter-Ansicht mit Regenradar von RainViewer).
- `kinder/effekte.js`: wechselnde Animationen beim Abhaken und Endbonus auf der Kinderseite.
- Tagesphasen: Zuhause-Tag mit Morgen, Vormittag, Leisezeit, Nachmittag, Abend, Nacht; Kita-Tag mit Morgen, Kita (08–15 Uhr), Nachmittag, Abend, Nacht.
- Haushalt: „Max pro Tag“ je Aufgabe; wiederholbare Aufgaben verschwinden, sobald das Tagesmaximum erreicht ist.
- Handys fragen einmal „Wer bist du?“ (Christian oder Lisa) und merken sich das (`fz.person`).
- Umstellung der Tabelle für Version 2: `docs/umstellung.md`. Tests mit Beispieldaten: `node tools/test/screens.js <ordner>`.
- `core.js`: gemeinsamer Kern – Schlüssel und Gerät, Daten aus der Google-Tabelle über das Apps Script, Leiste unten, Tagesphasen, Kita-/Zuhause-Tag, Verhalten am Wand-iPad.
- Daten: Google-Tabelle „Familienzentrale – Daten“, angebunden über ein Google Apps Script (Web-App).
- Zugriff nur mit dem Familien-Schlüssel. Der Schlüssel steht **nie** in diesem Repository; jedes Gerät bekommt ihn einmalig über einen Einrichtungs-Link (`…/#key=…`, Wand-iPad zusätzlich `&geraet=wand`).
- Ruhezustand am Wand-iPad: ohne Berührung springt die App morgens (Phase „Morgen“) und abends (ab Beginn der Phase „Abend“ bis 19:00) zur Kinderseite, sonst zur Startseite. Die Abend-Grenze lässt sich in der Tabelle im Reiter Einstellungen mit dem optionalen Schlüssel `kinderseite_abends_bis` (z. B. `18:45`) ändern.
- Startseite am Wand-iPad im Hochformat: alles auf einem Bildschirm; die Haushaltsliste wird mit „+ n weitere“ gekürzt.
- Die Farbwelt bleibt den ganzen Tag gleich. Die Tageszeit zeigt nur ein leichter Himmel oben (Sonnenaufgang rötlich, tagsüber blau, nachts dunkel) und nachts ein Schleier.
- Kinderseite: Aufgaben zuerst, dahinter Infokarten (morgens „Heute anziehen“ nach Wetter, immer das Abendessen). Ein Stern pro Aufgabe zeigt den Fortschritt; beim Abhaken kommt jedes Mal eine andere Animation, am Ende ein wechselnder Endbonus (Töne nur mit `kinder_toene`). Die Anzieh-Regeln (gefühlte Temperatur 7–17 Uhr, Regen, Schnee) stehen in `kinder/index.html` in der Funktion `anziehen`.
- Geplante Überarbeitung (gemeinsames Design, Wetter-Baustein, Kinderseite): `docs/plan-design-und-wetter.md`.
- Eltern-PIN am Wand-iPad: Haushalt, Essen und die Eltern-Seite fragen nach der PIN (`pin` in den Einstellungen). Einmal entsperrt bleiben alle drei offen, bis `sperrzeit_sekunden` lang keine dieser Seiten berührt wurde oder das iPad in den Ruhezustand springt. Handys fragen nie.
