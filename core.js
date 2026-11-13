/* Familienzentrale – gemeinsamer Kern für alle Seiten
 * Schlüssel und Gerät, Daten aus der Google-Tabelle (Apps Script), Leiste unten,
 * Tagesphasen, Kita-/Zuhause-Tag, Verhalten am Wand-iPad.
 * Der Familien-Schlüssel steht nie im Code. Er kommt per Einrichtungs-Link (#key=…).
 */
(function () {
  "use strict";

  const API = "https://script.google.com/macros/s/AKfycbx6trLZbNKs4m9sMgQKG6xt35S-Xtd9nEKUnd322uPoBOpuT7GgxQEgpcp0jS6aI12LdQ/exec";
  const ROOT = new URL(".", document.currentScript.src).href;
  const LS = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignorieren */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignorieren */ } }
  };

  // Einrichtungs-Link: …/#key=SCHLÜSSEL (Wand-iPad zusätzlich &geraet=wand)
  const hp = new URLSearchParams((location.hash || "").slice(1));
  if (hp.get("key")) LS.set("fz.key", hp.get("key").trim());
  if (hp.get("geraet")) LS.set("fz.geraet", hp.get("geraet").trim());
  if (hp.get("person")) LS.set("fz.person", hp.get("person").trim());

  // Gemeinsames Design und Schrift (Manrope). Nach den Seiten-Styles geladen, damit es gewinnt.
  (function () {
    const v = "7";
    const f = document.createElement("link"); f.rel = "stylesheet";
    f.href = "https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap";
    const c = document.createElement("link"); c.rel = "stylesheet"; c.href = ROOT + "design/fz.css?v=" + v;
    const add = () => { document.head.appendChild(f); document.head.appendChild(c); };
    if (document.head) add(); else document.addEventListener("DOMContentLoaded", add);
  })();

  /* ---------- Hilfen ---------- */
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const list = (s) => String(s || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  const WD = ["so", "mo", "di", "mi", "do", "fr", "sa"];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Zustand ---------- */
  let data = null;
  try { data = JSON.parse(LS.get("fz.data") || "null"); } catch (e) { data = null; }
  const listeners = [];
  let pending = 0, queue = Promise.resolve(), lastSync = data && data.geladen ? new Date(data.geladen) : null, syncErr = "", idleTimer = null, auto = false;

  const FZ = window.FZ = {
    root: ROOT,
    api: API,
    get key() { return LS.get("fz.key") || ""; },
    setKey(k) { if (k) LS.set("fz.key", k.trim()); else LS.del("fz.key"); },
    get geraet() { return LS.get("fz.geraet") || "handy"; },
    get wand() { return FZ.geraet === "wand"; },
    // Wem gehört dieses Handy? chris, lisa oder leer (Wand-iPad und unbekannt)
    get person() { const p = LS.get("fz.person") || ""; return p === "chris" || p === "lisa" ? p : ""; },
    setPerson(p) { if (p) LS.set("fz.person", p); else LS.del("fz.person"); },
    get data() { return data; },
    get daten() { return (data && data.daten) || {}; },
    get termine() { return (data && data.termine) || []; },
    get pending() { return pending; },
    get lastSync() { return lastSync; },
    get syncErr() { return syncErr; },
    pad, iso, parse, addDays, list, esc, WD,
    today: () => iso(new Date()),
    on(fn) { listeners.push(fn); },
    reiter(name) { return (data && data.daten && data.daten[name]) || []; }
  };
  function emit() { listeners.forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } }); }

  /* ---------- Schnittstelle ---------- */
  FZ.fetchAll = async function () {
    const r = await fetch(API + "?aktion=alles&key=" + encodeURIComponent(FZ.key), { cache: "no-store" });
    const j = await r.json();
    if (!j.ok) throw new Error(j.fehler || "Unbekannter Fehler");
    data = { daten: j.daten, termine: j.termine || [], geladen: Date.now() };
    LS.set("fz.data", JSON.stringify(data));
    lastSync = new Date(); syncErr = "";
    return j;
  };
  FZ.post = async function (aktionen) {
    // Body als Text, damit der Browser keine Vorab-Anfrage schickt
    const r = await fetch(API, { method: "POST", body: JSON.stringify({ key: FZ.key, aktionen }) });
    const j = await r.json();
    if (!j.ok) throw new Error(j.fehler || "Unbekannter Fehler");
    if (j.daten && data && data.daten) { Object.assign(data.daten, j.daten); LS.set("fz.data", JSON.stringify(data)); }
    return j;
  };

  function busy() {
    if (pending) return true;
    const ov = document.getElementById("overlay"), to = document.getElementById("toast");
    return (ov && !ov.hidden) || (to && !to.hidden) || FZ.hold === true;
  }
  FZ.refresh = async function (force) {
    if (!FZ.key) return;
    if (!force && busy()) { clearTimeout(idleTimer); idleTimer = setTimeout(() => FZ.refresh(false), 15000); return; }
    try {
      await FZ.fetchAll();
      if (!pending) emit();
    } catch (err) {
      syncErr = err.message || "Tabelle nicht erreichbar";
      if (!data) emit();
    }
    FZ.status();
  };
  // Änderungen der Reihe nach schreiben. build() wird erst beim Senden aufgerufen.
  FZ.send = function (build, after, onError) {
    pending++; FZ.status();
    queue = queue.then(() => FZ.post(typeof build === "function" ? build() : build)).then((j) => {
      if (after) after(j);
      lastSync = new Date(); syncErr = "";
    }).catch((err) => {
      syncErr = err.message || "Fehler beim Speichern";
      if (onError) onError(syncErr);
      else if (FZ.toast) FZ.toast("Nicht gespeichert: " + syncErr + ". Der Stand wird neu geladen.");
      setTimeout(() => FZ.refresh(true), 1500);
    }).finally(() => {
      pending--; FZ.status();
      if (!pending) { clearTimeout(idleTimer); idleTimer = setTimeout(() => FZ.refresh(false), 20000); }
    });
    return queue;
  };
  FZ.einst = function () {
    const o = {};
    FZ.reiter("Einstellungen").forEach((r) => { o[r["Schlüssel"]] = r.Wert; });
    return o;
  };
  FZ.toene = () => String(FZ.einst().kinder_toene || "aus").trim().toLowerCase();
  FZ.setEinst = function (k, v) {
    const row = (FZ.daten.Einstellungen || []).find((r) => r["Schlüssel"] === k);
    if (row) row.Wert = v;
  };

  /* ---------- Statuszeile (optional pro Seite: Element #fz-status) ---------- */
  const hhmm = (d) => pad(d.getHours()) + ":" + pad(d.getMinutes());
  FZ.status = function () {
    const el = document.getElementById("fz-status"); if (!el) return;
    el.classList.toggle("busy", pending > 0);
    el.classList.toggle("err", !!syncErr && !pending);
    el.textContent = pending ? "Speichert …" : syncErr ? "Keine Verbindung" + (lastSync ? " · Stand " + hhmm(lastSync) : "") : lastSync ? "Stand " + hhmm(lastSync) : "Verbinde …";
    el.title = syncErr || "";
  };

  /* ---------- Tagesphasen ---------- */
  // Zuhause-Tag: Morgen, Vormittag, Leisezeit, Nachmittag, Abend, Nacht.
  // Kita-Tag: Morgen, Kita (08–15 Uhr), Nachmittag, Abend, Nacht.
  // Reiter „Tagesphasen“ mit Spalte „Tagesart“ (kita, zuhause, beide) überschreibt die Zeiten.
  // Ohne Spalte „Tagesart“ gelten diese Vorgaben (die alte Einteilung mit zweimal „Tagsüber“ wird nicht mehr genutzt).
  const P = (id, name, start, ende, symbol, modus, farbe) => ({ id, name, start, ende, symbol, modus, farbe });
  const PH_ZUHAUSE = [
    P("morgen", "Morgen", "06:00", "08:30", "🌅", "hell", "#C8662A"),
    P("vormittag", "Vormittag", "08:30", "12:00", "☀️", "hell", "#2A6FB0"),
    P("leisezeit", "Leisezeit", "12:00", "14:30", "🤫", "leise", "#6D669C"),
    P("nachmittag", "Nachmittag", "14:30", "17:00", "🛝", "hell", "#B7791F"),
    P("abend", "Abend", "17:00", "21:00", "🌙", "abend", "#B0652A"),
    P("nacht", "Nacht", "21:00", "06:00", "✨", "nacht", "#4A5578")
  ];
  const PH_KITA = [
    P("morgen", "Morgen", "06:00", "08:00", "🌅", "hell", "#C8662A"),
    P("kita", "Kita", "08:00", "15:00", "🎒", "hell", "#2E8B57"),
    P("nachmittag", "Nachmittag", "15:00", "17:00", "🛝", "hell", "#B7791F"),
    P("abend", "Abend", "17:00", "21:00", "🌙", "abend", "#B0652A"),
    P("nacht", "Nacht", "21:00", "06:00", "✨", "nacht", "#4A5578")
  ];
  const FARBE = {}; PH_ZUHAUSE.concat(PH_KITA).forEach((p) => { FARBE[p.id] = p.farbe; });
  // Alte Phasen-IDs der Kinderaufgaben: „tag“ passt auf Vormittag, Nachmittag und Kita.
  FZ.phaseMatch = (liste, id) => liste.includes(id) || (liste.includes("tag") && (id === "vormittag" || id === "nachmittag" || id === "kita"));
  FZ.phasen = function (datum) {
    const kita = FZ.dayInfo(datum || iso(new Date())).kita;
    const rows = FZ.reiter("Tagesphasen").filter((r) => r.ID && r.Tagesart && /^\d{1,2}:\d{2}$/.test(r.Start || "") && /^\d{1,2}:\d{2}$/.test(r.Ende || ""));
    const passend = rows.filter((r) => { const t = String(r.Tagesart).trim().toLowerCase(); return t === "beide" || t === (kita ? "kita" : "zuhause"); });
    if (!passend.length) return kita ? PH_KITA : PH_ZUHAUSE;
    return passend.map((r) => P(r.ID, r.Name, r.Start.padStart(5, "0"), r.Ende.padStart(5, "0"), r.Symbol, r.Modus || "hell", r.Farbe || FARBE[r.ID] || "#5B6470"))
      .sort((a, b) => (a.id === "nacht") - (b.id === "nacht") || a.start.localeCompare(b.start));
  };
  const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
  FZ.toMin = toMin;
  FZ.phaseAt = function (min, Pl) {
    Pl = Pl || FZ.phasen();
    for (const p of Pl) { const a = toMin(p.start), b = toMin(p.ende); if (a < b ? min >= a && min < b : min >= a || min < b) return p; }
    return Pl[Pl.length - 1];
  };
  FZ.nextPhase = function (p, Pl) { Pl = Pl || FZ.phasen(); const tag = Pl.filter((x) => x.id !== "nacht"); const i = tag.findIndex((x) => x.id === p.id); return i >= 0 && i < tag.length - 1 ? tag[i + 1] : Pl.find((x) => x.id === "nacht"); };
  // Zeitstrahl als Baustein: Startseite groß, Handy schmal ("klein")
  FZ.zeitstrahl = function (klein) {
    const now = new Date(), min = now.getHours() * 60 + now.getMinutes();
    const Pl = FZ.phasen(), cur = FZ.phaseAt(min, Pl), tag = Pl.filter((p) => p.id !== "nacht");
    const lo = toMin(tag[0].start) - 60, hi = toMin(tag[tag.length - 1].ende) + 60, W = hi - lo;
    const segs = [{ id: "nacht", start: tag[0].start, a: lo, b: toMin(tag[0].start), farbe: FARBE.nacht, name: "" }]
      .concat(tag.map((p) => ({ id: p.id, a: toMin(p.start), b: toMin(p.ende), farbe: p.farbe, name: p.name })))
      .concat([{ id: "nacht2", a: toMin(tag[tag.length - 1].ende), b: hi, farbe: FARBE.nacht, name: "" }]);
    const isNow = (s) => (s.id === "nacht" ? cur.id === "nacht" && min < s.b : s.id === "nacht2" ? cur.id === "nacht" && min >= s.a : s.id === cur.id);
    const bar = segs.map((s) => '<div class="seg' + (isNow(s) ? " on" : "") + '" style="left:' + ((s.a - lo) / W * 100).toFixed(2) + "%;width:" + ((s.b - s.a) / W * 100).toFixed(2) + "%;--c:" + s.farbe + '"><span>' + esc(s.name) + "</span></div>").join("");
    const x = Math.max(0, Math.min(100, (min - lo) / W * 100));
    const ticks = tag.map((p) => p.start).concat([tag[tag.length - 1].ende]).map((t) => '<span style="left:' + ((toMin(t) - lo) / W * 100).toFixed(2) + '%">' + t + "</span>").join("");
    return '<div class="fz-tl' + (klein ? " klein" : "") + '" aria-label="Tagesphasen, jetzt ' + esc(cur.name) + '"><div class="bar">' + bar + '<i class="now" style="left:' + x.toFixed(2) + '%"></i></div><div class="ticks">' + ticks + "</div></div>";
  };
  FZ.phaseFarbe = (id) => FARBE[id] || "#5B6470";

  // Arbeitsseiten (Haushalt, Essen): Farben wie Start- und Kinderseite nach Tageszeit.
  // Nachts gilt der Abendmodus, damit die Seiten bedienbar bleiben.
  FZ.theme = function () {
    const now = new Date(), ph = FZ.phaseAt(now.getHours() * 60 + now.getMinutes());
    const root = document.documentElement;
    root.dataset.phase = ph.id;
    root.dataset.mode = ph.modus === "nacht" ? "abend" : ph.modus;
    return ph;
  };
  // Ruhezustand am Wand-iPad: morgens und abends (bis kinderseite_abends_bis, sonst 19:00) die Kinderseite, sonst die Startseite.
  FZ.ruheSeite = function () {
    const now = new Date(), min = now.getHours() * 60 + now.getMinutes();
    const ph = FZ.phaseAt(min);
    if (ph.id === "morgen") return "kinder";
    if (ph.id === "abend") {
      const v = String(FZ.einst().kinderseite_abends_bis || "").trim();
      const bis = /^\d{1,2}:\d{2}$/.test(v) ? toMin(v) : 19 * 60;
      const a = toMin(ph.start);
      if (min >= a && min < bis) return "kinder";
    }
    return "start";
  };
  FZ.ruheUrl = () => ROOT + (FZ.ruheSeite() === "kinder" ? "kinder/" : "");
  // Automatischer Seitenwechsel nur, wenn die Zielseite erreichbar ist.
  // Ohne WLAN bliebe sonst an der Wand eine Fehlerseite des Browsers stehen.
  let wechsel = false;
  FZ.geheZu = function (url, neuLaden) {
    if (wechsel) return;
    wechsel = true;
    fetch(url, { cache: "no-store" }).then((r) => {
      if (!r.ok) throw new Error("nicht erreichbar");
      if (neuLaden) location.reload(); else location.href = url;
    }).catch(() => { setTimeout(() => { wechsel = false; }, 20000); });
  };

  /* ---------- Feiertage Sachsen, Kita-Tag ---------- */
  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return iso(new Date(y, month - 1, day));
  }
  const hcache = {};
  FZ.holidays = function (y) {
    if (hcache[y]) return hcache[y];
    const o = easter(y), H = {};
    H[y + "-01-01"] = "Neujahr"; H[addDays(o, -2)] = "Karfreitag"; H[addDays(o, 1)] = "Ostermontag"; H[y + "-05-01"] = "Tag der Arbeit";
    H[addDays(o, 39)] = "Christi Himmelfahrt"; H[addDays(o, 50)] = "Pfingstmontag"; H[y + "-10-03"] = "Tag der Deutschen Einheit";
    H[y + "-10-31"] = "Reformationstag";
    const b = new Date(y, 10, 22); while (b.getDay() !== 3) b.setDate(b.getDate() - 1);
    H[iso(b)] = "Buß- und Bettag"; H[y + "-12-25"] = "1. Weihnachtstag"; H[y + "-12-26"] = "2. Weihnachtstag";
    return (hcache[y] = H);
  };
  FZ.holidayName = function (s) {
    const E = FZ.einst();
    return (E.feiertage_sachsen || "ja") === "ja" ? FZ.holidays(parse(s).getFullYear())[s] || "" : "";
  };
  FZ.dayInfo = function (s, zuhauseBis) {
    const E = FZ.einst();
    const zb = zuhauseBis !== undefined ? zuhauseBis : E.zuhause_bis || "";
    const w = parse(s).getDay();
    const kt = list(E.kita_tage || "mo,di,mi,do,fr");
    if (!kt.includes(WD[w])) return { kita: false, grund: w === 0 || w === 6 ? "Wochenende" : "kein Kita-Tag", fest: true };
    const hol = FZ.holidayName(s);
    if (hol) return { kita: false, grund: hol, fest: true };
    if (zb && s <= zb) return { kita: false, grund: "heute zu Hause", fest: false };
    return { kita: true, grund: "", fest: false };
  };

  // Kurztext für Start- und Kinderseite: „Kita-Tag“, „Zuhause, heute keine Kita“ oder „Zuhause · Wochenende“
  FZ.tagText = function (info) {
    if (info.kita) return "Kita-Tag";
    return info.grund === "heute zu Hause" || info.grund === "kein Kita-Tag" || !info.grund ? "Zuhause, heute keine Kita" : "Zuhause · " + info.grund;
  };

  /* ---------- Essen für heute/morgen (Start- und Kinderseite) ---------- */
  FZ.STATUS = {
    auswaerts: { emoji: "🍽️", label: "Auswärts essen", kid: "Heute essen wir auswärts" },
    eingeladen: { emoji: "🎉", label: "Eingeladen", kid: "Heute sind wir eingeladen" },
    reste: { emoji: "🥡", label: "Reste", kid: "Heute gibt's Reste" }
  };
  FZ.bildUrl = function (link) {
    const s = String(link || "").trim();
    if (!s) return "";
    if (s.indexOf("data:image/") === 0) return s;
    const m = s.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{20,})/);
    if (m) return "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w800";
    return /^https:\/\//.test(s) ? s : "";
  };
  FZ.meal = function (date) {
    const e = FZ.reiter("Essensplan").find((r) => r.Datum === date);
    if (!e) return null;
    if (e.Status === "gericht") {
      const g = FZ.reiter("Gerichte").find((x) => x.ID === e["Gericht-ID"]);
      return { status: "gericht", id: e["Gericht-ID"], name: g ? g.Name : "Gelöschtes Gericht", emoji: (g && g.Emoji) || "🍽️", bild: g ? FZ.bildUrl(g["Bild-Link"]) : "", kategorie: g ? g.Kategorie : "" };
    }
    const st = FZ.STATUS[e.Status];
    return st ? { status: e.Status, name: st.label, kid: st.kid, emoji: st.emoji, bild: "" } : null;
  };

  /* ---------- Haushalt: heute fällige Aufgaben, Tagesmaximum, Erledigen ---------- */
  // Spalte „Max pro Tag“ (leer = 1). Alte Spalte „Mehrfach: ja“ zählt als 3.
  const jaW = (v) => String(v || "").trim().toLowerCase() === "ja";
  FZ.maxProTag = (h) => { const n = parseInt(h["Max pro Tag"], 10); return n > 0 ? n : jaW(h.Mehrfach) ? 3 : 1; };
  const WDC = ["so", "mo", "di", "mi", "do", "fr", "sa"];
  function naechste(h, heute) {
    const art = String(h["Rhythmus-Art"] || "").trim(), base = (h["Nächste Fälligkeit"] || heute) > heute ? h["Nächste Fälligkeit"] : heute;
    if (art === "taeglich") return addDays(base, 1);
    if (art === "wochentage") { const tage = list(h.Wochentage).map((x) => WDC.indexOf(x)).filter((n) => n >= 0); let d = addDays(base, 1); for (let i = 0; i < 8; i++) { if (tage.includes(parse(d).getDay())) return d; d = addDays(d, 1); } return addDays(base, 7); }
    if (art === "monatlich") { const b = parse(base), tag = parseInt(h["Tag im Monat"], 10) || 1, len = new Date(b.getFullYear(), b.getMonth() + 2, 0).getDate(); return iso(new Date(b.getFullYear(), b.getMonth() + 1, Math.min(tag, len))); }
    if (art === "intervall") return addDays(heute, Math.max(1, parseInt(h["Intervall in Tagen"], 10) || 7));
    return addDays(heute, 1);
  }
  FZ.hhHeute = function (date) {
    date = date || iso(new Date());
    const done = FZ.reiter("Erledigt").filter((e) => String(e.Zeitpunkt || "").slice(0, 10) === date && e.Art !== "ausgesetzt");
    const out = [];
    FZ.reiter("Haushalt").forEach((h) => {
      if (!h.ID) return;
      const meine = done.filter((e) => e["Aufgaben-ID"] === h.ID).sort((a, b) => String(a.Zeitpunkt).localeCompare(String(b.Zeitpunkt)));
      const max = FZ.maxProTag(h), n = meine.length;
      const aktiv = jaW(h.Aktiv), faellig = h["Nächste Fälligkeit"] || date;
      const due = aktiv && (max > 1 ? String(h["Rhythmus-Art"] || "") === "taeglich" || faellig <= date : faellig <= date);
      if (!due && !n) return;
      const z = h["Zuständig"] === "chris" || h["Zuständig"] === "lisa" ? h["Zuständig"] : "offen";
      out.push({ id: h.ID, titel: h.Titel || "(ohne Titel)", zust: z, punkte: Number(String(h.Punkte || "0").replace(",", ".")) || 0, max, n, von: meine.map((e) => e["Erledigt von"]), fertig: n >= max || (!due && n > 0), spaet: due && max === 1 && faellig < date && !n ? Math.round((parse(date) - parse(faellig)) / 864e5) : 0 });
    });
    return out.sort((a, b) => a.fertig - b.fertig || b.spaet - a.spaet);
  };
  const stempel = () => { const d = new Date(), off = -d.getTimezoneOffset(), a = Math.abs(off); return iso(d) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":00" + (off >= 0 ? "+" : "-") + pad(Math.floor(a / 60)) + ":" + pad(a % 60); };
  FZ.hhErledigen = function (id, von) {
    const h = FZ.reiter("Haushalt").find((x) => x.ID === id); if (!h) return;
    const heute = iso(new Date()), max = FZ.maxProTag(h);
    const werte = { "Aufgaben-ID": id, "Titel": h.Titel, "Erledigt von": von, "Zeitpunkt": stempel(), "Punkte": String(h.Punkte || "0"), "Art": "erledigt" };
    (FZ.daten.Erledigt || (FZ.daten.Erledigt = [])).push(Object.assign({ ID: "neu" + Date.now() }, werte));
    const ops = [{ art: "anfuegen", reiter: "Erledigt", werte }];
    if (max === 1) { h["Nächste Fälligkeit"] = h.Typ === "einmalig" ? heute : naechste(h, heute); if (h.Typ === "einmalig") h.Aktiv = "nein"; ops.push({ art: "setzen", reiter: "Haushalt", wo: { ID: id }, werte: h.Typ === "einmalig" ? { Aktiv: "nein" } : { "Nächste Fälligkeit": h["Nächste Fälligkeit"] } }); }
    FZ.send(ops);
    emit();
  };

  /* ---------- Termine: Person und Farbe aus dem Titel ---------- */
  // Genau eine Person im Titel: Lisa/Mama → Lisa, Christian/Papa → Christian, Ruby oder Elli → Kinder.
  // Mehrere Namen oder keiner: Familie.
  FZ.PERS_FARBE = { chris: "var(--chris)", lisa: "var(--lisa)", kind: "var(--ruby)", fam: "var(--fam)" };
  FZ.PERS_NAME = { chris: "Christian", lisa: "Lisa", kind: "Kinder", fam: "Familie" };
  FZ.terminPerson = function (t) {
    const s = String(t.titel || "");
    // Jede Person zählt einmal, auch wenn sie mit Spitznamen dasteht (Papa = Christian, Mama = Lisa).
    const n = [["lisa", /\b(lisa|mama)/i], ["chris", /\b(christian|papa)/i], ["kind", /\bruby/i], ["kind", /\belli/i]].filter((x) => x[1].test(s));
    return n.length === 1 ? n[0][0] : "fam";
  };
  // Einstellungen schreiben (für einfache Schalter)
  function einstSetzen(k, v, beschr) {
    const rows = FZ.daten.Einstellungen || (FZ.daten.Einstellungen = []);
    const i = rows.findIndex((r) => r["Schlüssel"] === k);
    if (i >= 0) rows[i].Wert = v; else rows.push({ "Schlüssel": k, Wert: v, Beschreibung: beschr });
    FZ.send([{ art: "setzen", reiter: "Einstellungen", wo: { "Schlüssel": k }, werte: { Wert: v, Beschreibung: beschr } }]);
  }
  void einstSetzen;

  /* ---------- Tagesstimmung ---------- */
  // Gespeichert im Reiter „Bewertungen“ (den das Apps Script sicher schreibt) als Zeile mit
  // Datum „stimmung:JJJJ-MM-TT“, Gericht-ID „stimmung“, Person und Wert 1–5. Die Essens-Auswertungen
  // überspringen diese Zeilen (FZ.istStimmung). Ältere Einträge aus „Einstellungen“ und „Stimmung“ werden mitgelesen.
  FZ.istStimmung = (r) => r && (r["Gericht-ID"] === "stimmung" || String(r.Datum || "").indexOf("stimmung:") === 0);
  FZ.stimmungListe = function () {
    const out = {};
    FZ.reiter("Einstellungen").forEach((r) => { const m = /^stimmung:(\d{4}-\d{2}-\d{2}):(\w+)$/.exec(r["Schlüssel"] || ""); if (m && Number(r.Wert)) out[m[1] + m[2]] = { Datum: m[1], Person: m[2], Wert: Number(r.Wert) }; });
    FZ.reiter("Stimmung").forEach((r) => { if (r.Datum && r.Person && Number(r.Wert)) out[r.Datum + r.Person] = { Datum: r.Datum, Person: r.Person, Wert: Number(r.Wert) }; });
    FZ.reiter("Bewertungen").forEach((r) => { const m = /^stimmung:(\d{4}-\d{2}-\d{2})$/.exec(r.Datum || ""); if (m && r.Person && Number(r.Wert)) out[m[1] + r.Person] = { Datum: m[1], Person: r.Person, Wert: Number(r.Wert) }; });
    return Object.values(out);
  };
  FZ.stimmung = (date, p) => { const r = FZ.stimmungListe().find((x) => x.Datum === date && x.Person === p); return r ? r.Wert : 0; };
  FZ.stimmungSetzen = function (date, p, v) {
    const rows = FZ.daten.Bewertungen || (FZ.daten.Bewertungen = []), d = "stimmung:" + date;
    const i = rows.findIndex((r) => r.Datum === d && r.Person === p);
    if (FZ.stimmung(date, p) === v) {
      if (i >= 0) rows.splice(i, 1);
      FZ.send([{ art: "loeschen", reiter: "Bewertungen", wo: { Datum: d, Person: p } }]);
    } else {
      if (i >= 0) rows[i].Wert = String(v); else rows.push({ Datum: d, "Gericht-ID": "stimmung", Person: p, Wert: String(v) });
      FZ.send([{ art: "setzen", reiter: "Bewertungen", wo: { Datum: d, Person: p }, werte: { "Gericht-ID": "stimmung", Wert: String(v) } }]);
    }
    emit();
  };
  FZ.MOOD = { 1: "😣", 2: "😕", 3: "😐", 4: "🙂", 5: "😄" };
  FZ.MOOD_TXT = { 1: "mies", 2: "mäh", 3: "okay", 4: "gut", 5: "super" };
  // Fortschrittspunkte: jede Erledigung in der Farbe der Person, die sie erledigt hat
  FZ.punkteHtml = function (von, max) {
    const f = { chris: "var(--chris)", lisa: "var(--lisa)" };
    return '<span class="fz-dots" aria-label="' + von.length + " von " + max + (von.length ? ", erledigt von " + von.map((v) => FZ.NAMEN[v] || v).join(", ") : "") + '">' +
      Array.from({ length: max }, (_, i) => i < von.length ? '<i class="on" style="background:' + (f[von[i]] || "var(--p-offen)") + ";border-color:" + (f[von[i]] || "var(--p-offen)") + '" title="' + (FZ.NAMEN[von[i]] || "") + '"></i>' : "<i></i>").join("") + "<em>" + von.length + "/" + max + "</em></span>";
  };
  FZ.NAMEN = { chris: "Christian", lisa: "Lisa", ruby: "Ruby", elli: "Elli", offen: "offen" };

  /* ---------- Leiste unten ---------- */
  const IC = {
    start: '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9v11h13V9"/><path d="M10 20v-6h4v6"/>',
    kinder: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.2c.9 1.3 2.1 2 3.5 2s2.6-.7 3.5-2"/><circle cx="9.2" cy="10" r=".6" fill="currentColor"/><circle cx="14.8" cy="10" r=".6" fill="currentColor"/>',
    haushalt: '<rect x="4" y="3.5" width="16" height="17" rx="3"/><path d="m8 9 1.6 1.6L12.5 7.7"/><path d="M14.5 9.5H17"/><path d="m8 15 1.6 1.6 2.9-2.9"/><path d="M14.5 15.5H17"/>',
    essen: '<path d="M7 3.5v7.5"/><path d="M4.5 3.5v4.5a2.5 2.5 0 0 0 5 0V3.5"/><path d="M7 11v9.5"/><path d="M17 20.5V3.5c-2 1-3.5 3.6-3.5 7v2.5H17"/>',
    kalender: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    statistik: '<path d="M5 20V11M10 20V5M15 20v-7M20 20V8"/>'
  };
  const NAV = [["start", "Start", ""], ["kinder", "Kinder", "kinder/"], ["haushalt", "Haushalt", "haushalt/"], ["essen", "Essen", "essen/"], ["kalender", "Kalender", "kalender/"], ["statistik", "Statistik", "statistik/"]];
  FZ.page = "";
  FZ.nav = function (active) {
    FZ.page = active;
    const css = document.createElement("style");
    css.textContent =
      ".fz-nav{position:fixed;left:0;right:0;bottom:0;z-index:40;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:8px calc(10px + env(safe-area-inset-bottom,0px));background:var(--bg);border-top:1px solid var(--line);transition:background-color .6s ease}" +
      ".fz-nav .fz-in{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}" +
      ".fz-nav a{display:grid;justify-items:center;align-content:center;gap:4px;min-height:70px;padding:6px 4px;border-radius:18px;color:var(--muted);font:600 16px/1.2 -apple-system,BlinkMacSystemFont,system-ui,'Segoe UI',Roboto,sans-serif;text-decoration:none;-webkit-tap-highlight-color:transparent}" +
      ".fz-nav a svg{width:30px;height:30px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}" +
      ".fz-nav a[aria-current=page]{background:var(--soft,var(--surface-2,rgba(127,127,127,.12)));color:var(--fg)}" +
      ".fz-nav a[aria-current=page] svg{color:var(--accent,var(--fg))}" +
      ":root[data-mode=nacht] .fz-nav{opacity:.45}" +
      "body{padding-bottom:calc(96px + env(safe-area-inset-bottom,0px))}" +
      "@media (max-width:560px){.fz-nav a{min-height:58px;font-size:13px}.fz-nav a svg{width:26px;height:26px}.fz-nav .fz-in{gap:2px}body{padding-bottom:calc(82px + env(safe-area-inset-bottom,0px))}}" +
      ".fz-gate{max-width:520px;margin:48px auto;padding:22px;border-radius:20px;background:var(--surface);display:grid;gap:14px;font:17px/1.45 -apple-system,BlinkMacSystemFont,system-ui,'Segoe UI',Roboto,sans-serif;color:var(--fg)}" +
      ".fz-gate h2{margin:0;font-size:24px}.fz-gate p{margin:0;color:var(--muted)}" +
      ".fz-gate input{min-height:50px;border:1px solid var(--line);border-radius:12px;padding:0 14px;background:var(--bg);color:var(--fg);font-size:17px;width:100%;box-sizing:border-box}" +
      ".fz-gate .row{display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end}" +
      ".fz-gate button{min-height:48px;padding:0 18px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--fg);font-weight:600;font-size:16px}" +
      ".fz-gate button.p{background:var(--ink,var(--fg));color:var(--on-ink,var(--bg));border-color:var(--ink,var(--fg))}" +
      ".fz-pin{position:fixed;inset:0;z-index:39;background:var(--bg);display:grid;place-items:center;padding:calc(16px + env(safe-area-inset-top,0px)) 16px calc(112px + env(safe-area-inset-bottom,0px));font:17px/1.4 -apple-system,BlinkMacSystemFont,system-ui,'Segoe UI',Roboto,sans-serif;color:var(--fg);overflow:auto}" +
      ".fz-pin .in{display:grid;gap:16px;justify-items:center;width:min(330px,100%)}" +
      ".fz-pin h1{margin:0;font-weight:700;font-size:30px;line-height:1.15;text-align:center}.fz-pin p{margin:0;color:var(--muted);font-size:16px;text-align:center}" +
      ".fz-pin .dots{display:flex;gap:18px;height:22px}.fz-pin .dots span{width:18px;height:18px;border-radius:50%;border:2px solid var(--muted)}.fz-pin .dots span.f{background:var(--fg);border-color:var(--fg)}" +
      ".fz-pin .dots.err{animation:fz-shake .35s ease}.fz-pin .dots.err span{border-color:var(--due,var(--warn,#B4542A))}" +
      "@keyframes fz-shake{25%{transform:translateX(-10px)}75%{transform:translateX(10px)}}" +
      ".fz-pin .msg{color:var(--due,var(--warn,#B4542A));font-weight:600;min-height:22px}" +
      ".fz-pin .keys{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;width:100%}" +
      ".fz-pin .keys button{aspect-ratio:1.35;max-width:100%;border-radius:22px;border:1px solid var(--line);background:var(--surface);color:var(--fg);font-weight:600;font-size:28px;line-height:1;font-variant-numeric:tabular-nums;padding:0;cursor:pointer;-webkit-tap-highlight-color:transparent}" +
      ".fz-pin .keys button.ghost{border-color:transparent;background:transparent;font-size:16px;color:var(--muted)}" +
      ".fz-pin .keys button:active{background:var(--soft,var(--surface-2,rgba(127,127,127,.15)))}" +
      "@media (max-height:720px){.fz-pin .in{gap:10px;width:min(280px,100%)}.fz-pin h1{font-size:24px}.fz-pin .keys{gap:8px}}" +
      "#fz-status{font-size:13px;color:var(--muted)}#fz-status.err{color:var(--due,var(--warn,#B4542A));font-weight:600}";
    document.head.appendChild(css);
    const nav = document.createElement("nav");
    nav.className = "fz-nav"; nav.setAttribute("aria-label", "Bereiche");
    nav.innerHTML = '<div class="fz-in">' + NAV.map(([id, label, path]) =>
      '<a href="' + ROOT + path + '"' + (id === active ? ' aria-current="page"' : "") + '><svg viewBox="0 0 24 24" aria-hidden="true">' + IC[id] + "</svg>" + label + "</a>").join("") + "</div>";
    document.body.appendChild(nav);
    if (active !== "kinder") FZ.himmel();
    if (!FZ.wand && !LS.get("fz.person") && FZ.key) setTimeout(FZ.werBistDu, 400);
  };

  /* ---------- Himmel nach Uhrzeit (nur angedeutet) ---------- */
  const SKY = [[300, "#1E2A4A", "#3B4A7A"], [390, "#F0866A", "#F7C4A2"], [480, "#FFD39E", "#FFF0D8"], [600, "#9ECFF5", "#DCEEFC"], [900, "#A7D5F2", "#E3F1FB"], [1050, "#F5B068", "#FBDFBE"], [1140, "#E06E88", "#F3B5A7"], [1230, "#4B3F7A", "#8A79B5"], [1320, "#18213D", "#2C3A63"]];
  const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => "rgb(" + hx(a).map((v, i) => Math.round(v + (hx(b)[i] - v) * t)).join(",") + ")";
  function skyAt(m) {
    if (m <= SKY[0][0]) return [SKY[0][1], SKY[0][2]];
    for (let i = 1; i < SKY.length; i++) if (m <= SKY[i][0]) { const a = SKY[i - 1], b = SKY[i], t = (m - a[0]) / (b[0] - a[0]); return [mix(a[1], b[1], t), mix(a[2], b[2], t)]; }
    const l = SKY[SKY.length - 1]; return [l[1], l[2]];
  }
  const veilAt = (m) => (m < 330 || m > 1290 ? 0.2 : m < 420 ? 0.2 * (420 - m) / 90 : m > 1170 ? 0.2 * (m - 1170) / 120 : 0);
  let skyEl = null, veilEl = null;
  FZ.himmel = function () {
    if (!skyEl) {
      skyEl = document.createElement("div"); skyEl.className = "fz-sky"; skyEl.setAttribute("aria-hidden", "true");
      veilEl = document.createElement("div"); veilEl.className = "fz-veil"; veilEl.setAttribute("aria-hidden", "true");
      document.body.prepend(skyEl); document.body.appendChild(veilEl);
      setInterval(FZ.himmel, 60000);
    }
    const now = new Date(), m = now.getHours() * 60 + now.getMinutes(), c = skyAt(m);
    skyEl.style.background = "linear-gradient(180deg," + c[0] + " 0%," + c[1] + " 42%,rgba(255,255,255,0) 100%)";
    veilEl.style.opacity = veilAt(m).toFixed(3);
  };

  /* ---------- Wer bist du? (einmal pro Handy) ---------- */
  FZ.werBistDu = function (nachher) {
    if (document.querySelector(".fz-sheet.wer")) return;
    const box = document.createElement("div");
    box.className = "fz-sheet wer"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "Wer bist du?");
    box.innerHTML = '<div class="in"><h2>Wer bist du?</h2><p>Dann landen erledigte Aufgaben und deine Tagesstimmung automatisch bei dir. Einmal pro Handy, änderbar auf der Eltern-Seite.</p>' +
      '<div class="pick"><button type="button" data-wer="chris" style="background:var(--chris)">Christian</button><button type="button" data-wer="lisa" style="background:var(--lisa)">Lisa</button></div>' +
      '<button type="button" data-wer="wand" style="min-height:64px;border:0;border-radius:20px;background:var(--surface);color:var(--fg);font:800 18px var(--font);cursor:pointer">Tablet für alle (Wand-iPad)</button>' +
      '<p style="font-size:14px">Beim Tablet für alle wird jede erledigte Aufgabe über die Knöpfe C und L zugeordnet.</p>' +
      '<button type="button" class="x" data-wer="-">Später</button></div>';
    box.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-wer]"); if (!b) return;
      const w = b.dataset.wer;
      if (w === "wand") { LS.set("fz.geraet", "wand"); LS.set("fz.person", "-"); location.reload(); return; }
      if (w === "-") LS.set("fz.person", "-"); else if (w) FZ.setPerson(w);
      box.remove(); emit(); if (nachher) nachher();
    });
    document.body.appendChild(box);
  };

  /* ---------- Eltern-PIN am Wand-iPad (Haushalt, Essen, Eltern-Seite) ---------- */
  // Einmal entsperrt bleiben die drei Seiten offen, bis sperrzeit_sekunden lang niemand eine von ihnen
  // berührt hat oder das iPad in den Ruhezustand springt. Handys fragen nie nach der PIN.
  const SS = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ignorieren */ } },
    del(k) { try { sessionStorage.removeItem(k); } catch (e) { /* ignorieren */ } }
  };
  const GESCHUETZT = ["haushalt", "essen", "eltern"];
  const sperrSek = () => Math.max(30, parseInt(FZ.einst().sperrzeit_sekunden, 10) || 150);
  FZ.entsperrt = () => !FZ.wand || Date.now() - (Number(SS.get("fz.offen")) || 0) < sperrSek() * 1000;
  FZ.entsperren = () => SS.set("fz.offen", String(Date.now()));
  FZ.sperren = () => SS.del("fz.offen");
  // PIN-Abfrage über der Seite (Haushalt, Essen). Die Leiste unten bleibt bedienbar.
  FZ.schutz = function (titel) {
    if (!FZ.wand) return;
    let box = null, eingabe = "", fehler = false;
    const app = () => document.querySelector(".app");
    const zeichne = () => {
      const dots = [0, 1, 2, 3].map((i) => '<span class="' + (i < eingabe.length ? "f" : "") + '"></span>').join("");
      const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "zurück", "0", "löschen"].map((k) =>
        '<button type="button" data-pin="' + k + '"' + (k.length > 1 ? ' class="ghost"' : "") + ">" + (k === "zurück" ? "Abbrechen" : k === "löschen" ? "Löschen" : k) + "</button>").join("");
      box.innerHTML = '<div class="in"><h1>' + esc(titel) + "</h1><p>Eltern-PIN eingeben</p>" +
        '<div class="dots' + (fehler ? " err" : "") + '" aria-label="' + eingabe.length + ' von 4 Ziffern">' + dots + "</div>" +
        '<p class="msg" role="alert">' + (fehler ? "Falsche PIN, bitte noch einmal." : "") + "</p>" +
        '<div class="keys">' + keys + "</div></div>";
    };
    const auf = () => { if (!box) return; box.remove(); box = null; const a = app(); if (a) a.inert = false; document.documentElement.style.overflow = ""; };
    const zu = () => {
      if (box) return;
      box = document.createElement("div");
      box.className = "fz-pin"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "Eltern-PIN");
      eingabe = ""; fehler = false;
      box.addEventListener("click", (ev) => {
        const b = ev.target.closest("[data-pin]"); if (!b) return;
        const k = b.dataset.pin;
        if (k === "zurück") { location.href = ROOT; return; }
        if (k === "löschen") { eingabe = eingabe.slice(0, -1); fehler = false; return zeichne(); }
        if (eingabe.length >= 4) return;
        eingabe += k; fehler = false;
        if (eingabe.length === 4) {
          if (eingabe === String(FZ.einst().pin || "0000")) { FZ.entsperren(); return auf(); }
          fehler = true; eingabe = "";
        }
        zeichne();
      });
      document.body.appendChild(box);
      const a = app(); if (a) a.inert = true;
      document.documentElement.style.overflow = "hidden";
      window.scrollTo(0, 0);
      zeichne();
    };
    const pruefe = () => { if (FZ.entsperrt() || !FZ.key) auf(); else zu(); };
    pruefe();
    setInterval(pruefe, 2000);
  };

  /* ---------- Einrichtung / keine Verbindung ---------- */
  // Liefert true, wenn die Seite (noch) nichts anzeigen kann; zeigt dann einen Hinweis in el.
  FZ.gate = function (el) {
    if (!FZ.key) {
      el.innerHTML = '<section class="fz-gate"><h2>Gerät einrichten</h2><p>Öffne am besten den Einrichtungs-Link. Oder trage den Familien-Schlüssel hier ein.</p>' +
        '<label for="fz-key">Familien-Schlüssel</label><input id="fz-key" type="text" autocomplete="off" autocapitalize="off" spellcheck="false">' +
        '<div class="row"><button type="button" class="p" id="fz-key-save">Speichern</button></div></section>';
      el.querySelector("#fz-key-save").onclick = () => { const v = el.querySelector("#fz-key").value.trim(); if (v) { FZ.setKey(v); location.reload(); } };
      return true;
    }
    if (!data) {
      el.innerHTML = syncErr
        ? '<section class="fz-gate"><h2>Keine Verbindung zur Tabelle</h2><p>' + esc(syncErr) + '</p><div class="row"><button type="button" id="fz-reset">Schlüssel neu eingeben</button><button type="button" class="p" id="fz-retry">Noch einmal versuchen</button></div></section>'
        : '<p style="text-align:center;color:var(--muted);padding:60px 0">Lade Daten aus der Google-Tabelle …</p>';
      const r = el.querySelector("#fz-retry"); if (r) r.onclick = () => { syncErr = ""; FZ.gate(el); FZ.refresh(true); };
      const k = el.querySelector("#fz-reset"); if (k) k.onclick = () => { FZ.setKey(""); location.reload(); };
      return true;
    }
    return false;
  };

  /* ---------- Start: regelmäßig neu laden ---------- */
  // auto=true: dieser Kern lädt die Daten selbst (Start, Kinder, Essen, Eltern). Haushalt hat eine eigene Schleife.
  FZ.start = function (opts) {
    auto = !(opts && opts.auto === false);
    if (auto) {
      FZ.refresh(true);
      let last = Date.now();
      setInterval(() => {
        const min = Math.max(1, parseInt(FZ.einst().neu_laden_minuten, 10) || 1);
        if (Date.now() - last >= min * 60000) { last = Date.now(); FZ.refresh(false); }
      }, 30000);
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") FZ.refresh(false); });
    }
    wandSetup();
  };

  /* ---------- Wand-iPad ---------- */
  function wandSetup() {
    if (!FZ.wand) return;
    // Bildschirm wach halten
    let lock = null;
    const wake = () => { try { if (navigator.wakeLock && document.visibilityState === "visible") navigator.wakeLock.request("screen").then((l) => { lock = l; }).catch(() => {}); } catch (e) { /* ignorieren */ } };
    wake(); document.addEventListener("visibilitychange", wake);
    // Ohne Berührung zurück zur Ruheseite: morgens und abends die Kinderseite, sonst die Startseite
    let touched = Date.now();
    ["pointerdown", "keydown", "touchstart"].forEach((t) => document.addEventListener(t, () => {
      touched = Date.now();
      if (GESCHUETZT.includes(FZ.page) && FZ.entsperrt()) FZ.entsperren();
    }, { passive: true }));
    // Neuer Tag: Seite neu laden (holt auch neue App-Versionen)
    const startDay = FZ.today();
    setInterval(() => {
      const sek = Math.max(30, parseInt(FZ.einst().sperrzeit_sekunden, 10) || 150);
      const ziel = FZ.ruheSeite();
      if (FZ.page && FZ.page !== ziel && Date.now() - touched > sek * 1000 && !pending) { FZ.sperren(); FZ.geheZu(FZ.ruheUrl()); return; }
      if (FZ.today() !== startDay && FZ.page === "start" && Date.now() - touched > 60000) FZ.geheZu(location.pathname, true);
    }, 5000);
    void lock;
  }
})();
