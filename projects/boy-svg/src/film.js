// THE BOY NOBODY BELIEVED IN — the film itself.
// Every frame is a pure function of time: FILM.renderAt(t) rewrites the SVG for second t (0..60).
// That makes it scrubbable, frame-exact, and exportable (the exporter rasterizes the same SVG frame by frame).
// Characters are faceless by design: no real person's likeness is drawn at any point.
(function () {
  "use strict";
  const W = 1080, H = 1920, DUR = 60, FPS = 30;
  const FONTS = window.__GLYPHS__;          // {anton:{upm,g:{ch:[adv,d]}}, inter:{...}}
  const CHUNKS = window.__CHUNKS__;         // narration caption chunks [{start,end,text}]

  // ------------------------------------------------------------------ timeline (seconds), matched to the soundtrack
  const SC = [0, 9.9, 19.867, 30.9, 41.9, 54.42, 60];
  const T = {
    BLACK_IN: 0.75, BLACK_OUT: 9.62, FATHER: 15.041, ALONE: 17.6, DORM: 24.344, MOCK: 26.379, BOOTS: 28.904,
    MONITOR: 36.523, SPRINT: 37.923, M_SHOT: 43.6, M_CROWD: 45.2, M_CUP: 47.0, M_AWARD: 48.8, M_ALONE: 50.8,
    SILENCE: 54.3, TURN: 54.75, ERUPT: 55.85,
  };

  // ------------------------------------------------------------------ math helpers
  const F = (v) => Math.round(v * 10) / 10;
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ramp = (t, a, b) => cl((t - a) / (b - a));
  const ss = (x) => x * x * (3 - 2 * x);
  const sr = (t, a, b) => ss(ramp(t, a, b));
  const lerp = (a, b, u) => a + (b - a) * u;
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const mix = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const c = (v) => Math.round(cl(v * k, 0, 255)).toString(16).padStart(2, "0");
    return "#" + c(r) + c(g) + c(b);
  }
  const line = (a, b, c, w, extra = "") => `<line x1="${F(a[0])}" y1="${F(a[1])}" x2="${F(b[0])}" y2="${F(b[1])}" stroke="${c}" stroke-width="${F(w)}" stroke-linecap="round"${extra}/>`;
  const circ = (x, y, r, fill, extra = "") => `<circle cx="${F(x)}" cy="${F(y)}" r="${F(Math.max(0, r))}" fill="${fill}"${extra}/>`;
  const rect = (x, y, w, h, fill, extra = "") => `<rect x="${F(x)}" y="${F(y)}" width="${F(w)}" height="${F(h)}" fill="${fill}"${extra}/>`;
  const poly = (pts, fill, extra = "") => `<polygon points="${pts.map((p) => F(p[0]) + "," + F(p[1])).join(" ")}" fill="${fill}"${extra}/>`;
  const op = (o, s) => (o <= 0.001 ? "" : o >= 0.999 ? s : `<g opacity="${o.toFixed(3)}">${s}</g>`);

  // ------------------------------------------------------------------ text as glyph paths (identical everywhere)
  const GID = {};
  let glyphDefs = "";
  for (const fk of ["anton", "inter"]) {
    let i = 0;
    for (const ch in FONTS[fk].g) {
      const id = fk[0] + (i++);
      GID[fk + ch] = id;
      if (FONTS[fk].g[ch][1]) glyphDefs += `<path id="${id}" d="${FONTS[fk].g[ch][1]}"/>`;
    }
  }
  function measure(str, font, size, ls = 0) {
    const G = FONTS[font], k = size / G.upm; let w = 0;
    for (const ch of str) w += ((G.g[ch] || G.g["?"])[0]) * k + ls;
    return w - ls;
  }
  // draws a string; returns svg. opts: font,size,x,y(baseline),anchor,fill,ls,stroke,sw
  function text(str, o) {
    const font = o.font || "inter", size = o.size || 60, G = FONTS[font], k = size / G.upm, ls = o.ls || 0;
    const w = measure(str, font, size, ls);
    let x0 = o.x || 0; if ((o.anchor || "middle") === "middle") x0 -= w / 2; else if (o.anchor === "end") x0 -= w;
    let s = "", x = 0;
    for (const ch of str) {
      const g = G.g[ch] || G.g["?"];
      if (g[1]) s += `<use href="#${GID[font + (G.g[ch] ? ch : "?")]}" x="${Math.round(x / k)}"/>`;
      x += g[0] * k + ls;
    }
    const st = o.stroke ? ` stroke="${o.stroke}" stroke-width="${F((o.sw || 8) / k)}" stroke-linejoin="round" paint-order="stroke"` : "";
    return `<g transform="translate(${F(x0)} ${F(o.y || 0)}) scale(${k.toFixed(5)})" fill="${o.fill || "#fff"}"${st}>${s}</g>`;
  }
  function wrap(str, font, size, maxW) {
    const words = str.split(" "), lines = []; let cur = "";
    for (const w of words) {
      const t = cur ? cur + " " + w : w;
      if (cur && measure(t, font, size) > maxW) { lines.push(cur); cur = w; } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  // ------------------------------------------------------------------ static defs: gradients, patterns, glyphs
  const lg = (id, stops, x2 = 0, y2 = 1, extra = "") => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}"${extra}>${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join("")}</linearGradient>`;
  const rg = (id, stops, extra = "") => `<radialGradient id="${id}"${extra}>${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join("")}</radialGradient>`;
  const crowdPattern = (() => {
    const r = rng(7); let s = "";
    for (let i = 0; i < 9; i++) {
      const x = (i % 3) * 13 + 4 + r() * 4, y = Math.floor(i / 3) * 13 + 5 + r() * 3, c = ["#1d2433", "#2a3245", "#151a26", "#323b52"][Math.floor(r() * 4)];
      s += circ(x, y, 3.6, c) + `<rect x="${F(x - 5)}" y="${F(y + 3)}" width="10" height="7" rx="3" fill="${c}"/>`;
    }
    return `<pattern id="pCrowd" width="39" height="39" patternUnits="userSpaceOnUse">${s}</pattern>`;
  })();
  const DEFS = [
    glyphDefs,
    lg("gNightSky", [[0, "#0a1230"], [0.6, "#1b2c5c"], [1, "#2c3f72"]]),
    lg("gWall", [[0, "#151c33"], [1, "#0b1020"]]),
    lg("gBeam", [[0, "#cfe0ff", 0.55], [1, "#cfe0ff", 0]]),
    lg("gBeamW", [[0, "#fff4dc", 0.6], [1, "#fff4dc", 0]]),
    rg("gGlow", [[0, "#ffffff", 1], [0.25, "#ffffff", 0.45], [1, "#ffffff", 0]]),
    rg("gWarm", [[0, "#ffb767", 0.9], [0.4, "#ff9a3c", 0.3], [1, "#ff8a2a", 0]]),
    rg("gMoon", [[0, "#dfe8ff", 0.9], [0.3, "#a9c0ff", 0.3], [1, "#a9c0ff", 0]]),
    rg("gVig", [[0.45, "#000", 0], [1, "#000", 0.85]], ` cx="0.5" cy="0.5" r="0.75"`),
    rg("gRed", [[0, "#ff2a3c", 0.8], [1, "#ff2a3c", 0]]),
    rg("gTeal", [[0, "#3cffb0", 0.7], [1, "#3cffb0", 0]]),
    rg("gBall", [[0, "#ffffff", 0], [0.65, "#000", 0.05], [1, "#000", 0.55]], ` cx="0.35" cy="0.3" r="0.8"`),
    lg("gSunset", [[0, "#1d1440"], [0.38, "#5b2a6e"], [0.62, "#d4554c"], [0.8, "#ff9a52"], [1, "#ffd08a"]]),
    lg("gDusk", [[0, "#0d0b26"], [0.45, "#33204f"], [0.75, "#8c3d5b"], [1, "#e0794f"]]),
    lg("gSea", [[0, "#c96a6a"], [1, "#34204a"]]),
    lg("gDirt", [[0, "#b8743f"], [1, "#5e3219"]]),
    lg("gDawn", [[0, "#7f9cc4"], [0.6, "#d9c7c0"], [1, "#f6d6a8"]]),
    lg("gRunway", [[0, "#8a8e94"], [1, "#3d4046"]]),
    lg("gFuselage", [[0, "#ffffff"], [0.55, "#e2e6ec"], [1, "#9aa3ae"]]),
    lg("gDorm", [[0, "#1a2540"], [1, "#0c1222"]]),
    lg("gHosp", [[0, "#0d2228"], [1, "#071214"]]),
    lg("gMorning", [[0, "#3f74c8"], [0.55, "#9cc4ee"], [1, "#ffe0a8"]]),
    lg("gGrass", [[0, "#5fa04a"], [1, "#2c6a2a"]]),
    lg("gStadSky", [[0, "#020308"], [1, "#0b1224"]]),
    lg("gPitch", [[0, "#1d4a2a"], [1, "#0b2414"]]),
    lg("gGold", [[0, "#fff4c8"], [0.45, "#f0c25a"], [1, "#a86e1c"]]),
    lg("gGoldH", [[0, "#ffe9a6"], [1, "#d39a2e"]], 1, 0),
    lg("gSilver", [[0, "#ffffff"], [0.5, "#c3cbd6"], [1, "#6f7b8c"]], 1, 0),
    lg("gLampCone", [[0, "#fff6e0", 0.55], [1, "#fff6e0", 0]]),
    lg("gShadeB", [[0, "#000", 0], [1, "#000", 0.75]]),
    lg("gShadeT", [[0, "#000", 0.7], [1, "#000", 0]]),
    crowdPattern,
    `<pattern id="pFence" width="34" height="34" patternUnits="userSpaceOnUse"><path d="M0 0L34 34M34 0L0 34" stroke="#2a2d33" stroke-width="2.6" fill="none"/></pattern>`,
    `<pattern id="pGrid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M60 0H0V60" stroke="#1aff8c" stroke-opacity="0.12" stroke-width="2" fill="none"/></pattern>`,
    `<pattern id="pNet" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M26 0H0V26" stroke="#e8eef8" stroke-opacity="0.45" stroke-width="2" fill="none"/></pattern>`,
    `<clipPath id="cWin"><rect x="300" y="330" width="480" height="560"/></clipPath>`,
    `<clipPath id="cMon"><rect x="-150" y="-95" width="300" height="190"/></clipPath>`,
  ].join("");

  // ------------------------------------------------------------------ camera / parallax layers
  // A layer with depth factor p moves p× the camera; p<1 is far, p>1 is foreground.
  function layer(cam, p, inner) {
    const z = 1 + (cam.z - 1) * p;
    return `<g transform="translate(540 960) scale(${z.toFixed(4)}) translate(${F(-540 - cam.x * p)} ${F(-960 - cam.y * p)})">${inner}</g>`;
  }
  const shake = (t, at, amt = 14, dur = 0.5) => {
    const u = ramp(t, at, at + dur); if (u <= 0 || u >= 1) return [0, 0];
    const k = (1 - u) * amt; return [Math.sin(t * 83) * k, Math.cos(t * 71) * k];
  };

  // ------------------------------------------------------------------ characters (faceless, stylised)
  const SIL = { skin: "#000", hair: "#000", shirt: "#000", shorts: "#000", socks: "#000", boot: "#000", pants: "#000", sleeve: "#000" };
  const BASECOL = { skin: "#b9835c", hair: "#16100c", shirt: "#c8332f", shorts: "#1d2433", socks: "#f2f2f2", boot: "#141414" };
  // profile figure. o: {x,y (ground), h, dir (1 faces right), pose, col, sil, kid (0..1), anchor:'hip', pants}
  function person(o) {
    const Hh = o.h, s = o.dir || 1, kid = o.kid || 0;
    const P = Object.assign({ lean: 0, hl: 0, hr: 0, kl: 0, kr: 0, sl: 0, sr: 0, el: 0.25, er: 0.25, hp: 0 }, o.pose || {});
    const C = o.sil ? SIL : Object.assign({}, BASECOL, o.col || {});
    const hr = Hh * (0.064 + 0.02 * kid), th = Hh * (0.25 - 0.01 * kid), sh = Hh * (0.25 - 0.015 * kid), tor = Hh * (0.29 - 0.02 * kid);
    const ua = Hh * 0.155, fa = Hh * 0.145, lw = Hh * (0.06 + 0.006 * kid);
    const D = (a, l) => [Math.sin(a) * s * l, Math.cos(a) * l];
    const hip = [0, 0];
    const top = [Math.sin(P.lean) * s * tor, -Math.cos(P.lean) * tor];
    const shp = add(top, D(P.lean + Math.PI, -Hh * 0.025));
    const leg = (h, k) => { const kn = add(hip, D(h, th)); const an = add(kn, D(h - k, sh)); const a = h - k; const toe = [an[0] + Math.cos(a) * s * Hh * 0.075, an[1] - Math.sin(a) * Hh * 0.075]; return { kn, an, toe }; };
    const arm = (a, e) => { const el = add(shp, D(a, ua)); const wr = add(el, D(a + e, fa)); return { el, wr }; };
    const L = leg(P.hl, P.kl), R = leg(P.hr, P.kr), AL = arm(P.sl, P.el), AR = arm(P.sr, P.er);
    const hc = add(top, [Math.sin(P.lean + P.hp) * s * (Hh * 0.03 + hr), -Math.cos(P.lean + P.hp) * (Hh * 0.03 + hr)]);
    const dy = o.anchor === "hip" ? 0 : -Math.max(L.an[1], R.an[1], L.toe[1], R.toe[1]) - lw * 0.45;
    const far = (c) => (o.sil ? c : shade(c, 0.72));
    const drawLeg = (g, dark) => {
      const c = dark ? far : (x) => x;
      let q = "";
      if (o.pants) q += line(hip, g.kn, c(o.pants), lw * 1.15) + line(g.kn, g.an, c(o.pants), lw * 1.05);
      else {
        const m = mix(hip, g.kn, 0.6), sk = mix(g.kn, g.an, 0.35);
        q += line(hip, m, c(C.shorts), lw * 1.3) + line(m, g.kn, c(C.skin), lw) + line(g.kn, sk, c(C.skin), lw * 0.92) + line(sk, g.an, c(C.socks), lw * 0.95);
      }
      return q + line(g.an, g.toe, c(C.boot), lw * 0.9);
    };
    const drawArm = (g, dark) => {
      const c = dark ? far : (x) => x, sl = mix(shp, g.el, o.longSleeve ? 1 : 0.5);
      let q = line(shp, sl, c(C.shirt), lw * 1.08) + (o.longSleeve ? line(g.el, g.wr, c(C.shirt), lw * 0.95) : line(sl, g.el, c(C.skin), lw * 0.85) + line(g.el, g.wr, c(C.skin), lw * 0.82));
      return q + circ(g.wr[0], g.wr[1], lw * 0.55, c(C.skin));
    };
    let s1 = drawLeg(L, true) + drawArm(AL, true);
    s1 += line(hip, top, C.shirt, Hh * 0.15) + line(hip, add(hip, [0, -Hh * 0.04]), o.pants || C.shorts, Hh * 0.14);
    s1 += line(top, hc, C.skin, Hh * 0.045);
    s1 += drawLeg(R, false);
    // head + curly hair (back and top of the head); no facial features
    let hd = circ(hc[0], hc[1], hr, C.skin);
    hd += circ(hc[0] - s * hr * 0.14, hc[1] - hr * 0.16, hr * 0.93, C.hair);
    for (let i = 0; i < 13; i++) {
      const th2 = -0.75 + (i / 12) * 3.2;
      hd += circ(hc[0] - s * Math.cos(th2) * hr * 0.92, hc[1] - Math.sin(th2) * hr * 0.92, hr * 0.3, C.hair);
    }
    if (!o.sil) hd += circ(hc[0] - s * hr * 0.08, hc[1] + hr * 0.12, hr * 0.17, shade(C.skin, 0.85));   // ear
    s1 += hd + drawArm(AR, false);
    return `<g transform="translate(${F(o.x)} ${F(o.y + dy)})${o.rot ? ` rotate(${o.rot})` : ""}">${s1}</g>`;
  }
  // front/back view figure. o: {x,y,h,back,armL,armR (outward angle from down),elL,elR,spread,col,sil,kid,turn (x-scale)}
  function personFront(o) {
    const Hh = o.h, C = o.sil ? SIL : Object.assign({}, BASECOL, o.col || {}), kid = o.kid || 0;
    const hr = Hh * (0.068 + 0.02 * kid), hipY = -Hh * 0.49, shY = hipY - Hh * 0.29, lw = Hh * 0.068;
    const sp = o.spread || 0.06, aL = o.armL ?? 0.12, aR = o.armR ?? 0.12, eL = o.elL ?? 0.1, eR = o.elR ?? 0.1;
    let q = "";
    for (const sgn of [-1, 1]) {
      const h0 = [sgn * Hh * 0.05, hipY], ft = [sgn * (Hh * 0.05 + Math.sin(sp) * Hh * 0.5), 0 - lw * 0.5], kn = mix(h0, ft, 0.5);
      if (o.pants) q += line(h0, ft, o.pants, lw * 1.15);
      else q += line(h0, kn, C.skin, lw) + line(kn, mix(kn, ft, 0.35), C.skin, lw * 0.92) + line(mix(kn, ft, 0.35), ft, C.socks, lw * 0.95) + line(h0, mix(h0, kn, 0.6), C.shorts, lw * 1.45);
      q += `<ellipse cx="${F(ft[0] + sgn * 4)}" cy="${F(ft[1] + lw * 0.2)}" rx="${F(lw * 0.75)}" ry="${F(lw * 0.45)}" fill="${C.boot}"/>`;
    }
    q += `<path d="M${F(-Hh * 0.13)} ${F(shY)} L${F(Hh * 0.13)} ${F(shY)} L${F(Hh * 0.095)} ${F(hipY + Hh * 0.02)} L${F(-Hh * 0.095)} ${F(hipY + Hh * 0.02)} Z" fill="${C.shirt}" stroke="${C.shirt}" stroke-width="${F(Hh * 0.05)}" stroke-linejoin="round"/>`;
    q += line([-Hh * 0.09, hipY], [Hh * 0.09, hipY], o.pants || C.shorts, Hh * 0.06);
    for (const [sgn, a, e] of [[-1, aL, eL], [1, aR, eR]]) {
      const s0 = [sgn * Hh * 0.13, shY + Hh * 0.025];
      const el = add(s0, [sgn * Math.sin(a) * Hh * 0.155, Math.cos(a) * Hh * 0.155]);
      const wr = add(el, [sgn * Math.sin(a + e) * Hh * 0.145, Math.cos(a + e) * Hh * 0.145]);
      q += line(s0, mix(s0, el, 0.5), C.shirt, lw * 1.05) + line(mix(s0, el, 0.5), el, C.skin, lw * 0.85) + line(el, wr, C.skin, lw * 0.8) + circ(wr[0], wr[1], lw * 0.55, C.skin);
    }
    const hc = [0, shY - Hh * 0.03 - hr];
    q += line([0, shY], hc, C.skin, Hh * 0.05);
    q += circ(hc[0], hc[1], hr, C.skin);
    q += o.back ? circ(hc[0], hc[1] + hr * 0.04, hr * 1.06, C.hair) : circ(hc[0], hc[1] - hr * 0.35, hr * 0.78, C.hair);
    const n = 16;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (o.back ? -0.3 + 1.6 * i / (n - 1) : 0.05 + 0.9 * i / (n - 1));
      q += circ(hc[0] + Math.cos(a) * hr * 0.92, hc[1] - Math.sin(a) * hr * 0.92, hr * 0.3, C.hair);
    }
    return `<g transform="translate(${F(o.x)} ${F(o.y)}) scale(${(o.turn ?? 1).toFixed(3)} 1)">${q}</g>`;
  }
  function runPose(ph, A = 1) {
    const legP = (phi) => [A * 0.8 * Math.sin(phi), 0.15 + A * 1.25 * Math.max(0, Math.cos(phi - 0.3))];
    const [hl, kl] = legP(ph), [hr, kr] = legP(ph + Math.PI);
    return { lean: 0.18 * A, hl, kl, hr, kr, sl: -A * 0.85 * Math.sin(ph), sr: A * 0.85 * Math.sin(ph), el: 0.4 + 1.0 * A, er: 0.4 + 1.0 * A };
  }
  function walkPose(ph) {
    return { lean: 0.04, hl: 0.38 * Math.sin(ph), kl: 0.1 + 0.45 * Math.max(0, Math.cos(ph - 0.4)), hr: 0.38 * Math.sin(ph + Math.PI), kr: 0.1 + 0.45 * Math.max(0, Math.cos(ph + Math.PI - 0.4)), sl: -0.3 * Math.sin(ph), sr: 0.3 * Math.sin(ph), el: 0.25, er: 0.25 };
  }
  function ball(x, y, r, rot = 0, dim = 1) {
    let s = circ(x, y, r, dim < 1 ? shade("#f4efe4", dim) : "#f4efe4");
    for (let i = 0; i < 5; i++) {
      const a = rot + i * 1.2566, px = x + Math.cos(a) * r * 0.62, py = y + Math.sin(a) * r * 0.62;
      if (Math.cos(a - 0.4) > -0.6) s += circ(px, py, r * 0.17, "#2a2622");
    }
    s += circ(x, y, r * 0.2, "#2a2622") + circ(x, y, r, "url(#gBall)");
    return s;
  }
  const glow = (x, y, r, o = 1, id = "gGlow") => `<circle cx="${F(x)}" cy="${F(y)}" r="${F(r)}" fill="url(#${id})" opacity="${o.toFixed(3)}"/>`;

  // ------------------------------------------------------------------ overlays
  function tag(t, a, b, str) {
    const u = sr(t, a, a + 0.5) * (1 - sr(t, b - 0.4, b));
    if (u <= 0) return "";
    return op(u, rect(60, 152, 6, 46, "#f0c25a") + text(str, { font: "inter", size: 31, x: 84, y: 187, anchor: "start", fill: "#ffffff", ls: 3.5 }));
  }
  function title(lines, t, a, b, y0, size, goldLast = true) {
    const u = sr(t, a, a + 0.35) * (1 - sr(t, b - 0.3, b));
    if (u <= 0) return "";
    const sc = 1.12 - 0.12 * ss(ramp(t, a, a + 0.6));
    let s = "";
    lines.forEach((ln, i) => {
      const gold = goldLast && i === lines.length - 1;
      s += text(ln, { font: "anton", size, x: 540, y: y0 + i * size * 1.04, fill: gold ? "url(#gGold)" : "#ffffff", stroke: "#000000", sw: 14, ls: 2 });
    });
    return `<g opacity="${u.toFixed(3)}" transform="translate(540 ${y0}) scale(${sc.toFixed(4)}) translate(-540 ${-y0})">${s}</g>`;
  }
  function stat(t, a, b, y, big, label) {
    const u = sr(t, a, a + 0.3) * (1 - sr(t, b - 0.3, b));
    if (u <= 0) return "";
    const dx = (1 - ss(ramp(t, a, a + 0.45))) * -60;
    const bw = measure(big, "anton", 112, 2);
    return `<g opacity="${u.toFixed(3)}" transform="translate(${F(dx)} 0)">` +
      text(big, { font: "anton", size: 112, x: 72, y, anchor: "start", fill: "url(#gGold)", stroke: "#000", sw: 12, ls: 2 }) +
      text(label, { font: "anton", size: 58, x: 72 + bw + 22, y: y - 4, anchor: "start", fill: "#ffffff", stroke: "#000", sw: 10, ls: 3 }) + `</g>`;
  }
  // karaoke captions: whole chunk shown, words light up as they are spoken; CAPS words in gold
  function captions(t) {
    const c = CHUNKS.find((k) => t >= k.start - 0.05 && t < k.end + 0.12);
    if (!c || /CRISTIANO/.test(c.text)) return "";
    const size = 64, lines = wrap(c.text, "inter", size, 860);
    const total = c.text.length, prog = (t - c.start) / Math.max(0.3, c.end - c.start);
    const pop = 0.9 + 0.1 * ss(ramp(t, c.start - 0.05, c.start + 0.12));
    const y0 = 1500 - (lines.length - 1) * size * 0.6;
    let s = "", ci = 0;
    lines.forEach((ln, li) => {
      const words = ln.split(" "), lw = measure(ln, "inter", size);
      let x = 540 - lw / 2;
      for (const w of words) {
        const isKey = /[A-Z]{2,}/.test(w.replace(/[^A-Za-z]/g, "")) && w.replace(/[^A-Za-z]/g, "") === w.replace(/[^A-Za-z]/g, "").toUpperCase();
        const spoken = (ci + w.length * 0.5) / total <= prog + 0.06;
        const fill = isKey ? "#ffd25a" : "#ffffff";
        s += `<g opacity="${spoken ? 1 : 0.42}">` + text(w, { font: "inter", size, x, y: y0 + li * size * 1.2, anchor: "start", fill, stroke: "#05070c", sw: 13 }) + `</g>`;
        x += measure(w + " ", "inter", size); ci += w.length + 1;
      }
    });
    return `<g transform="translate(540 1500) scale(${pop.toFixed(3)}) translate(-540 -1500)">${s}</g>`;
  }

  // ================================================================== SCENE 1 — the hook: a boy alone at night (0–9.9)
  const R1 = rng(11);
  const RAIN = Array.from({ length: 46 }, () => [300 + R1() * 480, R1() * 620, 26 + R1() * 30, 0.6 + R1() * 0.6]);
  const PLASTER = Array.from({ length: 7 }, () => { const cx = R1() * 1080, cy = 200 + R1() * 1100, r = 30 + R1() * 70; return Array.from({ length: 7 }, (_, i) => { const a = i / 7 * 6.283, rr = r * (0.6 + R1() * 0.6); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.7]; }); });
  const CITY = Array.from({ length: 22 }, () => [310 + R1() * 460, 760 + R1() * 110, R1()]);
  function sceneHook(t) {
    const u = ramp(t, 0, 9.6), cam = { x: lerp(-30, 10, u), y: lerp(0, 40, ss(u)), z: lerp(1.0, 1.22, ss(u)) };
    const beat = (() => { let p = 0; for (let k = 0; k < 11; k++) { const d = t - (0.15 + k * 0.92); if (d >= 0 && d < 0.6) p = Math.max(p, Math.exp(-d * 9) + 0.6 * Math.exp(-Math.max(0, d - 0.28) * 9) * (d > 0.28 ? 1 : 0)); } return Math.min(1, p); })();
    let far = rect(-300, -300, 1680, 2520, "url(#gWall)");
    for (const p of PLASTER) far += poly(p, "#26304d", ` opacity="0.55"`);
    // window: night sky, moon, hills with a few town lights, rain
    let win = rect(300, 330, 480, 560, "url(#gNightSky)") + glow(640, 450, 230, 0.55, "gMoon") + circ(640, 450, 46, "#f3f0e4");
    win += `<path d="M300 780 Q420 700 540 760 T780 730 L780 890 L300 890 Z" fill="#070b18"/>`;
    for (const [x, y, k] of CITY) win += circ(x, y, 3.2, "#ffc46b", ` opacity="${(0.6 + 0.4 * Math.sin(t * 2 + k * 9)).toFixed(2)}"`);
    for (const [x, y0, len, sp] of RAIN) { const y = 330 + ((y0 + t * 900 * sp) % 620); win += line([x, y], [x - 6, y + len], "#c8d8ff", 2.2, ` opacity="0.45"`); }
    far += `<g clip-path="url(#cWin)">${win}</g>`;
    far += `<rect x="300" y="330" width="480" height="560" fill="none" stroke="#2c2018" stroke-width="22"/>` + line([540, 330], [540, 890], "#2c2018", 14) + line([300, 610], [780, 610], "#2c2018", 14);
    far += rect(280, 885, 520, 26, "#3a2a1e");
    // moonlight beam to the floor
    far += poly([[310, 900], [770, 900], [1040, 1920], [40, 1920]], "url(#gBeam)", ` opacity="${(0.3 + 0.05 * Math.sin(t * 1.3)).toFixed(3)}"`);
    // warm bedside lamp (left), flickering
    const fl = 0.75 + 0.1 * Math.sin(t * 13) * Math.sin(t * 7.3);
    let mid = glow(110, 1080, 420, 0.55 * fl, "gWarm") + rect(70, 1060, 80, 150, "#2a1d14") + `<path d="M40 1065 L180 1065 L150 985 L70 985 Z" fill="#e6a35a" opacity="0.9"/>`;
    // bed
    mid += rect(-40, 1230, 1160, 70, "#1d1712") + rect(-40, 1180, 1160, 90, "#2c3350") + `<path d="M-40 1200 Q200 1160 420 1215 T1120 1190 L1120 1300 L-40 1300 Z" fill="#3b3354"/>`;
    // the boy, seen from behind, head slightly bowed, breathing
    const br = 1 + 0.012 * Math.sin(t * 1.7);
    let boy = `<g transform="translate(540 1250) scale(1 ${br.toFixed(4)}) translate(-540 -1250)">` + personFront({ x: 540, y: 1520, h: 560, back: true, kid: 1, col: { shirt: "#7f8fb5", shorts: "#262b3c" }, armL: 0.18, armR: 0.18, elL: 0.35, elR: 0.35 }) + `</g>`;
    boy += `<path d="M452 1094 Q540 1070 628 1094" stroke="#bcd0ff" stroke-width="6" fill="none" opacity="0.45"/>`;   // moon rim light
    mid += boy;
    // ball on the floor, catching moonlight
    let near = rect(-200, 1520, 1480, 600, "#0f0c10") + ball(820, 1640, 78, 0.3 + t * 0.02, 0.92) + glow(800, 1610, 60, 0.25);
    let s = layer(cam, 0.35, far) + layer(cam, 0.8, mid) + layer(cam, 1.15, near);
    s += rect(0, 0, W, H, "url(#gVig)", ` opacity="${(0.75 + 0.2 * beat).toFixed(3)}"`);
    s += tag(t, 1.1, 6.9, "MADEIRA, PORTUGAL · 1990s");
    s += title(["CAN YOU GUESS", "WHO THIS BOY", "BECAME?"], t, 7.05, 9.62, 330, 118);
    return s;
  }

  // ================================================================== SCENE 2 — the beginning: Madeira (9.9–19.867)
  const R2 = rng(23);
  const HOUSES = Array.from({ length: 34 }, () => [R2() * 2600 - 700, 980 + R2() * 120, 26 + R2() * 30, 18 + R2() * 22, R2()]);
  const KIDS = [[-260, 0.9, "#2f62b5"], [1250, 1.7, "#e0b23a"], [1650, 0.3, "#3d8c4a"]];
  function madeira(t, cam, dusk) {
    let sky = rect(-800, -600, 2680, 2000, dusk > 0.5 ? "url(#gDusk)" : "url(#gSunset)");
    const sunY = 1040 + dusk * 70;
    sky += glow(700, sunY, 640, 0.7) + circ(700, sunY, 104, "#fff1c8");
    sky += rect(-800, 1080, 2680, 140, "url(#gSea)");
    for (let i = 0; i < 9; i++) { const y = 1095 + i * 13, w = 120 + 40 * Math.sin(t * 1.4 + i); sky += rect(700 - w / 2 + Math.sin(t + i) * 20, y, w, 3, "#ffd9a0", ` opacity="0.5"`); }
    const m1 = `<path d="M-900 1090 L-560 860 L-300 980 L-40 800 L260 960 L520 840 L820 990 L1120 820 L1460 960 L1800 860 L2100 1090 Z" fill="#4e2a58"/>`;
    let m2 = `<path d="M-900 1160 Q-500 960 -200 1040 T420 1000 T1100 1060 T1800 980 T2400 1160 Z" fill="#331d43"/>`;
    for (const [x, y, w, h, k] of HOUSES) { m2 += rect(x, y + 40, w, h, "#e7c7a8", ` opacity="0.55"`) + (k > 0.45 ? rect(x + w * 0.35, y + 46, 6, 6, "#ffcf7a") : ""); }
    const fence = rect(-900, 1250, 3000, 8, "#3a2418") + `<rect x="-900" y="1180" width="3000" height="100" fill="url(#pFence)" opacity="0.35"/>`;
    const ground = rect(-900, 1330, 3200, 900, "url(#gDirt)") + rect(-900, 1330, 3200, 10, "#d79a5e", ` opacity="0.4"`) + line([-900, 1560], [2300, 1560], "#f3e2c8", 6, ` opacity="0.25"`);
    return layer(cam, 0.12, sky) + layer(cam, 0.22, m1) + layer(cam, 0.4, m2) + layer(cam, 0.75, fence) + layer(cam, 1, ground);
  }
  function dust(t, x, y, seed, n = 5) {
    let s = "";
    for (let i = 0; i < n; i++) { const a = (t * 1.3 + hash(seed + i)) % 1; s += circ(x - a * 120 - i * 10, y - a * 50 - hash(i + seed) * 20, 10 + a * 30, "#e2b183", ` opacity="${(0.35 * (1 - a)).toFixed(3)}"`); }
    return s;
  }
  function sceneBeginning(t) {
    if (t < T.FATHER) {
      // dribbling across the dirt pitch at sunset; camera tracks him
      const u = t - SC[1], bx = 180 + u * 150, ph = u * 10.5;
      const cam = { x: bx - 560, y: 40, z: 1.08 - 0.03 * ramp(t, SC[1], T.FATHER) };
      let s = madeira(t, cam, 0);
      let kids = "";
      for (const [x0, sp, c] of KIDS) { const kx = x0 + Math.sin(t * sp) * 160; kids += person({ x: kx, y: 1345, h: 190, dir: Math.cos(t * sp) > 0 ? 1 : -1, kid: 1, pose: runPose(t * 9 + sp * 3, 0.8), col: { shirt: c } }); }
      s += layer(cam, 0.85, op(0.85, kids));
      let fg = dust(t, bx - 40, 1650, 3) + person({ x: bx, y: 1700, h: 400, dir: 1, kid: 1, pose: runPose(ph, 0.85), col: { shirt: "#c8332f" } });
      const bxx = bx + 95 + 35 * Math.abs(Math.sin(ph / 2)), by = 1668 - 24 * Math.abs(Math.sin(ph));
      fg += `<ellipse cx="${F(bxx)}" cy="1694" rx="30" ry="8" fill="#000" opacity="0.3"/>` + ball(bxx, by, 30, u * 9);
      s += layer(cam, 1, fg);
      return s + tag(t, 10.3, 14.8, "AGE 8 · FUNCHAL, MADEIRA");
    }
    if (t < T.ALONE) {
      // his father, the club's kit man, hangs shirts to dry; the boy runs up to him
      const u = ramp(t, T.FATHER, T.ALONE), cam = { x: lerp(-40, 40, u), y: 60, z: lerp(1.0, 1.1, ss(u)) };
      let s = madeira(t, cam, 0.15);
      let club = rect(80, 1060, 620, 300, "#e9d3b6") + rect(80, 1050, 640, 26, "#a5502f") + rect(470, 1170, 110, 190, "#2f5d8a") + rect(150, 1130, 120, 80, "#2a2a34") + rect(150, 1130, 120, 80, "#ffcf7a", ` opacity="0.25"`);
      club += line([760, 1080], [760, 1360], "#5a3a22", 10) + line([1180, 1080], [1180, 1360], "#5a3a22", 10) + `<path d="M760 1110 Q970 1150 1180 1110" stroke="#ddd" stroke-width="3" fill="none"/>`;
      ["#c8332f", "#f3f3f3", "#c8332f", "#1d2433"].forEach((c, i) => { const x = 800 + i * 95, y = 1122 + Math.sin(i * 0.9) * 10, sw = Math.sin(t * 2.2 + i) * 4; club += `<path d="M${x} ${y} l70 0 l12 30 l-16 6 l0 70 l-62 0 l0 -70 l-16 -6 Z" fill="${c}" transform="rotate(${F(sw)} ${x + 35} ${y})"/>`; });
      s += layer(cam, 0.85, club);
      const fx = 860, reach = 0.5 + 0.5 * Math.sin(t * 2.5);
      let fg = person({ x: fx, y: 1700, h: 640, dir: -1, pose: { sl: Math.PI - 0.35 - 0.1 * reach, sr: Math.PI - 0.55, el: -0.3, er: -0.2, lean: -0.05, hp: -0.25 }, col: { shirt: "#22334f", skin: "#a8774f", hair: "#1a1410" }, pants: "#4a4f5a", longSleeve: false });
      const bx = lerp(-120, 520, ss(ramp(t, T.FATHER, T.FATHER + 1.6)));
      const running = t < T.FATHER + 1.6;
      fg += person({ x: bx, y: 1700, h: 400, dir: 1, kid: 1, pose: running ? runPose((t - T.FATHER) * 10, 0.8) : { hp: -0.35, sl: 0.1, sr: -0.1 }, col: { shirt: "#c8332f" } });
      if (!running) fg += ball(bx - 70, 1672, 30, 0);
      s += layer(cam, 1, fg);
      return s;
    }
    // alone at dusk, juggling the ball; camera pulls back
    const u = ramp(t, T.ALONE, SC[2]), cam = { x: 0, y: lerp(40, 0, u), z: lerp(1.18, 1.0, ss(u)) };
    let s = madeira(t, cam, 1);
    const ph = (t - T.ALONE) * 2.6 * Math.PI, up = Math.abs(Math.sin(ph));
    let fg = `<ellipse cx="540" cy="1704" rx="160" ry="18" fill="#000" opacity="0.35"/>`;
    fg += person({ x: 540, y: 1700, h: 400, dir: 1, kid: 1, sil: true, pose: { hl: 0.2 + 0.9 * Math.max(0, Math.sin(ph)), kl: 0.9 * Math.max(0, Math.sin(ph)), hr: -0.05, kr: 0.05, sl: -0.5, sr: 0.5, el: 0.4, er: 0.4 } });
    fg += ball(590, 1540 - up * 230, 30, ph, 0.25);
    s += layer(cam, 1, fg);
    return s;
  }

  // ================================================================== SCENE 3 — the sacrifice (19.867–30.9)
  function sceneSacrifice(t) {
    if (t < T.DORM) {
      // leaving home at 12: the airport; family waves from behind the fence
      const u = ramp(t, SC[2], T.DORM), cam = { x: lerp(0, 60, u), y: 0, z: lerp(1.0, 1.1, ss(u)) };
      let sky = rect(-400, -400, 1880, 1700, "url(#gDawn)") + glow(250, 1000, 520, 0.5);
      let mid = rect(-400, 1180, 1880, 900, "url(#gRunway)");
      for (let i = 0; i < 12; i++) mid += rect(-300 + i * 180, 1300, 90, 8, "#e9e2cc", ` opacity="0.7"`);
      // plane (no airline markings)
      let plane = `<path d="M40 1010 L1300 1010 Q1340 1060 1300 1150 L120 1150 Q20 1140 0 1080 Q10 1020 40 1010 Z" fill="url(#gFuselage)"/>`;
      for (let i = 0; i < 16; i++) plane += `<rect x="${170 + i * 62}" y="1048" width="26" height="30" rx="10" fill="#273445"/>`;
      plane += `<path d="M120 1010 L40 820 L150 820 L270 1010 Z" fill="#dfe4ea"/><path d="M500 1120 L900 1120 L760 1240 L620 1240 Z" fill="#c9d0d9"/>` + rect(640, 1180, 200, 60, "#aab3bf", ` rx="28"`);
      plane += rect(420, 1150, 34, 120, "#6c737d") + `<path d="M300 1150 L360 1150 L470 1300 L410 1300 Z" fill="#7d858f"/>`;   // stairs
      const bx = lerp(560, 410, ss(ramp(t, SC[2], T.DORM - 0.6)));
      const turning = t > 22.4 && t < 23.4;
      const bs = 1 - 0.25 * ss(ramp(t, SC[2], T.DORM));
      let boy = person({ x: bx, y: 1395, h: 260 * bs, dir: turning ? 1 : -1, kid: 0.8, pose: turning ? { hp: 0.1 } : walkPose((t - SC[2]) * 6), col: { shirt: "#5a7fb8", shorts: "#2a2f3c" } });
      boy += rect(bx - (turning ? 30 : -6), 1300 - 12, 34, 26, "#3a2a20", ` rx="6"`);   // duffel bag
      // family behind the fence (backs to us), waving
      let fam = "";
      const famC = [["#7a3f5c", 520, -60], ["#3b4f6e", 600, 120], ["#c79a3a", 380, 270], ["#5d7a4c", 420, 420]];
      famC.forEach(([c, h, x], i) => { const wave = 0.5 + 0.5 * Math.sin(t * 7 + i); fam += personFront({ x: x + 60, y: 2010, h: h * 0.95, back: true, col: { shirt: c, shorts: "#262b36" }, pants: "#262b36", armR: i % 2 ? 0.2 : 2.5 + 0.35 * wave, elR: i % 2 ? 0.1 : 0.3 * wave, armL: 0.15 }); });
      let fence = `<rect x="-400" y="1120" width="1880" height="800" fill="url(#pFence)" opacity="0.3"/>` + line([-400, 1120], [1480, 1120], "#2a2d33", 8) + line([-400, 1500], [1480, 1500], "#2a2d33", 6);
      let s = layer(cam, 0.2, sky) + layer(cam, 0.5, mid + plane + boy) + layer(cam, 1.25, fence + fam);
      return s + tag(t, 20.2, 24.0, "AGE 12 · MADEIRA TO LISBON · ~600 MILES");
    }
    if (t < T.BOOTS) {
      const mocking = t >= T.MOCK;
      const u = mocking ? ramp(t, T.MOCK, T.BOOTS) : ramp(t, T.DORM, T.MOCK);
      const cam = mocking ? { x: lerp(20, -20, u), y: 0, z: lerp(1.0, 1.06, u) } : { x: lerp(-60, -140, u), y: lerp(60, 120, u), z: lerp(1.25, 1.45, ss(u)) };
      let room = rect(-500, -400, 2080, 2700, "url(#gDorm)");
      room += rect(700, 360, 300, 380, "#0a1022") + rect(700, 360, 300, 380, "none", ` stroke="#2a3150" stroke-width="16"`) + glow(850, 520, 260, 0.35, "gMoon");
      room += poly([[700, 740], [1000, 740], [1150, 1760], [560, 1760]], "url(#gBeam)", ` opacity="0.18"`);
      room += rect(-500, 1640, 2080, 700, "#0c0f19");
      // bunks: ours on the left, the others on the right
      const bunk = (x, w) => rect(x, 1180, w, 40, "#2c3a5e") + rect(x, 1220, w, 26, "#1b2236") + rect(x, 760, w, 40, "#2c3a5e") + rect(x, 800, w, 26, "#1b2236") + rect(x - 14, 700, 18, 960, "#3b4250") + rect(x + w - 4, 700, 18, 960, "#3b4250");
      room += bunk(-80, 560) + bunk(640, 520);
      // our boy: sitting, looking at a photo of his family (warm glow in his hands)
      const sit = { hl: 1.45, kl: 1.5, hr: 1.5, kr: 1.45, sl: 0.9, sr: 1.05, el: 0.75, er: 0.6, lean: 0.12, hp: mocking ? 0.55 : 0.35 };
      let boy = person({ x: 220, y: 1180, h: 470, dir: 1, kid: 0.8, anchor: "hip", pose: sit, col: { shirt: "#8090b0", shorts: "#262b3c" } });
      const photoX = 220 + 470 * 0.27, photoY = 1180 - 470 * 0.18;
      boy += glow(photoX, photoY, 110, 0.55, "gWarm") + `<rect x="${F(photoX - 26)}" y="${F(photoY - 20)}" width="52" height="38" fill="#f5e4c5" transform="rotate(-18 ${F(photoX)} ${F(photoY)})"/>`;
      let others = "";
      if (mocking) {
        const bob = (i) => Math.abs(Math.sin(t * 9 + i)) * 10;
        others += person({ x: 760, y: 1180 - bob(0), h: 440, dir: -1, anchor: "hip", pose: { hl: 1.4, kl: 1.4, hr: 1.5, kr: 1.5, sl: 1.55, el: 0.05, sr: 0.5, er: 0.8, lean: -0.15 - 0.1 * Math.sin(t * 9), hp: -0.3 }, col: { shirt: "#3d8c4a" } });
        others += person({ x: 960, y: 760 - bob(1), h: 420, dir: -1, anchor: "hip", pose: { hl: 1.5, kl: 1.3, hr: 1.4, kr: 1.5, sl: 2.2 + 0.3 * Math.sin(t * 8), el: 0.6, sr: 0.3, er: 0.5, lean: -0.2 - 0.12 * Math.sin(t * 9 + 1), hp: -0.4 }, col: { shirt: "#c46a2a" } });
        others += person({ x: 1060, y: 1180 - bob(2), h: 430, dir: -1, anchor: "hip", pose: { hl: 1.45, kl: 1.45, hr: 1.5, kr: 1.4, sl: 1.5, el: 0.1, sr: 0.9, er: 0.7, lean: -0.1 - 0.1 * Math.sin(t * 10 + 2), hp: -0.25 }, col: { shirt: "#7a3f8c" } });
        const bubble = (x, y, str, a, rot) => { const v = sr(t, a, a + 0.18); if (v <= 0) return ""; const w = measure(str, "anton", 64, 2) + 60; return `<g opacity="${v.toFixed(3)}" transform="translate(${x} ${y}) rotate(${rot}) scale(${(0.7 + 0.3 * v).toFixed(3)})"><rect x="${F(-w / 2)}" y="-58" width="${F(w)}" height="92" rx="46" fill="#f2f2f2"/><path d="M10 30 L40 30 L18 64 Z" fill="#f2f2f2"/>${text(str, { font: "anton", size: 64, y: 12, fill: "#14161c", ls: 2 })}</g>`; };
        others += bubble(820, 560, "HAHA!", T.MOCK + 0.25, -6) + bubble(400, 470, "SAY IT AGAIN!", T.MOCK + 0.9, 4) + bubble(860, 300, "HAHAHA", T.MOCK + 1.6, -3);
      }
      let s = layer(cam, 1, room + boy + others);
      s += rect(0, 0, W, H, "#0a1a3a", ` opacity="0.18"`);
      return s + tag(t, 24.6, 28.7, "AGE 12 · FOOTBALL ACADEMY, LISBON");
    }
    // close-up: lacing his boots at sunrise — he refuses to quit
    const u = ramp(t, T.BOOTS, SC[3]), cam = { x: 0, y: 0, z: lerp(1.0, 1.12, ss(u)) };
    let bg = rect(-300, -300, 1680, 2520, "#1a1210") + glow(1000, 500, 900, 0.5, "gWarm") + poly([[1080, 200], [1080, 700], [0, 1900], [0, 1300]], "url(#gBeamW)", ` opacity="0.35"`);
    bg += rect(-300, 1380, 1680, 900, "#24180f");
    const pull = Math.sin(t * 5) * 0.5 + 0.5;
    let boot = `<path d="M200 1420 Q190 1150 330 1060 L560 1040 Q620 1180 760 1250 Q980 1300 980 1420 L980 1470 L200 1470 Z" fill="#141414"/>`;
    boot += rect(200, 1460, 790, 34, "#e9e9e9", ` rx="10"`);
    for (let i = 0; i < 6; i++) boot += circ(395 + i * 52, 1110 + i * 26, 7, "#888");
    for (let i = 0; i < 5; i++) boot += line([395 + i * 52, 1110 + i * 26], [447 + i * 52, 1136 + i * 26 - 40], "#f2f2f2", 7);
    const lx1 = 395 - 40 - pull * 60, ly1 = 1060 - pull * 120, lx2 = 395 + 70 + pull * 50, ly2 = 1000 - pull * 140;
    boot += `<path d="M395 1110 Q370 1060 ${F(lx1)} ${F(ly1)}" stroke="#f2f2f2" stroke-width="7" fill="none"/><path d="M395 1110 Q420 1040 ${F(lx2)} ${F(ly2)}" stroke="#f2f2f2" stroke-width="7" fill="none"/>`;
    boot += line([lx1, ly1 - 10], [lx1 - 420, ly1 - 160], "#b9835c", 70) + line([lx1 - 300, ly1 - 115], [lx1 - 700, ly1 - 260], "#8090b0", 110) + circ(lx1, ly1 - 10, 48, "#c28d65") + line([lx2, ly2 - 10], [lx2 + 420, ly2 - 200], "#a7754f", 70) + line([lx2 + 300, ly2 - 150], [lx2 + 700, ly2 - 330], "#7383a3", 110) + circ(lx2, ly2 - 10, 48, "#b07e58");
    let s = layer(cam, 0.5, bg) + layer(cam, 1, boot);
    return s + title(["HE REFUSED", "TO GIVE UP."], t, T.BOOTS + 0.35, SC[3] - 0.05, 420, 128);
  }

  // ================================================================== SCENE 4 — the setback (30.9–41.9)
  function ecgPath(t, x0, w, y0, amp, flat = 0) {
    let d = "";
    for (let i = 0; i <= 120; i++) {
      const x = i / 120, ph = ((x * 3 - t * 1.2) % 1 + 1) % 1;
      const beat = ph > 0.42 && ph < 0.5 ? (ph < 0.45 ? -1 : ph < 0.47 ? 0.65 : -0.1) : ph > 0.6 && ph < 0.7 ? -0.16 * Math.sin((ph - 0.6) * 31) : 0;
      d += (i ? "L" : "M") + F(x0 + x * w) + " " + F(y0 + beat * amp * (1 - flat));
    }
    return d;
  }
  function sceneSetback(t) {
    if (t < T.MONITOR) {
      const u = ramp(t, SC[3], T.MONITOR), cam = { x: lerp(0, 120, ss(u)), y: lerp(0, -40, u), z: lerp(1.0, 1.28, ss(u)) };
      const sinceBeat = ((t - SC[3] - 0.3) * 1.2 % 1 + 1) % 1, pulse = Math.exp(-sinceBeat * 6);
      let room = rect(-400, -400, 1880, 2720, "url(#gHosp)");
      // window with blinds: slatted moonlight across the room
      room += rect(90, 380, 360, 440, "#0b1b2e");
      for (let i = 0; i < 11; i++) room += rect(90, 380 + i * 40, 360, 18, "#1c3a52");
      for (let i = 0; i < 8; i++) room += poly([[90, 420 + i * 48], [450, 400 + i * 48], [1300, 1500 + i * 70], [700, 1560 + i * 70]], "#9fd6ff", ` opacity="0.045"`);
      room += rect(-400, 1500, 1880, 820, "#0a1416");
      // bed + the teenager lying on his back (profile, head to the left)
      room += rect(120, 1260, 840, 90, "#d9e2e6") + rect(140, 1350, 800, 140, "#5f6b70") + rect(120, 1180, 30, 320, "#8a969b") + rect(930, 1220, 30, 280, "#8a969b");
      room += rect(150, 1205, 150, 70, "#eef2f4", ` rx="30"`);
      room += person({ x: 300, y: 1238, h: 560, dir: 1, kid: 0.3, anchor: "hip", rot: 0, pose: { lean: -1.57, hl: 1.57, kl: 0, hr: 1.55, kr: 0, sl: 1.3, el: 0.25, sr: 1.4, er: 0.3, hp: 0.05 }, col: { shirt: "#9fb6c4", shorts: "#6f8796" } });
      room += `<path d="M330 1210 Q520 1150 760 1200 L910 1250 L910 1290 L330 1290 Z" fill="#4f7891"/>`;
      room += glow(420, 1205, 120, 0.45 * pulse, "gRed");
      // IV stand
      room += line([1010, 700], [1010, 1500], "#7f8b90", 8) + rect(975, 700, 70, 110, "#cfe7ee", ` rx="16" opacity="0.6"`) + `<path d="M1010 810 Q990 1000 900 1180" stroke="#cfe7ee" stroke-opacity="0.5" stroke-width="4" fill="none"/>`;
      // heart monitor
      let mon = rect(-170, -115, 340, 230, "#141a1d", ` rx="18"`) + rect(-150, -95, 300, 190, "#02100a") + `<g clip-path="url(#cMon)"><rect x="-150" y="-95" width="300" height="190" fill="url(#pGrid)"/><path d="${ecgPath(t, -150, 300, 10, 70)}" stroke="#3cff8c" stroke-width="5" fill="none"/></g>`;
      mon += text("72", { font: "inter", size: 40, x: 128, y: -52, anchor: "end", fill: "#3cff8c" }) + glow(0, 0, 300, 0.35, "gTeal");
      room += `<g transform="translate(800 820)">${mon}</g>` + line([800, 935], [800, 1500], "#59646a", 10);
      let s = layer(cam, 1, room);
      s += rect(0, 0, W, H, "#ff1030", ` opacity="${(0.07 * pulse * sr(t, 33.4, 34.0)).toFixed(3)}"`);
      return s + tag(t, 31.3, 36.2, "AGE 15 · A HEART CONDITION");
    }
    if (t < T.SPRINT) {
      // the ECG fills the frame; the line steadies, then becomes a horizon
      const u = ramp(t, T.MONITOR, T.SPRINT), flat = sr(t, T.SPRINT - 0.55, T.SPRINT - 0.1);
      let s = rect(0, 0, W, H, "#010805") + `<rect x="0" y="0" width="${W}" height="${H}" fill="url(#pGrid)"/>`;
      s += glow(540, 960, 900, 0.25, "gTeal");
      s += `<g transform="translate(540 960) scale(${(1 + 0.15 * u).toFixed(3)}) translate(-540 -960)"><path d="${ecgPath(t, -60, 1200, 960, 360, flat)}" stroke="#3cff8c" stroke-width="10" fill="none" stroke-linejoin="round"/></g>`;
      s += rect(0, 0, W, H, "#ffffff", ` opacity="${(0.9 * sr(t, T.SPRINT - 0.2, T.SPRINT)).toFixed(3)}"`);
      return s;
    }
    // back on the pitch: one slow-motion second, then full speed
    const slowEnd = T.SPRINT + 1.0;
    const tt = t < slowEnd ? (t - T.SPRINT) * 0.35 : 0.35 + (t - slowEnd);
    const bx = 160 + tt * 470;
    const cam = { x: bx - 470, y: 0, z: t < slowEnd ? lerp(1.25, 1.12, ramp(t, T.SPRINT, slowEnd)) : 1.05 };
    let sky = rect(-800, -600, 4000, 2000, "url(#gMorning)") + glow(900, 1060, 700, 0.75) + circ(900, 1060, 90, "#fff8e0");
    const hills = `<path d="M-800 1160 Q-300 1000 200 1090 T1200 1060 T2200 1100 T3400 1080 L3400 1240 L-800 1240 Z" fill="#4c7a5a"/>`;
    let trees = ""; for (let i = 0; i < 30; i++) { const x = -700 + i * 140 + hash(i) * 60; trees += circ(x, 1180 - hash(i + 9) * 30, 50 + hash(i + 3) * 30, "#2f5a3c"); }
    let grass = rect(-800, 1220, 4400, 1000, "url(#gGrass)");
    for (let i = 0; i < 28; i++) grass += rect(-800 + i * 160, 1220, 80, 1000, "#ffffff", ` opacity="0.04"`);
    for (let i = 0; i < 7; i++) grass += `<path d="M${200 + i * 300} 1640 l18 -46 l18 46 Z" fill="#ff7a1a"/>`;
    let fg = `<ellipse cx="${F(bx + 10)}" cy="1708" rx="90" ry="14" fill="#000" opacity="0.25"/>` + person({ x: bx, y: 1700, h: 600, dir: 1, kid: 0.2, pose: runPose(tt * 11, 1), col: { shirt: "#f2f2f2", shorts: "#f2f2f2", socks: "#f2f2f2" } });
    if (t > slowEnd) { for (let i = 0; i < 14; i++) { const y = 1100 + hash(i) * 600, x = bx - 200 - hash(i + 4) * 700 - ((t * 2400 + i * 140) % 300); fg += line([x, y], [x + 240, y], "#ffffff", 4, ` opacity="${(0.35 * hash(i + 2)).toFixed(2)}"`); } }
    let s = layer(cam, 0.08, sky) + layer(cam, 0.25, hills + trees) + layer(cam, 1, grass + fg);
    s += rect(0, 0, W, H, "#ffffff", ` opacity="${(0.9 * (1 - sr(t, T.SPRINT, T.SPRINT + 0.35))).toFixed(3)}"`);
    return s;
  }

  // ================================================================== SCENES 5–6 — the rise and the reveal (41.9–60)
  const R5 = rng(41);
  const FLASHES = Array.from({ length: 120 }, () => [R5() * 1900 - 410, 560 + R5() * 520, R5()]);
  const CONF = Array.from({ length: 110 }, () => [R5(), R5(), R5(), R5()]);
  function stadium(t, cam, lights = 1, flashes = 0.4, crowdLit = 0.7) {
    let s = layer(cam, 0.1, rect(-800, -600, 2700, 2100, "url(#gStadSky)"));
    // stands: three tiers of crowd
    let st = "";
    const tiers = [[520, 230, 1.0], [760, 250, 0.9], [1020, 200, 0.8]];
    for (const [y, h, k] of tiers) st += `<rect x="-600" y="${y}" width="2300" height="${h}" fill="url(#pCrowd)"/>` + rect(-600, y + h - 8, 2300, 14, "#0b0f18");
    st += `<rect x="-600" y="520" width="2300" height="700" fill="#0a1020" opacity="${(0.85 - 0.6 * crowdLit * lights).toFixed(3)}"/>`;
    st += rect(-600, 470, 2300, 60, "#05070c");
    for (const [x, y, k] of FLASHES) { const on = hash(k * 999 + Math.floor(t * 20)) < flashes * 0.22; if (on) st += circ(x, y, 5 + k * 4, "#ffffff") + glow(x, y, 26, 0.7); }
    s += layer(cam, 0.35, st);
    // floodlight towers
    let fl = "";
    for (const x of [-180, 1260]) {
      fl += rect(x - 6, 120, 12, 420, "#0c0f16");
      for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) fl += rect(x - 75 + c * 25, 70 + r * 22, 19, 16, lights > 0.3 ? "#f4f8ff" : "#2c3344", ` opacity="${(0.25 + 0.75 * lights).toFixed(3)}"`);
      fl += glow(x, 110, 520, 0.85 * lights) + poly([[x - 60, 150], [x + 60, 150], [540 + (540 - x) * -0.2 + 300, 1900], [540 + (540 - x) * -0.2 - 300, 1900]], "url(#gBeam)", ` opacity="${(0.12 * lights).toFixed(3)}"`);
    }
    s += layer(cam, 0.45, fl);
    // pitch
    let p = rect(-800, 1180, 2700, 1100, "url(#gPitch)");
    for (let i = 0; i < 10; i++) p += rect(-800 + i * 270, 1180, 135, 1100, "#ffffff", ` opacity="0.025"`);
    p += line([-800, 1260], [1900, 1260], "#e8f0e0", 6, ` opacity="${(0.25 * lights + 0.05).toFixed(3)}"`);
    p += `<ellipse cx="540" cy="1560" rx="${F(520)}" ry="150" fill="url(#gGlow)" opacity="${(0.18 * lights).toFixed(3)}"/>`;
    s += layer(cam, 1, p);
    return s;
  }
  function confetti(t, t0, n = 110) {
    let s = "";
    for (let i = 0; i < n; i++) {
      const [a, b, c, d] = CONF[i % CONF.length], age = t - t0;
      if (age < 0) break;
      const y = -60 + ((age * (220 + c * 260) + d * 1900) % 2000), x = a * 1080 + Math.sin(age * 2 + i) * 40;
      s += `<rect x="${F(x)}" y="${F(y)}" width="18" height="10" fill="${i % 3 ? "#f0c25a" : "#fff3c4"}" transform="rotate(${F(age * 200 * (b - 0.5) + i * 30)} ${F(x + 9)} ${F(y + 5)})"/>`;
    }
    return s;
  }
  function sceneRise(t) {
    let s = "";
    if (t < T.M_SHOT) {
      // alone at night under a single lamp, striking the ball against a wall, again and again
      const u = ramp(t, SC[4], T.M_SHOT), cam = { x: 0, y: 0, z: lerp(1.15, 1.05, u) };
      let bg = rect(-300, -300, 1680, 2520, "#04060a") + glow(820, 300, 160, 1) + rect(812, 290, 16, 1400, "#111") + poly([[790, 320], [850, 320], [1300, 1750], [-100, 1750]], "url(#gLampCone)", ` opacity="0.45"`);
      bg += rect(-300, 1700, 1680, 600, "#0f1a12") + rect(980, 900, 160, 820, "#3a2e28") + `<ellipse cx="540" cy="1720" rx="520" ry="80" fill="url(#gGlow)" opacity="0.18"/>`;
      const ph = ((t - SC[4]) / 0.85) % 1, kick = ph < 0.3 ? ph / 0.3 : 1;
      const pose = { hl: -0.3, kl: 0.05, hr: lerp(-0.9, 1.3, ss(cl(kick))), kr: lerp(1.4, 0.05, ss(cl(kick))), sl: 0.9, sr: -0.6, el: 0.3, er: 0.3, lean: -0.1 };
      bg += person({ x: 420, y: 1720, h: 640, dir: 1, sil: true, pose });
      const bx = ph < 0.3 ? 520 : ph < 0.62 ? lerp(520, 960, (ph - 0.3) / 0.32) : lerp(960, 560, (ph - 0.62) / 0.38), by = 1690 - Math.sin(cl((ph - 0.3) / 0.7) * Math.PI) * 120;
      bg += ball(bx, by, 32, t * 8, 0.6);
      s = layer(cam, 1, bg);
    } else if (t < T.M_CROWD) {
      // the shot: ball into the net, the stadium explodes
      const u = ramp(t, T.M_SHOT, T.M_CROWD), sh = shake(t, T.M_SHOT + 0.8, 18), cam = { x: lerp(-60, 40, u) + sh[0], y: sh[1], z: lerp(1.05, 1.15, u) };
      s = stadium(t, cam, 1, t > T.M_SHOT + 0.8 ? 1 : 0.3, 0.6);
      const kick = ramp(t, T.M_SHOT, T.M_SHOT + 0.35);
      let fg = person({ x: 250, y: 1760, h: 700, dir: 1, sil: true, pose: { hl: -0.2, kl: 0.1, hr: lerp(-1.0, 1.45, ss(kick)), kr: lerp(1.5, 0.1, ss(kick)), sl: 1.0, sr: -0.8, el: 0.2, er: 0.2, lean: -0.15 } });
      // goal + net on the right, bulging when the ball hits
      const hit = ramp(t, T.M_SHOT + 0.8, T.M_SHOT + 1.3), bulge = Math.sin(hit * Math.PI) * 70 * (1 - hit * 0.4);
      fg += `<path d="M720 1220 Q${F(880 + bulge)} ${F(1420 + bulge * 0.3)} 1050 1700 L1100 1700 L1100 1220 Z" fill="url(#pNet)"/>` + rect(712, 1210, 16, 500, "#f2f2f2") + rect(712, 1206, 420, 16, "#f2f2f2");
      const fly = ramp(t, T.M_SHOT + 0.35, T.M_SHOT + 0.8);
      const bxx = t < T.M_SHOT + 0.35 ? 370 : t < T.M_SHOT + 0.8 ? lerp(370, 900, fly) : 920 + bulge * 0.6, byy = t < T.M_SHOT + 0.35 ? 1728 : t < T.M_SHOT + 0.8 ? lerp(1728, 1420, fly) - Math.sin(fly * Math.PI) * 120 : 1440 + hit * 220;
      fg += ball(bxx, byy, 30, t * 20, 0.7);
      s += layer(cam, 1, fg);
      s += rect(0, 0, W, H, "#ffffff", ` opacity="${(0.5 * (1 - ramp(t, T.M_SHOT + 0.8, T.M_SHOT + 1.1)) * (t > T.M_SHOT + 0.8 ? 1 : 0)).toFixed(3)}"`);
    } else if (t < T.M_CUP) {
      const u = ramp(t, T.M_CROWD, T.M_CUP), cam = { x: 0, y: lerp(40, 0, u), z: lerp(1.0, 1.12, ss(u)) };
      s = stadium(t, cam, 1, 1, 0.9);
      const jump = Math.max(0, Math.sin(ramp(t, T.M_CROWD + 0.1, T.M_CROWD + 0.7) * Math.PI)) * 70;
      s += layer(cam, 1, glow(540, 1200, 520, 0.35) + personFront({ x: 540, y: 1720 - jump, h: 760, sil: true, armL: 2.6, armR: 2.6, elL: 0.2, elR: 0.2, spread: 0.12 }));
    } else if (t < T.M_AWARD) {
      // the trophy
      const u = ramp(t, T.M_CUP, T.M_AWARD), cam = { x: 0, y: 0, z: lerp(1.1, 1.2, u) };
      s = stadium(t, cam, 1, 0.8, 0.8);
      const lift = ss(ramp(t, T.M_CUP, T.M_CUP + 0.6)) * 60;
      let cup = `<g transform="translate(540 ${F(780 - lift)})"><path d="M-110 -170 L110 -170 Q105 10 30 60 L30 150 L80 200 L-80 200 L-30 150 L-30 60 Q-105 10 -110 -170 Z" fill="url(#gSilver)"/>` +
        `<path d="M-110 -150 Q-230 -170 -210 -40 Q-190 40 -70 40" stroke="url(#gSilver)" stroke-width="24" fill="none"/><path d="M110 -150 Q230 -170 210 -40 Q190 40 70 40" stroke="url(#gSilver)" stroke-width="24" fill="none"/>` +
        `<rect x="-90" y="200" width="180" height="40" fill="#8a94a3"/><path d="M-60 -150 L-40 0" stroke="#fff" stroke-opacity="0.8" stroke-width="10"/></g>`;
      let fg = glow(540, 760 - lift, 380, 0.5) + personFront({ x: 540, y: 1760, h: 780, sil: true, armL: 2.75, armR: 2.75, elL: 0.35, elR: 0.35, spread: 0.1 }) + cup;
      s += layer(cam, 1, fg) + confetti(t, T.M_CUP);
    } else if (t < T.M_ALONE) {
      // the golden ball award, under a spotlight
      const u = ramp(t, T.M_AWARD, T.M_ALONE), cam = { x: 0, y: 0, z: lerp(1.0, 1.15, ss(u)) };
      let st = rect(-300, -300, 1680, 2520, "#030305") + poly([[470, -100], [610, -100], [900, 1500], [180, 1500]], "url(#gLampCone)", ` opacity="0.4"`);
      st += `<ellipse cx="540" cy="1500" rx="380" ry="70" fill="url(#gGlow)" opacity="0.35"/>` + `<path d="M420 1500 L660 1500 L620 1180 L460 1180 Z" fill="#14110c"/>` + rect(440, 1150, 200, 40, "#2a2316");
      const spin = t * 0.8;
      let gb = circ(540, 990, 160, "url(#gGold)");
      for (let i = 0; i < 5; i++) { const x = 540 + Math.sin(spin + i * 1.2566) * 120; if (Math.cos(spin + i * 1.2566) > 0) gb += `<ellipse cx="${F(x)}" cy="${F(990 + (i % 2 ? 50 : -40))}" rx="${F(46 * Math.cos(spin + i * 1.2566))}" ry="50" fill="none" stroke="#9a6a1a" stroke-width="5" opacity="0.6"/>`; }
      gb += circ(490, 930, 44, "#ffffff", ` opacity="0.45"`) + glow(540, 990, 360, 0.45);
      for (let i = 0; i < 18; i++) { const a = hash(i) * 6.28, r = 200 + ((t * 60 + i * 37) % 160); gb += circ(540 + Math.cos(a) * r, 990 + Math.sin(a) * r, 4, "#ffe9a6", ` opacity="${(0.8 * hash(i + Math.floor(t * 8))).toFixed(2)}"`); }
      s = layer(cam, 1, st + gb);
    } else {
      s = sceneAlone(t);
    }
    // the record, stacked in gold
    s += `<g>` + rect(0, 130, W, 520, "url(#gShadeT)", ` opacity="${(0.6 * sr(t, 43.3, 43.8) * (1 - sr(t, 50.5, 50.8))).toFixed(3)}"`) + `</g>`;
    s += stat(t, 43.35, T.M_ALONE, 290, "5×", "BALLON D'OR") + stat(t, 45.1, T.M_ALONE, 420, "5×", "CHAMPIONS LEAGUE") + stat(t, 47.2, T.M_ALONE, 550, "900+", "CAREER GOALS");
    return s;
  }
  function sceneAlone(t) {
    // empty stadium, one figure seen from behind; silence; the turn; the eruption
    const u = ramp(t, T.M_ALONE, T.SILENCE);
    const sh = shake(t, T.ERUPT, 22, 0.7);
    const cam = { x: sh[0], y: lerp(120, 40, ss(ramp(t, T.M_ALONE, T.TURN))) + sh[1], z: lerp(1.0, 1.22, ss(ramp(t, T.M_ALONE, T.ERUPT))) + 0.06 * sr(t, T.ERUPT, T.ERUPT + 0.5) };
    const dim = t < T.SILENCE ? 1 : t < T.ERUPT ? 0.25 : 1;
    const erupt = sr(t, T.ERUPT, T.ERUPT + 0.3);
    let s = stadium(t, cam, dim, t < T.SILENCE ? 0.15 : t < T.ERUPT ? 0 : 1, t < T.ERUPT ? 0.55 * dim : 1);
    const turn = ramp(t, T.TURN, T.TURN + 0.9);
    const front = turn > 0.5;
    const sx = Math.max(0.08, Math.abs(Math.cos(turn * Math.PI)));
    const arms = 0.14 + 2.5 * ss(ramp(t, T.ERUPT, T.ERUPT + 0.55));
    let fig = glow(540, 1260, 560, (0.25 + 0.35 * erupt) * (t < T.SILENCE ? 1 : t < T.ERUPT ? 0.6 : 1));
    fig += `<ellipse cx="540" cy="1722" rx="170" ry="22" fill="#000" opacity="0.6"/>`;
    fig += personFront({ x: 540, y: 1720, h: 780, sil: true, back: !front, turn: sx, armL: arms, armR: arms, elL: 0.15, elR: 0.15, spread: 0.07 });
    s += layer(cam, 1, fig);
    if (t > T.ERUPT) s += confetti(t, T.ERUPT, 110);
    s += rect(0, 0, W, H, "#000", ` opacity="${(0.45 * sr(t, T.SILENCE - 0.1, T.SILENCE + 0.15) * (1 - erupt)).toFixed(3)}"`);
    s += rect(0, 0, W, H, "#ffffff", ` opacity="${(0.85 * (1 - ramp(t, T.ERUPT, T.ERUPT + 0.45)) * (t >= T.ERUPT ? 1 : 0)).toFixed(3)}"`);
    if (t >= T.ERUPT) {
      // the name, in gold
      const a = ramp(t, T.ERUPT, T.ERUPT + 0.6), sc = 1.25 - 0.25 * ss(a);
      s += rect(0, 150, W, 560, "url(#gShadeT)", ` opacity="0.7"`);
      s += `<g opacity="${ss(a).toFixed(3)}" transform="translate(540 400) scale(${sc.toFixed(4)}) translate(-540 -400)">` + glow(540, 360, 520, 0.35) +
        text("CRISTIANO", { font: "anton", size: 150, x: 540, y: 330, fill: "url(#gGold)", stroke: "#000", sw: 12, ls: 6 }) +
        text("RONALDO", { font: "anton", size: 150, x: 540, y: 490, fill: "url(#gGold)", stroke: "#000", sw: 12, ls: 6 }) + `</g>`;
      const b = sr(t, 56.9, 57.4);
      if (b > 0) s += `<g opacity="${b.toFixed(3)}">` + text("THE WORLD SAW A POOR BOY.", { font: "anton", size: 62, x: 540, y: 610, fill: "#ffffff", stroke: "#000", sw: 10, ls: 3 }) + text("HE SAW A FUTURE LEGEND.", { font: "anton", size: 62, x: 540, y: 690, fill: "url(#gGold)", stroke: "#000", sw: 10, ls: 3 }) + `</g>`;
      const c = sr(t, 57.6, 58.1);
      if (c > 0) s += op(c * 0.75, text("Based on his publicly reported life story. Some scenes are dramatized.", { font: "inter", size: 22, x: 540, y: 1870, fill: "#cfd6e4" }));
    }
    return s;
  }

  // ------------------------------------------------------------------ frame assembly
  const SCENES = [sceneHook, sceneBeginning, sceneSacrifice, sceneSetback, sceneRise, sceneAlone];
  function frame(t) {
    t = cl(t, 0, DUR - 1e-4);
    let k = 0; while (k < 5 && t >= SC[k + 1]) k++;
    let s = SCENES[k](t);
    s += captions(t);
    // transitions: open from black, hard black cut after the hook, dips at scene changes, fade out
    let black = 1 - sr(t, 0, T.BLACK_IN);
    if (t >= T.BLACK_OUT && t < SC[1] + 0.12) black = Math.max(black, t < SC[1] ? 1 : 1 - ramp(t, SC[1], SC[1] + 0.12));
    for (const b of [SC[2], SC[3], SC[4], T.DORM]) { const d = Math.abs(t - b); if (d < 0.22) black = Math.max(black, 1 - d / 0.22); }
    for (const b of [T.FATHER, T.ALONE, T.MOCK, T.BOOTS, T.MONITOR, T.M_SHOT, T.M_CROWD, T.M_CUP, T.M_AWARD, T.M_ALONE]) { const d = t - b; if (d >= 0 && d < 0.18) black = Math.max(black, 0.55 * (1 - d / 0.18)); }
    black = Math.max(black, sr(t, 59.55, 60));
    if (black > 0.001) s += rect(0, 0, W, H, "#000", ` opacity="${black.toFixed(3)}"`);
    return s;
  }
  // mounts the film into an <svg> element; returns {renderAt}
  function mount(svg) {
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W); svg.setAttribute("height", H);
    svg.innerHTML = `<defs>${DEFS}</defs><rect width="${W}" height="${H}" fill="#000"/><g class="world"></g>`;
    const world = svg.querySelector(".world");
    let last = -1;
    return { renderAt(t) { if (t === last) return; last = t; world.innerHTML = frame(t); } };
  }
  window.FILM = { W, H, DUR, FPS, mount, frame, T, SC };
})();
