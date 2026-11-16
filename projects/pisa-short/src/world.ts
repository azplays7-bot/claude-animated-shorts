// The Pisa world as one three.js scene: sky, lawn piazza, cathedral, city wall, houses, trees, far hills, the tower
// (eight storeys, each its own merged group so it can be built floor by floor, lean and bend), scaffolding, the 1838
// trench, the 1934 pump, the 1990 barrier and doors, the bedroom insert set and the soil cut-away diorama.
// update(id, f, camera) poses everything for shot `id` at frame f (a pure function of id + f). Sky, light rig, clouds,
// cards and the post chain come from the bridge engine unchanged (cartoon-3d-short skill).
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { Batch, boxGeo, V, lam, quad, tri, Kit, Ray, kitClone, house, prop, setSight } from "./build";
import { ctex, rep, stoneHD, cobbleHD, grassHD, planksHD, cloudHD, roofHD, beam } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone, twoTone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, smooth, clamp01, FOREGROUND, ShotDef, towerAt, STOREY_H, ROOM, DIO, TS } from "./story";

// ---------------- assets ----------------
const KENNEY = ["tree_oak", "tree_default", "tree_fat", "tree_cone", "plant_bushDetailed", "plant_bush", "hedge"];
let kitP: Promise<Kit> | null = null;
export const loadKit = () => {
  if (!kitP) {
    const loader = new GLTFLoader();
    kitP = Promise.all(KENNEY.map((n) => loader.loadAsync(staticFile(`bridge/kenney/${n}.glb`)).then((g) => [n, g.scene] as const).catch(() => [n, null] as const)))
      .then((list) => Object.fromEntries(list.filter((e) => e[1]).map(([n, s]) => [n, s!])) as Kit);
  }
  return kitP;
};

const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 58, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const haloTex = () => ctex("sunHalo", 256, 256, (g) => {
  const im = g.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const u = Math.hypot(x - 127.5, y - 127.5) / 128;
    const a = (0.55 * Math.exp(-((u / 0.25) ** 2)) + 0.35 * Math.exp(-((u / 0.6) ** 2))) * (1 - Math.min(1, Math.max(0, (u - 0.8) / 0.2)));
    const i = (y * 256 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(255 * Math.min(1, a));
  }
  g.putImageData(im, 0, 0);
});

// ---------------- painted textures for this film ----------------
/** gallery arcade band: round-headed arches over the columns (dark loggia behind), marble spandrels */
const arcadeTex = (n: number) => ctex("arcade" + n, 2048, 256, (g, r) => {
  g.fillStyle = "#f3e7d1"; g.fillRect(0, 0, 2048, 256);
  const w = 2048 / n;
  for (let i = 0; i < n; i++) {
    const x = i * w;
    g.fillStyle = "#6f6458"; g.beginPath(); g.moveTo(x + w * 0.12, 256); g.lineTo(x + w * 0.12, 150); g.arc(x + w / 2, 150, w * 0.38, Math.PI, 0); g.lineTo(x + w * 0.88, 256); g.fill();
    g.strokeStyle = "rgba(60,45,40,0.55)"; g.lineWidth = 6; g.beginPath(); g.arc(x + w / 2, 150, w * 0.43, Math.PI, 0); g.stroke();
    g.fillStyle = `rgba(120,100,80,${0.04 + 0.05 * r()})`; g.fillRect(x, 0, w, 60);
  }
  g.fillStyle = "rgba(90,70,60,0.35)"; g.fillRect(0, 0, 2048, 10);
});
/** ground storey: tall blind arches on pilasters */
const blindTex = () => ctex("blind15", 2048, 512, (g) => {
  g.fillStyle = "#f4e8d2"; g.fillRect(0, 0, 2048, 512);
  const n = 15, w = 2048 / n;
  for (let i = 0; i < n; i++) {
    const x = i * w;
    g.fillStyle = "#e1d6c3"; g.beginPath(); g.moveTo(x + w * 0.16, 512); g.lineTo(x + w * 0.16, 170); g.arc(x + w / 2, 170, w * 0.34, Math.PI, 0); g.lineTo(x + w * 0.84, 512); g.fill();
    g.strokeStyle = "rgba(70,55,45,0.6)"; g.lineWidth = 7; g.beginPath(); g.arc(x + w / 2, 170, w * 0.34, Math.PI, 0); g.stroke();
    g.beginPath(); g.moveTo(x + w * 0.16, 512); g.lineTo(x + w * 0.16, 170); g.moveTo(x + w * 0.84, 512); g.lineTo(x + w * 0.84, 170); g.stroke();
    g.fillStyle = "rgba(60,80,110,0.35)"; g.beginPath(); g.ellipse(x + w / 2, 120, 12, 16, 0, 0, Math.PI * 2); g.fill(); // small lozenge window
  }
});
/** cathedral flank: white marble with thin grey bands and a blind arcade */
const cathTex = () => ctex("cathFlank", 1024, 1024, (g) => {
  g.fillStyle = "#efe8da"; g.fillRect(0, 0, 1024, 1024);
  for (let y = 0; y < 1024; y += 64) { g.fillStyle = "rgba(110,110,120,0.38)"; g.fillRect(0, y, 1024, 14); }
  for (let i = 0; i < 8; i++) {
    const x = i * 128; g.strokeStyle = "rgba(80,65,55,0.55)"; g.lineWidth = 6;
    g.beginPath(); g.moveTo(x + 20, 1024); g.lineTo(x + 20, 420); g.arc(x + 64, 420, 44, Math.PI, 0); g.lineTo(x + 108, 1024); g.stroke();
    g.fillStyle = "rgba(70,80,100,0.35)"; g.fillRect(x + 50, 520, 28, 120);
  }
});
/** soil cut face: lawn line, sandy top, wet blue-grey clay, darker deep layer, and the foundation block */
const soilTex = () => ctex("soilCut", 2048, 1024, (g, r) => {
  const band = (y0: number, y1: number, c: string) => { g.fillStyle = c; g.fillRect(0, y0, 2048, y1 - y0); };
  band(0, 60, "#5d9a3a"); band(60, 300, "#c9a46a"); band(300, 700, "#7d8a92"); band(700, 1024, "#5a5048");
  for (let k = 0; k < 900; k++) { const y = 60 + r() * 960; g.fillStyle = y < 300 ? "rgba(120,90,50,0.25)" : y < 700 ? "rgba(70,90,110,0.25)" : "rgba(40,30,30,0.25)"; g.beginPath(); g.ellipse(r() * 2048, y, 4 + r() * 10, 2 + r() * 5, 0, 0, 7); g.fill(); }
  g.strokeStyle = "rgba(40,30,40,0.6)"; g.lineWidth = 5;
  for (const y of [60, 300, 700]) { g.beginPath(); for (let x = 0; x <= 2048; x += 32) g.lineTo(x, y + 8 * Math.sin(x * 0.01 + y)); g.stroke(); }
});
const augerTex = () => ctex("auger", 256, 64, (g) => { g.fillStyle = "#8a9099"; g.fillRect(0, 0, 256, 64); g.strokeStyle = "#4a5058"; g.lineWidth = 9; for (let x = -64; x < 320; x += 32) { g.beginPath(); g.moveTo(x, 64); g.lineTo(x + 32, 0); g.stroke(); } });
const windowTex = () => ctex("roomWindow", 256, 256, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#7fb2ea"); gr.addColorStop(1, "#d6e8f7"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(80, 90, 50, 18, 0, 0, 7); g.fill();
  g.strokeStyle = "#f4efe6"; g.lineWidth = 16; g.strokeRect(8, 8, 240, 240); g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 256); g.moveTo(0, 128); g.lineTo(256, 128); g.stroke();
});

const UB = new THREE.BoxGeometry(1, 1, 1);
const cyl = (r: number, h: number, seg = 48, open = false, rt = r) => new THREE.CylinderGeometry(rt, r, h, seg, 1, open).translate(0, h / 2, 0);
const M4 = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), ry), V(sx, sy, sz));

/** every lens position on the piazza looking at its subject: centre, sides and top of frame (houses there are left out) */
const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) {
    if (s.place !== "piazza") continue;
    for (let f = s.a - 8; f < s.b + 8; f += 3) {
      const c = camAt(s.id, Math.max(0, f)), o = V(...c.pos), look = V(...c.look);
      const fw = look.clone().sub(o), len = fw.length() + 10;
      fw.normalize();
      const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
      const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
      for (const [sx, sy] of [[0, 0], [-0.7, 0], [0.7, 0], [0, 0.7], [0, -0.5]])
        out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len: sy < 0 ? len - 10 : len, core: sx === 0 && sy === 0 });
    }
  }
  return out;
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunDisc: THREE.Sprite; private sunHalo: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private fgs: { o: THREE.Object3D; a: number; b: number }[] = [];
  // tower
  private storeys: THREE.Group[] = [];
  private scaff: THREE.Group[] = [];
  private doors: THREE.Mesh[] = []; private lock: THREE.Mesh;
  // per-shot props
  private clay: THREE.Mesh; private trench = new THREE.Group(); private water: THREE.Mesh; private pump = new THREE.Group(); private barrier = new THREE.Group();
  private blocks = new THREE.Group(); private books = new THREE.Group(); private dent: THREE.Mesh;
  private stub = new THREE.Group(); private augers: THREE.Mesh[] = []; private scoops: THREE.Mesh[] = [];
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(kit: Kit) {
    const R = this.root;
    // ---- sky + light (bridge engine) ----
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
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: new THREE.Color(1, 1, 1), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
    this.sunDisc.renderOrder = -0.5; this.sunHalo.renderOrder = 5;
    for (const m of [this.sunDisc, this.sunHalo]) { m.frustumCulled = false; m.layers.set(NOINK); R.add(m); }
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

    // ---- the piazza (static batch) ----
    setSight(sightLines());
    const b = new Batch();
    const grass = lam("grassHD", () => ({ map: rep(grassHD(), 1, 1) }));
    const cobble = lam("cobbleHD", () => ({ map: cobbleHD() }));
    const marble = lam("marbleHD", () => ({ map: stoneHD("marbleHD") }));
    const path = lam("pathStone", () => ({ map: stoneHD("copeHD") }));
    const flat = (x0: number, x1: number, z0: number, z1: number, y: number, u: number, v: number) => quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), u, v);
    b.add(flat(-300, 300, -300, 300, 0, 150, 150), grass);
    b.add(flat(-300, 300, 34, 46, 0.01, 75, 1.5), cobble);                    // street in front of the walls of the piazza
    b.add(flat(-36, 36, 18, 26, 0.012, 9, 1), path);                        // marble walk south of the tower
    b.add(flat(-150, -36, -4, 4, 0.012, 15, 1), path);                       // walk to the cathedral
    const ring = new THREE.RingGeometry(8.2, 13.5, 64); ring.rotateX(-Math.PI / 2); ring.translate(0, 0.014, 0);
    b.add(ring, path);
    // cathedral (west, -x): nave, aisles, transept, apse toward the tower, small dome at the crossing
    const cath = lam("cathFlank", () => ({ map: cathTex() })), lead = lam("leadRoof", () => ({ map: roofHD("#8f97a8", true), side: THREE.DoubleSide }));
    const cbox = (x0: number, x1: number, z0: number, z1: number, h: number) => b.add(boxGeo(V(x0, 0, z0), V(x1, h, z1), 12), cath);
    const gable = (x0: number, x1: number, z0: number, z1: number, h: number, rh: number) => {
      const zc = (z0 + z1) / 2;
      b.add(quad(V(x0, h, z1 + 0.6), V(x1, h, z1 + 0.6), V(x1, h + rh, zc), V(x0, h + rh, zc), (x1 - x0) / 4, 3), lead);
      b.add(quad(V(x1, h, z0 - 0.6), V(x0, h, z0 - 0.6), V(x0, h + rh, zc), V(x1, h + rh, zc), (x1 - x0) / 4, 3), lead);
      b.add(tri(V(x0, h, z1), V(x0, h, z0), V(x0, h + rh, zc)), cath); b.add(tri(V(x1, h, z0), V(x1, h, z1), V(x1, h + rh, zc)), cath);
    };
    cbox(-135, -48, -13, 13, 26); gable(-135, -48, -13, 13, 26, 7);
    cbox(-135, -48, -21, -13, 15); cbox(-135, -48, 13, 21, 15);
    cbox(-84, -66, -36, 36, 24); gable(-84, -66, -36, 36, 24, 6);
    b.add(cyl(11, 22, 40), cath, M4(-48, 0, 0));
    b.add(new THREE.SphereGeometry(8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), lead, M4(-75, 31, 0));
    b.add(cyl(8.2, 2.5, 40), cath, M4(-75, 29, 0));
    // the old city wall north of the piazza, crenellated
    const wallM = lam("wallHD", () => ({ map: stoneHD("wallHD") }));
    b.add(boxGeo(V(-260, 0, -62), V(260, 11, -58), 4), wallM);
    for (let x = -258; x < 258; x += 4) b.add(boxGeo(V(x, 11, -62), V(x + 2.2, 12.6, -58), 2), wallM);
    for (const x of [-180, -90, 90, 180]) b.add(boxGeo(V(x - 5, 0, -66), V(x + 5, 16, -56), 4), wallM);
    // houses: rows beyond the wall (north), east of the piazza and south of the street
    const r = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
    for (const zr of [-75, -92, -110, -128]) for (let x = -200; x < 200; x += 9 + r() * 4) house(b, x, zr - r() * 3, 0, [7, 9][Math.floor(r() * 2)], 8, [7, 8.4, 9.8][Math.floor(r() * 3)], Math.floor(r() * 8), 0);
    for (let z = -40; z < 120; z += 9 + r() * 3) house(b, 70 + r() * 3, z, -Math.PI / 2, [7, 9][Math.floor(r() * 2)], 8, [7, 8.4, 9.8][Math.floor(r() * 3)], Math.floor(r() * 8), 0);
    for (let x = -150; x < 160; x += 9 + r() * 4) house(b, x, 54 + r() * 2, Math.PI, [7, 9][Math.floor(r() * 2)], 8, [7, 8.4, 9.8][Math.floor(r() * 3)], Math.floor(r() * 8), 0);
    // trees: clumps along the wall and the street, a few on the lawn edges
    for (let i = 0; i < 46; i++) {
      const x = -240 + i * 10.5 + r() * 5, z = i % 2 ? -50 + r() * 4 : 30 + r() * 3;
      if (Math.abs(x) < 18 && z > 0) continue;
      prop(b, kit, ["tree_oak", "tree_fat", "tree_default", "tree_cone"][i % 4], x, 0, z, 7 + r() * 4, r() * 6);
    }
    for (let i = 0; i < 14; i++) prop(b, kit, "plant_bushDetailed", 18 + i * 3.5, 0, 26 + (i % 2) * 1.2, 1.2 + r() * 0.5, r() * 6);
    b.build(R);
    // far hills (Monte Pisano to the north-east), soft in the fog
    const hillM = lam("hills", () => ({ color: "#7d9a7a" }));
    const hb = new Batch();
    for (let i = 0; i < 9; i++) { const g = new THREE.ConeGeometry(70 + (i % 3) * 25, 60 + (i % 4) * 22, 7, 1); g.translate(0, (60 + (i % 4) * 22) / 2, 0); hb.add(g, hillM, M4(-320 + i * 95, -4, -520 - (i % 3) * 60, 1.8, 1, 1)); }
    hb.build(R, false);

    // ---- the tower: one merged group per storey, local base at y = 0 ----
    const col = lam("columnM", () => ({ color: "#f6ecd8" })), loggia = lam("loggiaM", () => ({ color: "#c6b394" }));
    const arc30 = lam("arcade30", () => ({ map: arcadeTex(30) })), arc16 = lam("arcade16", () => ({ map: arcadeTex(16) })), blind = lam("blind15", () => ({ map: blindTex() }));
    const roofT = lam("roofTerra", () => ({ map: roofHD("#c9775a") }));
    for (let k = 0; k < 8; k++) {
      const g = new THREE.Group(), sb = new Batch(), h = STOREY_H[k];
      if (k === 0) {
        sb.add(cyl(8.1, 0.6, 64), marble);
        sb.add(cyl(7.7, h - 1.0, 64, true), blind, M4(0, 0.6, 0));
        for (let i = 0; i < 15; i++) { const a = (i / 15) * Math.PI * 2; sb.add(cyl(0.34, 8.6, 12), col, M4(7.82 * Math.cos(a), 0.6, 7.82 * Math.sin(a))); }
        sb.add(cyl(8.35, 0.5, 64), marble, M4(0, h - 0.5, 0));
      } else if (k < 7) {
        sb.add(cyl(8.45, 0.55, 64), marble);                              // gallery floor / cornice
        sb.add(cyl(6.75, h - 0.55, 48, true), loggia, M4(0, 0.55, 0));  // shadowed inner wall
        for (let i = 0; i < 30; i++) { const a = (i / 30) * Math.PI * 2; sb.add(cyl(0.2, 5.0, 10), col, M4(7.95 * Math.cos(a), 0.55, 7.95 * Math.sin(a))); }
        sb.add(cyl(8.15, 1.55, 64, true), arc30, M4(0, h - 1.55, 0));
        sb.add(cyl(8.2, 0.12, 64), marble, M4(0, h - 1.6, 0));
      } else {
        sb.add(cyl(6.2, 0.5, 48), marble);
        sb.add(cyl(4.5, h - 0.5, 40, true), loggia, M4(0, 0.5, 0));
        for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; sb.add(cyl(0.22, 4.3, 10), col, M4(5.45 * Math.cos(a), 0.5, 5.45 * Math.sin(a))); }
        sb.add(cyl(5.65, 1.6, 48, true), arc16, M4(0, h - 1.8, 0));
        sb.add(new THREE.CylinderGeometry(4.7, 6.0, 1.6, 40).translate(0, h + 0.6, 0), roofT);
        sb.add(cyl(5.9, 0.25, 48), marble, M4(0, h - 0.2, 0));
      }
      sb.build(g);
      // scaffolding around this storey: poles, ledgers, a walk board
      const sc = new THREE.Group(), scb = new Batch(), wood = lam("scaffWood", () => ({ map: beam() }));
      const rr = k === 7 ? 7.2 : 9.6, n = 14;
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; scb.add(UB, wood, new THREE.Matrix4().compose(V(rr * Math.cos(a), h / 2, rr * Math.sin(a)), new THREE.Quaternion(), V(0.22, h, 0.22))); }
      for (let y = 2.3; y < h; y += 2.4) for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, p0 = V(rr * Math.cos(a0), y, rr * Math.sin(a0)), p1 = V(rr * Math.cos(a1), y, rr * Math.sin(a1));
        const mid = p0.clone().add(p1).multiplyScalar(0.5), len = p0.distanceTo(p1);
        scb.add(UB, wood, new THREE.Matrix4().compose(mid, new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), p1.clone().sub(p0).normalize()), V(len + 0.2, 0.16, 0.16)));
        if (y + 2.4 >= h) scb.add(UB, wood, new THREE.Matrix4().compose(mid.clone().add(V(0, 0.15, 0)).multiplyScalar(1).setLength(0).add(V(mid.x * 0.95, y + 0.15, mid.z * 0.95)), new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), p1.clone().sub(p0).normalize()), V(len + 0.2, 0.08, 1.3)));
      }
      scb.build(sc);
      g.add(sc);
      this.scaff.push(sc);
      if (k === 0) {
        // the door on the south face (+z) and its two leaves (shut in 1990)
        const dark = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.6), lam("doorDark", () => ({ color: "#3a2f2c" })));
        dark.position.set(0, 2.4, 7.72); g.add(dark);
        for (const s of [-1, 1]) {
          const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.5, 0.12).translate(-s * 0.6, 0, 0), lam("doorWood", () => ({ map: rep(planksHD(), 0.5, 1) })));
          leaf.position.set(s * 1.2, 2.35, 7.8); leaf.castShadow = true; g.add(leaf); this.doors.push(leaf);
        }
        this.lock = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.12), twoTone(new THREE.MeshPhongMaterial({ color: "#d9a93a", specular: "#fff0b0", shininess: 50 }), 0.15));
        this.lock.position.set(0, 2.0, 7.95); g.add(this.lock);
      }
      g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.matrixAutoUpdate = true; } });
      this.storeys.push(g); R.add(g);
    }

    // ---- per-shot props on the piazza ----
    // soft clay patch where the south side sinks
    this.clay = new THREE.Mesh(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), lam("clayPatch", () => ({ color: "#7a6550" })));
    this.clay.scale.set(3.0, 1, 3.85); this.clay.position.set(4.1, 0.02, 0); R.add(this.clay);
    // 1838 trench (catino) ring with flood water
    const tr = new THREE.RingGeometry(4.6, 6.0, 64).rotateX(-Math.PI / 2);
    const trM = new THREE.Mesh(tr, lam("trenchMud", () => ({ color: "#6b553f" }))); trM.position.y = 0.025; this.trench.add(trM);
    for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2, mound = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), lam("dirtPile", () => ({ color: "#8a6a4a" }))); mound.scale.set(0.7, 0.45, 0.6); mound.position.set(6.7 * Math.cos(a), 0, 6.7 * Math.sin(a)); this.trench.add(mound); }
    this.water = new THREE.Mesh(new THREE.RingGeometry(4.65, 5.95, 64).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: "#7cc6e6" }));
    this.water.position.y = 0.04; this.trench.add(this.water); R.add(this.trench);
    // 1934 pump: engine box on wheels, drill tripod, hose
    const green = twoTone(new THREE.MeshPhongMaterial({ color: "#3f5f4a", specular: "#8aa090", shininess: 30 }), 0.15), iron = twoTone(new THREE.MeshPhongMaterial({ color: "#3d414c", specular: "#8a8a8a", shininess: 50 }), 0.15);
    const pb = new Batch();
    pb.add(UB, green, M4(8.2, 1.0, 5.6, 2.2, 1.4, 1.3)); pb.add(cyl(0.25, 1.6, 12), iron, M4(8.9, 1.7, 5.6));
    for (const [x, z] of [[7.3, 5.0], [9.1, 5.0], [7.3, 6.2], [9.1, 6.2]]) pb.add(new THREE.CylinderGeometry(0.35, 0.35, 0.2, 16).rotateX(Math.PI / 2), iron, M4(x, 0.35, z));
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2, foot = V(5.4 + 1.2 * Math.cos(a), 0, 2.8 + 1.2 * Math.sin(a)), top = V(5.4, 4.2, 2.8);
      pb.add(UB, iron, new THREE.Matrix4().compose(foot.clone().add(top).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), top.clone().sub(foot).normalize()), V(0.14, foot.distanceTo(top), 0.14))); }
    pb.add(cyl(0.12, 4.0, 10), iron, M4(5.4, 0, 2.8));
    const hose = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(7.2, 0.9, 5.4), V(6.4, 0.15, 4.6), V(5.6, 0.15, 3.4), V(5.4, 0.6, 2.9)]), 24, 0.12, 8);
    pb.add(hose, lam("hose", () => ({ color: "#2a2a2e" })));
    pb.build(this.pump); R.add(this.pump);
    // 1990 barrier: metal fence ring around the base
    const bb = new Batch(), fenceM = lam("fence", () => ({ color: "#c9cdd4" }));
    for (let i = 0; i < 28; i++) {
      const a0 = (i / 28) * Math.PI * 2, a1 = ((i + 1) / 28) * Math.PI * 2, R1 = 6.6, p0 = V(R1 * Math.cos(a0), 0, R1 * Math.sin(a0)), p1 = V(R1 * Math.cos(a1), 0, R1 * Math.sin(a1));
      bb.add(cyl(0.05, 1.15, 8), fenceM, M4(p0.x, 0, p0.z));
      for (const y of [0.35, 1.05]) { const mid = p0.clone().add(p1).multiplyScalar(0.5).setY(y); bb.add(UB, fenceM, new THREE.Matrix4().compose(mid, new THREE.Quaternion().setFromUnitVectors(V(1, 0, 0), p1.clone().sub(p0).normalize()), V(p0.distanceTo(p1), 0.06, 0.06))); }
    }
    bb.build(this.barrier); R.add(this.barrier);

    // ---- the bedroom insert ----
    const [RX, , RZ] = ROOM, rb = new Batch();
    const plaster = lam("plaster", () => ({ color: "#f3dcb0" })), floorM = lam("roomFloor", () => ({ map: rep(planksHD(), 2, 2) })), frame = lam("bedFrame", () => ({ map: beam() }));
    rb.add(quad(V(RX - 4, 0, RZ + 4), V(RX + 4, 0, RZ + 4), V(RX + 4, 0, RZ - 4), V(RX - 4, 0, RZ - 4), 3, 3), floorM);
    rb.add(boxGeo(V(RX - 4, 0, RZ - 1.6), V(RX + 4, 3.2, RZ - 1.45), 0), plaster);   // back wall
    rb.add(boxGeo(V(RX - 2.6, 0, RZ - 4), V(RX - 2.45, 3.2, RZ + 4), 0), plaster);  // left wall
    rb.add(boxGeo(V(RX + 2.6, 0, RZ - 4), V(RX + 2.75, 3.2, RZ + 4), 0), plaster);  // right wall
    rb.add(quad(V(RX + 0.6, 1.3, RZ - 1.44), V(RX + 1.8, 1.3, RZ - 1.44), V(RX + 1.8, 2.5, RZ - 1.44), V(RX + 0.6, 2.5, RZ - 1.44)), lam("roomWin", () => ({ map: windowTex() })));
    rb.add(boxGeo(V(RX - 1.0, 0, RZ - 0.75), V(RX + 1.0, 0.42, RZ + 0.75), 0), frame);
    rb.add(boxGeo(V(RX - 1.05, 0, RZ - 0.8), V(RX - 0.95, 0.95, RZ + 0.8), 0), frame);  // headboard
    rb.add(boxGeo(V(RX - 0.95, 0.42, RZ - 0.7), V(RX + 0.95, 0.66, RZ + 0.7), 0), lam("mattress", () => ({ color: "#f4f1ea" })));
    rb.add(boxGeo(V(RX + 0.05, 0.665, RZ - 0.7), V(RX + 0.95, 0.68, RZ + 0.7), 0), lam("quilt", () => ({ color: "#5a8fc2" })));
    rb.add(boxGeo(V(RX - 0.88, 0.66, RZ - 0.45), V(RX - 0.5, 0.8, RZ + 0.45), 0), lam("pillow", () => ({ color: "#ffffff" })));
    rb.add(boxGeo(V(RX + 1.5, 0, RZ - 1.3), V(RX + 2.4, 0.6, RZ - 0.7), 0), frame);   // little chest
    rb.build(R);
    this.dent = new THREE.Mesh(new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#c9c3b8", transparent: true, opacity: 0.6 }));
    this.dent.position.set(RX + 0.15, 0.664, RZ); this.dent.layers.set(NOINK); R.add(this.dent);
    const bcol = ["#e2453c", "#f2c33a", "#3f8fd6", "#2fa36b", "#f08a2c", "#a25ad1"];
    for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), lam("block" + i, () => ({ color: bcol[i] }))); m.position.set(0, 0.08 + i * 0.16, 0); m.rotation.y = (i % 2) * 0.2; m.castShadow = true; this.blocks.add(m); }
    this.blocks.position.set(RX + 0.15, 0.66, RZ); R.add(this.blocks);
    for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.25), lam("book" + i, () => ({ color: bcol[(i + 2) % 6] }))); m.position.set((i % 2) * 0.02, 0.03 + i * 0.062, 0); m.rotation.y = (i % 3) * 0.12; m.castShadow = true; this.books.add(m); }
    this.books.position.set(RX + 0.15, 0.66, RZ); R.add(this.books);

    // ---- the soil cut-away diorama ----
    const [DX, , DZ] = DIO, db = new Batch();
    const soil = lam("soilCut", () => ({ map: soilTex() })), soilSide = lam("soilSide", () => ({ color: "#8a6a4a" }));
    db.add(quad(V(DX - 18, -14, DZ + 6), V(DX + 18, -14, DZ + 6), V(DX + 18, 0, DZ + 6), V(DX - 18, 0, DZ + 6)), soil);
    db.add(boxGeo(V(DX - 18, -14, DZ - 6), V(DX + 18, -0.02, DZ + 5.98), 0, true), soilSide);
    db.add(quad(V(DX - 18, 0, DZ + 6), V(DX + 18, 0, DZ + 6), V(DX + 18, 0, DZ - 6), V(DX - 18, 0, DZ - 6), 8, 3), grass);
    db.build(R);
    // tower stub on the slab (pivots about its +x base edge as it leans)
    const st = new Batch();
    st.add(cyl(7.7, 11, 48), blind); st.add(cyl(8.35, 0.5, 48), marble, M4(0, 10.5, 0));
    st.add(cyl(8.45, 0.55, 48), marble, M4(0, 11, 0)); st.add(cyl(6.75, 6.5, 40, true), loggia, M4(0, 11.55, 0));
    for (let i = 0; i < 30; i++) { const a = (i / 30) * Math.PI * 2; st.add(cyl(0.2, 5.0, 8), col, M4(7.95 * Math.cos(a), 11.55, 7.95 * Math.sin(a))); }
    st.add(cyl(8.15, 1.55, 48, true), arc30, M4(0, 16.55, 0));
    st.add(boxGeo(V(-8.6, -3, -6.05), V(8.6, 0, 6.05), 0), lam("foundation", () => ({ color: "#bdb4a4" })));
    st.build(this.stub);
    this.stub.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    R.add(this.stub);
    const augM = lam("augerM", () => ({ map: rep(augerTex(), 6, 1) }));
    for (let i = 0; i < 3; i++) {
      const a = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 16, 16).rotateZ(Math.PI / 2), augM);
      a.position.set(DX - 12.5, -3.2 - i * 2.2, DZ + 6.4); a.rotation.z = -0.22; a.castShadow = true; R.add(a); this.augers.push(a);
    }
    for (let i = 0; i < 12; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8), lam("scoop", () => ({ color: "#7d8a92" }))); R.add(s); this.scoops.push(s); }

    // ---- near framing objects ----
    for (const fg of FOREGROUND) {
      const o = kitClone(kit, fg.kit, fg.s ?? 1);
      if (!o) continue;
      o.position.set(...fg.pos); o.rotation.y = fg.yaw ?? 0; o.visible = false;
      this.fgs.push({ o, a: fg.a, b: fg.b }); R.add(o);
    }
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

  /** stack the storeys: each one sits on the top of the one below, tilted by the lean minus its bend correction */
  private poseTower(id: number, f: number) {
    const s = towerAt(id, f), piazza = SHOTS[id - 1].place === "piazza";
    let x = 0, y = 0, prevA = 0;
    const full = Math.floor(s.built), frac = s.built - full;
    for (let k = 0; k < 8; k++) {
      const g = this.storeys[k];
      const corr = k >= 3 ? s.bend * (k - 2) * 0.32 : 0; // degrees bent back toward vertical, more on every higher floor
      const a = THREE.MathUtils.degToRad(s.lean - corr);
      const grow = k < full ? 1 : k === full ? frac : 0;
      g.visible = piazza && grow > 0.02;
      if (!g.visible) continue;
      // the pivot sits at the downhill (+x) edge of the bottom of each storey, so the tower rotates like a block on soft ground
      g.position.set(x, y, 0);
      g.rotation.set(0, 0, -a);
      g.scale.set(TS, TS * Math.max(0.02, grow), TS);
      this.scaff[k].visible = s.scaffold;
      const h = STOREY_H[k] * grow * TS;
      x += Math.sin(a) * h; y += Math.cos(a) * h;
      prevA = a;
    }
    void prevA;
    // doors: open until the 1990 shot shuts them
    const shut = id === 14 ? smooth((f - 1488) / 13) : id > 14 && id !== 15 ? 1 : 0;
    this.doors.forEach((d, i) => { d.rotation.y = (i ? -1 : 1) * (1 - shut) * 1.25; });
    this.lock.visible = id === 14 && f >= 1501;
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 6, 95);
    if (s.place === "room") Rr = 5;
    if (s.light === "golden") Rr = Math.max(Rr, 40);
    if ([2, 6, 9, 10, 11, 12, 16, 18].includes(id)) Rr = Math.max(Rr, 60); // the whole tower's shadow on the lawn
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, sun disc, clouds (they race across during the century time-lapse) ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = s.place === "room" ? 60 : L.fogNear; this.fog.far = s.place === "room" ? 400 : Math.max(L.fogFar, 520);
    scene.fog = this.fog; scene.background = null;
    const showSun = s.light === "golden";
    this.sunDisc.visible = this.sunHalo.visible = showSun;
    if (showSun) {
      this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900);
      this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7)));
      this.sunHalo.position.copy(this.sunDisc.position); this.sunHalo.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(24)));
      (this.sunHalo.material as THREE.SpriteMaterial).color.set(L.sunDisc).multiplyScalar(1.3);
    }
    const drift = t * 0.004 + (id === 6 ? smooth((f - 500) / 55) * 2.4 : id > 6 ? 2.4 : 0);
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], a = m.userData.a + drift;
      m.position.set(Math.cos(a) * m.userData.d, m.userData.h, Math.sin(a) * m.userData.d);
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light][i % 4];
    }
    for (const g of this.fgs) g.o.visible = f >= g.a && f < g.b && g.a < s.b && g.b > s.a;
    // ---- the tower and the per-shot props ----
    this.poseTower(id, f);
    this.clay.visible = [3, 4, 6, 7, 8].includes(id);
    if (this.clay.visible) { const k = id === 3 ? smooth((f - 300) / 20) : 1; this.clay.scale.set(3.0 * (0.3 + 0.7 * k), 1, 3.85 * (0.3 + 0.7 * k)); }
    this.trench.visible = id >= 11 && s.place === "piazza";
    this.water.visible = id === 11 && f > 1036;
    this.pump.visible = id === 12;
    this.barrier.visible = id === 14;
    // bedroom: blocks lean and sink (shot 5); books sink on the pressed side (shot 13)
    const room = s.place === "room";
    this.blocks.visible = room && id === 5; this.books.visible = room && id === 13;
    this.dent.visible = room;
    if (id === 5) { const k = smooth((f - 395) / 50); this.blocks.rotation.set(0, 0, -0.32 * k); this.blocks.position.y = 0.66 - 0.05 * k; this.dent.scale.set(0.12 + 0.12 * k, 1, 0.12 + 0.1 * k); }
    if (id === 13) { const k = smooth((f - 1325) / 12) * 0.5 + smooth((f - 1378) / 14) * 0.5; this.books.rotation.set(0, 0, 0.25 * k); this.books.position.y = 0.66 - 0.06 * k; this.dent.scale.set(0.2 + 0.14 * k, 1, 0.16 + 0.1 * k); }
    // diorama: augers turn and pull scoops of soil out from under the high side; the stub leans back
    const dio = s.place === "dio";
    this.stub.visible = dio;
    for (const a of this.augers) { a.visible = dio; a.rotation.x = t * 6; }
    if (dio) {
      const ts = towerAt(15, f), ang = THREE.MathUtils.degToRad(ts.lean);
      // rotate about the +x base edge: centre shifts so that edge stays put
      this.stub.position.set(DIO[0] + 7.7 - 7.7 * Math.cos(ang), 7.7 * Math.sin(ang) - 0.3, DIO[2]);
      this.stub.rotation.set(0, 0, -ang);
    }
    this.scoops.forEach((m, i) => {
      if (!dio) { m.visible = false; return; }
      const u = ((t * 0.55 + i / this.scoops.length) % 1), lane = i % 3, a = this.augers[lane];
      m.visible = f > 1530;
      // travel from the soil under the tower outward along the auger to the left edge, then pop up onto a growing pile
      const Lx = 7.5 - 15 * u;   // from the auger tip under the tower out to its far end
      m.position.set(a.position.x + Lx * Math.cos(-0.22), a.position.y + Lx * Math.sin(-0.22) + 0.42, a.position.z + 0.05);
      m.scale.setScalar(0.8 + 0.3 * Math.sin(i));
    });
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
      a.mesh.castShadow = L.actorShadow;
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
    void clamp01;
    return focus;
  }
}
