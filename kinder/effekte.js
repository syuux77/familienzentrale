/* Familienzentrale – Kinderseite: wechselnde Animationen beim Abhaken und Endbonus
 * Pro abgehakter Aufgabe eine zufällige Animation, nie zweimal hintereinander dieselbe.
 * Sind alle Aufgaben der Tageszeit geschafft, kommt ein wechselnder Endbonus.
 * Töne nur, wenn in den Einstellungen kinder_toene = an (oder bonus: nur beim Endbonus).
 */
(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const st = document.createElement("style");
  st.textContent = '#fx{position:fixed;inset:0;pointer-events:none;z-index:60;overflow:hidden}\n.fxp{position:absolute;width:1em;height:1em;margin:-.5em 0 0 -.5em;line-height:1;text-align:center;font-family:var(--f-emoji);will-change:transform,opacity}\n.fxp.bubble{border-radius:50%;background:radial-gradient(circle at 32% 30%,rgba(255,255,255,.95) 0 8%,rgba(255,255,255,.25) 22%,rgba(140,210,255,.2) 60%,rgba(255,170,235,.38) 86%,rgba(255,255,255,.75) 100%);box-shadow:inset 0 0 .12em rgba(255,255,255,.8),0 0 .12em rgba(80,140,210,.35)}\n.fxp.balloon{width:.82em;height:1em;margin:-.5em 0 0 -.41em;border-radius:50% 50% 47% 53%/58% 58% 42% 42%;background:radial-gradient(circle at 34% 28%,rgba(255,255,255,.75) 0 10%,transparent 28%),var(--c)}\n.fxp.balloon::after{content:"";position:absolute;left:50%;top:100%;width:1.5px;height:1.1em;background:rgba(0,0,0,.35)}\n.fxp.conf{width:.55em;height:1em;margin:-.5em 0 0 -.27em;border-radius:2px;background:var(--c)}\n.fxp.ring{border-radius:50%;border:.06em solid #F6C343;box-shadow:0 0 .1em rgba(246,195,67,.6)}\n.fxp.halo{border-radius:50%;background:radial-gradient(circle,rgba(255,232,130,.95),rgba(255,200,60,.45) 40%,transparent 70%)}\n.rainbow{position:absolute;pointer-events:none;border-radius:999px 999px 0 0}\n.veil{position:absolute;inset:0}\n.fxc{position:absolute;inset:0;width:100%;height:100%}';
  document.head.appendChild(st);
  if (!$("#fx")) { const d = document.createElement("div"); d.id = "fx"; d.setAttribute("aria-hidden", "true"); document.body.appendChild(d); }
/* ---------- Töne ---------- */
let SOUND = false;
const snd = (() => {
  let ac = null;
  function A() {
    if (!SOUND) return null;
    try {
      if (!ac) { const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return null; ac = new Ctx(); }
      if (ac.state === "suspended") ac.resume();
    } catch (e) { return null; }
    return ac;
  }
  function tone(f, t, d, type, v, f2) {
    const a = A(); if (!a) return;
    const T = a.currentTime + t, o = a.createOscillator(), g = a.createGain();
    o.type = type || "sine"; o.frequency.setValueAtTime(f, T);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, T + d);
    g.gain.setValueAtTime(0.0001, T); g.gain.exponentialRampToValueAtTime(v || 0.15, T + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, T + d);
    o.connect(g); g.connect(a.destination); o.start(T); o.stop(T + d + 0.05);
  }
  function noise(t, d, v, f1, f2, q) {
    const a = A(); if (!a) return;
    const T = a.currentTime + t, len = Math.max(1, Math.floor(a.sampleRate * d)), b = a.createBuffer(1, len, a.sampleRate), ch = b.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    const s = a.createBufferSource(); s.buffer = b;
    const fl = a.createBiquadFilter(); fl.type = "bandpass"; fl.Q.value = q || 1; fl.frequency.setValueAtTime(f1, T); fl.frequency.exponentialRampToValueAtTime(f2, T + d);
    const g = a.createGain(); g.gain.setValueAtTime(0.0001, T); g.gain.exponentialRampToValueAtTime(v, T + Math.min(0.05, d / 3)); g.gain.exponentialRampToValueAtTime(0.0001, T + d);
    s.connect(fl); fl.connect(g); g.connect(a.destination); s.start(T); s.stop(T + d + 0.05);
  }
  const N = { G4: 392, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5 };
  const PENTA = [N.C5, N.D5, N.E5, N.G5, N.A5, N.C6, N.E6];
  return {
    pling: (t) => { t = t || 0; [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(f, t + i * 0.07, 0.35, "triangle", 0.13)); },
    pop: (t) => tone(rnd(520, 900), t || 0, 0.09, "sine", 0.2, 170),
    boing: (t) => tone(210, t || 0, 0.3, "sine", 0.2, 640),
    gliss: (t) => { t = t || 0; tone(392, t, 0.75, "sine", 0.12, 1175); tone(523, t + 0.1, 0.7, "triangle", 0.06, 1568); },
    fiep: (t) => { t = t || 0; for (let i = 0; i < 3; i++) tone(700 + i * 150, t + i * 0.13, 0.2, "sine", 0.1, 1200 + i * 150); },
    note: (t, i) => tone(PENTA[i % PENTA.length], t, 0.45, "triangle", 0.13),
    whoosh: (t, d) => noise(t || 0, d || 1, 0.18, 300, 3500, 0.8),
    dingdong: (t) => { t = t || 0; tone(N.E5, t, 0.5, "sine", 0.15); tone(N.C5, t + 0.24, 0.6, "sine", 0.15); },
    thump: (t) => tone(140, t || 0, 0.25, "sine", 0.35, 55),
    chime: (t) => { t = t || 0; for (let i = 0; i < 7; i++) tone(pick([N.C6, N.E6, N.G5, N.A5, 1568]), t + i * 0.08, 0.5, "sine", 0.08); },
    fanfare: (t) => { t = t || 0; [[N.C5, 0, 0.16], [N.E5, 0.16, 0.16], [N.G5, 0.32, 0.16], [N.C6, 0.48, 0.8]].forEach((x) => { tone(x[0], t + x[1], x[2] + 0.12, "triangle", 0.16); tone(x[0] / 2, t + x[1], x[2] + 0.12, "sine", 0.08); }); },
    launch: (t) => noise(t || 0, 0.5, 0.08, 800, 4000, 2),
    boom: (t) => { t = t || 0; noise(t, 0.6, 0.22, 1200, 200, 0.7); tone(90, t, 0.4, "sine", 0.22, 40); },
    melody: (t) => { t = t || 0; const m = [N.C5, N.E5, N.G5, N.E5, N.C5, N.G4, N.C5, N.E5, N.G5, N.C6]; m.forEach((f, i) => { tone(f, t + i * 0.3, 0.24, "square", 0.045); if (i % 2 === 0) tone(f / 2, t + i * 0.3, 0.26, "triangle", 0.08); }); },
    countdown: (t) => { t = t || 0; [0, 0.5, 1].forEach((s) => tone(880, t + s, 0.12, "square", 0.06)); tone(1320, t + 1.5, 0.3, "square", 0.06); },
    ding: (t) => { t = t || 0; tone(N.C6, t, 0.8, "sine", 0.14); tone(N.G5, t, 0.8, "sine", 0.08); },
    drumroll: (t, d) => { t = t || 0; d = d || 2; for (let s = 0; s < d; s += 0.07) noise(t + s, 0.05, 0.05 + s / d * 0.08, 1500, 1200, 1); },
    tada: (t) => { t = t || 0; [N.C5, N.E5, N.G5, N.C6].forEach((f) => tone(f, t, 1.1, "triangle", 0.1)); tone(N.C6 * 1.5, t + 0.12, 0.9, "sine", 0.06); }
  };
})();

/* ---------- Animationen ---------- */
const fx = $("#fx");
function part(txt, x, y, size, cls) {
  const s = document.createElement("div");
  s.className = "fxp" + (cls ? " " + cls : "");
  if (txt) s.textContent = txt;
  s.style.left = x + "px"; s.style.top = y + "px"; s.style.fontSize = size + "px";
  fx.appendChild(s); return s;
}
function go(el, frames, o) {
  const a = el.animate(frames, Object.assign({ duration: 1000, easing: "cubic-bezier(.2,.7,.3,1)", fill: "both" }, o || {}));
  const done = () => el.remove();
  if (a.finished) a.finished.then(done, done); else a.onfinish = done;
  return a;
}
function veil(color, dur) {
  const v = document.createElement("div"); v.className = "veil"; v.style.background = color; fx.appendChild(v);
  go(v, [{ opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], { duration: dur, easing: "linear" });
}
const ANIM = {
  sterne(o) {
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + rnd(0, 0.4), d = rnd(110, 190), s = part(pick(["⭐", "✨", "🌟", "💛"]), o.x, o.y, rnd(26, 40));
      go(s, [{ transform: "translate(0,0) scale(.3)", opacity: 1 }, { transform: "translate(" + (Math.cos(a) * d).toFixed(0) + "px," + (Math.sin(a) * d).toFixed(0) + "px) scale(1.15) rotate(40deg)", opacity: 1, offset: 0.7 }, { transform: "translate(" + (Math.cos(a) * d * 1.08).toFixed(0) + "px," + (Math.sin(a) * d * 1.08 + 24).toFixed(0) + "px) scale(.9) rotate(70deg)", opacity: 0 }], { duration: 1150 });
    }
    snd.pling();
  },
  blasen(o) {
    for (let i = 0; i < 12; i++) {
      const b = part("", o.x + rnd(-70, 70), o.y + rnd(-20, 40), rnd(26, 64), "bubble");
      const up = rnd(220, 420), sway = rnd(16, 40) * (Math.random() < 0.5 ? -1 : 1), fr = [];
      for (let k = 0; k <= 8; k++) { const t = k / 8; fr.push({ transform: "translate(" + (Math.sin(t * Math.PI * 2) * sway).toFixed(1) + "px," + (-up * t).toFixed(1) + "px) scale(" + (k === 8 ? 1.5 : (0.4 + 0.6 * Math.min(1, t * 4))).toFixed(2) + ")", opacity: k === 0 || k === 8 ? 0 : 1, offset: t }); }
      const del = rnd(0, 450), dur = rnd(1500, 2200);
      go(b, fr, { duration: dur, delay: del, easing: "linear" });
      snd.pop((del + dur * 0.93) / 1000);
    }
  },
  tier(o) {
    const W = innerWidth, H = innerHeight, y = Math.min(H - 60, o.by + 50), s = part(pick(["🐰", "🐸", "🐥", "🐶", "🐱", "🦔", "🐿️"]), 0, y, 70), hops = 4, fr = [];
    for (let k = 0; k <= 48; k++) { const p = k / 48, h = Math.abs(Math.sin(p * hops * Math.PI)), sq = h < 0.08 ? " scale(1.15,.85)" : ""; fr.push({ transform: "translate(" + (-70 + (W + 140) * p).toFixed(0) + "px," + (-h * 120).toFixed(0) + "px)" + sq, offset: p }); }
    go(s, fr, { duration: 2600, easing: "linear" });
    for (let i = 0; i < hops; i++) snd.boing(i * 0.65);
  },
  regenbogen(o) {
    const w = Math.min(320, innerWidth * 0.82), r = document.createElement("div");
    r.className = "rainbow"; r.style.width = w + "px"; r.style.height = w / 2 + "px";
    r.style.left = (o.x - w / 2) + "px"; r.style.top = (o.y - w / 2 - 10) + "px";
    r.style.background = "radial-gradient(circle " + (w / 2) + "px at 50% 100%, transparent 0 52%, #8E5BE8 52% 60%, #3D7BF0 60% 68%, #33B36B 68% 76%, #F7D038 76% 84%, #F59A2B 84% 92%, #EB4B4B 92% 99.5%, transparent 100%)";
    fx.appendChild(r);
    go(r, [{ clipPath: "inset(0 100% 0 0)", opacity: 1, transform: "translateY(0)" }, { clipPath: "inset(0 0% 0 0)", opacity: 1, offset: 0.4 }, { clipPath: "inset(0 0% 0 0)", opacity: 1, transform: "translateY(0)", offset: 0.82 }, { clipPath: "inset(0 0% 0 0)", opacity: 0, transform: "translateY(-30px)" }], { duration: 2100, easing: "ease-out" });
    [-1, 1].forEach((sgn, i) => { const c = part("☁️", o.x + sgn * w * 0.38, o.y - 6, 56); go(c, [{ transform: "scale(0)", opacity: 0 }, { transform: "scale(1.15)", opacity: 1, offset: 0.2 }, { transform: "scale(1)", opacity: 1, offset: 0.3 }, { transform: "scale(1)", opacity: 1, offset: 0.82 }, { transform: "translateY(-30px)", opacity: 0 }], { duration: 2100 - i * 700, delay: i * 700 }); });
    snd.gliss();
  },
  ballons(o) {
    const cols = ["#FF5A5F", "#FFB400", "#00A699", "#7B61FF", "#FF7AB6", "#3DA5F4", "#8BD07A"];
    for (let i = 0; i < 7; i++) {
      const b = part("", o.x + rnd(-170, 170), innerHeight + 70, rnd(40, 54), "balloon"); b.style.setProperty("--c", cols[i % cols.length]);
      const up = innerHeight + 220, sw = rnd(14, 30), fr = [];
      for (let k = 0; k <= 6; k++) { const t = k / 6; fr.push({ transform: "translate(" + (Math.sin(t * Math.PI * 2 + i) * sw).toFixed(1) + "px," + (-up * t).toFixed(0) + "px) rotate(" + (Math.sin(t * Math.PI * 2 + i) * 8).toFixed(1) + "deg)", offset: t }); }
      go(b, fr, { duration: rnd(2600, 3400), delay: i * 120, easing: "ease-in" });
    }
    snd.fiep();
  },
  blumen(o) {
    const n = 7, w = Math.min(320, innerWidth - 40);
    for (let i = 0; i < n; i++) {
      const f = part(pick(["🌷", "🌼", "🌸", "🌻", "🌺"]), o.x - w / 2 + w * (i + 0.5) / n, o.by, rnd(40, 58));
      f.style.transformOrigin = "50% 100%"; f.style.marginTop = "-1em";
      go(f, [{ transform: "scale(.1,0)", opacity: 1 }, { transform: "scale(1.15,1.25)", opacity: 1, offset: 0.25 }, { transform: "scale(1) rotate(-6deg)", offset: 0.45 }, { transform: "scale(1) rotate(6deg)", offset: 0.65 }, { transform: "scale(1) rotate(0deg)", opacity: 1, offset: 0.85 }, { transform: "scale(.9) translateY(10px)", opacity: 0 }], { duration: 2100, delay: i * 90, easing: "ease-out" });
      snd.note(i * 0.09, i);
    }
  },
  rakete() {
    const W = innerWidth, H = innerHeight, r = part("🚀", 0, 0, 62), x0 = -60, y0 = H * 0.8, x1 = W + 60, y1 = H * 0.12, T = 1300, t0 = performance.now();
    r.style.transform = "translate(" + x0 + "px," + y0.toFixed(0) + "px)";
    let last = 0;
    snd.whoosh(0, 1.2);
    function step(now) {
      const p = Math.min(1, (now - t0) / T), x = x0 + (x1 - x0) * p, y = y0 + (y1 - y0) * p - Math.sin(p * Math.PI) * H * 0.1;
      r.style.transform = "translate(" + x.toFixed(0) + "px," + y.toFixed(0) + "px)";
      if (now - last > 35) { last = now; const s = part(pick(["✨", "⭐", "💫"]), x - 22, y + 22, rnd(16, 26)); go(s, [{ transform: "scale(1)", opacity: 1 }, { transform: "translate(" + rnd(-20, 0).toFixed(0) + "px," + rnd(5, 25).toFixed(0) + "px) scale(.2)", opacity: 0 }], { duration: 700 }); }
      if (p < 1) requestAnimationFrame(step); else r.remove();
    }
    requestAnimationFrame(step);
  },
  herzen(o) {
    for (let i = 0; i < 11; i++) {
      const h = part(pick(["💛", "💜", "💚", "❤️", "💙", "🧡"]), o.x + rnd(-50, 50), o.y + rnd(-10, 20), rnd(24, 42)), up = rnd(160, 300), sw = rnd(10, 26);
      go(h, [{ transform: "translate(0,0) scale(.2)", opacity: 0 }, { transform: "translate(" + sw.toFixed(0) + "px," + (-up * 0.35).toFixed(0) + "px) scale(1)", opacity: 1, offset: 0.3 }, { transform: "translate(" + (-sw).toFixed(0) + "px," + (-up * 0.7).toFixed(0) + "px) scale(1.1)", opacity: 1, offset: 0.65 }, { transform: "translate(" + (sw / 2).toFixed(0) + "px," + (-up).toFixed(0) + "px) scale(1.2)", opacity: 0 }], { duration: rnd(1400, 2000), delay: rnd(0, 350), easing: "ease-out" });
    }
    snd.dingdong();
  },
  stempel(o) {
    const s = part("⭐", o.x, o.y, 150);
    go(s, [{ transform: "scale(3) rotate(-25deg)", opacity: 0 }, { transform: "scale(.88) rotate(0deg)", opacity: 1, offset: 0.28 }, { transform: "scale(1.1)", offset: 0.4 }, { transform: "scale(1)", opacity: 1, offset: 0.52 }, { transform: "scale(1)", opacity: 1, offset: 0.8 }, { transform: "scale(1.15)", opacity: 0 }], { duration: 1500, easing: "ease-out" });
    const ring = part("", o.x, o.y, 120, "ring");
    go(ring, [{ transform: "scale(.3)", opacity: 0.9 }, { transform: "scale(2.4)", opacity: 0 }], { duration: 700, delay: 420, easing: "ease-out" });
    if (o.el) o.el.animate([{ transform: "translate(0,0)" }, { transform: "translate(-6px,3px)" }, { transform: "translate(5px,-3px)" }, { transform: "translate(-3px,2px)" }, { transform: "translate(0,0)" }], { duration: 320, delay: 420 });
    snd.thump(0.42); snd.pling(0.5);
  },
  zauber(o) {
    const n = 18;
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2, rr = rnd(110, 150), s = part(pick(["✨", "⭐", "💫", "✨"]), o.x, o.y, rnd(18, 30)), fr = [];
      for (let k = 0; k <= 10; k++) { const t = k / 10, a = a0 + t * Math.PI * 1.6, r = 20 + t * rr; fr.push({ transform: "translate(" + (Math.cos(a) * r).toFixed(1) + "px," + (Math.sin(a) * r).toFixed(1) + "px) scale(" + (0.4 + t * 0.8).toFixed(2) + ") rotate(" + (t * 180).toFixed(0) + "deg)", opacity: k === 10 ? 0 : 1, offset: t }); }
      go(s, fr, { duration: 1500, delay: i * 25, easing: "ease-out" });
    }
    const w = part("🪄", o.x + 40, o.y - 40, 56);
    go(w, [{ transform: "rotate(-30deg) scale(.5)", opacity: 0 }, { transform: "rotate(10deg) scale(1)", opacity: 1, offset: 0.3 }, { transform: "rotate(-15deg) scale(1)", offset: 0.55 }, { transform: "rotate(5deg) scale(1)", opacity: 1, offset: 0.8 }, { transform: "rotate(0deg) scale(.8)", opacity: 0 }], { duration: 1500 });
    snd.chime();
  }
};
const BONUS = {
  konfetti() {
    const W = innerWidth, H = innerHeight, cols = ["#FF5A5F", "#FFB400", "#00A699", "#7B61FF", "#FF7AB6", "#3DA5F4", "#8BD07A"];
    for (let i = 0; i < 70; i++) {
      const isE = i % 3 === 0, p = part(isE ? pick(["🎉", "🎊", "⭐", "🎈", "💛"]) : "", rnd(0, W), -40, isE ? rnd(26, 40) : rnd(10, 16), isE ? "" : "conf");
      if (!isE) p.style.setProperty("--c", pick(cols));
      go(p, [{ transform: "translate(0,0) rotate(0deg)" }, { transform: "translate(" + rnd(-80, 80).toFixed(0) + "px," + (H + 80) + "px) rotate(" + rnd(-540, 540).toFixed(0) + "deg)" }], { duration: rnd(2400, 4000), delay: rnd(0, 900), easing: "cubic-bezier(.3,.1,.6,1)" });
    }
    const cup = part("🏆", W / 2, H / 2, Math.min(170, W * 0.35));
    go(cup, [{ transform: "scale(0) rotate(-20deg)", opacity: 0 }, { transform: "scale(1.2) rotate(8deg)", opacity: 1, offset: 0.15 }, { transform: "scale(1) rotate(-5deg)", offset: 0.25 }, { transform: "scale(1) rotate(4deg)", offset: 0.4 }, { transform: "scale(1) rotate(0deg)", opacity: 1, offset: 0.85 }, { transform: "scale(.6) translateY(-40px)", opacity: 0 }], { duration: 3400 });
    snd.fanfare();
  },
  feuerwerk() {
    const W = innerWidth, H = innerHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    veil("rgba(12,14,40,.6)", 4600);
    const c = document.createElement("canvas"); c.className = "fxc"; c.width = W * dpr; c.height = H * dpr; fx.appendChild(c);
    const g = c.getContext("2d"); g.scale(dpr, dpr);
    const cols = ["#FFD166", "#EF476F", "#06D6A0", "#4CC9F0", "#B388FF", "#FF9F1C"], N = 6, rockets = [], parts = [];
    for (let i = 0; i < N; i++) rockets.push({ t: 300 + i * 450, x: rnd(W * 0.15, W * 0.85), ty: rnd(H * 0.15, H * 0.45), y: H + 10, col: pick(cols), done: false, launched: false });
    const t0 = performance.now(); let lastT = t0;
    function frame(now) {
      const el = now - t0, dt = Math.min(40, now - lastT) / 16.7; lastT = now;
      g.clearRect(0, 0, W, H);
      rockets.forEach((r) => {
        if (r.done || el < r.t) return;
        if (!r.launched) { r.launched = true; snd.launch(); }
        r.y -= (r.y - r.ty) * 0.07 * dt + 2 * dt;
        g.fillStyle = "#FFF"; g.beginPath(); g.arc(r.x, r.y, 2.6, 0, 7); g.fill();
        if (r.y - r.ty < 6) { r.done = true; snd.boom(); for (let k = 0; k < 64; k++) { const a = k / 64 * Math.PI * 2, sp = rnd(1.4, 4.4); parts.push({ x: r.x, y: r.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, col: Math.random() < 0.2 ? "#FFF" : r.col }); } }
      });
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.vy += 0.05 * dt; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= 0.012 * dt;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, 2.5, 0, 7); g.fill();
      }
      g.globalAlpha = 1;
      if (el < 6000 && (parts.length || rockets.some((r) => !r.done))) requestAnimationFrame(frame); else c.remove();
    }
    requestAnimationFrame(frame);
  },
  parade() {
    const W = innerWidth, H = innerHeight, an = ["🐘", "🦒", "🦓", "🐒", "🐧", "🐻", "🦁", "🐢"], y = H * 0.64, gap = Math.min(90, W / 6), dur = 4800;
    an.forEach((a, i) => {
      const s = part(a, 0, y, 66), x0 = W + 60 + i * gap, x1 = -80 - (an.length - i) * gap, fr = [];
      for (let k = 0; k <= 30; k++) { const t = k / 30; fr.push({ transform: "translate(" + (x0 + (x1 - x0) * t).toFixed(0) + "px," + (-Math.abs(Math.sin(t * 14 * Math.PI)) * 16).toFixed(1) + "px)", offset: t }); }
      go(s, fr, { duration: dur, easing: "linear" });
    });
    for (let i = 0; i < 9; i++) { const n = part(pick(["🎵", "🎶"]), rnd(W * 0.1, W * 0.9), y - 80, 30); go(n, [{ transform: "translateY(0) scale(.4)", opacity: 0 }, { transform: "translateY(-30px) scale(1)", opacity: 1, offset: 0.3 }, { transform: "translateY(-110px) scale(1)", opacity: 0 }], { duration: 1600, delay: i * 420 }); }
    snd.melody();
  },
  mond() {
    const W = innerWidth, H = innerHeight, mx = W * 0.78, my = H * 0.2, dur = 4300;
    veil("rgba(18,20,60,.55)", dur + 300);
    const moon = part("🌙", mx, my, 92);
    go(moon, [{ transform: "scale(0)", opacity: 0 }, { transform: "scale(1)", opacity: 1, offset: 0.12 }, { transform: "scale(1)", opacity: 1, offset: 0.8 }, { transform: "scale(1.35)", opacity: 1, offset: 0.85 }, { transform: "scale(1)", opacity: 1, offset: 0.9 }, { transform: "scale(1)", opacity: 0 }], { duration: dur });
    for (let i = 0; i < 16; i++) { const st = part("⭐", rnd(W * 0.05, W * 0.95), rnd(H * 0.05, H * 0.5), rnd(12, 22)); go(st, [{ opacity: 0, transform: "scale(.3)" }, { opacity: 1, transform: "scale(1)", offset: 0.3 }, { opacity: 0.4, offset: 0.5 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 3600, delay: rnd(0, 600) }); }
    const sx = W * 0.3, sy = H + 40, r = part("🚀", sx, sy, 84), dx = mx - 40 - sx, dy = my + 40 - sy;
    go(r, [{ transform: "translate(0,0)", offset: 0 }, { transform: "translate(0,-60px)", offset: 0.1 }, { transform: "translate(-4px,-60px)", offset: 0.15 }, { transform: "translate(4px,-60px)", offset: 0.2 }, { transform: "translate(-4px,-60px)", offset: 0.25 }, { transform: "translate(0,-60px)", offset: 0.4, easing: "cubic-bezier(.55,0,.9,.5)" }, { transform: "translate(" + dx.toFixed(0) + "px," + dy.toFixed(0) + "px) scale(.6)", offset: 0.8 }, { transform: "translate(" + dx.toFixed(0) + "px," + dy.toFixed(0) + "px) scale(.2)", opacity: 0, offset: 0.84 }, { transform: "translate(" + dx.toFixed(0) + "px," + dy.toFixed(0) + "px) scale(.2)", opacity: 0 }], { duration: dur, easing: "linear" });
    for (let i = 0; i < 8; i++) { const sm = part("☁️", sx + rnd(-30, 30), H - 30, rnd(40, 60)); go(sm, [{ transform: "translate(0,0) scale(.3)", opacity: 0 }, { transform: "translate(" + rnd(-140, 140).toFixed(0) + "px," + rnd(-40, 0).toFixed(0) + "px) scale(1.2)", opacity: 0.9, offset: 0.4 }, { transform: "translate(" + rnd(-200, 200).toFixed(0) + "px," + rnd(-60, -10).toFixed(0) + "px) scale(1.5)", opacity: 0 }], { duration: 1800, delay: 1600 + i * 60 }); }
    setTimeout(() => { for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2, s = part("✨", mx, my, 24); go(s, [{ transform: "translate(0,0) scale(.3)", opacity: 1 }, { transform: "translate(" + (Math.cos(a) * 90).toFixed(0) + "px," + (Math.sin(a) * 90).toFixed(0) + "px) scale(1)", opacity: 0 }], { duration: 900 }); } }, dur * 0.82);
    snd.countdown(); snd.whoosh(1.7, 1.8); snd.ding(dur * 0.82 / 1000);
  },
  geschenk() {
    const W = innerWidth, H = innerHeight, gsz = Math.min(150, W * 0.32);
    const g = part("🎁", W / 2, H / 2, gsz);
    go(g, [{ transform: "translateY(-60vh)", opacity: 1 }, { transform: "translateY(0) scale(1.1,.9)", offset: 0.18 }, { transform: "translateY(-30px) scale(.95,1.05)", offset: 0.26 }, { transform: "translateY(0) scale(1)", offset: 0.33 }, { transform: "rotate(-12deg)", offset: 0.42 }, { transform: "rotate(12deg)", offset: 0.5 }, { transform: "rotate(-12deg)", offset: 0.58 }, { transform: "rotate(10deg)", offset: 0.64 }, { transform: "rotate(0deg) scale(1)", opacity: 1, offset: 0.7 }, { transform: "scale(1.6)", opacity: 0, offset: 0.78 }, { transform: "scale(1.6)", opacity: 0 }], { duration: 3000, easing: "ease-out" });
    setTimeout(() => { for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, s = part(pick(["✨", "⭐"]), W / 2, H / 2, 28); go(s, [{ transform: "translate(0,0) scale(.3)", opacity: 1 }, { transform: "translate(" + (Math.cos(a) * 160).toFixed(0) + "px," + (Math.sin(a) * 160).toFixed(0) + "px) scale(1.1)", opacity: 0 }], { duration: 1000 }); } }, 2250);
    const halo = part("", W / 2, H / 2, Math.min(340, W * 0.8), "halo");
    go(halo, [{ transform: "scale(0)", opacity: 0 }, { transform: "scale(1)", opacity: 1, offset: 0.15 }, { transform: "scale(1.05)", opacity: 1, offset: 0.6 }, { transform: "scale(1.2)", opacity: 0 }], { duration: 2600, delay: 2250 });
    const st = part(pick(["🦄", "🐉", "🦖", "🐳", "🦋", "🐼", "🦊", "🐬"]), W / 2, H / 2, Math.min(170, W * 0.36));
    go(st, [{ transform: "scale(0)", opacity: 0 }, { transform: "scale(1.25)", opacity: 1, offset: 0.1 }, { transform: "scale(1) rotate(-6deg)", offset: 0.2 }, { transform: "scale(1) rotate(6deg)", offset: 0.3 }, { transform: "scale(1) rotate(-4deg)", offset: 0.4 }, { transform: "scale(1) rotate(0deg)", offset: 0.5 }, { transform: "translate(0,0) scale(1)", opacity: 1, offset: 0.7 }, { transform: "translate(" + (W * 0.38).toFixed(0) + "px," + (-H * 0.38).toFixed(0) + "px) scale(.2)", opacity: 0.9, offset: 0.95 }, { transform: "translate(" + (W * 0.38).toFixed(0) + "px," + (-H * 0.38).toFixed(0) + "px) scale(.2)", opacity: 0 }], { duration: 2900, delay: 2250 });
    snd.drumroll(0, 2.1); snd.tada(2.25);
  }
};

  const reduced = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  let lastA = "", lastB = "";
  const origin = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.45, by: r.bottom - 6, el: el }; };
  const ton = () => (window.FZ && FZ.toene ? FZ.toene() : "aus");
  window.FZ.kinderEffekt = function (el) {
    if (!el || reduced.matches) return;
    const pool = Object.keys(ANIM).filter((k) => k !== lastA), a = pick(pool); lastA = a;
    SOUND = ton() === "an";
    ANIM[a](origin(el));
  };
  window.FZ.kinderBonus = function () {
    if (reduced.matches) return;
    const pool = Object.keys(BONUS).filter((k) => k !== lastB), b = pick(pool); lastB = b;
    SOUND = ton() === "an" || ton() === "bonus";
    BONUS[b]();
  };
})();
