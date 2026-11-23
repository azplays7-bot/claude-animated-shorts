// "The Great Stink of 1858" (London), detailed style. Four sets placed 200 m apart: the Thames (origin; 1858 mud bank
// with a sewer outfall, sludge, flies and stink wisps, a Gothic Parliament with the unfinished clock tower, a paddle
// steamer, an embankment under construction with a cutaway sewer; a "today" variant with clean water, a granite
// embankment, lamps and a tour boat), a Victorian street (x 200: miasma poster, chemist's thermometer, the Broad Street
// pump and Snow's map), the House of Commons (x 400: green benches, curtains, chloride of lime, the bill, a day
// counter) and a brick sewer tunnel under construction (x 600). Each set lists its obstacles for overlap checks.
import * as THREE from "three";
import { ANTON, INTER, M, MP, glow, canvas, rep, rbox, cyl, put, grp, text, rng } from "../look/kit";

export const SETS = { river: new THREE.Vector3(0, 0, 0), street: new THREE.Vector3(200, 0, 0), commons: new THREE.Vector3(400, 0, 0), tunnel: new THREE.Vector3(600, 0, 0) };
export type Obstacle = [number, number, number]; // x, z, radius (set-local)
const SERIF = "Georgia, 'Times New Roman', serif";

const brick = (base: string, seed: number) => canvas(1024, 1024, (g) => { const r = rng(seed); g.fillStyle = "#c8bca8"; g.fillRect(0, 0, 1024, 1024); for (let row = 0; row < 32; row++) for (let c = -1; c < 9; c++) { const x = c * 128 + (row % 2 ? 64 : 0) + 3, y = row * 32 + 3; const col = new THREE.Color(base).multiplyScalar(0.82 + r() * 0.34); g.fillStyle = `#${col.getHexString()}`; g.fillRect(x, y, 122, 26); } });
const stone = (base = "#c8c0b0") => canvas(512, 512, (g) => { const r = rng(7); g.fillStyle = "#8a8478"; g.fillRect(0, 0, 512, 512); for (let row = 0; row < 8; row++) for (let c = -1; c < 5; c++) { const col = new THREE.Color(base).multiplyScalar(0.85 + r() * 0.25); g.fillStyle = `#${col.getHexString()}`; g.fillRect(c * 128 + (row % 2 ? 64 : 0) + 3, row * 64 + 3, 122, 58); } });
const cobble = () => canvas(1024, 1024, (g) => { const r = rng(13); g.fillStyle = "#4e4a46"; g.fillRect(0, 0, 1024, 1024); for (let row = 0; row < 24; row++) for (let c = -1; c < 21; c++) { const x = c * 52 + (row % 2 ? 26 : 0), y = row * 43, v = 95 + r() * 60; g.fillStyle = `rgb(${v + 8},${v},${v - 6})`; g.beginPath(); g.ellipse(x + 26, y + 21, 23, 18, 0, 0, 7); g.fill(); } });
const sludge = () => canvas(1024, 1024, (g) => {
  const r = rng(21); g.fillStyle = "#4f5032"; g.fillRect(0, 0, 1024, 1024);
  for (let k = 0; k < 60; k++) { const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1); void gr; g.fillStyle = `rgba(${70 + r() * 30},${55 + r() * 20},${25 + r() * 15},${0.5 + r() * 0.4})`; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 20 + r() * 70, 10 + r() * 40, r() * 3, 0, 7); g.fill(); }
  for (let k = 0; k < 400; k++) { g.fillStyle = `rgba(230,230,200,${r() * 0.25})`; g.beginPath(); g.arc(r() * 1024, r() * 1024, 1 + r() * 3, 0, 7); g.fill(); }
}, true);
const cleanWater = () => canvas(512, 512, (g) => { const r = rng(5); g.fillStyle = "#2f6f8f"; g.fillRect(0, 0, 512, 512); for (let k = 0; k < 600; k++) { g.strokeStyle = `rgba(255,255,255,${r() * 0.15})`; g.lineWidth = 2; g.beginPath(); const x = r() * 512, y = r() * 512; g.moveTo(x, y); g.lineTo(x + 20 + r() * 30, y); g.stroke(); } });
const mud = () => canvas(512, 512, (g) => { const r = rng(9); g.fillStyle = "#5a4a32"; g.fillRect(0, 0, 512, 512); for (let k = 0; k < 4000; k++) { g.fillStyle = r() < 0.5 ? `rgba(40,30,20,${r() * 0.4})` : `rgba(120,100,70,${r() * 0.3})`; g.fillRect(r() * 512, r() * 512, 2 + r() * 5, 2 + r() * 4); } });
const gothic = () => canvas(1024, 1024, (g) => {
  g.fillStyle = "#c8b48a"; g.fillRect(0, 0, 1024, 1024);
  for (let x = 0; x < 1024; x += 64) { g.fillStyle = "rgba(110,90,60,0.35)"; g.fillRect(x, 0, 6, 1024); }
  for (let y = 0; y < 1024; y += 256) for (let x = 12; x < 1024; x += 64) { g.fillStyle = "#3a3a44"; g.beginPath(); g.moveTo(x, y + 220); g.lineTo(x, y + 90); g.quadraticCurveTo(x + 20, y + 40, x + 40, y + 90); g.lineTo(x + 40, y + 220); g.fill(); g.fillStyle = "rgba(255,240,200,0.15)"; g.fillRect(x + 4, y + 100, 12, 110); }
  for (let y = 240; y < 1024; y += 256) { g.fillStyle = "#a89468"; g.fillRect(0, y, 1024, 16); }
});
const smellTex = () => canvas(128, 512, (g) => { g.strokeStyle = "rgba(120,170,60,0.85)"; g.lineWidth = 12; g.lineCap = "round"; for (const off of [34, 94]) { g.beginPath(); for (let y = 500; y > 10; y -= 8) g.lineTo(off + 20 * Math.sin(y / 40), y); g.stroke(); } });
const fliesTex = () => canvas(128, 128, (g) => { const r = rng(3); for (let k = 0; k < 7; k++) { const x = 20 + r() * 88, y = 20 + r() * 88; g.fillStyle = "#111"; g.beginPath(); g.ellipse(x, y, 5, 3.5, 0, 0, 7); g.fill(); g.fillStyle = "rgba(220,230,255,0.7)"; g.beginPath(); g.ellipse(x - 3, y - 4, 4, 2, -0.6, 0, 7); g.ellipse(x + 3, y - 4, 4, 2, 0.6, 0, 7); g.fill(); } });
export const paperTex = () => canvas(640, 840, (g) => {
  g.fillStyle = "#efe6cf"; g.fillRect(0, 0, 640, 840);
  text(g, "THE LONDON DAILY", 320, 70, 56, "#1c1814", SERIF); g.fillStyle = "#1c1814"; g.fillRect(30, 108, 580, 4);
  text(g, "JUNE · 1858", 320, 136, 24, "#1c1814", INTER);
  text(g, "THE GREAT", 320, 240, 104, "#1c1814"); text(g, "STINK", 320, 360, 140, "#5a6a1a");
  text(g, "THAMES UNBEARABLE IN THE HEAT", 320, 450, 28, "#1c1814", INTER);
  g.fillStyle = "#8a8070"; g.fillRect(40, 490, 270, 220); g.fillStyle = "#4f5032"; g.fillRect(40, 640, 270, 70);
  for (let k = 0; k < 13; k++) { g.fillStyle = "rgba(28,24,20,0.5)"; g.fillRect(330, 500 + k * 18, 260 - (k % 4) * 30, 7); }
  for (let k = 0; k < 5; k++) { g.fillStyle = "rgba(28,24,20,0.5)"; g.fillRect(40, 740 + k * 18, 560 - (k % 3) * 60, 7); }
});
const posterTex = () => canvas(512, 720, (g) => { g.fillStyle = "#efe2c0"; g.fillRect(0, 0, 512, 720); g.strokeStyle = "#2a2018"; g.lineWidth = 10; g.strokeRect(14, 14, 484, 692); text(g, "BEWARE", 256, 110, 100, "#7a1d1d"); text(g, "OF BAD AIR!", 256, 210, 70, "#2a2018"); text(g, "“MIASMA”", 256, 320, 64, "#5a6a1a", SERIF); for (let k = 0; k < 3; k++) { g.strokeStyle = "rgba(120,170,60,0.9)"; g.lineWidth = 10; g.beginPath(); for (let y = 640; y > 400; y -= 8) g.lineTo(150 + k * 100 + 18 * Math.sin(y / 30), y); g.stroke(); } text(g, "keep windows shut", 256, 680, 30, "#2a2018", SERIF); });
const mapTex = () => canvas(768, 768, (g) => {
  g.fillStyle = "#efe6cf"; g.fillRect(0, 0, 768, 768); g.strokeStyle = "#2a2018"; g.lineWidth = 6; g.strokeRect(10, 10, 748, 748);
  text(g, "CHOLERA DEATHS · 1854", 384, 60, 44, "#2a2018"); g.strokeStyle = "rgba(42,32,24,0.5)"; g.lineWidth = 10;
  for (const [x1, y1, x2, y2] of [[60, 200, 700, 220], [80, 420, 720, 400], [60, 620, 700, 640], [200, 100, 220, 720], [480, 100, 460, 720]]) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  const r = rng(4); g.fillStyle = "#1c1814"; for (let k = 0; k < 140; k++) { const a = r() * Math.PI * 2, d = Math.pow(r(), 1.8) * 230; g.fillRect(360 + Math.cos(a) * d, 410 + Math.sin(a) * d * 0.8, 10, 6); }
  g.fillStyle = "#1d5ac8"; g.beginPath(); g.arc(370, 410, 16, 0, 7); g.fill(); text(g, "PUMP", 370, 450, 30, "#1d5ac8");
});
const thermoTex = () => canvas(256, 768, (g) => { g.fillStyle = "#f2ead6"; g.fillRect(0, 0, 256, 768); g.strokeStyle = "#7a1515"; g.lineWidth = 10; g.strokeRect(5, 5, 246, 758); text(g, "HOT", 128, 70, 64, "#d8262e"); text(g, "WARM", 200, 330, 26, "#1c1814", INTER); text(g, "COLD", 200, 600, 26, "#1c1814", INTER); g.fillStyle = "#ddd"; g.fillRect(104, 120, 32, 560); g.fillStyle = "#d8262e"; g.fillRect(104, 140, 32, 540); g.beginPath(); g.arc(120, 690, 36, 0, 7); g.fill(); });
export const billTex = (law: number) => canvas(640, 840, (g) => {
  g.fillStyle = "#f3ecd8"; g.fillRect(0, 0, 640, 840); g.strokeStyle = "#2a2018"; g.lineWidth = 6; g.strokeRect(16, 16, 608, 808);
  text(g, "A BILL", 320, 90, 70, "#2a2018"); text(g, "for the Main Drainage", 320, 160, 40, "#2a2018", SERIF); text(g, "of the Metropolis", 320, 210, 40, "#2a2018", SERIF);
  text(g, "INTRODUCED:", 320, 320, 44, "#2a2018"); text(g, "15 JULY 1858", 320, 380, 56, "#1d3a5a");
  text(g, "BECAME LAW:", 320, 490, 44, "#2a2018"); text(g, "2 AUGUST 1858", 320, 550, 56, "#1d3a5a");
  if (law > 0) { g.save(); g.translate(320, 690); g.rotate(-0.12); const s = 1 + 1.4 * Math.max(0, 1 - law); g.scale(s, s); g.globalAlpha = Math.min(1, law * 1.4); g.strokeStyle = "#b51d24"; g.lineWidth = 12; g.strokeRect(-160, -60, 320, 120); text(g, "LAW", 0, 6, 100, "#b51d24"); g.restore(); }
});
export const dayTex = (d: number) => canvas(384, 480, (g) => { g.fillStyle = "#f6f1e4"; g.fillRect(0, 0, 384, 480); g.fillStyle = "#1d3a5a"; g.fillRect(0, 0, 384, 110); text(g, d >= 18 ? "2 AUGUST" : "SINCE 15 JULY", 192, 58, d >= 18 ? 56 : 44, "#f6f1e4"); text(g, String(d), 192, 270, 200, "#1c1814"); text(g, d === 1 ? "DAY" : "DAYS", 192, 410, 60, "#7a1d1d"); });
const planTex = (miles: boolean) => canvas(1024, 720, (g) => {
  g.fillStyle = "#1f4a8a"; g.fillRect(0, 0, 1024, 720); g.strokeStyle = "rgba(255,255,255,0.12)"; g.lineWidth = 1; for (let x = 0; x < 1024; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 720); g.stroke(); } for (let y = 0; y < 720; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
  text(g, "MAIN DRAINAGE OF THE METROPOLIS", 512, 60, 40, "#e8f0ff");
  g.strokeStyle = "#7ab8ff"; g.lineWidth = 34; g.beginPath(); g.moveTo(60, 420); g.bezierCurveTo(300, 470, 520, 330, 760, 400); g.lineTo(980, 380); g.stroke(); text(g, "RIVER THAMES", 360, 480, 30, "#e8f0ff", INTER);
  g.strokeStyle = "#ffd88a"; g.lineWidth = 9; for (const dy of [-70, 80]) { g.beginPath(); g.moveTo(60, 420 + dy); g.bezierCurveTo(300, 470 + dy, 520, 330 + dy, 760, 400 + dy); g.lineTo(980, 380 + dy); g.stroke(); }
  g.fillStyle = "#ffd88a"; g.beginPath(); g.moveTo(1000, 380); g.lineTo(960, 350); g.lineTo(960, 410); g.fill(); text(g, "WASTE → EAST, AWAY FROM THE CITY", 640, 600, 30, "#ffd88a", INTER);
  if (miles) { g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 3; const r = rng(2); for (let k = 0; k < 90; k++) { const x = 60 + r() * 900, y = 120 + r() * 520; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 80, y + (r() - 0.5) * 80); g.stroke(); } g.fillStyle = "#b51d24"; g.fillRect(250, 110, 524, 90); text(g, "+ 1,100 MILES OF STREET SEWERS", 512, 156, 36, "#ffffff"); }
});
const endTex = () => canvas(1536, 256, (g) => { g.fillStyle = "#f2ecd8"; g.fillRect(0, 0, 1536, 256); g.strokeStyle = "#1d3a5a"; g.lineWidth = 16; g.strokeRect(10, 10, 1516, 236); text(g, "FOLLOW FOR MORE WEIRD HISTORY", 768, 132, 110, "#1d3a5a"); });

export class Victorian {
  root = new THREE.Group(); river = new THREE.Group(); street = new THREE.Group(); commons = new THREE.Group(); tunnel = new THREE.Group();
  obstacles: Record<string, Obstacle[]> = { river: [], street: [], commons: [], tunnel: [] };
  water!: THREE.Mesh; waterMat!: THREE.MeshPhysicalMaterial; sludgeTex!: THREE.Texture; cleanTex!: THREE.Texture;
  old = new THREE.Group(); today = new THREE.Group(); outflow!: THREE.Mesh; wisps: THREE.Sprite[] = []; flies: THREE.Sprite[] = [];
  steamer!: THREE.Group; tour!: THREE.Group; wheel!: THREE.Group; sun!: THREE.DirectionalLight; hemi!: THREE.HemisphereLight; skyMat!: THREE.ShaderMaterial;
  bill!: THREE.MeshStandardMaterial; billCache = new Map<number, THREE.Texture>(); days!: THREE.MeshStandardMaterial; dayCache = new Map<number, THREE.Texture>();
  plan!: THREE.MeshStandardMaterial; planA!: THREE.Texture; planB!: THREE.Texture; curtainsWet: THREE.MeshStandardMaterial[] = [];
  constructor() {
    for (const [k, v] of Object.entries(SETS)) { const g = (this as unknown as Record<string, THREE.Group>)[k]; g.position.copy(v); this.root.add(g); }
    this.buildRiver(this.river); this.buildStreet(this.street); this.buildCommons(this.commons); this.buildTunnel(this.tunnel);
    const sm = smellTex(), ft = fliesTex();
    for (let k = 0; k < 20; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sm, transparent: true, depthWrite: false })); s.visible = false; this.root.add(s); this.wisps.push(s); }
    for (let k = 0; k < 8; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ft, transparent: true, depthWrite: false })); s.visible = false; this.root.add(s); this.flies.push(s); }
  }
  ob(set: string, x: number, z: number, r: number) { this.obstacles[set].push([x, z, r]); }
  buildRiver(R: THREE.Object3D) {
    this.skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { top: { value: new THREE.Color("#6a8ab0") }, mid: { value: new THREE.Color("#c8c8a8") }, bot: { value: new THREE.Color("#e8dcb8") } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.08 ? mix(mid, top, smoothstep(0.08, 0.7, h)) : mix(bot, mid, smoothstep(-0.03, 0.08, h)); gl_FragColor = vec4(c * 1.1, 1.0); }" });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(180, 32, 16), this.skyMat); sky.name = "sky"; R.add(sky);
    this.sludgeTex = rep(sludge(), 8, 3); this.cleanTex = rep(cleanWater(), 16, 6);
    this.waterMat = new THREE.MeshPhysicalMaterial({ map: this.sludgeTex, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 });
    this.water = put(R, new THREE.PlaneGeometry(240, 70), this.waterMat, 0, -1.2, -38, { rx: -Math.PI / 2, cast: false });
    // the promenade + houses behind it (both eras)
    put(R, new THREE.PlaneGeometry(240, 14), M("#ffffff", 0.75, 0, { map: rep(cobble(), 40, 3) }), 0, 0, 5, { rx: -Math.PI / 2, cast: false });
    const blocks: [number, number, string, number][] = [[-60, -40, "#8a6a4a", 11], [-40, -24, "#9a5a3c", 12], [-24, -8, "#7a6a5a", 10], [-8, 8, "#a8704a", 13], [8, 22, "#8c5a42", 11]];
    blocks.forEach(([x0, x1, col, h], i) => {
      const w = x1 - x0, cx = (x0 + x1) / 2;
      put(R, new THREE.BoxGeometry(w, h, 8), M("#ffffff", 0.85, 0, { map: rep(brick(col, i + 1), w / 3, h / 3) }), cx, h / 2, 16);
      const wt = canvas(128, 192, (g) => { g.fillStyle = "#e8e0d0"; g.fillRect(0, 0, 128, 192); g.fillStyle = "#3a4a5a"; g.fillRect(14, 14, 100, 164); g.fillStyle = "#e8e0d0"; g.fillRect(60, 14, 8, 164); g.fillRect(14, 92, 100, 8); });
      for (let fl = 0; fl < 3; fl++) for (let k = 0; k < Math.floor(w / 2.6); k++) put(R, new THREE.PlaneGeometry(1.0, 1.5), MP("#ffffff", 0.2, { map: wt }), x0 + 1.3 + k * 2.6, 2 + fl * 3, 11.99, { ry: Math.PI, cast: false });
    });
    // 1858: a muddy foreshore, the sewer outfall, debris, a paddle steamer, scaffolded clock tower
    R.add(this.old);
    put(this.old, new THREE.PlaneGeometry(240, 6), M("#ffffff", 0.95, 0, { map: rep(mud(), 40, 1) }), 0, -0.6, -2.8, { rx: -Math.PI / 2 - 0.2, cast: false });
    put(this.old, rbox(240, 0.4, 0.4, 0.05), M("#6a5a4a", 0.9), 0, -0.1, -0.2);
    const out = grp(this.old, -8, 0, -1.2);
    put(out, cyl(0.55, 0.55, 2.2, 20, true), M("#5a4a3a", 0.8, 0.2, { side: THREE.DoubleSide }), 0, -0.2, -0.4, { rx: Math.PI / 2 - 0.25 });
    this.outflow = put(out, new THREE.PlaneGeometry(0.9, 4.0), MP("#4a3a1a", 0.15, { transparent: true, opacity: 0.9, map: rep(sludge(), 1, 2) }), 0, -0.7, -2.6, { rx: -Math.PI / 2 + 0.4, cast: false });
    const r = rng(17);
    for (let k = 0; k < 40; k++) put(this.old, new THREE.SphereGeometry(0.08 + r() * 0.2, 8, 6), M(["#3a2a1a", "#6a5a3a", "#2a2a22"][k % 3], 0.9), -40 + r() * 80, -0.95, -6 - r() * 20, { s: [1.4, 0.3, 1] });
    this.steamer = grp(this.old, 20, -1.2, -22, Math.PI / 2);
    put(this.steamer, rbox(2.4, 1.2, 10, 0.4), MP("#2a2a30", 0.4), 0, 0.5, 0); put(this.steamer, rbox(2.2, 0.9, 5, 0.2), MP("#e8e0d0", 0.5), 0, 1.5, -0.5);
    put(this.steamer, cyl(0.3, 0.35, 3, 14), MP("#b8232c", 0.4), 0, 3.4, 0.4); put(this.steamer, cyl(0.32, 0.32, 0.4, 14), M("#111", 0.4), 0, 5.0, 0.4);
    this.wheel = grp(this.steamer, 1.35, 0.7, 0); for (let k = 0; k < 8; k++) put(this.wheel, rbox(0.1, 1.8, 0.25, 0.02), M("#6a4a2a", 0.7), 0, 0, 0, { rx: k * Math.PI / 8 }); put(this.wheel, new THREE.CylinderGeometry(1.0, 1.0, 0.5, 20, 1, true, 0, Math.PI), MP("#b8232c", 0.4, { side: THREE.DoubleSide }), 0, 0.1, 0, { rz: Math.PI / 2 });
    // Parliament along the river (x 30..70), with the clock tower still in scaffolding
    const P = grp(R, 50, 0, -3);
    const gm = M("#ffffff", 0.8, 0, { map: rep(gothic(), 4, 1) });
    put(P, new THREE.BoxGeometry(40, 14, 10), gm, 0, 7 - 1.2, 5);
    for (let k = 0; k < 9; k++) { put(P, rbox(0.8, 16, 0.8, 0.05), M("#b8a47a", 0.8), -20 + k * 5, 7, -0.1); put(P, new THREE.ConeGeometry(0.6, 2.4, 8), M("#7a6a4a", 0.8), -20 + k * 5, 16.2, -0.1); }
    const ct = grp(P, -22, 0, 3);
    put(ct, new THREE.BoxGeometry(5, 34, 5), gm, 0, 17, 0);
    const clockT = canvas(256, 256, (g) => { g.fillStyle = "#f6f0d8"; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill(); g.strokeStyle = "#1c1814"; g.lineWidth = 8; g.stroke(); });
    put(ct, new THREE.CircleGeometry(1.8, 32), MP("#ffffff", 0.3, { map: clockT }), 0, 27, -2.52, { ry: Math.PI, cast: false });
    for (let y = 30; y < 40; y += 1.2) for (const sx of [-1, 1]) { put(ct, rbox(5.8, 0.12, 0.12, 0.01), M("#8a6a40", 0.8), 0, y, sx * 2.9); put(ct, rbox(0.12, 0.12, 5.8, 0.01), M("#8a6a40", 0.8), sx * 2.9, y, 0); }
    for (const [x, z] of [[-2.9, -2.9], [2.9, -2.9], [-2.9, 2.9], [2.9, 2.9]]) put(ct, cyl(0.08, 0.08, 10, 6), M("#8a6a40", 0.8), x, 35, z);
    // embankment construction (1858+): half-built granite wall with a cutaway sewer pipe, a timber crane
    const E = grp(this.old, -34, 0, -1.5);
    put(E, new THREE.BoxGeometry(14, 4.5, 3), M("#ffffff", 0.85, 0, { map: rep(stone(), 4, 1.2) }), 0, -1.1, -1.6);
    put(E, new THREE.CylinderGeometry(1.15, 1.15, 14.2, 28, 1, true), M("#ffffff", 0.85, 0, { map: rep(brick("#8a4a30", 9), 6, 2), side: THREE.DoubleSide }), 0, -1.0, -1.6, { rz: Math.PI / 2 });
    put(E, new THREE.CircleGeometry(1.15, 28), M("#1a1410", 0.9), -7.11, -1.0, -1.6, { ry: -Math.PI / 2, cast: false });
    put(E, rbox(1.2, 0.3, 1.0, 0.03), M("#ffffff", 0.6, 0, { map: canvas(256, 96, (g) => { g.fillStyle = "#f2ecd8"; g.fillRect(0, 0, 256, 96); text(g, "SEWER", 128, 54, 56, "#7a1d1d"); }) }), -7.3, 0.6, -0.4);
    const cr = grp(E, 5, 0, 1); put(cr, rbox(0.35, 7, 0.35, 0.03), M("#7a5a3a", 0.8), 0, 3.5, 0); put(cr, rbox(5, 0.3, 0.3, 0.03), M("#7a5a3a", 0.8), -2, 6.8, 0, { rz: -0.15 }); put(cr, cyl(0.02, 0.02, 4, 6), M("#222", 0.5), -4.2, 5.0, 0);
    this.ob("river", -34, 0.6, 1.0); this.ob("river", -29, 1.0, 0.6);
    // today: a granite embankment wall, lamps, plane trees, a tour boat with the end banner
    R.add(this.today);
    put(this.today, new THREE.BoxGeometry(240, 3.2, 1.2), M("#ffffff", 0.8, 0, { map: rep(stone("#d8d0c0"), 60, 1) }), 0, -1.4, -0.6);
    put(this.today, rbox(240, 0.25, 1.4, 0.04), M("#c8c0b0", 0.7), 0, 0.85, -0.6);
    const lampT = canvas(8, 8, (g) => { g.fillStyle = "#fff0c0"; g.fillRect(0, 0, 8, 8); });
    for (let x = -60; x <= 60; x += 10) { const l = grp(this.today, x, 0, 0.2); put(l, cyl(0.07, 0.12, 3.6, 10), M("#1d3a2a", 0.4, 0.6), 0, 1.8, 0); put(l, new THREE.SphereGeometry(0.22, 12, 8), glow(lampT, 1.6), 0, 3.8, 0, { cast: false }); this.ob("river", x, 0.2, 0.2); }
    for (let x = -55; x <= 55; x += 10) { const t = grp(this.today, x, 0, 4.5); put(t, cyl(0.22, 0.3, 4, 8), M("#8a7a5a", 0.85), 0, 2, 0); for (let k = 0; k < 6; k++) put(t, new IcoGeo(1.6), MP(k % 2 ? "#4f8a3a" : "#3f7a32", 0.75, { clearcoat: 0 }), Math.cos(k) * 1.2, 4.8 + (k % 3) * 0.6, Math.sin(k) * 1.2); this.ob("river", x, 4.5, 0.4); }
    this.tour = grp(this.today, -10, -1.2, -12, Math.PI / 2);
    put(this.tour, rbox(3.2, 1.2, 14, 0.5), MP("#f2f2f2", 0.3), 0, 0.5, 0); put(this.tour, rbox(3.0, 1.4, 9, 0.3), MP("#1d3a5a", 0.2, { transparent: true, opacity: 0.85 }), 0, 1.7, -0.5);
    put(this.tour, rbox(3.1, 0.15, 9.2, 0.05), MP("#f2f2f2", 0.3), 0, 2.45, -0.5);
    put(this.tour, new THREE.PlaneGeometry(7.2, 1.2), M("#ffffff", 0.5, 0, { map: endTex() }), -1.62, 1.6, -0.5, { ry: -Math.PI / 2, cast: false });
    this.hemi = new THREE.HemisphereLight("#d8d8c0", "#5a5a3a", 0.85); R.add(this.hemi);
    this.sun = new THREE.DirectionalLight("#fff0c8", 3.4); this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048); Object.assign(this.sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 140 }); this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.04;
    R.add(this.sun, this.sun.target);
    // street furniture on the promenade (1858): posts, a bench
    for (let x = -50; x <= 50; x += 6) { put(this.old, cyl(0.1, 0.12, 0.9, 8), M("#2a2a2e", 0.5, 0.6), x, 0.45, 0.3); this.ob("river", x, 0.3, 0.15); }
  }
  setEra(today: boolean, sunset: boolean) {
    this.old.visible = !today; this.today.visible = today;
    this.waterMat.map = today ? this.cleanTex : this.sludgeTex; this.waterMat.roughness = today ? 0.08 : 0.35; this.waterMat.needsUpdate = true;
    const u = this.skyMat.uniforms;
    if (sunset) { u.top.value.set("#3a4f9a"); u.mid.value.set("#f2a25a"); u.bot.value.set("#ffd08a"); this.sun.color.set("#ffa060"); this.sun.intensity = 3.4; this.hemi.color.set("#ffc0a0"); this.hemi.intensity = 0.6; }
    else if (today) { u.top.value.set("#3f8fe0"); u.mid.value.set("#9fd0ff"); u.bot.value.set("#e8f4ff"); this.sun.color.set("#fff4e0"); this.sun.intensity = 3.2; this.hemi.color.set("#cfe4ff"); this.hemi.intensity = 0.9; }
    else { u.top.value.set("#8a9a80"); u.mid.value.set("#d8d0a0"); u.bot.value.set("#ece0b8"); this.sun.color.set("#fff0c0"); this.sun.intensity = 3.8; this.hemi.color.set("#e8e0b0"); this.hemi.intensity = 0.85; }
  }
  buildStreet(R: THREE.Object3D) {
    put(R, new THREE.PlaneGeometry(60, 30), M("#ffffff", 0.75, 0, { map: rep(cobble(), 12, 6) }), 0, 0, 4, { rx: -Math.PI / 2, cast: false });
    put(R, new THREE.PlaneGeometry(60, 2.4), M("#a49c8e", 0.8), 0, 0.1, -1.2, { rx: -Math.PI / 2, cast: false });
    put(R, new THREE.PlaneGeometry(60, 0.4), MP("#4a3a1a", 0.1, { clearcoat: 1 }), 0, 0.02, 0.2, { rx: -Math.PI / 2, cast: false });   // the open gutter
    const blocks: [number, number, string, number][] = [[-20, -9, "#7a5a44", 11], [-9, 2, "#8a6a4a", 12], [2, 12, "#6a5a4a", 11], [12, 22, "#8a5a3c", 12]];
    blocks.forEach(([x0, x1, col, h], i) => {
      const w = x1 - x0, cx = (x0 + x1) / 2;
      put(R, new THREE.BoxGeometry(w, h, 6), M("#ffffff", 0.85, 0, { map: rep(brick(col, i + 5), w / 3, h / 3) }), cx, h / 2, -5.4);
      const wt = canvas(128, 192, (g) => { g.fillStyle = "#e8e0d0"; g.fillRect(0, 0, 128, 192); g.fillStyle = "#3a4a5a"; g.fillRect(14, 14, 100, 164); g.fillStyle = "#e8e0d0"; g.fillRect(60, 14, 8, 164); g.fillRect(14, 92, 100, 8); });
      for (let fl = 0; fl < 3; fl++) for (let k = 0; k < Math.floor(w / 2.6); k++) put(R, new THREE.PlaneGeometry(1.0, 1.5), MP("#ffffff", 0.2, { map: wt }), x0 + 1.3 + k * 2.6, 4.6 + fl * 2.6, -2.39, { cast: false });
      put(R, rbox(1.2, 2.4, 0.1, 0.02), MP(["#2a3a2a", "#5a1d1d", "#1d2a4a", "#3a2a1a"][i], 0.4), cx - w * 0.3, 1.2, -2.35);
    });
    // chemist with the thermometer, the miasma poster, the Broad Street pump + Snow's map on an easel
    const ch = grp(R, 6, 0, -2.38);
    put(ch, rbox(3.6, 2.4, 0.1, 0.02), MP("#1d3a5a", 0.4), 0, 1.6, 0.05);
    put(ch, rbox(3.8, 0.6, 0.12, 0.03), M("#ffffff", 0.5, 0, { map: canvas(1024, 160, (g) => { g.fillStyle = "#1d3a5a"; g.fillRect(0, 0, 1024, 160); text(g, "CHEMIST & DRUGGIST", 512, 86, 86, "#e0b84a", SERIF); }) }), 0, 3.1, 0.1);
    put(ch, rbox(0.5, 1.45, 0.06, 0.02), M("#ffffff", 0.5, 0, { map: thermoTex() }), 2.3, 1.6, 0.1);
    const pumpX = -3.5; const pump = grp(R, pumpX, 0, 0.9);
    put(pump, cyl(0.22, 0.28, 2.2, 16), MP("#1d2a2a", 0.4, { metalness: 0.5 }), 0, 1.1, 0); put(pump, new THREE.SphereGeometry(0.28, 14, 10), MP("#1d2a2a", 0.4, { metalness: 0.5 }), 0, 2.25, 0);
    put(pump, cyl(0.05, 0.05, 0.5, 8), MP("#1d2a2a", 0.4, { metalness: 0.5 }), 0, 1.0, 0.3, { rx: Math.PI / 2 });
    put(pump, cyl(0.035, 0.035, 1.1, 8), MP("#1d2a2a", 0.4, { metalness: 0.5 }), 0.35, 1.9, 0, { rz: 0.5 });
    put(pump, rbox(1.4, 0.35, 0.05, 0.01), M("#ffffff", 0.6, 0, { map: canvas(512, 128, (g) => { g.fillStyle = "#f2ecd8"; g.fillRect(0, 0, 512, 128); g.strokeStyle = "#1c1814"; g.lineWidth = 8; g.strokeRect(6, 6, 500, 116); text(g, "BROAD ST.", 256, 68, 70, "#1c1814"); }) }), 0, 2.85, -0.1);
    put(pump, cyl(0.03, 0.03, 0.6, 6), M("#2a2a2a", 0.5), 0, 2.55, -0.1);
    this.ob("street", pumpX, 0.9, 0.45);
    const ea = grp(R, -1.4, 0, 1.6, -0.3);
    put(ea, rbox(1.2, 1.2, 0.04, 0.02), M("#ffffff", 0.6, 0, { map: mapTex() }), 0, 1.55, 0);
    for (const sx of [-1, 1]) put(ea, cyl(0.03, 0.03, 2.0, 6), M("#6a4a2a", 0.8), sx * 0.5, 1.0, -0.1, { rx: 0.1 });
    put(ea, cyl(0.03, 0.03, 1.9, 6), M("#6a4a2a", 0.8), 0, 0.95, -0.4, { rx: -0.3 });
    this.ob("street", -1.4, 1.6, 0.55);
    put(R, rbox(0.95, 1.35, 0.03, 0.01), M("#ffffff", 0.6, 0, { map: posterTex() }), -12.5, 1.8, -2.37);
    // gas lamps
    for (const x of [-10, 2, 14]) { const l = grp(R, x, 0, -0.6); put(l, cyl(0.06, 0.08, 3.4, 8), M("#1d1d1f", 0.5, 0.6), 0, 1.7, 0); put(l, new THREE.CylinderGeometry(0.2, 0.13, 0.45, 6, 1, true), MP("#fff6e0", 0.1, { transparent: true, opacity: 0.5 }), 0, 3.6, 0, { cast: false }); put(l, new THREE.ConeGeometry(0.24, 0.25, 6), M("#1d1d1f", 0.5, 0.6), 0, 3.95, 0); this.ob("street", x, -0.6, 0.15); }
    R.add(new THREE.HemisphereLight("#e8e0c0", "#6a5a4a", 0.9));
    const sun = new THREE.DirectionalLight("#fff0c8", 3.2); sun.position.set(-8, 16, 14); sun.target.position.set(0, 0, -1); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 }); R.add(sun, sun.target);
  }
  buildCommons(R: THREE.Object3D) {
    const W = 12, D = 20, H = 9;
    const panel = canvas(512, 512, (g) => { const r = rng(9); g.fillStyle = "#6a4a2a"; g.fillRect(0, 0, 512, 512); for (let k = 0; k < 120; k++) { g.strokeStyle = `rgba(30,15,5,${0.1 + r() * 0.15})`; g.lineWidth = 2; g.beginPath(); const y = r() * 512; g.moveTo(0, y); g.lineTo(512, y + r() * 10 - 5); g.stroke(); } g.strokeStyle = "rgba(255,230,190,0.18)"; g.lineWidth = 8; g.strokeRect(36, 36, 440, 440); });
    put(R, new THREE.PlaneGeometry(W, D), MP("#ffffff", 0.5, { map: rep(canvas(256, 256, (g) => { g.fillStyle = "#2a5a3a"; g.fillRect(0, 0, 256, 256); for (let k = 0; k < 600; k++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`; g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3); } }), 4, 8), clearcoat: 0 }), 0, 0, 0, { rx: -Math.PI / 2, cast: false });
    const wall = M("#ffffff", 0.7, 0, { map: rep(panel, 4, 3) });
    put(R, new THREE.PlaneGeometry(W, H), wall, 0, H / 2, -D / 2, { cast: false }); put(R, new THREE.PlaneGeometry(W, H), wall, 0, H / 2, D / 2, { ry: Math.PI, cast: false });
    for (const sx of [-1, 1]) put(R, new THREE.PlaneGeometry(D, H), wall, sx * W / 2, H / 2, 0, { ry: -sx * Math.PI / 2, cast: false });
    put(R, new THREE.PlaneGeometry(W, D), M("#4a3a2a", 0.9), 0, H, 0, { rx: Math.PI / 2, cast: false });
    const green = MP("#2f6a3a", 0.75, { clearcoat: 0.1, sheen: 0.5 });
    for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) {
      const x = sx * (1.6 + k * 0.9), y = 0.25 + k * 0.42;
      put(R, rbox(0.8, 0.12, 14, 0.04), green, x, y + 0.25, 0); put(R, rbox(0.12, 0.55, 14, 0.03), green, x + sx * 0.38, y + 0.55, 0);
      put(R, rbox(0.9, y + 0.25, 14, 0.02), M("#5a3a22", 0.7), x, (y + 0.25) / 2, 0);
      this.ob("commons", x, 0, 0); // benches are rows; checked by |x| ranges below
    }
    // the Speaker's chair, the table, dispatch boxes, the bill and the day counter
    const sp = grp(R, 0, 0, -8.6);
    put(sp, rbox(1.3, 0.15, 1.1, 0.04), M("#4a2a12", 0.5), 0, 0.85, 0); put(sp, rbox(1.3, 2.8, 0.2, 0.06), M("#4a2a12", 0.5), 0, 1.6, -0.5); put(sp, new THREE.ConeGeometry(1.0, 1.6, 4), M("#4a2a12", 0.5), 0, 3.8, -0.3, { ry: Math.PI / 4 });
    this.ob("commons", 0, -8.6, 0.8);
    const tb = grp(R, 0, 0, -4);
    put(tb, rbox(1.6, 0.08, 4.6, 0.03), M("#5a3a22", 0.4), 0, 0.92, 0); put(tb, rbox(1.4, 0.88, 4.4, 0.03), M("#4a2a12", 0.6), 0, 0.44, 0);
    for (const z of [-1.4, 1.4]) put(tb, rbox(0.45, 0.25, 0.32, 0.03), M("#6a4a2a", 0.4, 0.2), 0, 1.08, z);
    this.bill = new THREE.MeshStandardMaterial({ map: billTex(0), roughness: 0.7 });
    put(tb, new THREE.PlaneGeometry(0.5, 0.66), this.bill, 0, 0.965, 0.3, { rx: -Math.PI / 2, cast: false });
    this.ob("commons", 0, -4, 1.0); this.ob("commons", 0, -2.6, 0.8); this.ob("commons", 0, -5.4, 0.8);
    this.days = new THREE.MeshStandardMaterial({ map: dayTex(1), roughness: 0.6 });
    put(R, rbox(1.2, 1.5, 0.05, 0.02), this.days, 2.2, 4.0, -9.96);
    // tall Gothic windows on the left wall with heavy curtains (soaked later) and buckets of chloride of lime
    const winT = canvas(256, 512, (g) => { const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#fff6d0"); gr.addColorStop(1, "#d8e0b0"); g.fillStyle = gr; g.fillRect(0, 0, 256, 512); g.strokeStyle = "#3a2a1a"; g.lineWidth = 8; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(0, 128 * k); g.lineTo(256, 128 * k); g.stroke(); } g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 512); g.stroke(); });
    for (const z of [-6, 0, 6]) {
      put(R, new THREE.PlaneGeometry(1.6, 4.2), new THREE.MeshStandardMaterial({ color: "#000", emissive: "#ffffff", emissiveMap: winT, emissiveIntensity: 1.3 }), -W / 2 + 0.02, 5.4, z, { ry: Math.PI / 2, cast: false });
      for (const dz of [-1.0, 1.0]) { const cm = MP("#7a1d2a", 0.85, { clearcoat: 0, sheen: 0.6, side: THREE.DoubleSide }); this.curtainsWet.push(cm); put(R, new THREE.CylinderGeometry(0.35, 0.45, 4.8, 10, 1, true), cm, -W / 2 + 0.4, 5.1, z + dz, { s: [0.5, 1, 1] }); }
    }
    for (const z of [-3.0, 3.0]) { const bk = grp(R, -4.6, 0, z); put(bk, cyl(0.28, 0.24, 0.5, 18), M("#8a8e90", 0.4, 0.7), 0, 0.25, 0); put(bk, cyl(0.25, 0.25, 0.02, 18), MP("#e8ecd8", 0.3), 0, 0.46, 0); put(bk, new THREE.PlaneGeometry(0.42, 0.2), M("#ffffff", 0.6, 0, { map: canvas(256, 128, (g) => { g.fillStyle = "#f2ecd8"; g.fillRect(0, 0, 256, 128); text(g, "CHLORIDE", 128, 40, 40, "#1c1814"); text(g, "OF LIME", 128, 92, 40, "#1c1814"); }) }), 0, 0.28, 0.27, { cast: false }); this.ob("commons", -4.6, z, 0.35); }
    R.add(new THREE.HemisphereLight("#fff0d0", "#3a2a1a", 0.8));
    const key = new THREE.DirectionalLight("#fff0d0", 2.6); key.position.set(-8, 8, 2); key.target.position.set(1, 0, 0); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 0.5, far: 30 }); R.add(key, key.target);
    for (const z of [-6, 0, 6]) { const p = new THREE.PointLight("#ffe2b0", 6, 9, 2); p.position.set(0, 7.5, z); R.add(p); }
  }
  buildTunnel(R: THREE.Object3D) {
    const tun = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 40, 40, 1, true), M("#ffffff", 0.85, 0, { map: rep(brick("#8a4a30", 31), 10, 12), side: THREE.BackSide }));
    tun.rotation.x = Math.PI / 2; tun.scale.set(1, 1, 1.3); tun.position.set(0, 2.4, -10); tun.receiveShadow = true; R.add(tun);
    put(R, new THREE.PlaneGeometry(4.4, 40), M("#ffffff", 0.9, 0, { map: rep(brick("#6a4a3a", 33), 2, 16) }), 0, 0.05, -10, { rx: -Math.PI / 2, cast: false });
    for (let k = 0; k < 7; k++) { const z = -2 - k * 4; put(R, new THREE.TorusGeometry(2.45, 0.09, 8, 30, Math.PI), M("#8a6a40", 0.8), 0, 2.4, z, { s: [1, 1.3, 1] }); for (const sx of [-1, 1]) put(R, rbox(0.15, 2.4, 0.15, 0.02), M("#8a6a40", 0.8), sx * 2.0, 1.2, z); }
    const lt = canvas(8, 8, (g) => { g.fillStyle = "#ffcf7a"; g.fillRect(0, 0, 8, 8); });
    for (let k = 0; k < 5; k++) { const z = -1 - k * 5; put(R, cyl(0.08, 0.08, 0.18, 10), glow(lt, 5), 1.8, 2.4, z, { cast: false }); const p = new THREE.PointLight("#ffbf6a", 6, 7, 2); p.position.set(1.6, 2.3, z); R.add(p); }
    // the plan table, a wheelbarrow, bricks
    const tb = grp(R, -1.0, 0, -3.2, 0.3);
    put(tb, rbox(1.4, 0.06, 0.9, 0.02), M("#6a4a2a", 0.7), 0, 0.9, 0); for (const [x, z] of [[-0.6, -0.38], [0.6, -0.38], [-0.6, 0.38], [0.6, 0.38]]) put(tb, cyl(0.03, 0.03, 0.9, 6), M("#5a3a22", 0.7), x, 0.45, z);
    this.planA = planTex(false); this.planB = planTex(true);
    this.plan = new THREE.MeshStandardMaterial({ map: this.planA, roughness: 0.7 });
    put(tb, new THREE.PlaneGeometry(1.3, 0.92), this.plan, 0, 0.935, 0, { rx: -Math.PI / 2, cast: false });
    this.ob("tunnel", -1.0, -3.2, 0.85);
    const wb = grp(R, 1.2, 0, -6.5, -0.4); put(wb, new THREE.CylinderGeometry(0.4, 0.25, 0.4, 4, 1, true), M("#6a6a6e", 0.5, 0.6, { side: THREE.DoubleSide }), 0, 0.5, 0, { ry: Math.PI / 4 }); put(wb, cyl(0.15, 0.15, 0.06, 14), M("#2a2a2a", 0.6), 0, 0.15, 0.55, { rz: Math.PI / 2 }); this.ob("tunnel", 1.2, -6.5, 0.6);
    for (let k = 0; k < 12; k++) put(R, rbox(0.22, 0.07, 0.11, 0.01), M("#8a4a30", 0.85), -1.6 + (k % 4) * 0.24, 0.04 + Math.floor(k / 4) * 0.075, -8);
    this.ob("tunnel", -1.3, -8, 0.5);
    R.add(new THREE.HemisphereLight("#ffd8a0", "#3a2a1a", 0.5));
  }
  setBill(u: number) { const q = Math.round(u * 10) / 10; if (!this.billCache.has(q)) this.billCache.set(q, billTex(q)); this.bill.map = this.billCache.get(q)!; }
  setDays(d: number) { if (!this.dayCache.has(d)) this.dayCache.set(d, dayTex(d)); this.days.map = this.dayCache.get(d)!; }
}
class IcoGeo extends THREE.IcosahedronGeometry { constructor(r: number) { super(r, 1); } }
export { paperTex as newspaperTex };
