/* Familienzentrale – Wetter-Baustein
 * Ein Abruf für alle Seiten (Open-Meteo, kostenlos, ohne Schlüssel), dazu amtliche Warnungen
 * des Deutschen Wetterdienstes über Bright Sky. Zwischengespeichert, alle 15 Minuten neu.
 * FZ.wetter.on(fn) · FZ.wetter.icon(art) · FZ.wetter.hintergrund() · FZ.wetter.ansicht()
 * Standort aus den Einstellungen (wetter_lat, wetter_lon), sonst Chemnitz.
 * Radar in der Wetter-Ansicht: RainViewer (frei für private Nutzung) auf OpenStreetMap.
 */
(function () {
  "use strict";
  const FZ = window.FZ;
  const esc = FZ.esc, pad = FZ.pad;
  const LSK = "fz.wetter2";
  const listeners = [];
  let daten = null, laedt = false, ambEl = null;
  try { daten = JSON.parse(localStorage.getItem(LSK) || "null"); } catch (e) { daten = null; }

  const WT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  // Wettercode (WMO) in Art und Text
  function art(code, tag) {
    if (code === 0) return tag ? ["sonne", "sonnig"] : ["mond", "klar"];
    if (code <= 2) return tag ? ["wolkig", "heiter bis wolkig"] : ["mond", "leicht bewölkt"];
    if (code === 3) return ["bedeckt", "bewölkt"];
    if (code === 45 || code === 48) return ["nebel", "Nebel"];
    if (code >= 51 && code <= 57) return ["regen", "Nieselregen"];
    if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return ["regen", code >= 80 ? "Regenschauer" : "Regen"];
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return ["schnee", "Schnee"];
    if (code >= 95) return ["gewitter", "Gewitter"];
    return ["bedeckt", "bewölkt"];
  }
  const CLOUD = "M13 36H35A7 7 0 0 0 35 22A10 10 0 0 0 17 19A8.5 8.5 0 0 0 13 36Z";
  function icon(k) {
    const rays = (cx, cy, r1, r2) => { let s = ""; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; s += '<line x1="' + (cx + Math.cos(a) * r1).toFixed(1) + '" y1="' + (cy + Math.sin(a) * r1).toFixed(1) + '" x2="' + (cx + Math.cos(a) * r2).toFixed(1) + '" y2="' + (cy + Math.sin(a) * r2).toFixed(1) + '"/>'; } return '<g stroke="#F6B72B" stroke-width="3" stroke-linecap="round">' + s + "</g>"; };
    const cloud = (dy, dark) => '<path d="' + CLOUD + '" transform="translate(0 ' + dy + ')" fill="' + (dark ? "#93A1B3" : "#C9D3DF") + '"/>';
    let b;
    if (k === "sonne") b = '<circle cx="24" cy="24" r="8.5" fill="#F6B72B"/>' + rays(24, 24, 13, 17.5);
    else if (k === "mond") b = '<path d="M30 9a15 15 0 1 0 9 26A12 12 0 0 1 30 9z" fill="#8FA3D9"/>';
    else if (k === "wolkig") b = '<circle cx="18" cy="17" r="6.5" fill="#F6B72B"/>' + rays(18, 17, 10, 13.5) + cloud(4);
    else if (k === "regen") b = cloud(-6, true) + '<g stroke="#3B82F6" stroke-width="2.6" stroke-linecap="round"><line x1="18" y1="35" x2="16" y2="41"/><line x1="25" y1="35" x2="23" y2="41"/><line x1="32" y1="35" x2="30" y2="41"/></g>';
    else if (k === "schnee") b = cloud(-6) + '<g fill="#7FB3F5"><circle cx="17" cy="38" r="1.9"/><circle cx="24.5" cy="41" r="1.9"/><circle cx="32" cy="38" r="1.9"/></g>';
    else if (k === "gewitter") b = cloud(-6, true) + '<path d="M26 31l-5 8h5l-3 7 9-10h-5l3-5z" fill="#F6B72B"/>';
    else if (k === "nebel") b = cloud(-6) + '<g stroke="#9AA7B8" stroke-width="2.6" stroke-linecap="round"><line x1="12" y1="36" x2="36" y2="36"/><line x1="15" y1="41" x2="33" y2="41"/></g>';
    else b = cloud(0);
    return '<svg viewBox="0 0 48 48" aria-hidden="true">' + b + "</svg>";
  }

  function ort() {
    const E = FZ.einst();
    const lat = parseFloat(String(E.wetter_lat || "").replace(",", ".")), lon = parseFloat(String(E.wetter_lon || "").replace(",", "."));
    return isFinite(lat) && isFinite(lon) ? [lat, lon] : [50.83, 12.92];
  }
  async function laden() {
    if (laedt) return; laedt = true;
    const [lat, lon] = ort();
    try {
      const u = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
        "&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m,wind_gusts_10m,precipitation" +
        "&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,uv_index" +
        "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max,wind_gusts_10m_max" +
        "&minutely_15=precipitation&forecast_minutely_15=8&forecast_days=7&timezone=Europe%2FBerlin";
      const j = await (await fetch(u, { cache: "no-store" })).json();
      if (!j || !j.current || !j.hourly || !j.daily) throw new Error("Wetterdaten unvollständig");
      let warn = [];
      try {
        const a = await (await fetch("https://api.brightsky.dev/alerts?lat=" + lat + "&lon=" + lon, { cache: "no-store" })).json();
        warn = ((a && a.alerts) || []).map((w) => ({ titel: w.headline_de || w.event_de || "Wetterwarnung", text: w.description_de || "", stufe: w.severity || "", von: w.onset || "", bis: w.expires || "", ereignis: w.event_de || "" }));
      } catch (e) { warn = (daten && daten.warnungen) || []; }
      daten = aufbereiten(j, warn);
      try { localStorage.setItem(LSK, JSON.stringify(daten)); } catch (e) { /* egal */ }
      listeners.forEach((fn) => { try { fn(daten); } catch (e) { console.error(e); } });
      if (ambEl) hintergrund();
    } catch (e) { /* letzte Werte behalten, an der Wand keine Fehlermeldung */ }
    laedt = false;
  }
  function aufbereiten(j, warn) {
    const c = j.current, H = j.hourly, D = j.daily;
    const [k, txt] = art(c.weather_code, c.is_day === 1);
    const jetzt = new Date(), stunde = jetzt.toISOString ? FZ.iso(jetzt) + "T" + pad(jetzt.getHours()) + ":00" : "";
    let i0 = H.time.indexOf(stunde); if (i0 < 0) i0 = 0;
    const stunden = H.time.slice(i0, i0 + 24).map((t, i) => {
      const n = i0 + i, a = art(H.weather_code[n], +t.slice(11, 13) >= 7 && +t.slice(11, 13) < 17);
      return { zeit: t, t: Math.round(H.temperature_2m[n]), gefuehlt: Math.round(H.apparent_temperature[n]), regenP: H.precipitation_probability[n], regenMm: H.precipitation[n], art: a[0], uv: H.uv_index ? H.uv_index[n] : 0 };
    });
    const tage = D.time.map((t, i) => ({ datum: t, art: art(D.weather_code[i], true)[0], max: Math.round(D.temperature_2m_max[i]), min: Math.round(D.temperature_2m_min[i]), regenP: D.precipitation_probability_max[i], auf: (D.sunrise[i] || "").slice(11, 16), unter: (D.sunset[i] || "").slice(11, 16), uvMax: D.uv_index_max ? D.uv_index_max[i] : 0, boeen: D.wind_gusts_10m_max ? Math.round(D.wind_gusts_10m_max[i]) : 0 }));
    const minuten = j.minutely_15 ? j.minutely_15.time.map((t, i) => ({ zeit: t, mm: j.minutely_15.precipitation[i] || 0 })) : [];
    // Regen: ob und ab wann (heute)
    const nass = (s) => s.regenP >= 50 || s.regenMm >= 0.2;
    let regen = "";
    const heute = stunden.filter((s) => s.zeit.slice(0, 10) === tage[0].datum);
    if (c.precipitation > 0.1 || (heute[0] && nass(heute[0]))) { const e = heute.find((s) => !nass(s)); regen = e ? "Regen bis " + +e.zeit.slice(11, 13) + " Uhr" : "Regen den ganzen Tag"; }
    else { const s = heute.find(nass); regen = s ? (k === "schnee" || s.art === "schnee" ? "Schnee" : "Regen") + " ab " + +s.zeit.slice(11, 13) + " Uhr" : "heute trocken"; }
    return { stand: Date.now(), jetzt: { t: Math.round(c.temperature_2m), gefuehlt: Math.round(c.apparent_temperature), art: k, text: txt, tag: c.is_day === 1, wind: Math.round(c.wind_speed_10m), boeen: Math.round(c.wind_gusts_10m) }, stunden, tage, minuten, regen, warnungen: warn };
  }

  /* ---------- Wetter im Hintergrund (Startseite) ---------- */
  function seeded(seed) { return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
  function hintergrund() {
    if (!ambEl) { ambEl = document.createElement("div"); ambEl.className = "fz-amb"; ambEl.setAttribute("aria-hidden", "true"); document.body.prepend(ambEl); }
    if (!daten) return;
    const r = seeded(7), k = daten.jetzt.art;
    const tag = daten.jetzt.tag;
    let h = "";
    if (k === "sonne" && tag) h += '<i class="sun"></i>';
    if (k === "wolkig" || k === "bedeckt" || k === "regen" || k === "schnee" || k === "gewitter") for (let i = 0; i < (k === "bedeckt" ? 4 : 3); i++) h += '<i class="cloud" style="top:' + (2 + r() * 30).toFixed(1) + "%;animation-duration:" + (70 + r() * 50).toFixed(0) + "s;animation-delay:-" + (r() * 100).toFixed(0) + 's"></i>';
    if (k === "schnee") for (let i = 0; i < 46; i++) { const z = (4 + r() * 7).toFixed(1); h += '<i class="snow" style="left:' + (r() * 100).toFixed(1) + "%;width:" + z + "px;height:" + z + "px;--dx:" + (r() * 80 - 40).toFixed(0) + "px;animation-duration:" + (9 + r() * 9).toFixed(1) + "s;animation-delay:-" + (r() * 18).toFixed(1) + 's"></i>'; }
    if (k === "regen" || k === "gewitter") for (let i = 0; i < 60; i++) h += '<i class="rain" style="left:' + (r() * 120).toFixed(1) + "%;animation-duration:" + (0.9 + r() * 0.6).toFixed(2) + "s;animation-delay:-" + (r() * 1.5).toFixed(2) + 's"></i>';
    if (k === "gewitter") h += '<i class="flash"></i>';
    if (k === "nebel") for (let i = 0; i < 4; i++) h += '<i class="fog" style="top:' + (8 + i * 22) + "%;animation-duration:" + (14 + r() * 10).toFixed(0) + "s;animation-delay:-" + (r() * 20).toFixed(0) + 's"></i>';
    if (ambEl.dataset.k !== k + tag) { ambEl.innerHTML = h; ambEl.dataset.k = k + tag; }
  }

  /* ---------- Wetter-Ansicht beim Antippen ---------- */
  const zahl = (t) => (t < 0 ? "−" + Math.abs(t) : String(t));
  function ansicht() {
    if (!daten || document.querySelector(".fz-wx")) return;
    const d = daten, j = d.jetzt, heute = d.tage[0] || {};
    const box = document.createElement("div");
    box.className = "fz-sheet fz-wx"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "Wetter");
    const regen2h = d.minuten.length && d.minuten.some((m) => m.mm > 0)
      ? '<div class="box"><div class="lbl">Die nächsten 2 Stunden</div><div class="r15">' + d.minuten.map((m) => '<i class="' + (m.mm ? "" : "no") + '" style="height:' + (m.mm ? Math.min(100, 25 + m.mm * 120) : 8) + '%" title="' + m.zeit.slice(11, 16) + ": " + m.mm.toFixed(1).replace(".", ",") + ' mm"></i>').join("") + "</div></div>" : "";
    const uv = heute.uvMax >= 3 ? " · UV " + Math.round(heute.uvMax) + (heute.uvMax >= 6 ? " hoch, Sonnenschutz!" : " mittel") : "";
    box.innerHTML = '<div class="in">' +
      '<div class="head"><h2>Wetter</h2><button type="button" class="x" data-wx="zu">Schließen</button></div>' +
      '<div class="now">' + icon(j.art) + "<div><b>" + zahl(j.t) + "°</b> " + esc(j.text) + "<small>" + zahl(heute.max) + "° / " + zahl(heute.min) + "° · gefühlt " + zahl(j.gefuehlt) + "° · " + esc(d.regen) + "</small></div></div>" +
      d.warnungen.map((w) => '<div class="warn">⚠ ' + esc(w.titel) + (w.text ? '<div style="font-weight:500;margin-top:4px;color:var(--fg)">' + esc(w.text) + "</div>" : "") + "</div>").join("") +
      regen2h +
      '<div class="box"><div class="lbl">Die nächsten Stunden</div><div class="hours">' + d.stunden.slice(0, 12).map((s) => "<div><span style=\"font-size:12px;color:var(--muted)\">" + +s.zeit.slice(11, 13) + "</span>" + icon(s.art) + "<span>" + zahl(s.t) + '°</span><span class="r">' + (s.regenP >= 20 ? s.regenP + " %" : "") + "</span></div>").join("") + "</div></div>" +
      '<div class="box"><div class="lbl">Regenradar</div><div class="map" id="fz-map"><div class="msg">Radar lädt …</div></div><div class="mapbar"><button type="button" class="x" data-wx="play" style="padding:6px 12px">▶</button><input type="range" id="fz-mapt" min="0" max="0" value="0" aria-label="Zeitpunkt"><span id="fz-mapz">–</span></div><div class="src">Radar: RainViewer · Karte: © OpenStreetMap-Mitwirkende</div></div>' +
      '<div class="box days"><div class="lbl">Nächste Tage</div>' + d.tage.slice(1, 7).map((t) => "<div><span>" + WT[FZ.parse(t.datum).getDay()] + "</span>" + icon(t.art) + "<span>" + zahl(t.max) + "° / " + zahl(t.min) + '°</span><span style="color:#2a6fcf">' + (t.regenP >= 30 ? t.regenP + " %" : "") + "</span></div>").join("") + "</div>" +
      '<div class="src">Wind ' + j.wind + " km/h, Böen " + j.boeen + " · Sonne " + (heute.auf || "–") + " bis " + (heute.unter || "–") + uv + " · Daten: Open-Meteo, Deutscher Wetterdienst</div></div>";
    let zuTimer = null;
    const zu = () => { clearTimeout(zuTimer); box.remove(); };
    const wach = () => { clearTimeout(zuTimer); if (FZ.wand) zuTimer = setTimeout(zu, 60000); };
    box.addEventListener("click", (ev) => { wach(); if (ev.target === box || ev.target.closest('[data-wx="zu"]')) zu(); });
    box.addEventListener("input", wach);
    document.body.appendChild(box); wach();
    radar(box);
  }
  // Leaflet erst beim Öffnen laden
  function lade(src, css) {
    return new Promise((res, rej) => {
      if (css) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = src; l.onload = res; l.onerror = rej; document.head.appendChild(l); return; }
      const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }
  async function radar(box) {
    const el = box.querySelector("#fz-map");
    try {
      if (!window.L) { await lade("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", true); await lade("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"); }
      const info = await (await fetch("https://api.rainviewer.com/public/weather-maps.json", { cache: "no-store" })).json();
      const frames = (info.radar.past || []).concat(info.radar.nowcast || []);
      if (!frames.length) throw new Error("keine Radarbilder");
      el.innerHTML = "";
      const [lat, lon] = ort();
      const map = window.L.map(el, { zoomControl: false, attributionControl: false, minZoom: 5, maxZoom: 10 }).setView([lat, lon], 7);
      window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 10 }).addTo(map);
      window.L.circleMarker([lat, lon], { radius: 7, color: "#fff", weight: 3, fillColor: "#e2602c", fillOpacity: 1 }).addTo(map);
      // RainViewer hat Radarbilder nur bis Zoomstufe 7. Darüber vergrößert Leaflet die Kacheln,
      // statt Kacheln mit „Zoom Level Not Supported“ zu laden.
      const layers = frames.map((f) => window.L.tileLayer(info.host + f.path + "/256/{z}/{x}/{y}/2/1_1.png", { opacity: 0, zIndex: 5, maxNativeZoom: 7, maxZoom: 10 }));
      layers.forEach((l) => l.addTo(map));
      const slider = box.querySelector("#fz-mapt"), lab = box.querySelector("#fz-mapz");
      const past = (info.radar.past || []).length;
      slider.max = String(frames.length - 1);
      let cur = past - 1, timer = null;
      const show = (i) => { layers.forEach((l, k) => l.setOpacity(k === i ? 0.75 : 0)); cur = i; slider.value = String(i); const t = new Date(frames[i].time * 1000); lab.textContent = pad(t.getHours()) + ":" + pad(t.getMinutes()) + (i >= past ? " Vorschau" : ""); };
      show(cur);
      slider.addEventListener("input", () => show(+slider.value));
      box.addEventListener("click", (ev) => {
        const p = ev.target.closest('[data-wx="play"]'); if (!p) return;
        if (timer) { clearInterval(timer); timer = null; p.textContent = "▶"; return; }
        p.textContent = "❚❚"; timer = setInterval(() => show((cur + 1) % frames.length), 700);
      });
      new MutationObserver(() => { if (!document.body.contains(box) && timer) clearInterval(timer); }).observe(document.body, { childList: true });
    } catch (e) {
      el.innerHTML = '<div class="msg">Das Regenradar ist gerade nicht erreichbar.</div>';
    }
  }

  FZ.wetter = {
    get daten() { return daten; },
    on(fn) { listeners.push(fn); if (daten) fn(daten); },
    icon, art, laden, hintergrund, ansicht, zahl
  };
  laden();
  setInterval(laden, 15 * 60000);
})();
