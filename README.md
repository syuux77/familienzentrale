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
- Ruhezustand am Wand-iPad: ohne Berührung springt die App morgens (Phase „Morgen“) und abends (ab Beginn der Phase „Abend“ bis 19:00) zur Kinderseite, sonst zur Startseite. Die Abend-Grenze lässt sich in der Tabelle im Reiter Einstellungen mit dem optionalen Schlüssel `kinderseite_abends_bis` (z. B. `18:45`) ändern.
- Startseite im Tablet-Querformat: alles auf einem Bildschirm; lange Listen werden mit „+ n weitere“ gekürzt.
- Haushalt und Essen nutzen dieselben Farben nach Tageszeit wie Start- und Kinderseite (Leisezeit gedimmt, abends und nachts warm-dunkel).
