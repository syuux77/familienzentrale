# Familienzentrale

Familien-Dashboard als Web-App für ein Wandtablet (iPad im Flur) und die Handys der Eltern.

| Seite | Pfad |
| --- | --- |
| Start „Heute“ (Uhr, Wetter, Essen, Haushalt, Termine, Bewertung) | `/` |
| Kinderseite (Tagesablauf, Abendessen) | `/kinder/` |
| Haushalt (Aufgaben, Punkte, Statistik) | `/haushalt/` |
| Essen (Wochenplan Do–Mi, Gerichte, Statistik) | `/essen/` |
| Eltern-Seite (Zahnrad; PIN nur am Wand-iPad) | `/eltern/` |

- `core.js`: gemeinsamer Kern – Schlüssel und Gerät, Daten aus der Google-Tabelle über das Apps Script, Leiste unten, Tagesphasen, Kita-/Zuhause-Tag, Verhalten am Wand-iPad.
- Daten: Google-Tabelle „Familienzentrale – Daten“, angebunden über ein Google Apps Script (Web-App).
- Zugriff nur mit dem Familien-Schlüssel. Der Schlüssel steht **nie** in diesem Repository; jedes Gerät bekommt ihn einmalig über einen Einrichtungs-Link (`…/#key=…`, Wand-iPad zusätzlich `&geraet=wand`).
