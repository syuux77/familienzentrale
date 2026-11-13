// Bildschirmfotos aller Seiten mit Beispieldaten.
// Aufruf: node tools/test/screens.js <ausgabeordner> [filter]
// Startet einen kleinen Server für das Repository, ersetzt Apps Script und Wetterdienste
// durch Beispieldaten und fotografiert jede Seite als Wand-iPad (Hochformat) und Handy.
"use strict";
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const { build, TODAY } = require("./fixture.js");
const ROOT = path.resolve(__dirname, "../..");
const OUT = path.resolve(process.argv[2] || "screens");
const FILTER = process.argv[3] || "";
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json" };
function wetter() {
  const hours = [], t = [], ap = [], pp = [], pr = [], wc = [], uv = [];
  for (let d = 0; d < 2; d++) for (let h = 0; h < 24; h++) { const day = d ? "2026-11-13" : TODAY; hours.push(day + "T" + String(h).padStart(2, "0") + ":00"); const v = 2 + Math.max(0, 7 - Math.abs(h - 14)); t.push(v); ap.push(v - 3); pp.push(h >= 15 && h <= 19 ? 60 : 10); pr.push(h >= 15 && h <= 19 ? 0.6 : 0); wc.push(h >= 15 && h <= 19 ? 61 : 3); uv.push(h > 9 && h < 15 ? 1 : 0); }
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(TODAY + "T12:00:00"); d.setDate(d.getDate() + i); return d.toISOString().slice(0, 10); });
  const m15 = Array.from({ length: 8 }, (_, i) => TODAY + "T" + String(8 + Math.floor(i / 4)).padStart(2, "0") + ":" + String((i % 4) * 15).padStart(2, "0"));
  return { current: { time: TODAY + "T07:45", temperature_2m: 6.2, apparent_temperature: 3.1, weather_code: 3, is_day: 1, wind_speed_10m: 18, wind_gusts_10m: 35, precipitation: 0 },
    hourly: { time: hours, temperature_2m: t, apparent_temperature: ap, precipitation_probability: pp, precipitation: pr, weather_code: wc, uv_index: uv },
    minutely_15: { time: m15, precipitation: [0, 0, 0, 0, 0.1, 0.2, 0.3, 0.4] },
    daily: { time: days, weather_code: [61, 61, 63, 3, 2, 0, 71], temperature_2m_max: [9, 10, 11, 9, 8, 7, 3], temperature_2m_min: [3, 5, 6, 4, 2, -1, -3], precipitation_probability_max: [60, 70, 80, 20, 10, 0, 40], sunrise: days.map((d) => d + "T07:12"), sunset: days.map((d) => d + "T16:22"), uv_index_max: [1, 1, 1, 1, 1, 1, 1], wind_gusts_10m_max: [35, 40, 30, 20, 18, 15, 25] } };
}
function server() {
  return new Promise((res) => {
    const s = http.createServer((req, rsp) => {
      let p = decodeURIComponent(req.url.split("?")[0]);
      if (p.endsWith("/")) p += "index.html";
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f)) { rsp.writeHead(404); return rsp.end("nicht gefunden"); }
      rsp.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" });
      fs.createReadStream(f).pipe(rsp);
    }).listen(0, () => res(s));
  });
}
const CASES = [
  ["start-0742", "/", "07:42"], ["start-1330", "/", "13:30"], ["start-1830", "/", "18:30"], ["start-2230", "/", "22:30"],
  ["kinder-0715", "kinder/", "07:15"], ["kinder-1030", "kinder/", "10:30"], ["kinder-1800", "kinder/", "18:00"],
  ["haushalt", "haushalt/", "11:00"], ["haushalt-statistik", "haushalt/", "11:00", "#tab-statistik"], ["haushalt-form", "haushalt/", "11:00", '[data-act="edit"], .task [data-act="menu"]'],
  ["essen", "essen/", "11:00"], ["essen-gerichte", "essen/", "11:00", "#tab-gerichte"], ["essen-statistik", "essen/", "11:00", "#tab-statistik"], ["essen-form", "essen/", "11:00", "#tab-gerichte", ".gcard"],
  ["start-wetter", "/", "10:00", "#wx"], ["kalender", "kalender/", "11:00"], ["statistik", "statistik/", "11:00"], ["eltern", "eltern/", "11:00"]
];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await server(), port = srv.address().port;
  const fix = build();
  const b = await chromium.launch();
  const errors = [];
  for (const [name, url, time, click1, click2] of CASES) {
    if (FILTER && !name.includes(FILTER)) continue;
    for (const dev of ["wand", "handy"]) {
      const ctx = await b.newContext({ viewport: dev === "wand" ? { width: 820, height: 1180 } : { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
      const page = await ctx.newPage();
      page.on("pageerror", (e) => errors.push(name + "/" + dev + ": " + e.message));
      page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|ERR_/.test(m.text())) errors.push(name + "/" + dev + " console: " + m.text()); });
      await page.clock.install({ time: new Date(TODAY + "T" + time + ":00") });
      await page.route(/script\.google\.com/, (r) => r.request().method() === "POST" ? r.fulfill({ json: { ok: true } }) : r.fulfill({ json: fix }));
      await page.route(/api\.open-meteo\.com/, (r) => r.fulfill({ json: wetter() }));
      await page.route(/api\.brightsky\.dev/, (r) => r.fulfill({ json: { alerts: [{ event_de: "FROST", headline_de: "Amtliche WARNUNG vor FROST", description_de: "Es tritt Frost um −3 °C auf.", severity: "minor", onset: TODAY + "T21:00:00+01:00", expires: "2026-11-13T09:00:00+01:00" }] } }));
      await page.route(/fonts\.(googleapis|gstatic)\.com|unpkg\.com|rainviewer|tile\.openstreetmap/, (r) => r.abort());
      await page.addInitScript((d) => { localStorage.setItem("fz.key", "test"); localStorage.setItem("fz.geraet", d); if (d === "handy") localStorage.setItem("fz.person", "chris"); sessionStorage.setItem("fz.offen", String(Date.now() + 1e9)); }, dev);
      await page.goto("http://localhost:" + port + "/" + url.replace(/^\//, ""));
      await page.waitForTimeout(1500);
      for (const c of [click1, click2]) { if (!c) continue; const el = await page.$(c); if (el) { await el.click(); await page.waitForTimeout(700); } else errors.push(name + "/" + dev + ": nicht gefunden " + c); }
      const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      if (ov > 0) errors.push(name + "/" + dev + ": horizontaler Überlauf " + ov + " px");
      await page.screenshot({ path: path.join(OUT, name + "-" + dev + ".png"), fullPage: dev === "handy" });
      await ctx.close();
    }
  }
  await b.close(); srv.close();
  console.log(errors.length ? "Fehler:\n" + errors.join("\n") : "Keine Fehler.");
})();
