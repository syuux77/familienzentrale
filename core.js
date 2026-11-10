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
  const DEFAULT_PHASEN = [
    { id: "morgen", name: "Morgen", start: "06:00", ende: "08:30", symbol: "🌅", modus: "hell" },
    { id: "tag", name: "Tagsüber", start: "08:30", ende: "12:00", symbol: "☀️", modus: "hell" },
    { id: "leisezeit", name: "Leisezeit", start: "12:00", ende: "14:30", symbol: "🤫", modus: "leise" },
    { id: "tag", name: "Tagsüber", start: "14:30", ende: "17:00", symbol: "☀️", modus: "hell" },
    { id: "abend", name: "Abend", start: "17:00", ende: "21:00", symbol: "🌙", modus: "abend" },
    { id: "nacht", name: "Nacht", start: "21:00", ende: "06:00", symbol: "✨", modus: "nacht" }
  ];
  FZ.phasen = function () {
    const rows = FZ.reiter("Tagesphasen").filter((r) => r.ID && /^\d{1,2}:\d{2}$/.test(r.Start || "") && /^\d{1,2}:\d{2}$/.test(r.Ende || ""));
    if (!rows.length) return DEFAULT_PHASEN;
    return rows.map((r) => ({ id: r.ID, name: r.Name, start: r.Start.padStart(5, "0"), ende: r.Ende.padStart(5, "0"), symbol: r.Symbol, modus: r.Modus || "hell" }))
      .sort((a, b) => (a.id === "nacht") - (b.id === "nacht") || a.start.localeCompare(b.start));
  };
  const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
  FZ.toMin = toMin;
  FZ.phaseAt = function (min, P) {
    P = P || FZ.phasen();
    for (const p of P) { const a = toMin(p.start), b = toMin(p.ende); if (a < b ? min >= a && min < b : min >= a || min < b) return p; }
    return P[0];
  };

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

  /* ---------- Leiste unten ---------- */
  const IC = {
    start: '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9v11h13V9"/><path d="M10 20v-6h4v6"/>',
    kinder: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.2c.9 1.3 2.1 2 3.5 2s2.6-.7 3.5-2"/><circle cx="9.2" cy="10" r=".6" fill="currentColor"/><circle cx="14.8" cy="10" r=".6" fill="currentColor"/>',
    haushalt: '<rect x="4" y="3.5" width="16" height="17" rx="3"/><path d="m8 9 1.6 1.6L12.5 7.7"/><path d="M14.5 9.5H17"/><path d="m8 15 1.6 1.6 2.9-2.9"/><path d="M14.5 15.5H17"/>',
    essen: '<path d="M7 3.5v7.5"/><path d="M4.5 3.5v4.5a2.5 2.5 0 0 0 5 0V3.5"/><path d="M7 11v9.5"/><path d="M17 20.5V3.5c-2 1-3.5 3.6-3.5 7v2.5H17"/>'
  };
  const NAV = [["start", "Start", ""], ["kinder", "Kinder", "kinder/"], ["haushalt", "Haushalt", "haushalt/"], ["essen", "Essen", "essen/"]];
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
      "#fz-status{font-size:13px;color:var(--muted)}#fz-status.err{color:var(--due,var(--warn,#B4542A));font-weight:600}";
    document.head.appendChild(css);
    const nav = document.createElement("nav");
    nav.className = "fz-nav"; nav.setAttribute("aria-label", "Bereiche");
    nav.innerHTML = '<div class="fz-in">' + NAV.map(([id, label, path]) =>
      '<a href="' + ROOT + path + '"' + (id === active ? ' aria-current="page"' : "") + '><svg viewBox="0 0 24 24" aria-hidden="true">' + IC[id] + "</svg>" + label + "</a>").join("") + "</div>";
    document.body.appendChild(nav);
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
        const min = Math.max(1, parseInt(FZ.einst().neu_laden_minuten, 10) || 3);
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
    ["pointerdown", "keydown", "touchstart"].forEach((t) => document.addEventListener(t, () => { touched = Date.now(); }, { passive: true }));
    // Neuer Tag: Seite neu laden (holt auch neue App-Versionen)
    const startDay = FZ.today();
    setInterval(() => {
      const sek = Math.max(30, parseInt(FZ.einst().sperrzeit_sekunden, 10) || 150);
      const ziel = FZ.ruheSeite();
      if (FZ.page && FZ.page !== ziel && Date.now() - touched > sek * 1000 && !pending) { location.href = FZ.ruheUrl(); return; }
      if (FZ.today() !== startDay && FZ.page === "start" && Date.now() - touched > 60000) location.reload();
    }, 5000);
    void lock;
  }
})();
