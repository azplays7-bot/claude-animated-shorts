// "The Day a Giant Wave of Molasses Destroyed a City Neighborhood": Commercial Street, Boston, 1919 (detailed style).
// The street runs along x (cobblestones z 0..12), the brick North End blocks face it from z = 14.5, the elevated
// railway runs over it (deck at y 6.2, columns at z 2.5 / 9.5), and on the harbor side sit the 50-ft molasses tank
// (centre TANK, radius 13.5), a pump house with the contents board, a wooden freight shed, the wharf and ships.
// The flood is a height field (front radius R = RT + v t, a crest that decays, a sticky layer behind) with splashes;
// the tank bursts into 16 steel panels. Variants: "flood" (1919), "flash" (leaking tank being painted), "summer"
// (tank gone, empty lot) and "today" (Langone-style park with a ballfield, a plaque and a scoreboard).
import * as THREE from "three";
import { ANTON, INTER, M, MP, glow, canvas, rep, rbox, cyl, put, grp, rr, text, rng } from "../look/kit";

export const TANK = new THREE.Vector3(0, 0, -19);
export const RT = 13.5, TH = 15;
export const WAVE_V = 9.0;         // m/s on screen (the real front: about 35 mph = 15.6 m/s)
export const SHED = new THREE.Vector3(-25, 0, -7);
export const NEWS = new THREE.Vector3(-3.2, 0, 13.4);
export const THERMO = new THREE.Vector3(7.2, 2.3, 14.45);

const brick = (base: string, seed: number) => canvas(1024, 1024, (g) => {
  const r = rng(seed); g.fillStyle = "#cfc6b8"; g.fillRect(0, 0, 1024, 1024);
  for (let row = 0; row < 32; row++) for (let c = -1; c < 9; c++) {
    const x = c * 128 + (row % 2 ? 64 : 0) + 3, y = row * 32 + 3;
    const col = new THREE.Color(base).multiplyScalar(0.82 + r() * 0.34); g.fillStyle = `#${col.getHexString()}`; g.fillRect(x, y, 122, 26);
  }
});
const cobble = () => canvas(1024, 1024, (g) => {
  const r = rng(13); g.fillStyle = "#4e4a46"; g.fillRect(0, 0, 1024, 1024);
  for (let row = 0; row < 24; row++) for (let c = -1; c < 21; c++) {
    const x = c * 52 + (row % 2 ? 26 : 0), y = row * 43;
    const v = 95 + r() * 60; g.fillStyle = `rgb(${v + 8},${v},${v - 6})`; rr(g, x + 3, y + 3, 46, 37, 12); g.fill();
    g.fillStyle = "rgba(255,255,255,0.08)"; rr(g, x + 6, y + 5, 30, 12, 6); g.fill();
  }
}, true);
const cobbleBump = () => canvas(1024, 1024, (g) => {
  g.fillStyle = "#000"; g.fillRect(0, 0, 1024, 1024);
  for (let row = 0; row < 24; row++) for (let c = -1; c < 21; c++) {
    const x = c * 52 + (row % 2 ? 26 : 0), y = row * 43;
    const gr = g.createRadialGradient(x + 26, y + 21, 2, x + 26, y + 21, 26); gr.addColorStop(0, "#fff"); gr.addColorStop(1, "#555"); g.fillStyle = gr; rr(g, x + 3, y + 3, 46, 37, 12); g.fill();
  }
}, false);
const gravel = () => canvas(512, 512, (g) => { const r = rng(3); g.fillStyle = "#7b6f60"; g.fillRect(0, 0, 512, 512); for (let k = 0; k < 6000; k++) { const v = 80 + r() * 90; g.fillStyle = `rgb(${v},${v - 8},${v - 18})`; g.fillRect(r() * 512, r() * 512, 3, 3); } });
const upperWindows = (cols: number, rows: number, seed: number, warm = 0.2) => canvas(512, 512, (g) => {
  const r = rng(seed); g.clearRect(0, 0, 512, 512);
  const cw = 512 / cols, ch = 512 / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const x = i * cw, y = j * ch;
    g.fillStyle = "#e9dfc9"; g.fillRect(x + cw * 0.2, y + ch * 0.1, cw * 0.6, ch * 0.74);       // stone frame
    g.fillStyle = "#d8cdb4"; g.fillRect(x + cw * 0.16, y + ch * 0.06, cw * 0.68, ch * 0.08);      // lintel
    const lit = r() < warm; const gr = g.createLinearGradient(0, y, 0, y + ch);
    gr.addColorStop(0, lit ? "#ffe0a0" : "#3f566e"); gr.addColorStop(1, lit ? "#d98f40" : "#1d2a38"); g.fillStyle = gr;
    g.fillRect(x + cw * 0.25, y + ch * 0.15, cw * 0.5, ch * 0.64);
    g.fillStyle = "#e9dfc9"; g.fillRect(x + cw * 0.49, y + ch * 0.15, 4, ch * 0.64); g.fillRect(x + cw * 0.25, y + ch * 0.46, cw * 0.5, 4);
    if (r() < 0.5) { g.fillStyle = r() < 0.5 ? "rgba(240,235,220,0.8)" : "rgba(160,40,40,0.7)"; g.fillRect(x + cw * 0.26, y + ch * 0.16, cw * 0.48, ch * 0.18); }   // curtains
  }
});
const shopSign = (s: string, bg: string, fg: string) => canvas(1024, 160, (g) => { g.fillStyle = bg; g.fillRect(0, 0, 1024, 160); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(10, 10, 1004, 140); text(g, s, 512, 86, 88, fg); });
const shopWin = (seed: number, kind: string) => canvas(512, 384, (g) => {
  const r = rng(seed); const gr = g.createLinearGradient(0, 0, 0, 384); gr.addColorStop(0, "#f8e2b4"); gr.addColorStop(1, "#a87442"); g.fillStyle = gr; g.fillRect(0, 0, 512, 384);
  for (let k = 0; k < 3; k++) { g.fillStyle = "#6b4426"; g.fillRect(0, 120 + k * 90, 512, 10); }
  for (let k = 0; k < 40; k++) { const x = r() * 480, y = 70 + Math.floor(r() * 3) * 90; g.fillStyle = kind === "bakery" ? ["#e0a050", "#c8783a", "#f2d39a"][k % 3] : ["#d8262e", "#2b5fb4", "#e7b018", "#3f9b4a"][k % 4]; if (kind === "bakery") { g.beginPath(); g.ellipse(x + 15, y + 34, 18, 12, 0, 0, 7); g.fill(); } else g.fillRect(x, y + 10, 22, 40); }
  g.fillStyle = "rgba(255,255,255,0.18)"; g.beginPath(); g.moveTo(0, 0); g.lineTo(160, 0); g.lineTo(0, 260); g.fill();
});
export const tankTex = (kind: "brown" | "gray", paint = 0) => canvas(4096, 1024, (g) => {
  const r = rng(kind === "brown" ? 2 : 4);
  g.fillStyle = kind === "brown" ? "#5a3a22" : "#8b8f94"; g.fillRect(0, 0, 4096, 1024);
  // plate seams + rivet rows
  for (let y = 0; y < 1024; y += 128) { g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, y, 4096, 5); for (let x = 0; x < 4096; x += 16) { g.fillStyle = "rgba(255,255,255,0.22)"; g.beginPath(); g.arc(x + 8, y + 14, 3.5, 0, 7); g.fill(); } }
  for (let x = 0; x < 4096; x += 256) { g.fillStyle = "rgba(0,0,0,0.22)"; g.fillRect(x + ((x / 256) % 2) * 0, 0, 5, 1024); }
  if (kind === "gray") {
    // brown drips running down from the seams (the leaks)
    for (let k = 0; k < 160; k++) { const x = r() * 4096, y = Math.floor(r() * 8) * 128 + 10, l = 60 + r() * 360; const gr = g.createLinearGradient(0, y, 0, y + l); gr.addColorStop(0, "rgba(70,35,10,0.95)"); gr.addColorStop(1, "rgba(70,35,10,0)"); g.fillStyle = gr; g.fillRect(x, y, 4 + r() * 8, l); }
    // the paint job: brown paint covering from the left of the front panels
    if (paint > 0) { g.fillStyle = "#5a3a22"; g.fillRect(1600, 0, 900 * paint, 1024); for (let y = 0; y < 1024; y += 10) { g.fillStyle = "rgba(90,58,34,0.9)"; g.fillRect(1600 + 900 * paint, y, 6 + r() * 26, 6); } }
  } else {
    for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(40,20,8,${0.15 + r() * 0.2})`; g.fillRect(r() * 4096, r() * 1024, 6 + r() * 12, 60 + r() * 200); }
  }
  // lettering on the front (centred on u = 0.5 -> the street-facing side)
  g.save(); g.font = `150px ${ANTON}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = kind === "brown" || paint > 0.6 ? "#f1e6cf" : "#f6f6f2"; g.fillText("PURITY DISTILLING CO.", 2048, 300); g.font = `90px ${ANTON}`; g.fillText("MOLASSES", 2048, 440); g.restore();
});
const paperTex = (lines: [string, number, number, string?][], w = 768, h = 1024, aged = true) => canvas(w, h, (g) => {
  g.fillStyle = aged ? "#efe6cf" : "#f8f6f0"; g.fillRect(0, 0, w, h);
  const r = rng(w + h); for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(120,90,50,${r() * 0.06})`; g.fillRect(r() * w, r() * h, 3, 3); }
  lines.forEach(([s, y, sz, f]) => text(g, s, w / 2, y, sz, "#1c1814", f ?? ANTON));
});
export const newspaperTex = () => canvas(768, 1024, (g) => {
  g.fillStyle = "#efe6cf"; g.fillRect(0, 0, 768, 1024);
  text(g, "THE NORTH END GAZETTE", 384, 70, 64, "#1c1814", "Georgia, serif");
  g.fillStyle = "#1c1814"; g.fillRect(30, 108, 708, 4); g.fillRect(30, 150, 708, 2);
  text(g, "THURSDAY, JANUARY 16, 1919", 384, 130, 22, "#1c1814", INTER);
  text(g, "MOLASSES TANK", 384, 240, 104, "#1c1814"); text(g, "BURSTS", 384, 350, 104, "#1c1814");
  text(g, "21 DEAD, 150 HURT", 384, 470, 76, "#7a1515");
  text(g, "IN NORTH END FLOOD", 384, 548, 50, "#1c1814");
  g.fillStyle = "#8a8070"; g.fillRect(40, 600, 330, 250);
  g.fillStyle = "#5a4a3a"; g.beginPath(); g.ellipse(205, 760, 140, 50, 0, 0, 7); g.fill();
  for (let k = 0; k < 22; k++) { g.fillStyle = "rgba(28,24,20,0.55)"; g.fillRect(400, 610 + k * 18, 320 - (k % 4) * 30, 7); }
  for (let k = 0; k < 7; k++) { g.fillStyle = "rgba(28,24,20,0.55)"; g.fillRect(40, 880 + k * 18, 680 - (k % 3) * 60, 7); }
});
const scoreTex = (msg: string) => canvas(1024, 512, (g) => {
  g.fillStyle = "#0b2a18"; g.fillRect(0, 0, 1024, 512);
  text(g, "HOME", 230, 70, 54, "#ffffff"); text(g, "GUEST", 794, 70, 54, "#ffffff");
  for (const [x, n] of [[230, "3"], [794, "2"]] as const) { g.fillStyle = "#050806"; g.fillRect(x - 90, 110, 180, 140); text(g, n, x, 185, 120, "#ffb627"); }
  g.fillStyle = "#050806"; g.fillRect(40, 300, 944, 170);
  g.font = `70px ${ANTON}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#ffb627";
  const words = msg.split(" "); let line = "", lines: string[] = [];
  for (const w of words) { if (g.measureText(line + " " + w).width > 880) { lines.push(line.trim()); line = w; } else line += " " + w; } lines.push(line.trim());
  lines.forEach((l, i) => g.fillText(l, 512, 385 - (lines.length - 1) * 38 + i * 76));
  g.fillStyle = "rgba(5,8,6,0.5)"; for (let x = 0; x < 1024; x += 6) g.fillRect(x, 300, 2, 170);
});
const plaqueTex = () => canvas(768, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 768, 512); gr.addColorStop(0, "#5a4a2a"); gr.addColorStop(1, "#3a2e18"); g.fillStyle = gr; g.fillRect(0, 0, 768, 512);
  g.strokeStyle = "#c9a55a"; g.lineWidth = 12; g.strokeRect(14, 14, 740, 484);
  text(g, "THE GREAT", 384, 100, 86, "#f2d88e"); text(g, "MOLASSES FLOOD", 384, 200, 86, "#f2d88e");
  text(g, "JANUARY 15, 1919", 384, 300, 56, "#f2d88e", INTER);
  text(g, "21 LIVES LOST", 384, 420, 64, "#f2d88e");
});
const thermoTex = (deg: number) => canvas(256, 768, (g) => {
  g.fillStyle = "#f2ead6"; rr(g, 0, 0, 256, 768, 40); g.fill(); g.strokeStyle = "#7a1515"; g.lineWidth = 10; rr(g, 6, 6, 244, 756, 36); g.stroke();
  text(g, "°F", 128, 60, 54, "#7a1515");
  const y = (d: number) => 640 - (d - 0) * 10;
  for (let d = 0; d <= 50; d += 10) { g.fillStyle = "#1c1814"; g.fillRect(150, y(d) - 2, 50, 4); text(g, String(d), 210, y(d), 28, "#1c1814", INTER, "left"); }
  g.fillStyle = "#ddd"; rr(g, 104, 100, 32, 560, 16); g.fill();
  g.fillStyle = "#d8262e"; rr(g, 104, y(deg), 32, 660 - y(deg), 16); g.fill(); g.beginPath(); g.arc(120, 680, 38, 0, 7); g.fill();
  g.fillStyle = "#2b5fb4"; g.fillRect(40, y(32) - 2, 60, 4); text(g, "FREEZING", 70, y(32) - 22, 18, "#2b5fb4", INTER);
});
const smellTex = () => canvas(128, 512, (g) => {
  g.strokeStyle = "rgba(150,90,40,0.85)"; g.lineWidth = 12; g.lineCap = "round";
  for (const off of [34, 94]) { g.beginPath(); for (let y = 500; y > 10; y -= 8) g.lineTo(off + 20 * Math.sin(y / 40), y); g.stroke(); }
});

export class North {
  root = new THREE.Group();
  wave: THREE.Mesh; waveGeo: THREE.PlaneGeometry; waveMat: THREE.MeshPhysicalMaterial;
  drops: THREE.InstancedMesh;
  panels: THREE.Group[] = []; panelMats: THREE.MeshStandardMaterial[] = []; roof: THREE.Mesh; liquid: THREE.Mesh; tankRoot: THREE.Group;
  tankTexBrown: THREE.Texture; grayCache = new Map<number, THREE.Texture>();
  el: THREE.Group; elBent: THREE.Group[] = []; train: THREE.Group;
  shed: THREE.Group; boards: { m: THREE.Mesh; p0: THREE.Vector3; r0: THREE.Euler; v: THREE.Vector3; w: THREE.Vector3 }[] = [];
  truck: THREE.Group; gaugeMat: THREE.MeshStandardMaterial; gaugeCache = new Map<number, THREE.Texture>();
  thermo: THREE.MeshStandardMaterial; thermoCache = new Map<number, THREE.Texture>();
  sun: THREE.DirectionalLight; hemi: THREE.HemisphereLight; sky: THREE.Mesh; skyMat: THREE.ShaderMaterial;
  lot: THREE.Group; park: THREE.Group; score: THREE.MeshStandardMaterial; smells: THREE.Sprite[] = [];
  streetLamps: THREE.MeshStandardMaterial; dateBoard!: THREE.MeshStandardMaterial; dateTex!: THREE.Texture; summerTex?: THREE.Texture; lampLights: THREE.PointLight[] = []; windows: THREE.MeshStandardMaterial[] = [];
  constructor() {
    const R = this.root;
    this.skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { top: { value: new THREE.Color("#5c9ae0") }, mid: { value: new THREE.Color("#b8d6f2") }, bot: { value: new THREE.Color("#eef4fa") } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.1 ? mix(mid, top, smoothstep(0.1, 0.7, h)) : mix(bot, mid, smoothstep(-0.05, 0.1, h)); gl_FragColor = vec4(c * 1.1, 1.0); }" });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(160, 32, 16), this.skyMat); R.add(this.sky);
    // ground: cobbled street, sidewalks, the tank lot, the wharf and the harbor
    const cb = new THREE.MeshPhysicalMaterial({ map: rep(cobble(), 90 / 6, 12 / 6), bumpMap: rep(cobbleBump(), 90 / 6, 12 / 6), bumpScale: 3, roughness: 0.62, clearcoat: 0.25, clearcoatRoughness: 0.5 });
    put(R, new THREE.PlaneGeometry(90, 12), cb, 0, 0, 6, { rx: -Math.PI / 2, cast: false });
    for (const [z0, z1] of [[-2.5, 0], [12, 14.5]] as const) { put(R, new THREE.PlaneGeometry(90, z1 - z0), M("#a49c8e", 0.8), 0, 0.12, (z0 + z1) / 2, { rx: -Math.PI / 2, cast: false }); put(R, rbox(90, 0.14, 0.2, 0.02), M("#8e877b", 0.8), 0, 0.06, z0 === -2.5 ? 0 : 12); }
    this.lot = grp(R);
    put(this.lot, new THREE.PlaneGeometry(90, 38), M("#ffffff", 0.95, 0, { map: rep(gravel(), 18, 8) }), 0, 0.02, -21.5, { rx: -Math.PI / 2, cast: false });
    put(R, new THREE.PlaneGeometry(90, 8), M("#6b5236", 0.8), 0, 0.03, -44, { rx: -Math.PI / 2, cast: false });       // wharf planks
    for (let k = 0; k < 12; k++) put(R, cyl(0.25, 0.25, 2, 10), M("#4a3626", 0.8), -40 + k * 7.5, -0.4, -48);
    put(R, new THREE.PlaneGeometry(240, 120), MP("#2a4a5e", 0.08, { clearcoat: 1, clearcoatRoughness: 0.05, metalness: 0.2 }), 0, -0.6, -108, { rx: -Math.PI / 2, cast: false });
    // ships in the harbor
    for (const [x, z, s] of [[-30, -70, 1.2], [22, -82, 1.5], [55, -64, 1.0]] as const) {
      const sh = grp(R, x, -0.6, z, 0.2); sh.scale.setScalar(s);
      put(sh, rbox(24, 4, 6, 1.2), MP("#2b2f36", 0.4), 0, 1.6, 0); put(sh, rbox(24.2, 0.6, 6.1, 0.2), MP("#a32b25", 0.5), 0, 0.2, 0);
      put(sh, rbox(8, 3, 4.5, 0.4), MP("#ece6d8", 0.5), -2, 5, 0); put(sh, cyl(0.9, 1.0, 5, 16), MP("#c9493a", 0.4), -2, 8.5, 0); put(sh, cyl(0.92, 0.92, 0.8, 16), MP("#1a1a1a", 0.4), -2, 10.6, 0);
      for (const mx of [-9, 7]) put(sh, cyl(0.12, 0.15, 12, 8), M("#4a3626", 0.7), mx, 9, 0);
    }
    this.buildCity(R); this.buildTank(R); this.buildEl(R); this.buildShed(R); this.buildPump(R); this.buildTruck(R); this.buildPark(R);
    // the wave: a height field over the lot + street
    this.waveGeo = new THREE.PlaneGeometry(92, 64, 200, 140); this.waveGeo.rotateX(-Math.PI / 2); this.waveGeo.translate(0, 0, -11);
    this.waveMat = new THREE.MeshPhysicalMaterial({ color: "#3a1a07", roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.18, sheen: 0.3, sheenColor: new THREE.Color("#a0522d"), emissive: "#1a0800", emissiveIntensity: 0.4 });
    this.wave = new THREE.Mesh(this.waveGeo, this.waveMat); this.wave.receiveShadow = true; this.wave.castShadow = true; R.add(this.wave);
    this.drops = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.22, 1), this.waveMat, 420); this.drops.castShadow = true; R.add(this.drops);
    // lights
    this.hemi = new THREE.HemisphereLight("#d6e6ff", "#7a6a5a", 0.9); R.add(this.hemi);
    this.sun = new THREE.DirectionalLight("#fff2dc", 3.2); this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 160 }); this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.05;
    R.add(this.sun, this.sun.target);
    // smell squiggles (summer)
    const st = smellTex();
    for (let k = 0; k < 14; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, transparent: true, depthWrite: false })); s.visible = false; R.add(s); this.smells.push(s); }
  }
  buildCity(R: THREE.Object3D) {
    const blocks: [number, number, number, string, string, string, string][] = [
      [-46, -34, 12, "#9a4a34", "HARDWARE", "#1d3a2a", "#f1e6cf"], [-34, -24, 10, "#b05c3e", "BAKERY", "#5a1f1f", "#f6d68a"], [-24, -13, 13, "#8c4632", "GROCERY", "#1f3a5a", "#f1e6cf"],
      [-13, -2, 11, "#a85a3c", "BARBER", "#2a2a2e", "#f1e6cf"], [-2, 11, 14, "#c9b89a", "SAVINGS BANK", "#3a2a1a", "#e8cf8a"], [11, 22, 12, "#94503a", "CAFE", "#1f4a32", "#f6e2b4"],
      [22, 34, 10, "#a8543a", "MARKET", "#5a1f1f", "#f1e6cf"], [34, 46, 13, "#8a4a36", "HOTEL", "#1d2a4a", "#e8cf8a"],
    ];
    const Z = 14.5;
    blocks.forEach(([x0, x1, h, col, sign, sbg, sfg], i) => {
      const w = x1 - x0, cx = (x0 + x1) / 2, bank = sign === "SAVINGS BANK";
      const mat = bank ? MP("#d9ccb0", 0.7, { clearcoat: 0 }) : M("#ffffff", 0.85, 0, { map: rep(brick(col, i + 2), w / 3, h / 3) });
      put(R, new THREE.BoxGeometry(w, h, 10), mat, cx, h / 2, Z + 5);
      put(R, rbox(w + 0.3, 0.5, 0.6, 0.05), M(bank ? "#c9b89a" : "#d8cdb4", 0.6), cx, h - 0.25, Z - 0.2);
      put(R, rbox(w + 0.1, 0.18, 0.35, 0.03), M("#d8cdb4", 0.6), cx, h - 0.75, Z - 0.1);
      const wm = new THREE.MeshStandardMaterial({ map: upperWindows(Math.max(2, Math.round(w / 2.4)), Math.max(2, Math.round((h - 4.2) / 2.8)), i * 5 + 1), transparent: true, roughness: 0.2, emissive: "#ffffff", emissiveMap: upperWindows(Math.max(2, Math.round(w / 2.4)), Math.max(2, Math.round((h - 4.2) / 2.8)), i * 5 + 1), emissiveIntensity: 0.12 });
      this.windows.push(wm);
      put(R, new THREE.PlaneGeometry(w - 0.6, h - 4.6), wm, cx, 4.2 + (h - 4.6) / 2, Z - 0.02, { ry: Math.PI, cast: false });
      // storefront
      const sw = new THREE.MeshStandardMaterial({ map: shopWin(i, sign === "BAKERY" ? "bakery" : "goods"), emissive: "#ffffff", emissiveMap: shopWin(i, sign === "BAKERY" ? "bakery" : "goods"), emissiveIntensity: 0.25, roughness: 0.06, metalness: 0.1 });
      this.windows.push(sw);
      for (const sx of [-1, 1]) put(R, new THREE.PlaneGeometry(w * 0.32, 2.2), sw, cx + sx * w * 0.25, 1.75, Z - 0.03, { ry: Math.PI, cast: false });
      put(R, rbox(1.2, 2.5, 0.1, 0.02), MP(sbg, 0.4), cx, 1.35, Z - 0.05);
      put(R, rbox(w - 0.4, 0.75, 0.12, 0.02), M("#ffffff", 0.4, 0, { map: shopSign(sign, sbg, sfg) }), cx, 3.35, Z - 0.1, { ry: Math.PI });
      if (!bank) {
        const aw = canvas(512, 128, (g) => { for (let x = 0; x < 512; x += 64) { g.fillStyle = (x / 64) % 2 ? "#f1e6cf" : sbg; g.fillRect(x, 0, 64, 128); } });
        put(R, new THREE.BoxGeometry(w - 1, 0.06, 1.4), MP("#ffffff", 0.6, { map: rep(aw, 4, 1) }), cx, 2.95, Z - 0.65, { rx: -0.35 });
        // fire escape
        for (let fl = 0; fl < Math.floor((h - 5) / 2.8); fl++) {
          const y = 5.6 + fl * 2.8;
          put(R, rbox(3.2, 0.06, 1.0, 0.01), M("#1d1d1f", 0.5, 0.6), cx + w * 0.22, y, Z - 0.55);
          for (let k = 0; k < 8; k++) put(R, cyl(0.015, 0.015, 0.9, 4), M("#1d1d1f", 0.5, 0.6), cx + w * 0.22 - 1.5 + k * 0.43, y + 0.45, Z - 1.03);
          put(R, rbox(3.2, 0.04, 0.04, 0.005), M("#1d1d1f", 0.5, 0.6), cx + w * 0.22, y + 0.9, Z - 1.03);
        }
      } else {
        // the bank: columns, a big clock (12:40) and the outdoor thermometer
        for (let k = 0; k < 4; k++) put(R, cyl(0.35, 0.4, 4.0, 20), MP("#ece4d2", 0.5), cx - 4.5 + k * 3, 2.0, Z - 0.5);
        const clk = canvas(512, 512, (g) => { g.fillStyle = "#fbf7ea"; g.beginPath(); g.arc(256, 256, 240, 0, 7); g.fill(); g.strokeStyle = "#1c1814"; g.lineWidth = 14; g.stroke(); for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; text(g, ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"][k], 256 + Math.sin(a) * 185, 256 - Math.cos(a) * 185, 40, "#1c1814", "Georgia, serif"); } g.lineCap = "round"; g.lineWidth = 14; g.beginPath(); g.moveTo(256, 256); g.lineTo(256 + Math.sin(0.35) * 110, 256 - Math.cos(0.35) * 110); g.stroke(); g.lineWidth = 8; g.beginPath(); g.moveTo(256, 256); g.lineTo(256 + Math.sin(4.19) * 170, 256 - Math.cos(4.19) * 170); g.stroke(); });
        put(R, cyl(1.25, 1.25, 0.25, 40), M("#c9a55a", 0.3, 1), cx, h - 2.4, Z - 0.2, { rx: Math.PI / 2 });
        put(R, new THREE.CircleGeometry(1.1, 40), MP("#ffffff", 0.2, { map: clk }), cx, h - 2.4, Z - 0.34, { ry: Math.PI, cast: false });
        this.thermo = new THREE.MeshStandardMaterial({ map: thermoTex(41), roughness: 0.4 });
        put(R, rbox(0.5, 1.45, 0.06, 0.03), this.thermo, THERMO.x, THERMO.y, THERMO.z - 0.04, { ry: Math.PI });
      }
    });
    // newsstand with the date board
    const ns_ = grp(R, NEWS.x, 0, NEWS.z, Math.PI);
    put(ns_, rbox(2.2, 1.1, 0.9, 0.04), MP("#2a4a32", 0.5), 0, 0.55, 0); put(ns_, rbox(2.4, 0.08, 1.1, 0.02), MP("#2a4a32", 0.5), 0, 2.2, 0);
    for (const sx of [-1, 1]) put(ns_, cyl(0.04, 0.04, 1.1, 8), M("#1d1d1f", 0.5, 0.5), sx * 1.05, 1.65, 0.4);
    for (let k = 0; k < 5; k++) put(ns_, rbox(0.34, 0.03, 0.45, 0.005), M("#efe6cf", 0.8), -0.75 + k * 0.38, 1.12 + (k % 2) * 0.03, 0.1, { ry: (k - 2) * 0.05 });
    const db = canvas(768, 512, (g) => { g.fillStyle = "#1c1814"; g.fillRect(0, 0, 768, 512); g.strokeStyle = "#e8cf8a"; g.lineWidth = 10; g.strokeRect(14, 14, 740, 484); text(g, "WEDNESDAY", 384, 110, 84, "#f1e6cf"); text(g, "JAN. 15, 1919", 384, 250, 110, "#ffd88a"); text(g, "WEATHER: MILD, NEAR 40°", 384, 400, 52, "#f1e6cf", INTER); });
    this.dateBoard = M("#ffffff", 0.5, 0, { map: db }); this.dateTex = db;
    put(ns_, rbox(1.6, 1.05, 0.06, 0.02), this.dateBoard, 0, 2.85, 0.35);
    // gas lamps
    this.streetLamps = glow(canvas(8, 8, (g) => { g.fillStyle = "#ffe2a0"; g.fillRect(0, 0, 8, 8); }), 0.2);
    for (const [x, z] of [[-30, 13.2], [-14, 13.2], [14, 13.2], [30, 13.2], [-22, -1.4], [22, -1.4]] as const) {
      const l = grp(R, x, 0, z);
      put(l, cyl(0.07, 0.1, 3.6, 10), M("#1d2a24", 0.4, 0.5), 0, 1.8, 0); put(l, cyl(0.18, 0.2, 0.3, 10), M("#1d2a24", 0.4, 0.5), 0, 0.15, 0);
      put(l, new THREE.CylinderGeometry(0.28, 0.18, 0.55, 6, 1, true), MP("#fff6e0", 0.1, { transparent: true, opacity: 0.4 }), 0, 3.85, 0, { cast: false });
      put(l, new THREE.SphereGeometry(0.12, 10, 8), this.streetLamps, 0, 3.8, 0, { cast: false }); put(l, new THREE.ConeGeometry(0.34, 0.3, 6), M("#1d2a24", 0.4, 0.5), 0, 4.25, 0);
      const pl = new THREE.PointLight("#ffcf8a", 0, 9, 2); pl.position.set(0, 3.7, 0); l.add(pl); this.lampLights.push(pl);
    }
    // horse + wagon parked on the street
    const hw = grp(R, -13, 0, 9.5, Math.PI / 2);
    hw.name = "wagon";
    const hm = MP("#6b4226", 0.55);
    put(hw, new THREE.CapsuleGeometry(0.42, 1.2, 8, 16), hm, 0, 1.35, 0, { rx: Math.PI / 2 });
    put(hw, new THREE.CapsuleGeometry(0.18, 0.6, 6, 12), hm, 0, 1.85, 0.85, { rx: 0.7 });
    put(hw, new THREE.CapsuleGeometry(0.17, 0.35, 6, 12), hm, 0, 1.95, 1.25, { rx: 1.7 });
    for (const [x, z] of [[-0.25, 0.5], [0.25, 0.5], [-0.25, -0.55], [0.25, -0.55]]) put(hw, cyl(0.08, 0.07, 1.05, 8), hm, x, 0.55, z);
    put(hw, new THREE.CylinderGeometry(0.05, 0.12, 0.7, 8), M("#2a1a10", 0.8), 0, 1.4, -1.0, { rx: -0.6 });
    for (let k = 0; k < 5; k++) put(hw, rbox(0.06, 0.25, 0.08, 0.02), M("#2a1a10", 0.8), 0, 2.15 - k * 0.12, 0.95 - k * 0.1, { rx: 0.6 });
    put(hw, rbox(1.8, 0.5, 3.0, 0.05), M("#8a5a30", 0.7), 0, 1.0, -2.7); for (const sx of [-1, 1]) for (const z of [-1.7, -3.7]) { put(hw, cyl(0.55, 0.55, 0.08, 16, true), M("#3a2616", 0.7), sx * 0.95, 0.55, z, { rz: Math.PI / 2 }); for (let k = 0; k < 6; k++) put(hw, rbox(0.04, 1.05, 0.04, 0.01), M("#3a2616", 0.7), sx * 0.95, 0.55, z, { rx: (k * Math.PI) / 6 }); }
    for (let k = 0; k < 6; k++) put(hw, cyl(0.25, 0.25, 0.55, 14), M("#7a5a3a", 0.7), -0.4 + (k % 2) * 0.8, 1.52, -1.8 - Math.floor(k / 2) * 0.9);
  }
  buildTank(R: THREE.Object3D) {
    this.tankRoot = grp(R, TANK.x, 0, TANK.z);
    this.tankTexBrown = tankTex("brown");
    const n = 16, segW = 2 * Math.PI * RT / n;
    for (let k = 0; k < n; k++) {
      const a = (k + 0.5) * (2 * Math.PI / n);
      const g = grp(this.tankRoot, Math.sin(a) * RT, 0, Math.cos(a) * RT, a);
      const t = this.tankTexBrown.clone(); t.needsUpdate = true; t.repeat.set(1 / n, 1); t.offset.set(((k + n / 2) % n) / n, 0);
      const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, metalness: 0.4 });
      this.panelMats.push(m);
      put(g, new THREE.BoxGeometry(segW + 0.05, TH, 0.3), m, 0, TH / 2, 0);
      this.panels.push(g);
    }
    this.roof = put(this.tankRoot, new THREE.ConeGeometry(RT + 0.4, 2.6, 32), MP("#4a3020", 0.5), 0, TH + 1.3, 0);
    this.liquid = put(this.tankRoot, cyl(RT - 0.3, RT - 0.3, 1, 48), new THREE.MeshPhysicalMaterial({ color: "#3a1a07", roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04 }), 0, 0.5, 0);
    this.liquid.visible = false;
    // a walkway + ladder on the side
    for (let k = 0; k < 30; k++) put(this.tankRoot, rbox(0.5, 0.05, 0.05, 0.01), M("#2a2a2e", 0.5, 0.8), Math.sin(-0.4) * (RT + 0.4), 0.5 + k * 0.5, Math.cos(-0.4) * (RT + 0.4), { ry: -0.4 });
  }
  tankGray(paint: number) {
    const q = Math.round(paint * 20) / 20;
    if (!this.grayCache.has(q)) this.grayCache.set(q, tankTex("gray", q));
    return this.grayCache.get(q)!;
  }
  setTankSkin(kind: "brown" | "gray", paint = 0) {
    const base = kind === "brown" ? this.tankTexBrown : this.tankGray(paint);
    const n = this.panelMats.length;
    this.panelMats.forEach((m, k) => { if (m.map?.image !== base.image) { const t = base.clone(); t.needsUpdate = true; t.repeat.set(1 / n, 1); t.offset.set(((k + n / 2) % n) / n, 0); m.map = t; m.needsUpdate = true; } });
  }
  buildEl(R: THREE.Object3D) {
    this.el = grp(R);
    const steel = MP("#3a3f44", 0.45, { metalness: 0.6 });
    for (let k = -5; k <= 5; k++) {
      const x = k * 9;
      const seg = grp(this.el, x, 0, 6);
      for (const z of [-3.5, 3.5]) {
        put(seg, rbox(0.5, 6.0, 0.5, 0.04), steel, 0, 3.0, z);
        for (let j = 0; j < 3; j++) put(seg, rbox(0.06, 2.2, 0.06, 0.01), steel, 0, 1.2 + j * 1.6, z + 0.22, { rz: j % 2 ? 0.5 : -0.5 });
      }
      put(seg, rbox(0.5, 0.6, 7.5, 0.04), steel, 0, 6.0, 0);
      const span = grp(seg, 4.5, 6.2, 0);
      for (const z of [-2.6, 2.6]) { put(span, rbox(9.0, 0.9, 0.35, 0.04), steel, 0, 0, z); for (let j = 0; j < 9; j++) put(span, rbox(0.05, 0.85, 0.05, 0.01), steel, -4 + j, 0, z - 0.2, { rz: j % 2 ? 0.6 : -0.6 }); }
      for (let j = 0; j < 12; j++) put(span, rbox(0.3, 0.16, 6.2, 0.01), M("#4a3626", 0.8), -4.3 + j * 0.78, 0.5, 0);
      for (const z of [-1.6, -0.6, 0.6, 1.6]) put(span, rbox(9.0, 0.1, 0.08, 0.01), M("#8a8f96", 0.3, 1), 0, 0.62, z);
      if (Math.abs(k) <= 1) this.elBent.push(seg);
    }
    // a train on the line
    this.train = grp(this.el, 22, 6.85, 7.1);
    for (let c = 0; c < 2; c++) {
      const car = grp(this.train, c * 10.5, 0, 0);
      put(car, rbox(10, 2.6, 2.8, 0.25), MP("#7a1d1d", 0.4), 0, 1.4, 0); put(car, rbox(10.2, 0.3, 3.0, 0.1), MP("#3a2a1a", 0.5), 0, 2.85, 0);
      const wt = canvas(1024, 128, (g) => { g.fillStyle = "#7a1d1d"; g.fillRect(0, 0, 1024, 128); for (let k = 0; k < 10; k++) { g.fillStyle = "#ffe8b0"; g.fillRect(30 + k * 100, 20, 70, 70); } text(g, "BOSTON ELEVATED", 512, 112, 22, "#e8cf8a", INTER); });
      for (const sx of [-1, 1]) put(car, new THREE.PlaneGeometry(9.6, 1.2), new THREE.MeshStandardMaterial({ map: wt, emissive: "#ffffff", emissiveMap: wt, emissiveIntensity: 0.2, roughness: 0.4 }), 0, 1.75, sx * 1.42, { ry: sx > 0 ? 0 : Math.PI, cast: false });
      for (const x of [-3.5, 3.5]) for (const z of [-0.9, 0.9]) put(car, cyl(0.38, 0.38, 0.2, 14), M("#1d1d1f", 0.5, 0.7), x, 0.05, z, { rx: Math.PI / 2 });
    }
  }
  buildShed(R: THREE.Object3D) {
    this.shed = grp(R, SHED.x, 0, SHED.z);
    const r = rng(19), wood = [M("#8a6038", 0.8), M("#7a5230", 0.8), M("#9a6c40", 0.8)];
    const add = (geo: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
      const m = put(this.shed, geo, wood[Math.floor(r() * 3)], x, y, z, { rx, ry, rz });
      const p = new THREE.Vector3(x, y, z).add(SHED), dir = p.clone().sub(TANK).setY(0).normalize();
      this.boards.push({ m, p0: m.position.clone(), r0: m.rotation.clone(), v: dir.multiplyScalar(6 + r() * 8).setY(3 + r() * 6), w: new THREE.Vector3(r() * 6 - 3, r() * 6 - 3, r() * 6 - 3) });
    };
    for (let k = 0; k < 14; k++) { add(new THREE.BoxGeometry(0.42, 4, 0.12), -3 + k * 0.45, 2, 2.5); add(new THREE.BoxGeometry(0.42, 4, 0.12), -3 + k * 0.45, 2, -2.5); }
    for (let k = 0; k < 11; k++) { add(new THREE.BoxGeometry(0.12, 4, 0.42), -3.1, 2, -2.3 + k * 0.45); add(new THREE.BoxGeometry(0.12, 4, 0.42), 3.1, 2, -2.3 + k * 0.45); }
    for (let k = 0; k < 8; k++) { add(new THREE.BoxGeometry(6.6, 0.1, 0.75), 0, 4.2 + (k < 4 ? k * 0.3 : (7 - k) * 0.3), -2.6 + k * 0.72, 0.4 * (k < 4 ? -1 : 1)); }
    const sg = canvas(768, 128, (g) => { g.fillStyle = "#f1e6cf"; g.fillRect(0, 0, 768, 128); text(g, "FREIGHT · NORTH END PIER", 384, 68, 56, "#3a2616"); });
    const s = put(this.shed, rbox(4.8, 0.7, 0.08, 0.02), M("#ffffff", 0.6, 0, { map: sg }), 0, 3.3, 2.6);
    this.boards.push({ m: s, p0: s.position.clone(), r0: s.rotation.clone(), v: new THREE.Vector3(-4, 7, 9), w: new THREE.Vector3(2, 3, 1) });
  }
  buildPump(R: THREE.Object3D) {
    const p = grp(R, 17, 0, -5.5);
    p.name = "pump";
    put(p, new THREE.BoxGeometry(5, 3.6, 4), M("#ffffff", 0.85, 0, { map: rep(brick("#8c4632", 31), 2, 1.5) }), 0, 1.8, 0);
    put(p, rbox(5.4, 0.3, 4.4, 0.05), M("#3a2a1a", 0.6), 0, 3.7, 0);
    put(p, cyl(0.3, 0.3, 14, 12), M("#4a4a4e", 0.4, 0.8), -6, 1.0, -3, { rz: Math.PI / 2 });
    const board = paperTex([["PURITY DISTILLING CO.", 90, 54], ["TANK No. 1", 180, 60], ["CONTENTS:", 300, 56], ["2,300,000", 420, 120], ["GALLONS MOLASSES", 540, 58]], 768, 640, false);
    put(p, rbox(2.6, 2.2, 0.08, 0.03), M("#ffffff", 0.55, 0, { map: board }), 0, 1.9, 2.05);
    // low fence along the lot
    for (let k = -22; k <= 22; k++) { put(R, cyl(0.03, 0.03, 1.2, 6), M("#1d1d1f", 0.5, 0.6), k * 2, 0.6, -2.3); }
    put(R, rbox(88, 0.06, 0.06, 0.01), M("#1d1d1f", 0.5, 0.6), 0, 1.1, -2.3); put(R, rbox(88, 0.06, 0.06, 0.01), M("#1d1d1f", 0.5, 0.6), 0, 0.3, -2.3);
  }
  buildTruck(R: THREE.Object3D) {
    this.truck = grp(R, -14, 0, 3.2, Math.PI / 2);
    const red = MP("#1f3a2a", 0.4, { clearcoat: 0.8 });
    put(this.truck, rbox(1.7, 0.9, 1.9, 0.12), red, 0, 1.05, 1.6);                 // hood
    put(this.truck, rbox(1.9, 1.6, 1.4, 0.1), red, 0, 1.55, 0.3);                  // cab
    put(this.truck, rbox(1.95, 0.12, 1.5, 0.05), M("#111", 0.4), 0, 2.4, 0.3);
    put(this.truck, rbox(2.1, 0.3, 3.4, 0.05), M("#7a5a3a", 0.7), 0, 0.9, -2.1);   // flat bed
    put(this.truck, rbox(1.6, 0.9, 0.1, 0.02), MP("#c0c4ca", 0.05, { transparent: true, opacity: 0.35 }), 0, 2.0, 1.0, { cast: false });
    const sp = canvas(64, 64, (g) => { g.fillStyle = "#fff8e0"; g.fillRect(0, 0, 64, 64); });
    for (const sx of [-1, 1]) put(this.truck, cyl(0.16, 0.16, 0.15, 16), glow(sp, 0.8), sx * 0.6, 1.25, 2.6, { rx: Math.PI / 2 });
    for (const [x, z] of [[-0.95, 1.6], [0.95, 1.6], [-0.95, -2.6], [0.95, -2.6]]) { put(this.truck, cyl(0.48, 0.48, 0.18, 18), M("#1a1a1a", 0.6), x, 0.48, z, { rz: Math.PI / 2 }); for (let k = 0; k < 6; k++) put(this.truck, rbox(0.03, 0.85, 0.05, 0.01), M("#c9a55a", 0.3, 0.8), x * 1.06, 0.48, z, { rx: (k * Math.PI) / 6 }); }
    const sideT = canvas(512, 128, (g) => { g.fillStyle = "#1f3a2a"; g.fillRect(0, 0, 512, 128); text(g, "NORTH END DELIVERY", 256, 66, 48, "#e8cf8a"); });
    for (const sx of [-1, 1]) put(this.truck, new THREE.PlaneGeometry(1.2, 0.3), M("#ffffff", 0.5, 0, { map: sideT }), sx * 0.96, 1.6, 0.3, { ry: sx * Math.PI / 2, cast: false });
    // the dashboard speedometer (seen from the driver's seat)
    this.gaugeMat = new THREE.MeshStandardMaterial({ map: this.gauge(0), roughness: 0.3, emissive: "#ffffff", emissiveMap: this.gauge(0), emissiveIntensity: 0.25 });
    put(this.truck, new THREE.TorusGeometry(0.19, 0.02, 10, 40), M("#c9a55a", 0.3, 1), 0.35, 1.95, 0.912);
    put(this.truck, new THREE.CircleGeometry(0.18, 40), this.gaugeMat, 0.35, 1.95, 0.915, { ry: Math.PI, cast: false });
    put(this.truck, rbox(1.7, 0.35, 0.15, 0.03), M("#3a2616", 0.6), 0, 1.6, 0.98);
    put(this.truck, new THREE.TorusGeometry(0.22, 0.025, 8, 24), M("#1a1a1a", 0.5), -0.35, 1.75, 0.7, { rx: 1.0 });
  }
  gauge(mph: number) {
    const q = Math.round(mph);
    if (!this.gaugeCache.has(q)) this.gaugeCache.set(q, canvas(256, 256, (g) => {
      g.fillStyle = "#f6efdc"; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
      for (let v = 0; v <= 50; v += 5) { const a = -2.4 + (v / 50) * 4.8; g.strokeStyle = "#1c1814"; g.lineWidth = v % 10 ? 3 : 6; g.beginPath(); g.moveTo(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100); g.lineTo(128 + Math.sin(a) * 116, 128 - Math.cos(a) * 116); g.stroke(); if (v % 10 === 0) text(g, String(v), 128 + Math.sin(a) * 78, 128 - Math.cos(a) * 78, 26, "#1c1814", INTER); }
      text(g, "MPH", 128, 182, 22, "#7a1515", INTER);
      const a = -2.4 + (q / 50) * 4.8; g.strokeStyle = "#c8202a"; g.lineWidth = 7; g.lineCap = "round"; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(a) * 104, 128 - Math.cos(a) * 104); g.stroke();
      g.fillStyle = "#1c1814"; g.beginPath(); g.arc(128, 128, 12, 0, 7); g.fill();
    }));
    return this.gaugeCache.get(q)!;
  }
  setGauge(mph: number) { const t = this.gauge(mph); this.gaugeMat.map = t; this.gaugeMat.emissiveMap = t; }
  setThermo(deg: number) { const q = Math.round(deg); if (!this.thermoCache.has(q)) this.thermoCache.set(q, thermoTex(q)); this.thermo.map = this.thermoCache.get(q)!; }
  buildPark(R: THREE.Object3D) {
    this.park = grp(R); this.park.visible = false;
    const P = this.park;
    const grass = canvas(512, 512, (g) => { const r = rng(5); g.fillStyle = "#4f9a3f"; g.fillRect(0, 0, 512, 512); for (let k = 0; k < 7000; k++) { g.fillStyle = r() < 0.5 ? "rgba(30,90,30,0.4)" : "rgba(140,200,90,0.35)"; g.fillRect(r() * 512, r() * 512, 2, 5); } for (let y = 0; y < 512; y += 128) { g.fillStyle = "rgba(255,255,255,0.05)"; g.fillRect(0, y, 512, 64); } });
    put(P, new THREE.PlaneGeometry(90, 38), M("#ffffff", 0.9, 0, { map: rep(grass, 18, 8) }), 0, 0.05, -21.5, { rx: -Math.PI / 2, cast: false });
    // ball diamond (infield dirt + bases + mound), backstop, bleachers, scoreboard, trees, benches, the plaque
    const D = grp(P, 4, 0.07, -20, Math.PI / 4 + Math.PI);
    put(D, new THREE.CircleGeometry(14, 48, 0, Math.PI / 2), M("#b07a4a", 0.95), 0, 0, 0, { rx: -Math.PI / 2, rz: 0, cast: false });
    put(D, new THREE.PlaneGeometry(7.5, 7.5), M("#4f9a3f", 0.9), 4.2, 0.01, -4.2, { rx: -Math.PI / 2, cast: false });
    for (const [x, z] of [[9.5, 0.4], [9.5, -9.5], [0.4, -9.5]]) put(D, rbox(0.4, 0.08, 0.4, 0.02), M("#ffffff", 0.6), x * 0.9, 0.04, z * 0.9);
    put(D, cyl(1.3, 1.5, 0.25, 24), M("#b07a4a", 0.9), 4.2, 0.05, -4.2);
    const fenceT = canvas(256, 256, (g) => { g.clearRect(0, 0, 256, 256); g.strokeStyle = "#c0c4ca"; g.lineWidth = 3; for (let k = -256; k < 512; k += 22) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 256, 256); g.stroke(); g.beginPath(); g.moveTo(k + 256, 0); g.lineTo(k, 256); g.stroke(); } });
    const fm = new THREE.MeshStandardMaterial({ map: rep(fenceT, 6, 2), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.4, metalness: 0.6 });
    put(P, new THREE.PlaneGeometry(14, 5), fm, 4 + 0, 2.5, -20 + 2.5, { ry: Math.PI / 4, cast: false });
    put(P, new THREE.PlaneGeometry(80, 2.2), fm, 0, 1.1, -3.0, { cast: false });
    this.score = glow(scoreTex("WELCOME TO THE PARK"), 1.9);
    const sb = grp(P, -12, 0, -32, 0.35);
    for (const sx of [-1, 1]) put(sb, rbox(0.3, 6, 0.3, 0.04), M("#1d3a2a", 0.4, 0.5), sx * 3.2, 3, 0);
    put(sb, rbox(7, 3.6, 0.3, 0.05), M("#1d3a2a", 0.4, 0.4), 0, 5.6, 0);
    put(sb, new THREE.PlaneGeometry(6.6, 3.3), this.score, 0, 5.6, 0.16, { cast: false });
    for (let k = 0; k < 4; k++) put(P, rbox(8, 0.12, 0.5, 0.02), M("#9aa0a8", 0.3, 0.8), 18, 0.4 + k * 0.45, -10 - k * 0.55);
    const r = rng(41);
    for (const [x, z] of [[-30, -10], [-22, -34], [26, -30], [34, -12], [-36, -26]] as const) {
      const t = grp(P, x, 0, z); put(t, cyl(0.25, 0.35, 4, 10), M("#6b4a2a", 0.85), 0, 2, 0);
      for (let k = 0; k < 9; k++) put(t, new THREE.IcosahedronGeometry(1.5, 1), MP(k % 3 ? "#3f8f3a" : "#2f7a32", 0.7, { clearcoat: 0 }), (r() - 0.5) * 2.4, 4.6 + r() * 2, (r() - 0.5) * 2.4);
    }
    const pq = grp(P, -6, 0.12, -1.6);
    put(pq, rbox(1.0, 1.0, 0.6, 0.08), M("#8e877b", 0.85), 0, 0.5, 0);
    put(pq, rbox(0.9, 0.62, 0.05, 0.01), M("#ffffff", 0.45, 0.15, { map: plaqueTex() }), 0, 0.55, 0.315);
    for (const x of [-10, 2]) { const b = grp(P, x, 0, -4.2); for (let k = 0; k < 3; k++) put(b, rbox(1.8, 0.05, 0.14, 0.01), M("#6b4a2a", 0.6), 0, 0.45, -0.18 + k * 0.17); for (const sx of [-1, 1]) put(b, rbox(0.06, 0.45, 0.45, 0.01), M("#222", 0.4, 0.8), sx * 0.8, 0.22, 0); }
  }
  /** per frame: the flood. ft < 0 = before the burst; mode "settled" = the night layer */
  flood(ft: number, mode: "flood" | "settled" | "none", t: number) {
    const pos = this.waveGeo.attributes.position as THREE.BufferAttribute;
    const n = pos.count, show = mode !== "none" && (mode === "settled" || ft > 0);
    this.wave.visible = show; this.drops.visible = mode === "flood" && ft > 0 && ft < 6;
    // the tank: panels fall outward, roof drops, the liquid level sinks
    const burst = mode === "flood" ? Math.max(0, ft) : mode === "settled" ? 99 : 0;
    this.panels.forEach((g, k) => {
      const a = (k + 0.5) * (2 * Math.PI / 16), front = Math.cos(a - Math.PI * 0.0);
      const spd = 0.55 + 0.35 * ((k * 7) % 5) / 5 + 0.3 * Math.max(0, front);
      const ang = Math.min(Math.PI / 2 - 0.05, spd * burst * burst * 0.9);
      g.rotation.set(ang, a, 0, "YXZ");
      g.position.set(Math.sin(a) * (RT + Math.min(burst, 4) * 0.6 * (k % 3 === 0 ? 1.5 : 0.6)), 0, Math.cos(a) * (RT + Math.min(burst, 4) * 0.6 * (k % 3 === 0 ? 1.5 : 0.6)));
      if (mode === "none" && ft < 0 && ft > -1.4) { g.position.x += Math.sin(t * 60 + k) * 0.03; }
    });
    this.roof.position.y = TH + 1.3 - Math.min(TH, burst * burst * 4.9);
    this.roof.rotation.z = Math.min(0.3, burst * 0.2);
    this.liquid.visible = burst > 0;
    const level = burst > 0 ? Math.max(0.6, TH * Math.exp(-burst / 1.2)) : 0;
    this.liquid.scale.y = level; this.liquid.position.y = level / 2;
    if (!show) return;
    const Rf = RT + WAVE_V * Math.max(0, ft), H = 7.6 * Math.exp(-Math.max(0, ft) / 3.2) + 0.9, base = 1.2 * Math.exp(-Math.max(0, ft) / 6) + 0.55;
    const width = 4 + Math.max(0, ft) * 1.6;
    for (let i = 0; i < n; i++) {
      const x = pos.getX(i), z = pos.getZ(i), dx = x - TANK.x, dz = z - TANK.z, r = Math.hypot(dx, dz);
      let h: number;
      if (mode === "settled") h = 0.75 + 0.12 * Math.sin(x * 0.7 + z * 0.4) + 0.08 * Math.sin(x * 1.9 - z * 1.3) - (r > 46 ? (r - 46) * 0.2 : 0);
      else if (r > Rf + 1.6) h = -0.3;
      else if (r > Rf) h = H * Math.sqrt(Math.max(0, 1 - (r - Rf) / 1.6)) * 0.9;
      else {
        const d = Rf - r;
        h = base * (0.6 + 0.4 * Math.exp(-r / 30)) + (H - base) * Math.exp(-(d / width) * (d / width));
        h += 0.12 * Math.sin(r * 1.3 - t * 7) + 0.08 * Math.sin(x * 0.9 + z * 1.4 + t * 3);
      }
      if (r < RT - 0.4 && mode === "flood") h = Math.min(h, level - 0.2);
      pos.setY(i, h);
    }
    pos.needsUpdate = true; this.waveGeo.computeVertexNormals();
    this.waveMat.roughness = mode === "settled" ? 0.42 : 0.22; this.waveMat.clearcoat = mode === "settled" ? 0.3 : 0.8;
    // splashes riding the front
    if (this.drops.visible) {
      const r = rng(5), m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
      for (let k = 0; k < 420; k++) {
        const a = r() * Math.PI * 2, ph = (r() + t * (0.8 + r())) % 1, life = ph;
        const rad = Rf - 0.5 + life * (2 + r() * 3), y = H * (0.6 + 0.5 * r()) + life * 3 - life * life * 6;
        const sc = (0.3 + r() * 0.9) * (1 - life * 0.6);
        s.set(sc, sc * (0.8 + r() * 0.6), sc); q.setFromEuler(new THREE.Euler(r() * 3, r() * 3, 0));
        m.compose(new THREE.Vector3(TANK.x + Math.sin(a) * rad, Math.max(0.1, y), TANK.z + Math.cos(a) * rad), q, s); this.drops.setMatrixAt(k, m);
      }
      this.drops.instanceMatrix.needsUpdate = true;
    }
  }
  /** the elevated railway bends and the shed blows apart when the front reaches them */
  damage(ft: number) {
    const hitEl = Math.max(0, ft - (Math.abs(6 - TANK.z) - RT) / WAVE_V);
    this.elBent.forEach((s, i) => { const k = Math.min(1, hitEl * 1.4); s.rotation.x = 0.22 * k * (i === 1 ? 1.4 : 0.8); s.position.y = -1.4 * k * (i === 1 ? 1 : 0.5); s.rotation.z = (i - 1) * 0.08 * k; });
    this.train.rotation.x = 0.15 * Math.min(1, hitEl * 1.2);
    const hitShed = ft - (SHED.distanceTo(new THREE.Vector3(TANK.x, 0, TANK.z)) - RT - 3) / WAVE_V;
    this.boards.forEach((b) => {
      if (hitShed <= 0) { b.m.position.copy(b.p0); b.m.rotation.copy(b.r0); return; }
      const u = Math.min(hitShed, 3);
      b.m.position.set(b.p0.x + b.v.x * u * 0.5, Math.max(0.1, b.p0.y + b.v.y * u * 0.6 - 4.9 * u * u * 0.6), b.p0.z + b.v.z * u * 0.5);
      b.m.rotation.set(b.r0.x + b.w.x * u, b.r0.y + b.w.y * u, b.r0.z + b.w.z * u);
    });
  }
  setLight(kind: "noon" | "night" | "sepia" | "summer" | "today") {
    const u = this.skyMat.uniforms;
    const set = (top: string, mid: string, bot: string) => { u.top.value.set(top); u.mid.value.set(mid); u.bot.value.set(bot); };
    const night = kind === "night";
    this.lampLights.forEach((l) => (l.intensity = night ? 18 : 0)); this.streetLamps.emissiveIntensity = night ? 5 : 0.2;
    this.windows.forEach((w) => (w.emissiveIntensity = night ? 0.9 : 0.15));
    if (kind === "noon" || kind === "sepia") { set("#5c9ae0", "#b8d6f2", "#eef4fa"); this.sun.color.set("#fff2dc"); this.sun.intensity = 3.0; this.sun.position.set(-40, 25, 12); this.hemi.intensity = 0.95; this.hemi.color.set("#d6e6ff"); }
    if (night) { set("#060b1e", "#142446", "#26385e"); this.sun.color.set("#8fb0ff"); this.sun.intensity = 1.5; this.sun.position.set(20, 30, 30); this.hemi.intensity = 0.5; this.hemi.color.set("#5a78c0"); }
    if (kind === "summer") { set("#3f8fe8", "#a8d4ff", "#fff4dc"); this.sun.color.set("#fff0c8"); this.sun.intensity = 3.8; this.sun.position.set(-8, 40, 30); this.hemi.intensity = 1.0; this.hemi.color.set("#e6f0ff"); }
    if (kind === "today") { set("#4a98ec", "#b6dcff", "#f4f8ff"); this.sun.color.set("#fff6e0"); this.sun.intensity = 3.4; this.sun.position.set(-20, 30, 34); this.hemi.intensity = 1.0; this.hemi.color.set("#dde9ff"); }
    this.sun.target.position.set(0, 0, -5);
  }
  setSmell(on: boolean, t: number) {
    this.smells.forEach((s, k) => {
      s.visible = on; if (!on) return;
      const ph = (t * 0.25 + k / 14) % 1;
      s.position.set(-6.4 + (k % 7) * 0.85, 0.4 + ph * 2.2, 11.2 + Math.floor(k / 7) * 1.1 + Math.sin(k) * 0.3);
      s.scale.set(0.45, 1.6, 1); (s.material as THREE.SpriteMaterial).opacity = Math.sin(Math.PI * ph) * 0.85;
    });
  }
  setBoard(summer: boolean) {
    if (summer && !this.summerTex) this.summerTex = canvas(768, 512, (g) => { g.fillStyle = "#1c1814"; g.fillRect(0, 0, 768, 512); g.strokeStyle = "#e8cf8a"; g.lineWidth = 10; g.strokeRect(14, 14, 740, 484); text(g, "HOT TODAY!", 384, 120, 96, "#ffd88a"); text(g, "ICE CREAM 5¢", 384, 270, 90, "#f1e6cf"); text(g, "COLD SODA", 384, 400, 70, "#f1e6cf", INTER); });
    this.dateBoard.map = summer ? this.summerTex! : this.dateTex;
  }
  setScore(msg: string) { this.score.emissiveMap = scoreTex(msg); }
}
export { scoreTex, paperTex, plaqueTex };
