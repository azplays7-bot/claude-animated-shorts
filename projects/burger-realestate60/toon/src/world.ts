// The world of "How McDonald's makes money from real estate" as one three.js scene (Pisa engine): a street with a
// generic burger restaurant on its own parcel of land, four more franchised restaurants and houses; two insert sets far
// away (Sam's kitchen, the money stage). update(id, f, camera) poses everything for shot `id` at frame f. Sky, light rig,
// clouds, character cards and the post chain are the bridge / Pisa engine's.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { Batch, V, lam, quad, Kit, Ray, house, prop, setSight } from "./build";
import { ctex, rep, stoneHD, grassHD, cloudHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone, twoTone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, smooth, clamp01, ShotDef, REST, RW, RD, RH, WALK_Z, ROAD_Z, LOT, POLE, OTHERS, KITCHEN, STAGE, BT, RENT_B, ROY_B } from "./story";

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

// ---------------- painted textures ----------------
const asphaltTex = () => ctex("asphalt", 1024, 1024, (g, r) => {
  g.fillStyle = "#6c6f7a"; g.fillRect(0, 0, 1024, 1024);
  for (let k = 0; k < 3000; k++) { g.fillStyle = r() < 0.5 ? "rgba(40,40,50,0.18)" : "rgba(200,200,210,0.12)"; g.fillRect(r() * 1024, r() * 1024, 3, 3); }
});
const boardTex = (text: string, bg: string, fg = "#ffffff", w = 1024) => ctex("board" + text + bg, w, 256, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, 256);
  g.fillStyle = fg; g.font = "150px Anton, Impact, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, 136);
});
const tileTex = () => ctex("kitTiles", 512, 512, (g) => {
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? "#e8e4da" : "#b9b2a4"; g.fillRect(i * 64, j * 64, 64, 64); }
});
const menuTex = () => ctex("menuB", 1024, 240, (g) => {
  g.fillStyle = "#1f2430"; g.fillRect(0, 0, 1024, 240);
  for (let k = 0; k < 3; k++) {
    const x = 30 + k * 335; g.fillStyle = "#ffd24a"; g.font = "56px Anton, Impact, sans-serif"; g.fillText(["BURGERS", "FRIES", "DRINKS"][k], x, 70);
    g.fillStyle = "rgba(255,255,255,0.7)"; for (let j = 0; j < 3; j++) g.fillRect(x, 100 + j * 40, 200 - j * 30, 16);
  }
});
/** the round burger sign (a generic burger drawing, no brand) */
const burgerSignTex = () => ctex("burgerSign", 512, 512, (g) => {
  g.fillStyle = "#e8742c"; g.beginPath(); g.arc(256, 256, 250, 0, 7); g.fill();
  g.fillStyle = "#fff5e0"; g.beginPath(); g.arc(256, 256, 214, 0, 7); g.fill();
  g.fillStyle = "#e9a447"; g.beginPath(); g.ellipse(256, 200, 150, 80, 0, Math.PI, 0); g.fill();
  g.fillStyle = "#5cbf4a"; g.fillRect(100, 200, 312, 22);
  g.fillStyle = "#6b3a22"; g.fillRect(110, 222, 292, 48);
  g.fillStyle = "#e9a447"; g.fillRect(118, 270, 276, 40);
  g.fillStyle = "#c0392b"; g.font = "70px Anton, Impact, sans-serif"; g.textAlign = "center"; g.fillText("BURGERS", 256, 400);
});
const glassTex = () => ctex("glassWin", 256, 256, (g) => {
  const gr = g.createLinearGradient(0, 0, 256, 256); gr.addColorStop(0, "#bfe3f5"); gr.addColorStop(0.5, "#7fb3d6"); gr.addColorStop(1, "#5a8fb8"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.moveTo(30, 0); g.lineTo(90, 0); g.lineTo(20, 256); g.lineTo(-40, 256); g.fill();
  g.strokeStyle = "#f6f1e6"; g.lineWidth = 14; g.strokeRect(7, 7, 242, 242);
});

const UB = new THREE.BoxGeometry(1, 1, 1);
const cyl = (r: number, h: number, seg = 32, rt = r) => new THREE.CylinderGeometry(rt, r, h, seg, 1).translate(0, h / 2, 0);
const M4 = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), ry), V(sx, sy, sz));
const box = (b: Batch, m: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => b.add(UB, m, M4((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0));
const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };

/** every street lens position looking at its subject (houses that would block a shot are left out) */
const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) {
    if (s.place !== "street" || s.id === 3 || s.id === 4 || s.id === 10) continue;   // aerials look over the roofs
    for (let f = s.a - 8; f < s.b + 8; f += 3) {
      const c = camAt(s.id, Math.max(0, Math.min(1799, f))), o = V(...c.pos), look = V(...c.look);
      const fw = look.clone().sub(o), len = fw.length() + 6;
      fw.normalize();
      const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
      const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
      for (const [sx, sy] of [[0, 0], [-0.7, 0], [0.7, 0], [0, 0.7], [0, -0.5]])
        out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len: sy < 0 ? len - 6 : len, core: sx === 0 && sy === 0 });
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
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  // dynamic props
  private parcel = new THREE.Group();
  private pins: THREE.Group[] = [];
  private rentBar!: THREE.Mesh; private royBar!: THREE.Mesh;
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

    // ---- the street (static batch) ----
    const b = new Batch();
    const grass = lam("grassHD", () => ({ map: rep(grassHD(), 1, 1) }));
    const path = lam("pathStone", () => ({ map: stoneHD("copeHD") }));
    const asph = lam("asphalt", () => ({ map: rep(asphaltTex(), 1, 1) }));
    const white = lam("whiteTrim", () => ({ color: "#f6f1e6" })), yellow = lam("roadLine", () => ({ color: "#f2c94c" })), curb = lam("curb", () => ({ color: "#c9c4ba" }));
    const flat = (x0: number, x1: number, z0: number, z1: number, y: number, u: number, v: number) => quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), u, v);
    b.add(flat(-300, 300, -300, 300, 0, 150, 150), grass);
    b.add(flat(-300, 300, ROAD_Z - 3, ROAD_Z + 3, 0.012, 60, 1), asph);
    b.add(flat(-300, 300, WALK_Z - 0.8, WALK_Z + 0.7, 0.02, 120, 1), path);
    b.add(flat(-300, 300, ROAD_Z + 3.1, ROAD_Z + 4.6, 0.02, 120, 1), path);
    for (let x = -300; x < 300; x += 6) b.add(flat(x, x + 3, ROAD_Z - 0.09, ROAD_Z + 0.09, 0.016, 1, 1), yellow);
    box(b, curb, -300, 0, ROAD_Z - 3.12, 300, 0.14, ROAD_Z - 2.95); box(b, curb, -300, 0, ROAD_Z + 2.95, 300, 0.14, ROAD_Z + 3.12);
    b.build(R);
    // the restaurants (ours + four more franchised ones down the street)
    setSight([]);
    this.restaurant(R, REST[0], REST[2], 0, true);
    for (const [x, z, yaw] of OTHERS) this.restaurant(R, x, z, yaw, false);
    // neighbours: houses between the restaurants
    const hb2 = new Batch();
    const rays = sightLines(); setSight(rays.filter((r) => r.core));
    const north: [number, number, number][] = [[-44, 4, 5.6], [45, 6, 6.4], [-58, 2, 6.4], [59, 3, 5.6]];
    for (const [x, si, h] of north) house(hb2, x, 0, 0, 9, 8, h, si);
    const south: [number, number, number][] = [[-33, 3, 5.6], [33, 6, 5.6], [-46, 0, 6.4], [47, 1, 6.4]];
    for (const [x, si, h] of south) house(hb2, x, 24, Math.PI, 9, 8, h, si);
    setSight(rays);
    const trees: [number, number, number][] = [[-13, 3.0, 7.5], [13.5, 2.0, 8.0], [-38.5, 3.5, 7.5], [39.5, 3.0, 8.5], [1, 16.5, 7.5], [-27, 16.5, 8], [28, 16.5, 7], [-52, 3.5, 7.5], [53, 3.2, 8]];
    trees.forEach(([x, z, h], i) => prop(hb2, kit, ["tree_oak", "tree_fat", "tree_default", "tree_oak"][i % 4], x, 0, z, h, i * 1.3));
    for (const x of [-9.2, 9.2]) for (const z of [-3, 2]) prop(hb2, kit, "plant_bushDetailed", x, 0, z, 1.1, x + z);
    hb2.build(R);
    const hillM = lam("hills", () => ({ color: "#7d9a7a" })), hb = new Batch();
    for (let i = 0; i < 9; i++) { const g = new THREE.ConeGeometry(70 + (i % 3) * 25, 50 + (i % 4) * 18, 7, 1); g.translate(0, (50 + (i % 4) * 18) / 2, 0); hb.add(g, hillM, M4(-320 + i * 95, -4, -420 - (i % 3) * 60, 1.8, 1, 1)); }
    hb.build(R, false);

    // the parcel outline (gold, glowing) around our lot
    const goldE = new THREE.MeshLambertMaterial({ color: "#f2c33a", emissive: "#ffb000", emissiveIntensity: 1.6 });
    const { x0, x1, z0, z1 } = LOT, tW = 0.32;
    for (const [a0, a1, c0, c1] of [[x0, x1, z0 - tW / 2, z0 + tW / 2], [x0, x1, z1 - tW / 2, z1 + tW / 2], [x0 - tW / 2, x0 + tW / 2, z0, z1], [x1 - tW / 2, x1 + tW / 2, z0, z1]]) {
      const m = mesh(UB, goldE, this.parcel); m.scale.set(a1 - a0, 0.12, c1 - c0); m.position.set((a0 + a1) / 2, 0.08, (c0 + c1) / 2); m.castShadow = false;
    }
    const fill = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#ffd24a", transparent: true, opacity: 0.28, depthWrite: false }));
    fill.position.set((x0 + x1) / 2, 0.07, (z0 + z1) / 2); fill.name = "fill"; fill.layers.set(NOINK); this.parcel.add(fill);
    this.parcel.visible = false; R.add(this.parcel);
    // pins over every restaurant (franchised = gold)
    const gold = twoTone(new THREE.MeshPhongMaterial({ color: "#f2c33a", specular: "#fff0b0", shininess: 60, emissive: "#5a3a00" }), 0.15);
    for (const [x, z] of [[REST[0], REST[2]], ...OTHERS.map((o) => [o[0], o[1]])]) {
      const g = new THREE.Group();
      mesh(new THREE.ConeGeometry(1.3, 2.8, 24).rotateX(Math.PI), gold, g).position.y = 0;
      mesh(new THREE.SphereGeometry(1.45, 24, 16), gold, g).position.y = 1.6;
      g.position.set(x, 12, z); g.visible = false; R.add(g); this.pins.push(g);
    }

    // ---- Sam's kitchen ----
    {
      const [KX, , KZ] = KITCHEN, kb = new Batch();
      const floor = lam("kitFloor", () => ({ map: tileTex() })), wall = lam("kitWall", () => ({ color: "#e9e2d2" }));
      kb.add(quad(V(KX - 6, 0, KZ + 6), V(KX + 6, 0, KZ + 6), V(KX + 6, 0, KZ - 6), V(KX - 6, 0, KZ - 6), 1, 1), floor);
      box(kb, wall, KX - 6, 0, KZ - 1.6, KX + 6, 3.6, KZ - 1.45);
      box(kb, lam("kitTile", () => ({ color: "#c96b4a" })), KX - 6, 0, KZ - 1.44, KX + 6, 1.0, KZ - 1.42);
      kb.add(quad(V(KX - 2.4, 2.2, KZ - 1.41), V(KX + 2.4, 2.2, KZ - 1.41), V(KX + 2.4, 3.3, KZ - 1.41), V(KX - 2.4, 3.3, KZ - 1.41)), lam("menuBoard", () => ({ map: menuTex() })));
      // the grill (Sam stands behind it)
      const steel = lam("steel", () => ({ color: "#9aa3ad" })), dark = lam("grillTop", () => ({ color: "#2b2e35" }));
      box(kb, steel, KX - 0.4, 0, KZ + 0.45, KX + 1.6, 0.86, KZ + 1.05);
      box(kb, dark, KX - 0.38, 0.86, KZ + 0.47, KX + 1.58, 0.9, KZ + 1.03);
      for (const [px, pz] of [[-0.05, 0.62], [0.35, 0.86], [0.8, 0.62], [1.2, 0.86]]) kb.add(cyl(0.15, 0.05, 20), lam("patty", () => ({ color: "#6b3a22" })), M4(KX + px, 0.9, KZ + pz));
      // the counter + register on the left
      box(kb, lam("counter", () => ({ color: "#d9a441" })), KX - 3.6, 0, KZ + 0.5, KX - 1.2, 1.0, KZ + 1.1);
      box(kb, lam("counterTop", () => ({ color: "#f4f1ea" })), KX - 3.65, 1.0, KZ + 0.45, KX - 1.15, 1.06, KZ + 1.15);
      box(kb, lam("register", () => ({ color: "#3a3f4a" })), KX - 2.7, 1.06, KZ + 0.6, KX - 2.1, 1.35, KZ + 0.95);
      kb.add(cyl(0.18, 0.25, 20), lam("tray", () => ({ color: "#c0392b" })), M4(KX - 3.2, 1.06, KZ + 0.8, 1, 0.2, 1));
      kb.build(R);
      const lamp = new THREE.PointLight("#fff1d0", 5, 6); lamp.position.set(KX + 0.6, 2.8, KZ + 1.2); R.add(lamp);
    }
    // ---- the money stage: the register, then two columns - RENT and ROYALTIES ----
    {
      const [SX, , SZ] = STAGE, sb = new Batch();
      sb.add(cyl(7, 0.5, 64), lam("stageTop", () => ({ color: "#e9dcc0" })), M4(SX, -0.5, SZ));
      sb.add(cyl(7.3, 0.2, 64), lam("stageRim", () => ({ color: "#c98a3a" })), M4(SX, -0.5, SZ));
      // register on a plinth (Sam's sales)
      box(sb, lam("plinthR", () => ({ color: "#6b7383" })), SX - 0.8, 0, SZ + 0.6, SX + 0.8, 0.9, SZ + 1.8);
      box(sb, lam("register", () => ({ color: "#3a3f4a" })), SX - 0.55, 0.9, SZ + 0.8, SX + 0.55, 1.45, SZ + 1.6);
      box(sb, lam("regScreen", () => ({ color: "#7fd18f" })), SX - 0.4, 1.45, SZ + 0.9, SX + 0.4, 1.75, SZ + 1.0);
      const lab = (t: string, bg: string, x: number, z: number, w = 2.6) => sb.add(quad(V(x - w / 2, 0.02, z + 0.35), V(x + w / 2, 0.02, z + 0.35), V(x + w / 2, 0.62, z), V(x - w / 2, 0.62, z)), lam("lab" + t, () => ({ map: boardTex(t, bg) })));
      lab("SALES", "#2f8a4a", SX, SZ + 2.0, 2.0);
      lab("RENT", "#b8860b", SX - 3.2, SZ - 0.4, 2.2);
      lab("ROYALTIES", "#1f6aa0", SX + 3.2, SZ - 0.4, 2.6);
      for (const x of [SX - 3.2, SX + 3.2]) sb.add(cyl(1.15, 0.25, 32), lam("colBase", () => ({ color: "#4a5262" })), M4(x, 0, SZ - 1.6));
      sb.build(R);
      this.rentBar = mesh(UB, twoTone(new THREE.MeshPhongMaterial({ color: "#f2c33a", specular: "#fff0b0", shininess: 60 }), 0.15), R);
      this.royBar = mesh(UB, twoTone(new THREE.MeshPhongMaterial({ color: "#3a9bd6", specular: "#d8f0ff", shininess: 50 }), 0.15), R);
      this.rentBar.visible = this.royBar.visible = false;
    }
  }

  /** a generic burger restaurant on its own lot, front facing +z in its own frame (yaw turns it), with a tall round sign */
  private restaurant(R: THREE.Object3D, x: number, z: number, yaw: number, main: boolean) {
    const g = new THREE.Group();
    const wallM = lam("restWall", () => ({ color: "#f3e3c3" })), brick = lam("restBrick", () => ({ color: "#b5452f" })), roofM = lam("restRoof", () => ({ color: "#1f8a8a" }));
    const asph = lam("lotAsph", () => ({ map: rep(asphaltTex(), 1, 1) })), white = lam("whiteTrim", () => ({ color: "#f6f1e6" }));
    const hw = RW / 2, hd = RD / 2;
    const B = (m: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => { const o = mesh(UB, m, g); o.scale.set(x1 - x0, y1 - y0, z1 - z0); o.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return o; };
    // the lot (asphalt) with parking lines
    const lotM = new THREE.Mesh(new THREE.PlaneGeometry(LOT.x1 - LOT.x0, LOT.z1 - LOT.z0).rotateX(-Math.PI / 2), asph); lotM.position.set(0, 0.014, (LOT.z0 + LOT.z1) / 2); lotM.receiveShadow = true; g.add(lotM);
    for (let k = 0; k < 6; k++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 3.2).rotateX(-Math.PI / 2), white); l.position.set(hw + 0.9 + (k % 2) * 0, 0.02, -6 + k * 2.2); l.rotation.y = Math.PI / 2; l.position.x = hw + 2.2; g.add(l); }
    // body
    B(brick, -hw, 0, -hd, hw, 1.0, hd);
    B(wallM, -hw + 0.05, 1.0, -hd + 0.05, hw - 0.05, RH, hd - 0.05);
    // roof band + slab
    B(roofM, -hw - 0.35, RH, -hd - 0.35, hw + 0.35, RH + 0.9, hd + 0.35);
    B(lam("restRoofTop", () => ({ color: "#d9d4c8" })), -hw - 0.2, RH + 0.9, -hd - 0.2, hw + 0.2, RH + 0.95, hd + 0.2);
    // sign board above the door
    const sb = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.75), lam("restBoard", () => ({ map: boardTex("BURGERS", "#e8742c", "#fff5e0") }))); sb.position.set(0, RH + 0.45, hd + 0.36); g.add(sb);
    // windows + door on the front
    const gl = lam("restGlass", () => ({ map: glassTex() }));
    for (const cx of [-3.3, 3.3]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 2.1), gl); w.position.set(cx, 2.15, hd + 0.01); g.add(w); }
    for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.1), gl); w.position.set(sx * (hw + 0.01), 2.15, 0); w.rotation.y = sx * Math.PI / 2; g.add(w); }
    B(lam("restDoorF", () => ({ color: "#f6f1e6" })), -0.95, 0, hd - 0.02, 0.95, 2.75, hd + 0.04);
    const d = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.5), lam("restDoorG", () => ({ color: "#5a8fb8" }))); d.position.set(0, 1.25, hd + 0.05); g.add(d);
    // awnings over the windows
    for (const cx of [-3.3, 3.3]) { const a = B(lam("awning", () => ({ color: "#e8742c" })), cx - 1.7, 3.3, hd, cx + 1.7, 3.42, hd + 0.9); a.rotation.x = 0.25; }
    // the tall round sign
    const pole = mesh(cyl(0.18, 7.2, 16), lam("pole", () => ({ color: "#6b7383" })), g); pole.position.set(POLE[0], 0, POLE[2]);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.25, 40).rotateX(Math.PI / 2), [lam("discRim", () => ({ color: "#e8742c" })), lam("burgerSign", () => ({ map: burgerSignTex() })), lam("burgerSign", () => ({ map: burgerSignTex() }))]);
    disc.position.set(POLE[0], 7.9, POLE[2]); disc.castShadow = true; g.add(disc);
    // planters by the door
    for (const sx of [-1.6, 1.6]) B(lam("planter", () => ({ color: "#8a8f99" })), sx - 0.3, 0, hd + 0.2, sx + 0.3, 0.5, hd + 0.8);
    void main;
    g.position.set(x, 0, z); g.rotation.y = yaw; R.add(g);
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
    const t = f / FPS;
    // the parcel outline lights up for "real estate", the twist and the rising value
    const show = id === 3 || (id === 7 && f > BT.land - 6 && f < BT.month + 30) || (id === 9 && f > BT.rise - 4) || id === 10;
    this.parcel.visible = show;
    if (show) {
      const a0 = id === 3 ? 180 : id === 7 ? BT.land - 6 : id === 9 ? BT.rise - 4 : 1360;
      const u = smooth((f - a0) / 14), pulse = 0.75 + 0.25 * Math.sin(t * 6);
      const fill = this.parcel.getObjectByName("fill") as THREE.Mesh;
      (fill.material as THREE.MeshBasicMaterial).opacity = 0.45 * u * pulse;
      this.parcel.scale.set(1, 1, 1);
      this.parcel.children.forEach((c) => { if (c !== fill) c.scale.y = 0.12 * Math.max(0.05, u); });
    }
    // pins over every restaurant: pop in one by one in the 95 % shot and stay for the ending
    this.pins.forEach((p, i) => {
      const a0 = id === 4 ? BT.p95 + 10 + i * 9 : id === 10 ? 1380 + i * 8 : 1e9;
      const u = smooth((f - a0) / 10);
      p.visible = (id === 4 || id === 10) && u > 0; p.scale.setScalar(Math.max(0.01, u) * (id === 10 ? 0.6 : 1)); p.position.y = 12 + 0.6 * Math.sin(t * 2 + i); p.rotation.y = t * 1.2;
    });
    // rent vs royalties columns (scaled: $1 B = 0.36 m)
    const [SX, , SZ] = STAGE, Kb = 0.36, w = 1.5;
    const vis = id === 8;
    this.rentBar.visible = this.royBar.visible = vis;
    if (vis) {
      const r = (smooth((f - BT.slice - 14) / 20) * 0.12 + smooth((f - BT.y2024 - 20) / 40) * 0.88) * RENT_B * Kb;
      const y = (smooth((f - BT.roy - 14) / 20) * 0.12 + smooth((f - BT.y2024 - 20) / 40) * 0.88) * ROY_B * Kb;
      this.rentBar.scale.set(w, Math.max(0.01, r), w); this.rentBar.position.set(SX - 3.2, 0.25 + r / 2, SZ - 1.6);
      this.royBar.scale.set(w, Math.max(0.01, y), w); this.royBar.position.set(SX + 3.2, 0.25 + y / 2, SZ - 1.6);
    }
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
    const inside = s.place === "kitchen";
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 6, 95);
    if (inside) Rr = 6;
    if (s.place === "stage") Rr = 12;
    if (id === 3 || id === 4 || id === 10 || (id === 7 && f > BT.owns - 6 && f < BT.month) || (id === 9 && f > BT.rise - 6)) Rr = Math.max(Rr, 70);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, clouds (they race across during the time-lapse) ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = inside || s.place === "stage" ? 60 : L.fogNear; this.fog.far = inside || s.place === "stage" ? 400 : Math.max(L.fogFar, 520);
    scene.fog = this.fog; scene.background = null;
    const drift = t * 0.004;
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], a = m.userData.a + drift;
      m.position.set(Math.cos(a) * m.userData.d, m.userData.h, Math.sin(a) * m.userData.d);
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light][i % 4];
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
    return focus;
  }
}
