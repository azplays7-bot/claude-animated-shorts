// The world of "How is Ronaldo still scoring at 41?" as one three.js scene (Pisa engine):
//  - the stadium: a striped pitch with lines and a goal, four sloped stands full of crowd, LED ad boards, floodlight
//    towers, a big screen behind the goal (its message changes with the narration), a TV booth, a training log board
//    by the tunnel, cones and a measuring pole for the training shots;
//  - the house (one long room at HOUSE): bedroom (bed, alarm, whiteboard), kitchen (table, menu board, fridge note),
//    press room (backdrop, table, mics), ice room (tub, calendar, weights), living room (couch, TV, sticky note).
// update(id, f, camera) poses everything for shot `id` at frame f.
import * as THREE from "three";
import { staticFile } from "remotion";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Batch, V, lam, quad, Kit, setSight } from "./build";
import { ctex, rep, cloudHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, smooth, clamp01, ShotDef, BT, HOUSE, GOAL_X, PITCH_X, PITCH_Z, SCREEN, BOOTH, LOG_BOARD, POLE_M, BED, TABLE_K, PRESS_T,
  TUB, CALENDAR, COUCH, WHITEBOARD, FRIDGE_NOTE } from "./story";

// ---------------- assets ----------------
let kitP: Promise<Kit> | null = null;
export const loadKit = () => {
  if (!kitP) kitP = Promise.resolve({} as Kit);
  void GLTFLoader; void staticFile;
  return kitP;
};

// ---------------- painted textures ----------------
const ANTON = "Anton, Impact, sans-serif";
type G = CanvasRenderingContext2D;
const RED = "#c8102e", GRN = "#1f7a3a", YEL = "#ffc928", DARK = "#241726";
const T = (g: G, s: string, x: number, y: number, size: number, col: string, align: CanvasTextAlign = "center") => {
  g.fillStyle = col; g.font = `${size}px ${ANTON}`; g.textAlign = align; g.textBaseline = "middle"; g.fillText(s, x, y);
};
/** text with a dark outline */
const TO = (g: G, s: string, x: number, y: number, size: number, col: string, ow = 10) => {
  g.font = `${size}px ${ANTON}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  g.strokeStyle = DARK; g.lineWidth = ow; g.strokeText(s, x, y); g.fillStyle = col; g.fillText(s, x, y);
};
const grassTex = () => ctex("pitchGrass", 512, 512, (g, r) => {
  for (let i = 0; i < 2; i++) { g.fillStyle = i ? "#4f9a3c" : "#5aa846"; g.fillRect(i * 256, 0, 256, 512); }
  for (let k = 0; k < 2500; k++) { g.fillStyle = r() < 0.5 ? "rgba(30,80,30,0.12)" : "rgba(160,220,120,0.10)"; g.fillRect(r() * 512, r() * 512, 2, 4); }
});
const crowdTex = (key: string, seats: string) => ctex("crowd" + key, 1024, 512, (g, r) => {
  g.fillStyle = seats; g.fillRect(0, 0, 1024, 512);
  const shirts = ["#c8102e", "#c8102e", "#1f7a3a", "#ffffff", "#ffc928", "#2f6fd6", "#c8102e", "#e8e4dc", "#d8262e"];
  const skins = ["#ffe2c2", "#f5c9a0", "#ecd0b6", "#c99067", "#8a5a3a"];
  for (let row = 0; row < 8; row++) for (let c = 0; c < 26; c++) {
    if (r() < 0.06) continue;
    const x = c * 39.4 + 20 + (row % 2) * 18 + (r() - 0.5) * 8, y = row * 64 + 40;
    g.fillStyle = shirts[Math.floor(r() * shirts.length)]; g.beginPath(); g.ellipse(x, y + 18, 15, 16, 0, 0, 7); g.fill();
    g.fillStyle = skins[Math.floor(r() * skins.length)]; g.beginPath(); g.arc(x, y - 6, 10, 0, 7); g.fill();
    if (r() < 0.25) { g.strokeStyle = g.fillStyle; g.lineWidth = 5; g.beginPath(); g.moveTo(x - 12, y + 8); g.lineTo(x - 18, y - 22); g.moveTo(x + 12, y + 8); g.lineTo(x + 18, y - 22); g.stroke(); }
  }
});
const adTex = () => ctex("adBoards", 2048, 128, (g) => {
  const ads: [string, string, string][] = [["PLAY", "#c8102e", "#ffffff"], ["TRAIN", "#1f7a3a", "#ffffff"], ["REST", "#16121c", "#ffc928"], ["REPEAT", "#ffc928", "#16121c"]];
  ads.forEach(([s, bg, fg], i) => { g.fillStyle = bg; g.fillRect(i * 512, 0, 512, 128); T(g, s, i * 512 + 256, 70, 96, fg); });
});
/** the big screen: a dark panel with up to three lines (big middle line) */
const SCREENS: Record<string, [string, string, string, string]> = {
  live: ["MATCH NIGHT", "LIVE", "", "#ffffff"],
  age: ["AGE", "41", "STILL PLAYING", YEL],
  goals: ["CAREER GOALS", "970+", "NEXT STOP: 1,000?", YEL],
  train: ["TRAINING", "TODAY", "", "#ffffff"],
  goal: ["", "GOAL!", "", YEL],
  record: ["INTERNATIONAL GOALS", "#1 EVER", "MEN'S FOOTBALL", YEL],
  cups: ["WORLD CUPS PLAYED", "6", "", YEL],
  champs: ["LEAGUE CHAMPIONS", "AT 41", "", YEL],
  habits: ["HABITS", "", "", "#ffffff"],
  siu: ["", "SIUUU!", "", YEL],
};
const screenTex = (k: string) => ctex("screen" + k, 1024, 448, (g) => {
  const [a, b, c, col] = SCREENS[k];
  g.fillStyle = "#0e0c16"; g.fillRect(0, 0, 1024, 448);
  g.strokeStyle = RED; g.lineWidth = 16; g.strokeRect(8, 8, 1008, 432);
  g.fillStyle = "rgba(255,255,255,0.05)"; for (let y = 0; y < 448; y += 6) g.fillRect(0, y, 1024, 2);
  if (a) T(g, a, 512, 70, 64, "#ffffff");
  if (b) { g.shadowColor = col; g.shadowBlur = 24; T(g, b, 512, 236, b.length > 6 ? 170 : 220, col); g.shadowBlur = 0; }
  if (c) T(g, c, 512, 390, 54, "#9fd8ff");
  if (k === "habits") ["SLEEP", "FOOD", "TRAIN", "ICE"].forEach((s, i) => T(g, s, 140 + i * 248, 270, 74, "#ffffff"));
});
const boothTex = () => ctex("boothSign", 1024, 200, (g) => { g.fillStyle = "#16121c"; g.fillRect(0, 0, 1024, 200); T(g, "TV STUDIO", 380, 104, 120, "#ffffff"); g.fillStyle = "#e23b4e"; g.beginPath(); g.arc(760, 100, 26, 0, 7); g.fill(); T(g, "LIVE", 880, 104, 96, "#e23b4e"); });
const logTex = () => ctex("trainLog", 768, 512, (g) => {
  g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, 768, 512); g.strokeStyle = "#2a2f3a"; g.lineWidth = 14; g.strokeRect(7, 7, 754, 498);
  g.fillStyle = RED; g.fillRect(14, 14, 740, 110); T(g, "TRAINING LOG", 384, 74, 84, "#ffffff");
  T(g, "FIRST IN:", 250, 230, 78, "#2a2f3a"); T(g, "#7", 520, 230, 90, RED);
  T(g, "LAST OUT:", 250, 390, 78, "#2a2f3a"); T(g, "#7", 520, 390, 90, RED);
  g.strokeStyle = "#9aa3ad"; g.lineWidth = 6; g.strokeRect(610, 180, 100, 100); g.strokeRect(610, 340, 100, 100);
});
const poleTex = () => ctex("measurePole", 128, 1024, (g) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 128, 1024);
  for (let cm = 0; cm <= 300; cm += 10) { const y = 1024 - cm * (1024 / 300); g.fillStyle = cm % 50 ? "#2a2f3a" : RED; g.fillRect(0, y - (cm % 50 ? 2 : 4), cm % 50 ? 50 : 90, cm % 50 ? 4 : 8);
    if (cm % 50 === 0 && cm > 0 && cm < 300) { g.save(); g.translate(100, y); g.rotate(-Math.PI / 2); T(g, (cm / 100).toFixed(1) + " M", 0, 0, 30, "#2a2f3a"); g.restore(); } }
});
const bannerTex = (s: string, bg: string, fg: string) => ctex("banner" + s, 1024, 160, (g) => { g.fillStyle = bg; g.fillRect(0, 0, 1024, 160); T(g, s, 512, 86, 120, fg); });
// ---- house ----
const woodTex = () => ctex("woodFloor", 512, 512, (g, r) => {
  for (let i = 0; i < 8; i++) { g.fillStyle = ["#c89a6a", "#bd8f5e", "#d2a676"][i % 3]; g.fillRect(0, i * 64, 512, 64); g.fillStyle = "rgba(90,50,20,0.35)"; g.fillRect(0, i * 64, 512, 3); g.fillRect(((i * 197) % 400) + 40, i * 64, 3, 64); }
  for (let k = 0; k < 600; k++) { g.fillStyle = "rgba(120,70,30,0.12)"; g.fillRect(r() * 512, r() * 512, 20, 2); }
});
const iceTileTex = () => ctex("iceTiles", 512, 512, (g) => { g.fillStyle = "#dfeef6"; g.fillRect(0, 0, 512, 512); g.strokeStyle = "rgba(90,120,140,0.35)"; g.lineWidth = 3; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 512); g.moveTo(0, i * 64); g.lineTo(512, i * 64); g.stroke(); } });
const windowTex = () => ctex("morningWin", 512, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#ffe9b8"); gr.addColorStop(0.6, "#ffd28a"); gr.addColorStop(1, "#bfe0f6"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#fff6d8"; g.beginPath(); g.arc(360, 300, 70, 0, 7); g.fill();
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 18); g.fillRect(0, 494, 512, 18); g.fillRect(0, 0, 18, 512); g.fillRect(494, 0, 18, 512); g.fillRect(247, 0, 18, 512); g.fillRect(0, 247, 512, 18);
});
const whiteboardTex = () => ctex("sleepBoard", 768, 512, (g) => {
  g.fillStyle = "#fbfbf8"; g.fillRect(0, 0, 768, 512); g.strokeStyle = "#9aa3ad"; g.lineWidth = 18; g.strokeRect(9, 9, 750, 494);
  T(g, "SLEEP = TRAINING", 384, 90, 84, "#1e3a8a");
  ["NIGHT SLEEP", "NAP", "NAP", "NAP"].forEach((s, i) => { g.strokeStyle = "#2a2f3a"; g.lineWidth = 6; g.strokeRect(150, 176 + i * 78, 44, 44); T(g, s, 230, 200 + i * 78, 58, "#2a2f3a", "left"); });
});
const menuBoardTex = () => ctex("breakfastBoard", 768, 512, (g) => {
  g.fillStyle = "#24302a"; g.fillRect(0, 0, 768, 512); g.strokeStyle = "#8a6a40"; g.lineWidth = 22; g.strokeRect(11, 11, 746, 490);
  T(g, "BREAKFAST", 384, 86, 82, "#ffffff");
  ["FISH  ·  EGGS", "CHICKEN  ·  FRUIT", "WATER"].forEach((s, i) => T(g, s, 384, 210 + i * 92, 62, ["#ffd23f", "#bfe9ff", "#9fe8a8"][i]));
});
const noteTex = (s: string, s2: string, bg = "#ffe680") => ctex("note" + s + s2, 256, 256, (g) => { g.fillStyle = bg; g.fillRect(0, 0, 256, 256); g.fillStyle = "rgba(0,0,0,0.08)"; g.fillRect(0, 230, 256, 26); T(g, s, 128, 96, 60, "#c0242e"); T(g, s2, 128, 170, 52, "#2a2f3a"); });
const pressTex = () => ctex("pressWall", 1024, 512, (g) => {
  g.fillStyle = "#16234a"; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const x = 128 + i * 256, y = 64 + j * 128;
    if ((i + j) % 2) { g.fillStyle = "#ffffff"; g.beginPath(); g.arc(x, y, 30, 0, 7); g.fill(); g.fillStyle = "#16234a"; g.beginPath(); g.arc(x, y, 12, 0, 7); g.fill(); }
    else T(g, "PRESS", x, y + 4, 50, "#ffffff");
  }
});
const iceSignTex = () => ctex("iceSign", 768, 256, (g) => { g.fillStyle = "#1e5a8a"; g.fillRect(0, 0, 768, 256); T(g, "RECOVERY ROOM", 384, 90, 76, "#ffffff"); T(g, "WATER: 3°C", 384, 186, 64, "#bfe9ff"); });
const calendarTex = () => ctex("calendar", 512, 640, (g) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 512, 640); g.fillStyle = RED; g.fillRect(0, 0, 512, 130); T(g, "EVERY DAY", 256, 70, 76, "#ffffff");
  g.strokeStyle = "#c9c4ba"; g.lineWidth = 3;
  for (let i = 0; i < 7; i++) for (let j = 0; j < 5; j++) { g.strokeRect(14 + i * 69, 150 + j * 94, 69, 94); g.strokeStyle = "#2f7a46"; g.lineWidth = 6; g.beginPath(); g.moveTo(26 + i * 69, 200 + j * 94); g.lineTo(44 + i * 69, 222 + j * 94); g.lineTo(72 + i * 69, 170 + j * 94); g.stroke(); g.strokeStyle = "#c9c4ba"; g.lineWidth = 3; }
});
const tvTex = () => ctex("tvShow", 512, 288, (g) => { g.fillStyle = "#2f8a3a"; g.fillRect(0, 0, 512, 288); g.strokeStyle = "#ffffff"; g.lineWidth = 6; g.strokeRect(30, 30, 452, 228); g.beginPath(); g.moveTo(256, 30); g.lineTo(256, 258); g.stroke(); g.beginPath(); g.arc(256, 144, 40, 0, 7); g.stroke(); g.fillStyle = "#16121c"; g.fillRect(0, 236, 512, 52); T(g, "FOOTBALL LIVE", 256, 264, 40, "#ffffff"); });
const UB = new THREE.BoxGeometry(1, 1, 1);
const cyl = (r: number, h: number, seg = 32, rt = r) => new THREE.CylinderGeometry(rt, r, h, seg, 1).translate(0, h / 2, 0);
const M4 = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), ry), V(sx, sy, sz));
const box = (b: Batch, m: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => b.add(UB, m, M4((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0));
/** unlit (keeps its colour in the grey shots; > 1 = HDR for the bloom) */
const glow = (col: string, k: number, map?: THREE.Texture, transparent = false) =>
  new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), map: map ?? null, transparent, depthWrite: !transparent, fog: false, toneMapped: true });
const gbox = (R: THREE.Object3D, m: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => {
  const o = new THREE.Mesh(UB, m); o.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); o.scale.set(x1 - x0, y1 - y0, z1 - z0); o.castShadow = true; R.add(o); return o;
};
const panel = (x0: number, y0: number, x1: number, y1: number, z: number, mat: THREE.Material, parent: THREE.Object3D, ry = 0, ink = true) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), mat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, z); m.rotation.y = ry; m.receiveShadow = true; if (!ink) m.layers.set(NOINK); parent.add(m); return m;
};


export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private stadium = new THREE.Group();
  private house = new THREE.Group();
  private training = new THREE.Group();
  private screenMat!: THREE.MeshBasicMaterial; private screenMaps: Record<string, THREE.Texture> = {};
  private floodMat!: THREE.MeshBasicMaterial; private adMat!: THREE.MeshBasicMaterial;
  private iceMat!: THREE.MeshBasicMaterial;
  private areaLights: THREE.PointLight[] = []; private coldLights: THREE.PointLight[] = [];
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root;
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 130 + (i % 4) * 30; m.scale.set(w, w / 2, 1); m.layers.set(NOINK);
      m.userData.a = (i / 10) * Math.PI * 2 + 0.3; m.userData.d = 620 + (i % 3) * 60; m.userData.h = 120 + (i % 4) * 38;
      this.clouds.push(m); R.add(m);
    }
    setSight([]);
    this.buildStadium(this.stadium);
    this.buildHouse(this.house);
    this.house.position.set(...HOUSE);
    R.add(this.stadium, this.house);
  }

  // =============== the stadium ===============
  private buildStadium(R: THREE.Object3D) {
    const b = new Batch();
    const flat = (x0: number, x1: number, z0: number, z1: number, y: number, u: number, v: number) => quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), u, v);
    b.add(flat(-300, 300, -300, 300, -0.02, 1, 1), lam("outside", () => ({ color: "#6d7a5c" })));
    b.add(flat(-PITCH_X - 6, PITCH_X + 6, -PITCH_Z - 4, PITCH_Z + 4, 0, 7, 1), lam("pitch", () => ({ map: rep(grassTex(), 1, 1) })));
    // lines
    const L = lam("lines", () => ({ color: "#f4f4ee" })), y = 0.012, lw = 0.12;
    const line = (x0: number, z0: number, x1: number, z1: number) => b.add(flat(Math.min(x0, x1) - lw / 2, Math.max(x0, x1) + lw / 2, Math.min(z0, z1) - lw / 2, Math.max(z0, z1) + lw / 2, y, 1, 1), L);
    line(-PITCH_X, -PITCH_Z, PITCH_X, -PITCH_Z); line(-PITCH_X, PITCH_Z, PITCH_X, PITCH_Z);
    line(-PITCH_X, -PITCH_Z, -PITCH_X, PITCH_Z); line(PITCH_X, -PITCH_Z, PITCH_X, PITCH_Z); line(0, -PITCH_Z, 0, PITCH_Z);
    for (const s of [-1, 1]) {
      const gx = s * PITCH_X;
      line(gx, -20.15, gx - s * 16.5, -20.15); line(gx, 20.15, gx - s * 16.5, 20.15); line(gx - s * 16.5, -20.15, gx - s * 16.5, 20.15);
      line(gx, -9.16, gx - s * 5.5, -9.16); line(gx, 9.16, gx - s * 5.5, 9.16); line(gx - s * 5.5, -9.16, gx - s * 5.5, 9.16);
      const spot = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), L); spot.rotation.x = -Math.PI / 2; spot.position.set(gx - s * 11, y, 0); R.add(spot);
    }
    const ring = new THREE.Mesh(new THREE.RingGeometry(9.15 - lw / 2, 9.15 + lw / 2, 96), L); ring.rotation.x = -Math.PI / 2; ring.position.y = y; R.add(ring);
    // goals (white posts + net)
    const post = lam("post", () => ({ color: "#ffffff" }));
    const netMat = new THREE.MeshLambertMaterial({ map: ctex("net", 256, 256, (g) => { g.clearRect(0, 0, 256, 256); g.strokeStyle = "rgba(255,255,255,0.85)"; g.lineWidth = 3; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, 256); g.moveTo(0, i * 32); g.lineTo(256, i * 32); g.stroke(); } }), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, depthWrite: false });
    for (const s of [-1, 1]) {
      const gx = s * GOAL_X;
      for (const z of [-3.66, 3.66]) b.add(cyl(0.06, 2.44, 12), post, M4(gx, 0, z));
      b.add(new THREE.CylinderGeometry(0.06, 0.06, 7.32 + 0.12, 12).rotateX(Math.PI / 2), post, M4(gx, 2.44, 0));
      const back = gx + s * 2.0;
      const np = (a: THREE.Vector3, b2: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, u: number, v: number) => { const m = new THREE.Mesh(quad(a, b2, c, d, u, v), netMat); m.layers.set(NOINK); R.add(m); };
      np(V(gx, 2.44, -3.66), V(gx, 2.44, 3.66), V(back, 1.6, 3.66), V(back, 1.6, -3.66), 7, 2);
      np(V(back, 1.6, -3.66), V(back, 1.6, 3.66), V(back, 0, 3.66), V(back, 0, -3.66), 7, 2);
      for (const z of [-3.66, 3.66]) np(V(gx, 2.44, z), V(back, 1.6, z), V(back, 0, z), V(gx, 0, z), 2, 2);
    }
    // stands: sloped crowd decks on all four sides, a front wall, a roof with floodlight strips
    const crowd = (k: string, seats: string, u: number) => new THREE.MeshLambertMaterial({ map: rep(crowdTex(k, seats), u, 3), side: THREE.DoubleSide });
    const deck = (a: THREE.Vector3, b2: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, m: THREE.Material) => { const o = new THREE.Mesh(quad(a, b2, c, d), m); o.receiveShadow = true; R.add(o); };
    const X0 = -70, X1 = 70, Z0 = -46, Z1 = 46, N = 38, F = 62, H0 = 1.3, H1 = 19;
    deck(V(X0, H0, -N), V(X1, H0, -N), V(X1, H1, -F), V(X0, H1, -F), crowd("n", "#8a1b2a", 9));
    deck(V(X1, H0, N), V(X0, H0, N), V(X0, H1, F), V(X1, H1, F), crowd("s", "#8a1b2a", 9));
    deck(V(58, H0, Z0), V(58, H0, Z1), V(82, H1, Z1), V(82, H1, Z0), crowd("e", "#1d5a34", 6));
    deck(V(-58, H0, Z1), V(-58, H0, Z0), V(-82, H1, Z0), V(-82, H1, Z1), crowd("w", "#1d5a34", 6));
    const wall = lam("standWall", () => ({ color: "#3a3f4a" })), roof = lam("roof", () => ({ color: "#d8dce2" }));
    box(b, wall, X0, 0, -N - 0.4, X1, H0, -N); box(b, wall, X0, 0, N, X1, H0, N + 0.4);
    box(b, wall, 57.6, 0, Z0, 58, H0, Z1); box(b, wall, -58, 0, Z0, -57.6, H0, Z1);
    box(b, roof, X0 - 4, H1 + 6, -F - 2, X1 + 4, H1 + 6.8, -N + 4); box(b, roof, X0 - 4, H1 + 6, N - 4, X1 + 4, H1 + 6.8, F + 2);
    box(b, roof, 56, H1 + 6, Z0 - 4, 86, H1 + 6.8, Z1 + 4); box(b, roof, -86, H1 + 6, Z0 - 4, -56, H1 + 6.8, Z1 + 4);
    box(b, wall, X0, 0, -F, X1, H1 + 6, -F - 1); box(b, wall, X0, 0, F, X1, H1 + 6, F + 1);
    box(b, wall, 82, 0, Z0 - 4, 83, H1 + 6, Z1 + 4); box(b, wall, -83, 0, Z0 - 4, -82, H1 + 6, Z1 + 4);
    // stand corners closed off
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(b, wall, sx > 0 ? 58 : -86, 0, sz > 0 ? Z1 : -F - 1, sx > 0 ? 86 : -58, H1 + 6, sz > 0 ? F + 1 : Z0);
    this.floodMat = glow("#fffbe8", 2.6);
    for (const [x0, z0, x1, z1] of [[X0, -N + 3.4, X1, -N + 3.8], [X0, N - 3.8, X1, N - 3.4], [56.4, Z0, 56.8, Z1], [-56.8, Z0, -56.4, Z1]] as const) {
      const o = new THREE.Mesh(UB, this.floodMat); o.position.set((x0 + x1) / 2, H1 + 5.9, (z0 + z1) / 2); o.scale.set(x1 - x0, 0.25, z1 - z0); o.layers.set(NOINK); R.add(o);
    }
    // LED ad boards around the pitch
    this.adMat = glow("#ffffff", 1.15, rep(adTex(), 6, 1));
    const ad = (x0: number, z0: number, x1: number, z1: number, ry: number) => { const m = panel(-Math.hypot(x1 - x0, z1 - z0) / 2, 0, Math.hypot(x1 - x0, z1 - z0) / 2, 0.9, 0, this.adMat, R, ry); m.position.set((x0 + x1) / 2, 0.45, (z0 + z1) / 2); };
    ad(-50, -PITCH_Z - 3, 50, -PITCH_Z - 3, 0); ad(-50, PITCH_Z + 3, 50, PITCH_Z + 3, Math.PI);
    ad(PITCH_X + 4, -26, PITCH_X + 4, 26, -Math.PI / 2); ad(-PITCH_X - 4, -26, -PITCH_X - 4, 26, Math.PI / 2);
    for (const [x0, z0, x1, z1] of [[-50, -PITCH_Z - 3.2, 50, -PITCH_Z - 3], [-50, PITCH_Z + 3, 50, PITCH_Z + 3.2], [PITCH_X + 4, -26, PITCH_X + 4.2, 26], [-PITCH_X - 4.2, -26, -PITCH_X - 4, 26]] as const)
      box(b, wall, x0, 0, z0, x1, 0.9, z1);
    // floodlight towers
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const x = sx * 64, z = sz * 50;
      b.add(cyl(0.6, 38, 12, 0.4), lam("tower", () => ({ color: "#9aa0aa" })), M4(x, 0, z));
      const head = new THREE.Mesh(new THREE.BoxGeometry(9, 4, 0.6), this.floodMat); head.position.set(x, 39, z); head.lookAt(0, 0, 0); head.layers.set(NOINK); R.add(head);
    }
    // the big screen behind the goal
    for (const k of Object.keys(SCREENS)) this.screenMaps[k] = screenTex(k);
    this.screenMat = glow("#ffffff", 1.35, this.screenMaps.live);
    box(b, wall, SCREEN[0] + 0.3, SCREEN[1] - 4.3, SCREEN[2] - 9.4, SCREEN[0] + 1.2, SCREEN[1] + 4.3, SCREEN[2] + 9.4);
    box(b, wall, SCREEN[0] + 0.5, 0, -1, SCREEN[0] + 1.1, SCREEN[1] - 4.3, 1);
    const scr = panel(-9, -3.94, 9, 3.94, 0, this.screenMat, R, -Math.PI / 2, false); scr.position.set(SCREEN[0] + 0.25, SCREEN[1], SCREEN[2]);
    // banners on the stands
    const ban = (s: string, bg: string, fg: string, x: number, yy: number, z: number, ry: number, w: number) => { const m = panel(-w / 2, -w * 0.078, w / 2, w * 0.078, 0, new THREE.MeshLambertMaterial({ map: bannerTex(s, bg, fg) }), R, ry); m.position.set(x, yy, z); m.rotation.x = 0; };
    ban("41 & STILL GOING", RED, "#ffffff", -18, 3.6, -N - 0.9, 0, 14); ban("#7", GRN, "#ffffff", 22, 5.7, -N - 4.2, 0, 7);
    ban("1,000 SOON?", "#16121c", YEL, 20, 3.6, N + 0.9, Math.PI, 13);
    // the TV booth in the south stand (opening faces the pitch)
    const [bx, by, bz] = BOOTH, bw = 3.4;
    const bm = lam("booth", () => ({ color: "#2a2f3a" })), bin = lam("boothIn", () => ({ color: "#5a6478" }));
    box(b, bm, bx - bw, by - 0.2, bz - 1.0, bx + bw, by, bz + 2.6);        // floor
    box(b, bm, bx - bw, by + 3.0, bz - 1.0, bx + bw, by + 3.3, bz + 2.6);  // roof
    box(b, bin, bx - bw, by, bz + 2.4, bx + bw, by + 3.0, bz + 2.6);       // back
    box(b, bm, bx - bw - 0.3, by - 0.2, bz - 1.0, bx - bw, by + 3.3, bz + 2.6); box(b, bm, bx + bw, by - 0.2, bz - 1.0, bx + bw + 0.3, by + 3.3, bz + 2.6);
    box(b, bm, bx - bw, 0, bz - 1.0, bx + bw, by - 0.2, bz - 0.6);          // the stand under it
    box(b, lam("desk", () => ({ color: "#c8102e" })), bx - 2.2, by, bz - 0.55, bx + 2.2, by + 0.95, bz - 0.15);
    box(b, lam("deskTop", () => ({ color: "#e8e4dc" })), bx - 2.25, by + 0.95, bz - 0.6, bx + 2.25, by + 1.0, bz - 0.1);
    const bs = panel(-2.6, -0.5, 2.6, 0.5, 0, glow("#ffffff", 1.3, boothTex()), R, Math.PI, false); bs.position.set(bx, by + 3.85, bz - 1.02);
    const bscr = panel(-1.6, -0.8, 1.6, 0.8, 0, glow("#ffffff", 1.1, tvTex()), R, Math.PI); bscr.position.set(bx, by + 2.0, bz + 2.38);
    // the tunnel and the training log by it (north stand)
    box(b, lam("tunnel", () => ({ color: "#14121a" })), 37, 0, -N - 0.45, 41, 2.6, -N + 0.02);
    box(b, wall, 36.6, 2.6, -N - 0.5, 41.4, 3.0, -N + 0.1);
    box(b, wall, 42, 0.4, -N + 0.0, 45, 3.3, -N + 0.25);
    const lb = panel(-1.35, -0.9, 1.35, 0.9, 0, new THREE.MeshLambertMaterial({ map: logTex() }), R); lb.position.set(LOG_BOARD[0], LOG_BOARD[1], -N + 0.27);
    b.build(R, false);   // the stands would shade the whole pitch at a low sun
    // training extras (shot 3 only): cones, the measuring pole, a ball bag
    const tb = new Batch(), T2 = this.training;
    for (let x = 12; x <= 22; x += 2.5) tb.add(new THREE.ConeGeometry(0.16, 0.36, 14).translate(0, 0.18, 0), lam("cone", () => ({ color: "#ff7a1e" })), M4(x, 0, 4.8));
    for (let k = 0; k < 6; k++) tb.add(new THREE.SphereGeometry(0.11, 14, 10), lam("ballW", () => ({ color: "#ffffff" })), M4(39.6 + (k % 3) * 0.25, 0.11, -1.4 + Math.floor(k / 3) * 0.25));
    tb.build(T2);
    const pm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.0, 0.06), [lam("poleSide", () => ({ color: "#ffffff" })), lam("poleSide", () => ({ color: "#ffffff" })), lam("poleSide", () => ({ color: "#ffffff" })), lam("poleSide", () => ({ color: "#ffffff" })), new THREE.MeshLambertMaterial({ map: poleTex() }), new THREE.MeshLambertMaterial({ map: poleTex() })]);
    pm.position.set(POLE_M[0], 1.5, POLE_M[2]); pm.castShadow = true; T2.add(pm);
    R.add(T2);
  }

  // =============== the house (local coordinates; the group sits at HOUSE) ===============
  private buildHouse(R: THREE.Object3D) {
    const b = new Batch();
    const flat = (x0: number, x1: number, z0: number, z1: number, y: number, u: number, v: number) => quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), u, v);
    const CE = 3.1;
    b.add(flat(-16, 8, -4, 5, 0, 12, 4.5), lam("wood", () => ({ map: rep(woodTex(), 1, 1) })));
    b.add(flat(8, 16, -4, 5, 0, 8, 9), lam("iceFloor", () => ({ map: rep(iceTileTex(), 1, 1) })));
    b.add(flat(16, 24, -4, 5, 0, 4, 4.5), lam("wood2", () => ({ map: rep(woodTex(), 1, 1) })));
    const zones: [number, number, string][] = [[-16, -8, "#cfe3f2"], [-8, 0, "#f6e7c8"], [0, 8, "#16234a"], [8, 16, "#dfeef6"], [16, 24, "#e9d8f0"]];
    zones.forEach(([x0, x1, c], i) => box(b, lam("wall" + i, () => ({ color: c })), x0, 0, -4.3, x1, CE, -4));
    box(b, lam("iceWall", () => ({ map: rep(iceTileTex(), 4, 1.5) })), 8, 0, -4.02, 16, CE, -4.0);
    box(b, lam("ceilH", () => ({ color: "#f4f1ea" })), -16, CE, -4.3, 24, CE + 0.1, 5);
    for (const x of [-16.3, 24]) box(b, lam("wall0", () => ({ color: "#cfe3f2" })), x, 0, -4.3, x + 0.3, CE, 5);
    for (const x of [-8, 0, 8, 16]) box(b, lam("part", () => ({ color: "#f4f1ea" })), x - 0.06, 0, -4, x + 0.06, CE, 0.4);
    const skirt = lam("skirt", () => ({ color: "#ffffff" }));
    box(b, skirt, -16, 0, -4.0, 24, 0.12, -3.96);
    // ---- bedroom ----
    const [bx, , bz] = BED;
    box(b, lam("bedFrame", () => ({ color: "#5a3b2a" })), bx - 2.2, 0, bz - 0.8, bx + 2.2, 0.4, bz + 0.8);
    box(b, lam("mattress", () => ({ color: "#f4f4f0" })), bx - 2.15, 0.4, bz - 0.75, bx + 2.15, 0.55, bz + 0.75);
    box(b, lam("headboard", () => ({ color: "#4a2e20" })), bx - 2.35, 0, bz - 0.85, bx - 2.2, 1.1, bz + 0.85);
    box(b, lam("pillow", () => ({ color: "#ffffff" })), bx - 2.1, 0.55, bz - 0.55, bx - 1.5, 0.7, bz + 0.55);
    box(b, lam("night", () => ({ color: "#8a6a50" })), bx - 3.3, 0, bz - 0.5, bx - 2.5, 0.6, bz + 0.3);
    panel(bx - 1.6, 1.25, bx + 1.2, 2.65, -3.98, glow("#ffffff", 1.25, windowTex()), R);
    const wb = panel(-0.6, -0.4, 0.6, 0.4, 0, new THREE.MeshLambertMaterial({ map: whiteboardTex() }), R); wb.position.set(WHITEBOARD[0], WHITEBOARD[1], WHITEBOARD[2]);
    // ---- kitchen ----
    const [kx, , kz] = TABLE_K;
    box(b, lam("kTable", () => ({ color: "#f4efe4" })), kx - 1.0, 0.72, kz - 0.5, kx + 1.0, 0.78, kz + 0.5);
    for (const sx of [-0.85, 0.85]) for (const sz of [-0.4, 0.4]) box(b, lam("kLeg", () => ({ color: "#5a3b2a" })), kx + sx - 0.04, 0, kz + sz - 0.04, kx + sx + 0.04, 0.72, kz + sz + 0.04);
    box(b, lam("chair", () => ({ color: "#c8102e" })), kx - 0.3, 0.42, kz - 1.15, kx + 0.3, 0.48, kz - 0.65);
    box(b, lam("chair", () => ({ color: "#c8102e" })), kx - 0.3, 0.48, kz - 1.2, kx + 0.3, 1.15, kz - 1.12);
    box(b, lam("counterK", () => ({ color: "#e8e4dc" })), -7.9, 0, -4, -5.8, 0.9, -3.4);
    box(b, lam("fridge", () => ({ color: "#e4e8ec" })), -1.8, 0, -4, -0.6, 2.0, -3.1);
    box(b, lam("fridgeH", () => ({ color: "#9aa3ad" })), -0.8, 0.9, -3.1, -0.74, 1.6, -3.04);
    const mb = panel(-0.9, -0.6, 0.9, 0.6, 0, new THREE.MeshLambertMaterial({ map: menuBoardTex() }), R); mb.position.set(kx, 1.95, -3.97);
    const fn = panel(-0.2, -0.2, 0.2, 0.2, 0, new THREE.MeshLambertMaterial({ map: noteTex("NO", "SUGAR!") }), R); fn.position.set(FRIDGE_NOTE[0], FRIDGE_NOTE[1], FRIDGE_NOTE[2] - 0.08 + 0.18 - 0.09);
    // ---- press room ----
    const pw = panel(0.06, 0, 7.94, CE, -3.97, glow("#ffffff", 0.95, rep(pressTex(), 2, 1)), R);
    void pw;
    const [px, , pz] = PRESS_T;
    box(b, lam("pTable", () => ({ color: "#e8e4dc" })), px - 1.4, 0.72, pz - 0.4, px + 1.4, 0.78, pz + 0.4);
    box(b, lam("pCloth", () => ({ color: "#c8102e" })), px - 1.4, 0, pz + 0.35, px + 1.4, 0.72, pz + 0.4);
    box(b, lam("pChair", () => ({ color: "#2a2f3a" })), px - 0.3, 0.48, pz - 1.05, px + 0.3, 1.2, pz - 0.97);
    for (const dx of [-0.25, 0.25]) { b.add(cyl(0.012, 0.3, 8), lam("mic", () => ({ color: "#2a2f3a" })), M4(px + dx, 0.78, pz + 0.12)); b.add(new THREE.SphereGeometry(0.035, 10, 8), lam("micHead", () => ({ color: "#16121c" })), M4(px + dx, 1.09, pz + 0.12)); }
    // ---- ice room ----
    const [tx, , tz] = TUB;
    box(b, lam("tub", () => ({ color: "#f4f4f0" })), tx - 1.0, 0, tz - 0.7, tx + 1.0, 0.7, tz + 0.7);
    this.iceMat = glow("#7fd0ff", 1.0);
    const wtr = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.2), this.iceMat); wtr.rotation.x = -Math.PI / 2; wtr.position.set(tx, 0.62, tz); R.add(wtr);
    const is = panel(-1.2, -0.4, 1.2, 0.4, 0, glow("#ffffff", 1.1, iceSignTex()), R); is.position.set(tx, 2.4, -3.95);
    const cal = panel(-0.5, -0.625, 0.5, 0.625, 0, new THREE.MeshLambertMaterial({ map: calendarTex() }), R); cal.position.set(CALENDAR[0], CALENDAR[1], CALENDAR[2]);
    box(b, lam("rack", () => ({ color: "#3a3f4a" })), 8.6, 0, -3.9, 10.2, 1.0, -3.4);
    for (let k = 0; k < 4; k++) b.add(new THREE.CylinderGeometry(0.09, 0.09, 0.32, 14).rotateZ(Math.PI / 2), lam("dbell", () => ({ color: "#16121c" })), M4(8.9 + k * 0.38, 1.08, -3.65));
    // ---- living room ----
    const [cx, , cz] = COUCH;
    const sofa = lam("sofa", () => ({ color: "#7a5ac9" })), sofa2 = lam("sofa2", () => ({ color: "#6a4ab8" }));
    box(b, sofa, cx - 1.3, 0, cz - 0.5, cx + 1.3, 0.42, cz + 0.5);
    box(b, sofa2, cx - 1.3, 0.42, cz - 0.6, cx + 1.3, 1.05, cz - 0.3);
    for (const s of [-1, 1]) box(b, sofa2, cx + s * 1.3 - (s > 0 ? 0 : 0.25), 0, cz - 0.6, cx + s * 1.3 + (s > 0 ? 0.25 : 0), 0.7, cz + 0.5);
    box(b, lam("rug", () => ({ color: "#c25a7a" })), cx - 1.6, 0.0, cz + 0.6, cx + 1.6, 0.01, cz + 2.4);
    const sn = panel(-0.3, -0.3, 0.3, 0.3, 0, new THREE.MeshLambertMaterial({ map: noteTex("GYM:", "TOMORROW") }), R); sn.position.set(cx + 0.6, 1.75, -3.96); sn.rotation.z = 0.08;
    const pic = panel(-0.55, -0.4, 0.55, 0.4, 0, new THREE.MeshLambertMaterial({ map: tvTex() }), R); pic.position.set(cx - 0.6, 1.8, -3.96);
    b.add(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 14).rotateZ(Math.PI / 2), lam("dbell", () => ({ color: "#16121c" })), M4(cx + 1.9, 0.08, cz + 1.0));
    b.build(R);
    // ---- lights ----
    const Lt = (x: number, yy: number, z: number, col: string, k: number, d: number, cold = false) => { const l = new THREE.PointLight(col, k, d); l.position.set(x, yy, z); R.add(l); (cold ? this.coldLights : this.areaLights).push(l); return l; };
    for (const x of [-12, -4, 4, 20]) Lt(x, 2.7, 0.5, "#fff1dc", 7, 9);
    Lt(12, 2.7, 0.0, "#bfe4ff", 9, 9, true); Lt(12, 1.2, -2.0, "#7fd0ff", 4, 3, true);
  }

  /** camera-relative sun, frozen per shot */
  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  private poseProps(id: number, f: number) {
    const t = f / FPS, s = SHOTS[id - 1], golden = s.light === "golden", inHouse = s.place === "house";
    this.house.visible = inHouse; this.stadium.visible = !inHouse;
    this.training.visible = id === 3;
    this.floodMat.color.set("#fffbe8").multiplyScalar(golden ? 3.2 : 1.6);
    this.adMat.color.setScalar(golden ? 1.35 : 1.1);
    this.iceMat.color.set("#7fd0ff").multiplyScalar(1.0 + 0.15 * Math.sin(t * 3));
    for (const l of this.coldLights) l.visible = id === 4;
    // the big screen follows the story
    let k = "live";
    if (id === 1) k = f < BT.n41 - 4 ? "live" : f < BT.k1000 - 4 ? "age" : "goals";
    if (id === 3) k = "train";
    if (id === 5) k = f < BT.result + 12 ? "live" : f < BT.g970 - 2 ? "goal" : f < BT.more ? "goals" : f < BT.cups - 4 ? "record" : f < BT.league - 4 ? "cups" : f < BT.habits - 6 ? "champs" : "habits";
    if (id === 7) k = f < BT.n41d - 2 ? "age" : "siu";
    this.screenMat.map = this.screenMaps[k];
    let sk = 1.35;
    if ((k === "goal" || k === "siu") && Math.floor(t * 6) % 2) sk = 1.9;
    this.screenMat.color.setScalar(sk);
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0);
    if (Math.abs(c.pos[0] - c.look[0]) + Math.abs(c.pos[2] - c.look[2]) < 0.3) cam.up.set(0, 0, -1);
    cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    const inside = s.place === "house", cold = !!s.cold;
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = inside ? L.sunI * 0.7 : L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 6, 95);
    if (inside) Rr = 12;
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce);
    TONE.uSat.value = inside ? 1.1 : K.sat;
    if (inside) { TONE.uShadeCol.value.set(0.62, 0.6, 0.62); TONE.uLitCol.value.set(1.45, 1.42, 1.38); }
    if (cold) { TONE.uShadeCol.value.set(0.5, 0.62, 0.78); TONE.uLitCol.value.set(1.15, 1.35, 1.6); }
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    if (inside) CHAR.uCharTint.value.set(1.0, 0.98, 0.95);
    if (cold) CHAR.uCharTint.value.set(0.82, 0.92, 1.08);
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = inside ? 80 : 120; this.fog.far = inside ? 500 : 700;
    scene.fog = this.fog; scene.background = null;
    const drift = t * 0.004;
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], a = m.userData.a + drift;
      m.position.set(Math.cos(a) * m.userData.d, m.userData.h, Math.sin(a) * m.userData.d);
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      const mm = m.material as THREE.MeshBasicMaterial;
      mm.map = this.cloudMaps[s.light][i % 4]; mm.color.setScalar(1.1);
    }
    this.poseProps(id, f);
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow && !inside;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft);
      e2.mesh.visible = true;
      e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e3 of fused) e3.bind();
    return focus;
  }
}
void clamp01; void smooth; void TO;
