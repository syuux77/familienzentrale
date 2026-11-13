// Beispieldaten für Tests. Erfunden, aber im Aufbau wie die echte Google-Tabelle.
// Stichtag: Donnerstag, 12.11.2026.
"use strict";
const TODAY = "2026-11-12";
function addDays(s, n) { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
function build(opts) {
  opts = opts || {};
  const r = rng(42);
  const Haushalt = [
    ["h001", "Betten beziehen", "chris", "wiederkehrend", "intervall", "", "", "14", addDays(TODAY, 3), "3", "1"],
    ["h002", "Zimmer säubern", "lisa", "wiederkehrend", "wochentage", "mo", "", "", addDays(TODAY, 4), "3", "1"],
    ["h003", "Bad putzen", "lisa", "wiederkehrend", "wochentage", "di", "", "", addDays(TODAY, -2), "3", "1"],
    ["h005", "Wohnung saugen", "lisa", "wiederkehrend", "taeglich", "", "", "", TODAY, "2", "1"],
    ["h006", "Geschirrspüler aus- und einräumen", "offen", "wiederkehrend", "taeglich", "", "", "", TODAY, "1", "2"],
    ["h009", "Abendessen zubereiten", "offen", "wiederkehrend", "taeglich", "", "", "", TODAY, "3", "1"],
    ["h011", "Trude Runde", "offen", "wiederkehrend", "taeglich", "", "", "", TODAY, "2", "3"],
    ["h019", "Müll rausbringen", "offen", "wiederkehrend", "taeglich", "", "", "", TODAY, "1", "2"],
    ["h016", "Schwarze Tonne", "chris", "einmalig", "", "", "", "", addDays(TODAY, 1), "1", "1"]
  ].map((a) => {
    const o = { ID: a[0], Titel: a[1], "Zuständig": a[2], Typ: a[3], "Rhythmus-Art": a[4], Wochentage: a[5], "Tag im Monat": a[6], "Intervall in Tagen": a[7], "Nächste Fälligkeit": a[8], Punkte: a[9], Aktiv: "ja" };
    if (opts.alt) o.Mehrfach = Number(a[10]) > 1 ? "ja" : "nein"; else o["Max pro Tag"] = a[10];
    return o;
  });
  const Erledigt = [];
  let n = 1;
  for (let d = -84; d <= 0; d++) {
    const day = addDays(TODAY, d);
    Haushalt.forEach((h) => {
      const max = Number(h["Max pro Tag"] || (h.Mehrfach === "ja" ? 3 : 1));
      const times = d === 0 ? (h.ID === "h011" ? 2 : h.ID === "h006" ? 1 : 0) : (r() < (max > 1 ? 0.9 : 0.35) ? 1 + Math.floor(r() * max) : 0);
      for (let i = 0; i < times; i++) {
        const von = h["Zuständig"] === "offen" ? (r() < 0.52 ? "chris" : "lisa") : h["Zuständig"];
        Erledigt.push({ ID: "e" + n++, "Aufgaben-ID": h.ID, Titel: h.Titel, "Erledigt von": von, Zeitpunkt: day + "T" + String(7 + i * 5).padStart(2, "0") + ":15:00+01:00", Punkte: h.Punkte, Art: "erledigt" });
      }
    });
  }
  const Gerichte = [
    ["g001", "Nudeln mit Wurst", "🌭", "Fleisch,Nudeln,Wurst", "schnell"],
    ["g002", "Pizza (selbstgemacht)", "🍕", "Fleisch,Pizza & Flammkuchen,Wurst", "aufwendig,Ruby hilft mit"],
    ["g003", "Ofenkäse mit Fladenbrot", "🧀", "Vegetarisch,Ofen & Auflauf,Abendbrot", "schnell"],
    ["g004", "Backfisch, Kartoffeln, Rotkraut", "🐟", "Fisch,Kartoffeln", "normal"],
    ["g007", "Nudeln mit Tomate und Mozzarella", "🍅", "Vegetarisch,Nudeln", "schnell"],
    ["g008", "Kartoffelsuppe mit Bockwurst", "🍲", "Fleisch,Suppe & Eintopf,Kartoffeln,Wurst", "normal,reicht für Reste"],
    ["g010", "Beefsteak, Kartoffelbrei, Speckbohnen", "🥩", "Fleisch,Kartoffeln,Hackfleisch", "aufwendig"],
    ["g013", "Kartoffeln, Ei, Spinat", "🥚", "Vegetarisch,Kartoffeln", "schnell"],
    ["g014", "Bolognese", "🍝", "Fleisch,Nudeln,Hackfleisch", "normal,reicht für Reste"],
    ["g015", "Bratreis (asiatisch)", "🍚", "Vegetarisch,Reis,Pfanne & Wok", "schnell"],
    ["g016", "Essen wird bestellt", "🛵", "Bestellt", ""],
    ["g017", "Hähnchen Alfredo", "🐔", "Fleisch,Nudeln,Geflügel", "normal"]
  ].map((a) => ({ ID: a[0], Name: a[1], Emoji: a[2], "Bild-Link": "", Kategorie: a[3], Merkmale: a[4], "Notiz / Rezept-Link": "", Aktiv: "ja" }));
  const L = (art, names) => names.map((x, i) => ({ Art: art, Name: x, Aktiv: "ja", Reihenfolge: String(i + 1) }));
  const EssenListen = [].concat(
    L("ernaehrung", ["Fleisch", "Fisch", "Vegetarisch"]),
    L("gericht", ["Nudeln", "Kartoffeln", "Reis", "Suppe & Eintopf", "Ofen & Auflauf", "Pizza & Flammkuchen", "Pfanne & Wok", "Abendbrot", "Süßes", "Bestellt"]),
    L("fleischsorte", ["Schwein", "Rind", "Geflügel", "Hackfleisch", "Wurst"]),
    L("zeit", ["schnell", "normal", "aufwendig"]),
    L("merkmal", ["Ruby hilft mit", "reicht für Reste"])
  );
  const Essensplan = [], Bewertungen = [];
  for (let d = -84; d <= 6; d++) {
    const day = addDays(TODAY, d);
    const g = Gerichte[Math.floor(r() * Gerichte.length)];
    if (d === 0) { Essensplan.push({ Datum: day, Status: "gericht", "Gericht-ID": "g008" }); continue; }
    if (d === -1) { Essensplan.push({ Datum: day, Status: "gericht", "Gericht-ID": "g014" }); Bewertungen.push({ Datum: day, "Gericht-ID": "g014", Person: "chris", Wert: "3" }); continue; }
    if (r() < 0.08) { Essensplan.push({ Datum: day, Status: "reste", "Gericht-ID": "" }); continue; }
    Essensplan.push({ Datum: day, Status: "gericht", "Gericht-ID": g.ID });
    if (d < 0) ["chris", "lisa", "ruby"].forEach((p) => { if (r() < 0.85) Bewertungen.push({ Datum: day, "Gericht-ID": g.ID, Person: p, Wert: String(1 + Math.floor(r() * 3) > 1 && r() < 0.6 ? 3 : 1 + Math.floor(r() * 3)) }); });
  }
  const Stimmung = [];
  for (let d = -60; d < 0; d++) ["chris", "lisa"].forEach((p) => { if (r() < 0.8) Stimmung.push({ Datum: addDays(TODAY, d), Person: p, Wert: String(Math.min(5, Math.max(1, Math.round(2.8 + r() * 2.4)))), Notiz: "" }); });
  const Kinderaufgaben = [
    ["k001", "Zähne putzen", "🪥", "morgen", "immer", "2"], ["k002", "Anziehen", "👕", "morgen", "immer", "1"], ["k003", "Frühstücken", "🥣", "morgen", "immer", "3"],
    ["k004", "Kindergarten", "🏫", "tag", "kita", "1"], ["k005", "Spielen", "🧸", "tag", "zuhause", "2"], ["k006", "Buch lesen", "📖", "tag", "zuhause", "3"],
    ["k007", "Ausruhen", "🛋️", "leisezeit", "immer", "1"], ["k009", "Tisch decken", "🍴", "abend", "immer", "3"], ["k011", "Zimmer aufräumen", "📦", "abend", "immer", "1"],
    ["k013", "Kindergarten-Tasche packen", "🎒", "abend", "vor_kita", "5"], ["k014", "Zähne putzen", "🪥", "abend", "immer", "6"], ["k016", "Bett fertig machen", "🛏️", "abend", "immer", "2"]
  ].map((a) => ({ ID: a[0], Text: a[1], Emoji: a[2], Tagesphasen: a[3], Wochentage: "", Wann: a[4], Aktiv: "ja", Reihenfolge: a[5], "Erledigt am": "" }));
  const Einstellungen = [["pin", "0000"], ["sperrzeit_sekunden", "150"], ["neu_laden_minuten", "3"], ["woche_beginnt", "mo"], ["kita_tage", "mo,di,mi,do,fr"], ["zuhause_bis", ""], ["feiertage_sachsen", "ja"], ["essen_woche_beginnt", "do"], ["essen_hinweis", "mi 17:00"], ["essen_bewertung_bis", "17:00"], ["termine_tage", "7"], ["kinder_toene", "aus"]].map((a) => ({ "Schlüssel": a[0], Wert: a[1], Beschreibung: "" }));
  const Personen = [["chris", "Christian", "Elternteil"], ["lisa", "Lisa", "Elternteil"], ["ruby", "Ruby", "Kind"], ["elli", "Elli", "Kind"], ["trude", "Trude", "Haustier"]].map((a) => ({ ID: a[0], Name: a[1], Rolle: a[2], Aktiv: "ja" }));
  const Terminpersonen = [{ Titel: "Oma und Opa zu Besuch", Person: "fam" }];
  const termine = [
    { datum: TODAY, zeit: "16:30", ende: "17:15", titel: "Schwimmkurs Ruby", ort: "Hallenbad" },
    { datum: TODAY, zeit: "19:30", ende: "21:00", titel: "Elternabend Kita (Lisa)", ort: "" },
    { datum: addDays(TODAY, 1), zeit: "10:00", ende: "10:30", titel: "Kinderarzt Elli", ort: "" },
    { datum: addDays(TODAY, 1), zeit: "18:00", ende: "19:30", titel: "Fußball Christian", ort: "" },
    { datum: addDays(TODAY, 2), zeit: "", titel: "Oma und Opa zu Besuch", ort: "" },
    { datum: addDays(TODAY, 4), zeit: "07:30", ende: "08:00", titel: "Zahnarzt Christian", ort: "" },
    { datum: addDays(TODAY, 5), zeit: "20:00", ende: "21:00", titel: "Yoga Lisa", ort: "" },
    { datum: addDays(TODAY, 9), zeit: "15:00", ende: "16:00", titel: "Laternenfest Kita", ort: "Kindergarten" },
    { datum: addDays(TODAY, 12), zeit: "", titel: "Geburtstag Oma", ort: "" },
    { datum: addDays(TODAY, 16), zeit: "09:30", ende: "10:00", titel: "U-Untersuchung Elli", ort: "Kinderarztpraxis" },
    { datum: addDays(TODAY, 19), zeit: "19:00", ende: "22:00", titel: "Weihnachtsfeier Christian", ort: "" },
    { datum: addDays(TODAY, 24), zeit: "10:00", ende: "11:00", titel: "Friseur Lisa", ort: "" },
    { datum: addDays(TODAY, 31), zeit: "", titel: "Weihnachtsmarkt", ort: "" },
    { datum: addDays(TODAY, 38), zeit: "16:00", ende: "17:00", titel: "Ruby Turnen Probetraining", ort: "" }
  ];
  const daten = { Personen, Terminpersonen, Haushalt, Erledigt, Gerichte, "Essen-Listen": EssenListen, Essensplan, Bewertungen, Kinderaufgaben, Einstellungen, Tagesphasen: [] };
  if (!opts.ohneStimmung) daten.Stimmung = Stimmung;
  return { ok: true, daten, termine };
}
module.exports = { build, TODAY };
