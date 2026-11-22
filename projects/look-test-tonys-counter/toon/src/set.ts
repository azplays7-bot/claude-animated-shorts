// Look test: Tony's counter, fully dressed. Room shell (glossy reflective checker floor, subway-tile wall with grout
// relief, ceiling tiles, window with blinds, door + glowing exit sign), the front counter (steel top, logo front,
// customer display, cups with price tents, tray, napkins, straws, tip jar), the kitchen line behind (soda fountain,
// cup towers, fryer with baskets, heat lamp, ticket rail, trays, bags), wall shelves, posters, clock, pendant lights,
// glowing menu screens (the facts live here), steam and dust.
import * as THREE from "three";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { ANTON, INTER, M, MP, STEEL, BRUSHED, glow, canvas, rep, rbox, cyl, put, grp, rr, text, burgerIcon, rng } from "./kit";

export const ROOM = { x0: -3.2, x1: 3.2, z0: -2.3, z1: 4.6, h: 3.1 };

// ---------------- textures ----------------
const floorTex = () => canvas(512, 512, (g) => {
  const r = rng(3);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    g.fillStyle = (i + j) % 2 ? "#1f7a4d" : "#ece6d8"; g.fillRect(i * 256, j * 256, 256, 256);
  }
  for (let k = 0; k < 1400; k++) { g.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,255,255"},${0.03 + r() * 0.04})`; g.fillRect(r() * 512, r() * 512, 2 + r() * 4, 2 + r() * 4); }
  g.strokeStyle = "rgba(60,60,60,0.55)"; g.lineWidth = 4; for (const p of [0, 256, 512]) { g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 512); g.stroke(); g.beginPath(); g.moveTo(0, p); g.lineTo(512, p); g.stroke(); }
});
const subway = (bump: boolean) => canvas(1024, 1024, (g) => {
  const r = rng(7);
  g.fillStyle = bump ? "#000" : "#b9bcc0"; g.fillRect(0, 0, 1024, 1024);
  const tw = 128, th = 64;
  for (let row = 0; row < 16; row++) for (let c = -1; c < 9; c++) {
    const x = c * tw + (row % 2 ? tw / 2 : 0) + 3, y = row * th + 3;
    if (bump) { const gr = g.createLinearGradient(x, y, x, y + th); gr.addColorStop(0, "#d8d8d8"); gr.addColorStop(0.15, "#ffffff"); gr.addColorStop(0.85, "#f0f0f0"); gr.addColorStop(1, "#bdbdbd"); g.fillStyle = gr; }
    else { const v = 238 + Math.floor(r() * 12); g.fillStyle = `rgb(${v},${v},${v + 2})`; }
    rr(g, x, y, tw - 6, th - 6, 8); g.fill();
  }
}, !bump);
const ceilingTex = () => canvas(512, 512, (g) => {
  const r = rng(11);
  g.fillStyle = "#e9e9e6"; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 4000; k++) { g.fillStyle = `rgba(120,120,120,${r() * 0.15})`; g.fillRect(r() * 512, r() * 512, 2, 2); }
  g.strokeStyle = "#9da1a6"; g.lineWidth = 10; g.strokeRect(0, 0, 512, 512);
});
const skyTex = () => canvas(1024, 768, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 768); gr.addColorStop(0, "#7fc0ff"); gr.addColorStop(0.65, "#d8ecff"); gr.addColorStop(1, "#f4e6cf"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 768);
  const r = rng(5);
  for (let k = 0; k < 9; k++) { const w = 80 + r() * 140, h = 180 + r() * 360, x = k * 120 - 40; g.fillStyle = `rgba(${150 + k * 6},${170 + k * 5},${200},0.9)`; g.fillRect(x, 768 - h, w, h);
    g.fillStyle = "rgba(255,255,230,0.55)"; for (let i = 0; i < 6; i++) for (let j = 0; j < h / 40 - 1; j++) if (r() < 0.6) g.fillRect(x + 10 + i * (w - 20) / 6, 768 - h + 14 + j * 40, 9, 16); }
  g.fillStyle = "#3f8f4f"; for (let k = 0; k < 14; k++) { g.beginPath(); g.ellipse(k * 80, 760, 70, 50, 0, 0, 7); g.fill(); }
});

const MENU_W = 1100, MENU_H = 600;
const menuBg = (g: CanvasRenderingContext2D, title: string, col: string) => {
  const gr = g.createLinearGradient(0, 0, 0, MENU_H); gr.addColorStop(0, "#0d1a2e"); gr.addColorStop(1, "#08101c"); g.fillStyle = gr; g.fillRect(0, 0, MENU_W, MENU_H);
  g.strokeStyle = "rgba(90,140,220,0.12)"; g.lineWidth = 2; for (let y = 0; y < MENU_H; y += 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(MENU_W, y); g.stroke(); }
  g.fillStyle = col; g.fillRect(0, 0, MENU_W, 112); text(g, title, MENU_W / 2, 60, 86, "#ffffff");
};
const drinksTex = (hi: number, pulse: number) => canvas(MENU_W, MENU_H, (g) => {
  menuBg(g, "DRINKS", "#d8262e");
  const rows: [string, string][] = [["SMALL", "$2.00"], ["MEDIUM", "$3.50"], ["LARGE", "$4.00"]];
  rows.forEach(([n, p], i) => {
    const y = 190 + i * 140;
    if (i === hi) { g.fillStyle = "rgba(255,201,40,0.92)"; rr(g, 40, y - 58, MENU_W - 80, 116, 20); g.fill(); }
    const c = i === hi ? "#1a1208" : "#ffffff";
    // cup icon, sized like the cup
    const s = 0.62 + i * 0.2;
    g.fillStyle = i === hi ? "#1a1208" : "#e8eef8"; g.beginPath(); g.moveTo(110 - 30 * s, y - 45 * s); g.lineTo(110 + 30 * s, y - 45 * s); g.lineTo(110 + 22 * s, y + 45 * s); g.lineTo(110 - 22 * s, y + 45 * s); g.closePath(); g.fill();
    g.fillStyle = "#d8262e"; g.fillRect(110 - 25 * s, y - 10 * s, 50 * s, 22 * s);
    text(g, n, 200, y + 4, 84, c, ANTON, "left"); text(g, p, MENU_W - 70, y + 4, 92, i === hi ? "#1a1208" : "#ffd23f", ANTON, "right");
    if (i === 1) { g.save(); g.translate(610, y - 34); g.rotate(-0.12); g.scale(1 + 0.12 * pulse, 1 + 0.12 * pulse); g.fillStyle = "#d8262e"; rr(g, -70, -30, 140, 60, 14); g.fill(); text(g, "NEW!", 0, 3, 46, "#ffffff"); g.restore(); }
  });
});
const burgersTex = () => canvas(MENU_W, MENU_H, (g) => {
  menuBg(g, "BURGERS", "#1f8a4a");
  [["CLASSIC", "$5.00"], ["DOUBLE", "$7.00"], ["CHEESE", "$6.00"]].forEach(([n, p], i) => {
    const y = 195 + i * 138; burgerIcon(g, 115, y + 10, 110 + i * 6);
    text(g, n, 210, y + 4, 80, "#ffffff", ANTON, "left"); text(g, p, MENU_W - 70, y + 4, 88, "#ffd23f", ANTON, "right");
  });
});
const sidesTex = () => canvas(MENU_W, MENU_H, (g) => {
  menuBg(g, "SIDES", "#e08a18");
  [["FRIES", "$3.00"], ["ONION RINGS", "$3.50"], ["SHAKE", "$4.50"]].forEach(([n, p], i) => {
    const y = 195 + i * 138;
    g.fillStyle = "#d8262e"; g.beginPath(); g.moveTo(85, y - 20); g.lineTo(145, y - 20); g.lineTo(138, y + 45); g.lineTo(92, y + 45); g.fill();
    g.fillStyle = "#ffd23f"; for (let k = 0; k < 6; k++) g.fillRect(88 + k * 9, y - 55 + (k % 3) * 7, 7, 45);
    text(g, n, 200, y + 4, 76, "#ffffff", ANTON, "left"); text(g, p, MENU_W - 70, y + 4, 88, "#ffd23f", ANTON, "right");
  });
});
const posTex = () => canvas(512, 300, (g) => {
  g.fillStyle = "#0b1626"; g.fillRect(0, 0, 512, 300);
  g.fillStyle = "#1f8a4a"; g.fillRect(0, 0, 512, 54); text(g, "ORDER #42", 256, 29, 36, "#ffffff", INTER);
  text(g, "1  MEDIUM SODA", 30, 108, 34, "#e8eef8", INTER, "left");
  g.strokeStyle = "rgba(255,255,255,0.2)"; g.lineWidth = 2; g.beginPath(); g.moveTo(24, 150); g.lineTo(488, 150); g.stroke();
  text(g, "TOTAL", 30, 214, 44, "#ffffff", ANTON, "left"); text(g, "$3.50", 482, 214, 76, "#ffd23f", ANTON, "right");
});
const logoFront = () => canvas(2048, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#23955a"); gr.addColorStop(1, "#1a7546"); g.fillStyle = gr; g.fillRect(0, 0, 2048, 512);
  g.strokeStyle = "rgba(0,0,0,0.18)"; g.lineWidth = 6; for (let x = 0; x < 2048; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); }
  g.fillStyle = "#f4efe2"; rr(g, 524, 86, 1000, 300, 60); g.fill(); g.strokeStyle = "#d8262e"; g.lineWidth = 16; rr(g, 540, 102, 968, 268, 50); g.stroke();
  burgerIcon(g, 680, 250, 170);
  g.font = `190px ${ANTON}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round"; g.strokeStyle = "#2a1517"; g.lineWidth = 18; g.strokeText("TONY'S", 1150, 236); g.fillStyle = "#d8262e"; g.fillText("TONY'S", 1150, 236);
  text(g, "HOMEMADE BURGERS", 1150, 345, 46, "#1f7a4d", INTER);
});
const poster = (lines: [string, number, string][], bg: string, w = 512, h = 700) => canvas(w, h, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 10; g.strokeRect(18, 18, w - 36, h - 36);
  lines.forEach(([s, y, c], i) => text(g, s, w / 2, y, i ? 54 : 120, c, i ? INTER : ANTON));
});
const ticketTex = (seed: number) => canvas(128, 200, (g) => {
  const r = rng(seed); g.fillStyle = "#fbf8ef"; g.fillRect(0, 0, 128, 200);
  g.fillStyle = "#333"; g.font = `bold 18px ${INTER}`; g.fillText("#" + (30 + seed), 10, 24);
  for (let k = 0; k < 6; k++) g.fillRect(10, 44 + k * 22, 40 + r() * 70, 6);
});
const bubble = () => canvas(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });

// ---------------- the set ----------------
export class TonySet {
  root = new THREE.Group();
  drinks: THREE.MeshStandardMaterial;
  drinkTex = new Map<string, THREE.Texture>();
  steam: THREE.Sprite[] = [];
  dust: THREE.Points;
  reflector: Reflector;
  constructor() {
    const R = this.root, { x0, x1, z0, z1, h } = ROOM, W = x1 - x0, D = z1 - z0;
    // floor: a mirror underneath + a glossy semi-transparent checker on top = soft real reflections
    this.reflector = new Reflector(new THREE.PlaneGeometry(W, D), { textureWidth: 540, textureHeight: 960, color: new THREE.Color("#7f8a86") });
    this.reflector.rotation.x = -Math.PI / 2; this.reflector.position.set(0, -0.001, (z0 + z1) / 2); R.add(this.reflector);
    const fl = new THREE.MeshPhysicalMaterial({ map: rep(floorTex(), W / 0.8, D / 0.8), roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.06, transparent: true, opacity: 0.8 });
    put(R, new THREE.PlaneGeometry(W, D), fl, 0, 0, (z0 + z1) / 2, { rx: -Math.PI / 2, cast: false });
    // walls
    const tile = rep(subway(false), W / 1.2, 1), bump = rep(subway(true), W / 1.2, 1);
    const wallM = new THREE.MeshPhysicalMaterial({ map: tile, bumpMap: bump, bumpScale: 2.5, roughness: 0.18, clearcoat: 0.8, clearcoatRoughness: 0.12 });
    put(R, new THREE.PlaneGeometry(W, 1.2), wallM, 0, 1.0 + 0.6, z0, { cast: false });
    put(R, new THREE.PlaneGeometry(W, h - 2.2), M("#f3ede1", 0.85), 0, 2.2 + (h - 2.2) / 2, z0, { cast: false });
    put(R, new THREE.PlaneGeometry(W, 1.0), MP("#1f7a4d", 0.35), 0, 0.5, z0, { cast: false });
    put(R, rbox(W, 0.05, 0.04, 0.01), STEEL(), 0, 1.0, z0 + 0.02); // chair rail
    put(R, rbox(W, 0.04, 0.03, 0.01), STEEL(), 0, 2.2, z0 + 0.015);
    // side walls
    const sideM = M("#efe6d4", 0.8);
    put(R, new THREE.PlaneGeometry(D, h), sideM, x0, h / 2, (z0 + z1) / 2, { ry: Math.PI / 2, cast: false });
    put(R, new THREE.PlaneGeometry(D, h), sideM, x1, h / 2, (z0 + z1) / 2, { ry: -Math.PI / 2, cast: false });
    for (const [x, ry] of [[x0, Math.PI / 2], [x1, -Math.PI / 2]] as const) put(R, new THREE.PlaneGeometry(D, 1.0), MP("#1f7a4d", 0.35), x + (ry > 0 ? 0.002 : -0.002), 0.5, (z0 + z1) / 2, { ry, cast: false });
    put(R, new THREE.PlaneGeometry(W, h), sideM, 0, h / 2, z1, { ry: Math.PI, cast: false });
    // ceiling + vent + track
    put(R, new THREE.PlaneGeometry(W, D), M("#ffffff", 0.9, 0, { map: rep(ceilingTex(), W / 0.6, D / 0.6) }), 0, h, (z0 + z1) / 2, { rx: Math.PI / 2, cast: false });
    const vent = grp(R, 1.6, h - 0.01, 1.4);
    put(vent, rbox(0.6, 0.02, 0.6, 0.005), BRUSHED(), 0, 0, 0, { cast: false });
    for (let k = 0; k < 7; k++) put(vent, new THREE.BoxGeometry(0.52, 0.01, 0.02), M("#55595f", 0.5, 0.8), 0, -0.012, -0.24 + k * 0.08, { cast: false });
    // window on the left wall with blinds and a bright street outside
    const win = grp(R, x0 + 0.01, 0, 1.6, Math.PI / 2);
    put(win, new THREE.PlaneGeometry(2.4, 1.5), new THREE.MeshBasicMaterial({ map: skyTex(), toneMapped: true, color: new THREE.Color(1.6, 1.6, 1.6) }), 0, 1.75, 0, { cast: false, recv: false });
    const frameM = MP("#2b2f36", 0.4);
    for (const [w, hh, x, y] of [[2.5, 0.06, 0, 2.5], [2.5, 0.06, 0, 1.0], [0.06, 1.56, -1.22, 1.75], [0.06, 1.56, 1.22, 1.75], [0.04, 1.5, 0, 1.75]] as const) put(win, rbox(w, hh, 0.08, 0.01), frameM, x, y, 0.03);
    const slats = new THREE.InstancedMesh(new THREE.BoxGeometry(2.36, 0.012, 0.05), M("#f1efe9", 0.5), 14);
    for (let k = 0; k < 14; k++) slats.setMatrixAt(k, new THREE.Matrix4().compose(new THREE.Vector3(0, 2.44 - k * 0.022, 0.08), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.6, 0, 0)), new THREE.Vector3(1, 1, 1)));
    slats.castShadow = true; win.add(slats);
    put(win, rbox(2.5, 0.05, 0.25, 0.01), MP("#e8e3d8", 0.4), 0, 0.98, 0.12); // sill
    put(win, cyl(0.07, 0.06, 0.12, 20), MP("#c75b3a", 0.6), 0.8, 1.06, 0.13); // pot on sill
    for (let k = 0; k < 7; k++) put(win, new THREE.SphereGeometry(0.06, 12, 8), MP("#3f9b4a", 0.6), 0.8 + Math.cos(k) * 0.05, 1.15 + (k % 3) * 0.04, 0.13 + Math.sin(k) * 0.05, { s: [0.6, 1.3, 0.6], rz: Math.cos(k * 2) * 0.5 });
    // door + exit sign + extinguisher on the right wall
    const door = grp(R, x1 - 0.01, 0, 2.6, -Math.PI / 2);
    put(door, rbox(1.0, 2.15, 0.05, 0.01), MP("#a7342b", 0.45), 0, 1.075, 0.02);
    put(door, rbox(0.55, 0.7, 0.02, 0.01), MP("#9fc6e8", 0.05, { metalness: 0, transmission: 0, opacity: 0.85, transparent: true }), 0, 1.55, 0.05, { cast: false });
    put(door, rbox(0.5, 0.04, 0.05, 0.01), STEEL(), 0.05, 1.05, 0.08);
    const exitT = canvas(256, 96, (g) => { g.fillStyle = "#04140a"; g.fillRect(0, 0, 256, 96); text(g, "EXIT", 128, 52, 70, "#3dff7a"); });
    put(door, rbox(0.36, 0.14, 0.06, 0.01), glow(exitT, 3.0), 0, 2.38, 0.05);
    const ext = grp(R, x1 - 0.12, 0.55, 1.4);
    put(ext, cyl(0.075, 0.075, 0.42, 20), MP("#d8262e", 0.25), 0, 0, 0); put(ext, cyl(0.03, 0.03, 0.08, 12), M("#222", 0.4), 0, 0.25, 0);
    put(ext, new THREE.TorusGeometry(0.06, 0.008, 6, 16, Math.PI), M("#111", 0.4), 0.04, 0.3, 0, { rz: -0.4 });
    put(R, rbox(0.3, 0.3, 0.02, 0.005), M("#ffffff", 0.5, 0, { map: canvas(128, 128, (g) => { g.fillStyle = "#d8262e"; g.fillRect(0, 0, 128, 128); text(g, "FIRE", 64, 70, 54, "#fff"); }) }), x1 - 0.012, 1.15, 1.4, { ry: -Math.PI / 2 });

    this.buildBackLine(R);
    this.buildFrontCounter(R);
    this.buildPendants(R);
    this.buildForeground(R);

    // menu screens (the facts live here)
    this.drinks = glow(this.drinkState(-1, 0), 2.1);
    const scr = [[-1.2, glow(burgersTex(), 2.1)], [0, this.drinks], [1.2, glow(sidesTex(), 2.1)]] as const;
    for (const [x, mat] of scr) {
      const s = grp(R, x, 2.48, z0 + 0.06);
      put(s, rbox(1.14, 0.66, 0.05, 0.015), M("#0c0c10", 0.3, 0.5), 0, 0, 0);
      put(s, new THREE.PlaneGeometry(1.1, 0.6), mat, 0, 0, 0.027, { cast: false });
      put(s, rbox(0.06, 0.06, 0.08, 0.01), M("#333", 0.4, 0.8), 0, 0, -0.05);
    }
    const ban = canvas(2048, 160, (g) => { g.fillStyle = "#d8262e"; g.fillRect(0, 0, 2048, 160); for (let x = 0; x < 2048; x += 512) burgerIcon(g, x + 60, 86, 90); text(g, "HOMEMADE SINCE 2026  ·  FRESH EVERY DAY  ·  HOMEMADE SINCE 2026", 1080, 84, 82, "#ffffff"); });
    put(R, rbox(3.7, 0.22, 0.03, 0.01), M("#ffffff", 0.5, 0, { map: ban }), 0, 2.95, z0 + 0.03);

    // steam over the fryer + dust in the air
    const bt = bubble();
    for (let k = 0; k < 18; k++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: bt, transparent: true, depthWrite: false, opacity: 0.4 })); R.add(sp); this.steam.push(sp); }
    const r = rng(21), pts = new Float32Array(240 * 3);
    for (let k = 0; k < 240; k++) { pts[k * 3] = -2 + r() * 4; pts[k * 3 + 1] = 0.8 + r() * 2.1; pts[k * 3 + 2] = -1.5 + r() * 4; }
    const pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    this.dust = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.012, color: new THREE.Color(1.4, 1.3, 1.1), transparent: true, opacity: 0.55, depthWrite: false, map: bt }));
    R.add(this.dust);
  }
  drinkState(hi: number, pulse: number) {
    const k = `${hi}|${pulse.toFixed(1)}`;
    if (!this.drinkTex.has(k)) this.drinkTex.set(k, drinksTex(hi, Math.round(pulse * 10) / 10));
    return this.drinkTex.get(k)!;
  }
  buildBackLine(R: THREE.Object3D) {
    const z = ROOM.z0 + 0.34, top = 0.92;
    // stainless base cabinets with doors and handles
    const cab = grp(R, -0.55, 0, z);
    put(cab, rbox(4.1, top - 0.1, 0.6, 0.01), BRUSHED(), 0, (top - 0.1) / 2 + 0.1, 0);
    put(cab, rbox(4.1, 0.1, 0.56, 0.01), M("#25272b", 0.6), 0, 0.05, -0.01);
    put(cab, rbox(4.16, 0.04, 0.66, 0.008), STEEL(), 0, top, 0);
    for (let k = 0; k < 6; k++) { put(cab, rbox(0.62, 0.62, 0.012, 0.006), STEEL(), -1.75 + k * 0.7, 0.48, 0.305); put(cab, rbox(0.22, 0.02, 0.03, 0.008), M("#2a2c30", 0.3, 1), -1.75 + k * 0.7, 0.72, 0.325); }
    // soda fountain
    const sf = grp(R, -1.85, top + 0.02, z - 0.02);
    put(sf, rbox(0.8, 0.62, 0.42, 0.03), MP("#1b1d22", 0.3), 0, 0.31, 0);
    const brands: [string, string][] = [["COLA", "#c8202a"], ["LIME", "#4cb848"], ["ORANGE", "#f08a1c"], ["ROOT", "#6b3a1e"]];
    brands.forEach(([n, c], i) => {
      const t = canvas(128, 200, (g) => { g.fillStyle = c; g.fillRect(0, 0, 128, 200); g.fillStyle = "rgba(255,255,255,0.25)"; g.beginPath(); g.arc(64, 70, 44, 0, 7); g.fill(); g.save(); g.translate(64, 140); g.rotate(-0.15); text(g, n, 0, 0, n.length > 4 ? 30 : 40, "#ffffff"); g.restore(); });
      const x = -0.3 + i * 0.2;
      put(sf, rbox(0.17, 0.25, 0.01, 0.004), glow(t, 1.8), x, 0.43, 0.215, { cast: false });
      put(sf, cyl(0.018, 0.012, 0.05, 12), STEEL(), x, 0.25, 0.19);
    });
    const grate = canvas(256, 64, (g) => { g.fillStyle = "#1a1a1a"; g.fillRect(0, 0, 256, 64); g.fillStyle = "#8a8f96"; for (let x = 4; x < 256; x += 10) g.fillRect(x, 0, 5, 64); });
    put(sf, rbox(0.78, 0.03, 0.2, 0.005), M("#ffffff", 0.3, 0.9, { map: grate }), 0, 0.015, 0.24);
    // cup towers
    const cupM = MP("#f7f4ee", 0.4);
    for (const [x, rr0, n] of [[-2.45, 0.045, 9], [-2.3, 0.055, 8], [-2.13, 0.065, 7]] as const) {
      put(R, cyl(rr0 + 0.01, rr0 + 0.01, 0.55, 20, true), MP("#d8dde3", 0.08, { transparent: true, opacity: 0.35 }), x, top + 0.3, z - 0.1, { cast: false });
      for (let k = 0; k < n; k++) put(R, cyl(rr0, rr0 * 0.75, 0.06, 20, true), cupM, x, top + 0.05 + k * 0.055, z - 0.1);
    }
    // ice bin
    put(R, rbox(0.45, 0.06, 0.38, 0.01), STEEL(), -0.95, top + 0.03, z);
    // tray stack + paper bags
    for (let k = 0; k < 7; k++) put(R, rbox(0.42, 0.018, 0.32, 0.008), MP(k % 2 ? "#d8262e" : "#c51d27", 0.4), -0.45, top + 0.02 + k * 0.02, z + 0.02, { ry: (k % 3) * 0.04 });
    for (let k = 0; k < 4; k++) put(R, rbox(0.18, 0.3, 0.12, 0.004), M("#b98a5a", 0.85), 0.0 + k * 0.03, top + 0.15, z - 0.1 + k * 0.02, { ry: 0.1 * k });
    // heat lamp with fries and wrapped burgers
    const hl = grp(R, 0.75, top + 0.02, z);
    put(hl, rbox(0.9, 0.04, 0.42, 0.01), STEEL(), 0, 0.02, 0);
    for (const sx of [-1, 1]) put(hl, cyl(0.012, 0.012, 0.5, 8), STEEL(), sx * 0.42, 0.27, -0.15);
    put(hl, rbox(0.95, 0.07, 0.36, 0.015), M("#2a2c30", 0.35, 0.9), 0, 0.53, 0);
    const lampT = canvas(64, 64, (g) => { g.fillStyle = "#ffb56a"; g.fillRect(0, 0, 64, 64); });
    put(hl, new THREE.PlaneGeometry(0.85, 0.26), glow(lampT, 2.4), 0, 0.493, 0, { rx: Math.PI / 2, cast: false });
    const friesM = MP("#f4c542", 0.6);
    const box = MP("#d8262e", 0.5);
    const r = rng(9);
    for (let k = 0; k < 3; k++) {
      const fb = grp(hl, -0.3 + k * 0.17, 0.04, 0.05);
      put(fb, new THREE.CylinderGeometry(0.06, 0.045, 0.11, 4, 1, true), box, 0, 0.055, 0, { ry: Math.PI / 4 });
      for (let j = 0; j < 10; j++) put(fb, new THREE.BoxGeometry(0.012, 0.09 + r() * 0.05, 0.012), friesM, -0.03 + r() * 0.06, 0.12, -0.02 + r() * 0.04, { rz: (r() - 0.5) * 0.4, rx: (r() - 0.5) * 0.3 });
    }
    const wrapT = canvas(256, 256, (g) => { g.fillStyle = "#f2ead6"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#d8262e"; for (let k = 0; k < 8; k++) g.fillRect(0, k * 32, 256, 6); burgerIcon(g, 128, 140, 80); });
    for (let k = 0; k < 3; k++) put(hl, new THREE.SphereGeometry(0.07, 16, 10), M("#ffffff", 0.7, 0, { map: wrapT }), 0.18 + (k % 2) * 0.15, 0.065 + (k > 1 ? 0.07 : 0), -0.05 + (k % 2) * 0.1, { s: [1, 0.6, 1], ry: k });
    // fryer with two baskets
    const fr = grp(R, 2.15, 0, z);
    put(fr, rbox(0.75, top, 0.6, 0.015), STEEL(), 0, top / 2, 0);
    put(fr, rbox(0.66, 0.02, 0.48, 0.005), M("#3a2a12", 0.08, 0.2), 0, top + 0.005, 0, { cast: false });
    put(fr, rbox(0.75, 0.32, 0.12, 0.02), STEEL(), 0, top + 0.16, -0.26);
    const dialT = canvas(256, 64, (g) => { g.fillStyle = "#111"; g.fillRect(0, 0, 256, 64); text(g, "350°", 60, 34, 40, "#ff6a3a", INTER); g.fillStyle = "#3dff7a"; g.beginPath(); g.arc(200, 32, 10, 0, 7); g.fill(); });
    put(fr, new THREE.PlaneGeometry(0.4, 0.1), glow(dialT, 2.0), 0, top + 0.2, -0.198, { cast: false });
    for (const sx of [-1, 1]) {
      const b = grp(fr, sx * 0.17, top + 0.06, 0.02);
      const wire = new THREE.MeshStandardMaterial({ color: "#c0c4ca", metalness: 1, roughness: 0.35, wireframe: true });
      put(b, new THREE.BoxGeometry(0.26, 0.12, 0.34, 6, 3, 8), wire, 0, 0, 0);
      put(b, cyl(0.012, 0.012, 0.3, 8), M("#151515", 0.5), 0, 0.1, 0.27, { rx: 1.0 });
      for (let j = 0; j < 12; j++) put(b, new THREE.BoxGeometry(0.012, 0.012, 0.09), friesM, -0.1 + r() * 0.2, 0.03 + r() * 0.03, -0.12 + r() * 0.24, { ry: r() * 3 });
    }
    // ticket rail
    put(R, rbox(1.4, 0.03, 0.05, 0.008), STEEL(), 0.25, 1.58, ROOM.z0 + 0.06);
    for (let k = 0; k < 6; k++) put(R, new THREE.PlaneGeometry(0.1, 0.16), M("#ffffff", 0.8, 0, { map: ticketTex(k), side: THREE.DoubleSide }), -0.3 + k * 0.21, 1.49, ROOM.z0 + 0.09, { rz: (k % 2 ? 1 : -1) * 0.05, rx: -0.08 });
    // wall shelves (left) with jars, boxes, spices, a plant; a clock and signs
    const shelf = grp(R, -2.35, 0, ROOM.z0 + 0.16);
    const jarM = MP("#d9eef2", 0.05, { transparent: true, opacity: 0.45 });
    for (const y of [1.55, 1.92]) {
      put(shelf, rbox(1.3, 0.035, 0.3, 0.008), M("#7a5235", 0.55), 0, y, 0);
      for (const sx of [-0.55, 0.55]) put(shelf, rbox(0.03, 0.15, 0.03, 0.005), M("#2a2a2a", 0.4, 0.8), sx, y - 0.08, -0.1);
    }
    const lab = (s: string, c: string) => canvas(256, 256, (g) => { g.fillStyle = c; g.fillRect(0, 0, 256, 256); g.fillStyle = "#fff6df"; g.fillRect(20, 80, 216, 96); text(g, s, 128, 130, 58, "#2a1a12"); });
    [["BUNS", "#d8262e", 0.3], ["FRIES", "#e7b018", 0.3], ["SALT", "#2b5fb4", 0.22]].forEach(([s, c, hh], i) => put(shelf, rbox(0.24, hh as number, 0.2, 0.01), M("#ffffff", 0.7, 0, { map: lab(s as string, c as string) }), -0.45 + i * 0.3, 1.57 + (hh as number) / 2, 0));
    for (let k = 0; k < 4; k++) {
      const x = -0.5 + k * 0.17;
      put(shelf, cyl(0.06, 0.06, 0.17, 20), jarM, x, 1.94 + 0.085, 0, { cast: false });
      put(shelf, cyl(0.045, 0.045, 0.12, 16), MP(["#5f8f2f", "#c94a1e", "#e0b23a", "#8a3a8a"][k], 0.4), x, 1.94 + 0.065, 0);
      put(shelf, cyl(0.063, 0.063, 0.03, 20), M(["#d8262e", "#1f8a4a", "#d8262e", "#e08a18"][k], 0.4, 0.3), x, 1.94 + 0.185, 0);
    }
    put(shelf, cyl(0.08, 0.065, 0.13, 20), MP("#d06a3c", 0.6), 0.42, 1.94 + 0.065, 0);
    for (let k = 0; k < 9; k++) put(shelf, new THREE.SphereGeometry(0.055, 10, 8), MP("#3c9a48", 0.55), 0.42 + Math.cos(k * 0.7) * 0.07, 2.08 + (k % 4) * 0.04, Math.sin(k * 0.7) * 0.07, { s: [0.5, 1.4, 0.5], rz: Math.cos(k * 1.7) * 0.7, rx: Math.sin(k) * 0.4 });
    // spice shakers
    for (let k = 0; k < 5; k++) put(R, cyl(0.025, 0.025, 0.1, 14), MP(k % 2 ? "#f2f0ea" : "#2a2a2a", 0.3), -1.25 + k * 0.07, top + 0.07, z - 0.18);
    // clock
    const clockT = canvas(256, 256, (g) => { g.fillStyle = "#fbfaf5"; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.fillStyle = "#222"; for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; g.fillRect(128 + Math.sin(a) * 100 - 4, 128 - Math.cos(a) * 100 - 4, 8, 8); } g.strokeStyle = "#222"; g.lineWidth = 10; g.lineCap = "round"; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + 50, 128 - 30); g.stroke(); g.lineWidth = 6; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 - 10, 128 - 90); g.stroke(); });
    put(R, cyl(0.2, 0.2, 0.05, 40), MP("#d8262e", 0.3), 2.55, 2.45, ROOM.z0 + 0.03, { rx: Math.PI / 2 });
    put(R, new THREE.CircleGeometry(0.17, 40), MP("#ffffff", 0.2, { map: clockT }), 2.55, 2.45, ROOM.z0 + 0.06, { cast: false });
    put(R, rbox(0.5, 0.68, 0.01, 0.005), M("#ffffff", 0.6, 0, { map: poster([["FRESH!", 200, "#ffd23f"], ["NEVER FROZEN", 380, "#ffffff"], ["BEEF · DAILY", 470, "#ffffff"]], "#1f8a4a") }), 2.55, 1.55, ROOM.z0 + 0.02);
    put(R, rbox(0.34, 0.2, 0.01, 0.005), M("#ffffff", 0.5, 0, { map: canvas(340, 200, (g) => { g.fillStyle = "#f6f3ea"; g.fillRect(0, 0, 340, 200); g.fillStyle = "#2b5fb4"; g.fillRect(0, 0, 340, 50); text(g, "NOTICE", 170, 27, 34, "#fff", INTER); text(g, "EMPLOYEES MUST", 170, 100, 30, "#222", INTER); text(g, "WASH HANDS", 170, 145, 38, "#222", INTER); }) }), -0.95, 1.6, ROOM.z0 + 0.02);
  }
  buildFrontCounter(R: THREE.Object3D) {
    const c = grp(R, 0, 0, 0);
    // body: logo front, kick plate, side panels, steel top
    put(c, rbox(3.6, 0.92, 0.7, 0.02), MP("#1d7c4a", 0.35), 0, 0.5, 0);
    put(c, new THREE.PlaneGeometry(3.4, 0.85), M("#ffffff", 0.45, 0, { map: logoFront() }), 0, 0.52, 0.352, { cast: false });
    put(c, rbox(3.62, 0.1, 0.66, 0.01), M("#1b1c20", 0.5, 0.6), 0, 0.05, -0.01);
    put(c, rbox(3.7, 0.05, 0.8, 0.012), STEEL(), 0, 0.985, 0);
    put(c, rbox(3.7, 0.015, 0.02, 0.004), M("#ffcf3a", 0.3, 0.6), 0, 0.965, 0.405);
    // customer display (faces the customer) + register body + card reader
    const reg = grp(c, 0.85, 1.01, 0.02, -0.15);
    put(reg, rbox(0.42, 0.1, 0.34, 0.02), MP("#24262c", 0.35), 0, 0.05, 0);
    put(reg, rbox(0.06, 0.22, 0.05, 0.01), M("#3a3c42", 0.4, 0.8), 0, 0.2, -0.05);
    const disp = grp(reg, 0, 0.36, -0.04);
    disp.rotation.x = -0.25;
    put(disp, rbox(0.46, 0.3, 0.035, 0.015), M("#111216", 0.35, 0.5), 0, 0, 0);
    put(disp, new THREE.PlaneGeometry(0.42, 0.25), glow(posTex(), 1.9), 0, 0, 0.019, { cast: false });
    const cr = grp(c, 0.45, 1.01, 0.22, 0.3);
    put(cr, rbox(0.09, 0.14, 0.05, 0.012), MP("#1a1b1f", 0.3), 0, 0.07, 0, { rx: -0.4 });
    put(cr, new THREE.PlaneGeometry(0.06, 0.05), glow(canvas(64, 64, (g) => { g.fillStyle = "#123"; g.fillRect(0, 0, 64, 64); text(g, "TAP", 32, 34, 22, "#7fd0ff", INTER); }), 1.1), 0, 0.09, 0.03, { rx: -0.4, cast: false });
    // three cups with lids, straws and price tents
    const cupT = (s: string) => canvas(256, 256, (g) => { g.fillStyle = "#fbfaf6"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#d8262e"; g.fillRect(0, 90, 256, 80); for (const x of [32, 96, 160, 224]) text(g, "TONY'S", x, 132, 26, "#fff"); void s; });
    const cupMat = MP("#ffffff", 0.4, { map: cupT("") });
    const tentT = (p: string, n: string, hi: boolean) => canvas(256, 160, (g) => { g.fillStyle = hi ? "#ffc928" : "#fbfaf6"; g.fillRect(0, 0, 256, 160); text(g, n, 128, 44, 40, "#1d1d22", INTER); text(g, p, 128, 108, 72, hi ? "#1d1d22" : "#d8262e"); });
    ([[-0.95, 0.06, 0.15, "$2.00", "SMALL"], [-0.66, 0.072, 0.2, "$3.50", "MEDIUM"], [-0.32, 0.085, 0.26, "$4.00", "LARGE"]] as const).forEach(([x, r0, hh, p, n], i) => {
      const cup = grp(c, x, 1.01, 0.12);
      put(cup, cyl(r0, r0 * 0.72, hh, 32), cupMat, 0, hh / 2, 0);
      put(cup, cyl(r0 * 1.04, r0 * 1.04, 0.015, 32), MP("#f2f2f2", 0.25, { transparent: true, opacity: 0.85 }), 0, hh + 0.007, 0);
      put(cup, cyl(r0 * 0.6, r0 * 1.0, 0.02, 32), MP("#f2f2f2", 0.25, { transparent: true, opacity: 0.7 }), 0, hh + 0.022, 0);
      put(cup, cyl(0.006, 0.006, 0.2, 8), MP(["#d8262e", "#1f8a4a", "#2b5fb4"][i], 0.3), 0.01, hh + 0.08, 0, { rz: 0.15 });
      const tent = grp(c, x, 1.01, 0.3);
      put(tent, new THREE.PlaneGeometry(0.14, 0.09), M("#ffffff", 0.5, 0, { map: tentT(p, n, i === 1) }), 0, 0.04, 0.012, { rx: -0.3, cast: false });
      put(tent, rbox(0.145, 0.095, 0.006, 0.002), M("#e8e4da", 0.6), 0, 0.04, 0, { rx: -0.3 });
      put(tent, rbox(0.145, 0.095, 0.006, 0.002), M("#e8e4da", 0.6), 0, 0.04, -0.03, { rx: 0.3 });
    });
    // tray with a burger, fries and a napkin
    const tr = grp(c, -1.45, 1.01, 0.08, 0.2);
    put(tr, rbox(0.46, 0.025, 0.34, 0.01), MP("#d8262e", 0.35), 0, 0.012, 0);
    put(tr, new THREE.PlaneGeometry(0.38, 0.28), M("#ffffff", 0.8, 0, { map: canvas(256, 192, (g) => { g.fillStyle = "#f3ead4"; g.fillRect(0, 0, 256, 192); g.strokeStyle = "#d8262e"; g.lineWidth = 3; for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(0, 20 + k * 30); g.lineTo(256, 30 + k * 30); g.stroke(); } text(g, "TONY'S", 128, 96, 48, "#d8262e"); }) }), 0, 0.026, 0, { rx: -Math.PI / 2, cast: false });
    const bur = grp(tr, -0.08, 0.026, 0);
    put(bur, new THREE.SphereGeometry(0.075, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), MP("#e1962f", 0.45), 0, 0.075, 0, { s: [1, 0.75, 1] });
    put(bur, cyl(0.076, 0.076, 0.012, 24), MP("#58c04a", 0.6), 0, 0.068, 0);
    put(bur, rbox(0.13, 0.008, 0.13, 0.002), MP("#ffcb2f", 0.4), 0, 0.06, 0, { ry: 0.6 });
    put(bur, cyl(0.072, 0.072, 0.03, 24), MP("#6b3a1e", 0.65), 0, 0.042, 0);
    put(bur, cyl(0.07, 0.068, 0.025, 24), MP("#e1962f", 0.45), 0, 0.014, 0);
    for (let k = 0; k < 9; k++) put(bur, new THREE.SphereGeometry(0.005, 6, 4), M("#fff4d6", 0.5), Math.cos(k * 2.4) * 0.04, 0.125 - (k % 3) * 0.008, Math.sin(k * 2.4) * 0.04, { s: [1.6, 0.6, 1] });
    const r = rng(17), fr = grp(tr, 0.12, 0.026, -0.02);
    put(fr, new THREE.CylinderGeometry(0.06, 0.045, 0.11, 4, 1, true), MP("#d8262e", 0.5), 0, 0.055, 0, { ry: Math.PI / 4 });
    for (let j = 0; j < 12; j++) put(fr, new THREE.BoxGeometry(0.012, 0.09 + r() * 0.05, 0.012), MP("#f4c542", 0.6), -0.03 + r() * 0.06, 0.12, -0.02 + r() * 0.04, { rz: (r() - 0.5) * 0.4, rx: (r() - 0.5) * 0.3 });
    // napkin dispenser, straw holder, tip jar, condiment caddy
    const nd = grp(c, 1.35, 1.01, 0.1, -0.2);
    put(nd, rbox(0.16, 0.14, 0.12, 0.01), STEEL(), 0, 0.07, 0);
    put(nd, new THREE.BoxGeometry(0.1, 0.06, 0.005), M("#ffffff", 0.9), 0, 0.09, 0.063);
    const sh = grp(c, 1.55, 1.01, 0.05);
    put(sh, cyl(0.05, 0.05, 0.16, 24, true), MP("#d9eef2", 0.05, { transparent: true, opacity: 0.4 }), 0, 0.08, 0, { cast: false });
    for (let k = 0; k < 14; k++) put(sh, cyl(0.004, 0.004, 0.24, 6), MP(["#d8262e", "#ffffff", "#2b5fb4", "#1f8a4a"][k % 4], 0.3), Math.cos(k * 2.2) * 0.03, 0.12, Math.sin(k * 2.2) * 0.03, { rz: Math.cos(k) * 0.12, rx: Math.sin(k) * 0.12 });
    const tj = grp(c, 0.42, 1.01, 0.3);
    put(tj, cyl(0.055, 0.055, 0.13, 24, true), MP("#d9eef2", 0.05, { transparent: true, opacity: 0.4 }), 0, 0.065, 0, { cast: false });
    for (let k = 0; k < 10; k++) put(tj, cyl(0.012, 0.012, 0.003, 12), M(k % 3 ? "#d9b04a" : "#c0c4ca", 0.3, 1), Math.cos(k * 2) * 0.03, 0.006 + k * 0.004, Math.sin(k * 2) * 0.03, { rx: Math.sin(k) * 0.4 });
    put(tj, new THREE.PlaneGeometry(0.08, 0.04), M("#ffffff", 0.6, 0, { map: canvas(128, 64, (g) => { g.fillStyle = "#ffffff"; g.fillRect(0, 0, 128, 64); text(g, "TIPS :)", 64, 34, 34, "#d8262e"); }) }), 0, 0.07, 0.056, { cast: false });
    const cc = grp(c, 1.62, 1.01, -0.15);
    put(cc, rbox(0.2, 0.05, 0.11, 0.008), STEEL(), 0, 0.025, 0);
    for (const [x, col] of [[-0.05, "#d8262e"], [0.05, "#f4c21a"]] as const) { put(cc, cyl(0.03, 0.03, 0.16, 18), MP(col, 0.25), x, 0.1, 0); put(cc, cyl(0.004, 0.022, 0.05, 12), MP(col, 0.25), x, 0.205, 0); }
  }
  buildPendants(R: THREE.Object3D) {
    const bulbT = canvas(32, 32, (g) => { g.fillStyle = "#fff2d6"; g.fillRect(0, 0, 32, 32); });
    for (const x of [-1.2, 0, 1.2]) {
      const p = grp(R, x, ROOM.h, 0.05);
      put(p, cyl(0.004, 0.004, 0.62, 6), M("#111", 0.5), 0, -0.31, 0, { cast: false });
      put(p, new THREE.ConeGeometry(0.17, 0.2, 32, 1, true), MP("#1f7a4d", 0.3, { side: THREE.DoubleSide }), 0, -0.72, 0, { cast: false });
      put(p, cyl(0.03, 0.03, 0.06, 12), M("#d8b15a", 0.3, 1), 0, -0.6, 0, { cast: false });
      put(p, new THREE.SphereGeometry(0.06, 16, 12), glow(bulbT, 6.0), 0, -0.78, 0, { cast: false });
    }
  }
  buildForeground(R: THREE.Object3D) {
    // a diner table + stool close to the camera (out of focus: depth)
    const t = grp(R, 1.35, 0, 2.95);
    put(t, cyl(0.42, 0.42, 0.04, 40), MP("#d8262e", 0.25), 0, 0.78, 0);
    put(t, cyl(0.425, 0.425, 0.02, 40, true), STEEL(), 0, 0.78, 0);
    put(t, cyl(0.04, 0.04, 0.76, 12), STEEL(), 0, 0.38, 0);
    put(t, cyl(0.22, 0.25, 0.03, 24), M("#222", 0.4, 0.7), 0, 0.015, 0);
    put(t, cyl(0.022, 0.022, 0.07, 14), MP("#ffffff", 0.2), -0.1, 0.835, 0.08); put(t, cyl(0.022, 0.022, 0.07, 14), MP("#2a2a2a", 0.2), -0.04, 0.835, 0.1);
    const s = grp(R, 0.7, 0, 3.35);
    put(s, cyl(0.19, 0.19, 0.08, 28), MP("#ffc928", 0.4), 0, 0.68, 0); put(s, cyl(0.035, 0.035, 0.64, 12), STEEL(), 0, 0.32, 0);
    put(s, new THREE.TorusGeometry(0.15, 0.012, 8, 24), STEEL(), 0, 0.28, 0, { rx: Math.PI / 2 });
  }
  /** per-frame: highlighted menu row, steam, dust */
  update(t: number, hi: number, pulse: number) {
    this.drinks.emissiveMap = this.drinkState(hi, pulse);
    const r = rng(33);
    this.steam.forEach((s, k) => {
      const ph = (t * 0.35 + r()) % 1, x0 = 2.0 + r() * 0.3, z = ROOM.z0 + 0.3 + r() * 0.3;
      s.position.set(x0 + Math.sin(t * 1.3 + k) * 0.06 * ph, 0.98 + ph * 0.9, z);
      s.scale.setScalar(0.12 + ph * 0.35);
      (s.material as THREE.SpriteMaterial).opacity = 0.32 * Math.sin(Math.PI * ph);
    });
    this.dust.position.set(Math.sin(t * 0.3) * 0.05, Math.sin(t * 0.21) * 0.04 + t * 0.01, 0);
  }
}
