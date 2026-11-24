// "Khabib vs McGregor" series: every set lives in one world, far apart, toggled per shot.
// arena (0): an eight-sided cage under a lighting rig, tiered crowd with phone lights, a four-sided big screen.
// stage (300): a weigh-in / press-conference stage with an LED wall and a crowd; a dark backstage zone behind it.
// hotel (600): a corridor with doors and sconces.   dock (900): a loading dock with a fighters' bus and a police car.
// studio (1200): a TV studio (interview chairs + a news desk) with a big screen.   street (1500): a city street at night,
// neon and a billboard.   phone (1800): a dark void with two giant phones for the online messages.
// Every text surface is a canvas texture cached by its content, so the shot code can just say what a screen shows.
import * as THREE from "three";
import { M, MP, canvas, put, grp, rbox, cyl, glow, text, rr, rng, rep, ANTON, INTER } from "../look/kit";

export const SETS = {
  arena: new THREE.Vector3(0, 0, 0), stage: new THREE.Vector3(300, 0, 0), hotel: new THREE.Vector3(600, 0, 0), dock: new THREE.Vector3(900, 0, 0),
  studio: new THREE.Vector3(1200, 0, 0), street: new THREE.Vector3(1500, 0, 0), phone: new THREE.Vector3(1800, 0, 0),
};
export const BUS_WIN = 1.2;   // the window the dolly goes through (bus-local x)
export type SetName = keyof typeof SETS;
export type Line = [string, number, string?, string?];   // text, size (px on a 1024-wide canvas), colour, font
const texCache = new Map<string, THREE.Texture>();
/** a screen: dark gradient + centred lines of text (cached by content) */
export const screenTex = (lines: Line[], w = 1024, h = 576, bg = ["#0b1430", "#1d0b2e"], accent = "#d8262e") => {
  const key = JSON.stringify([lines, w, h, bg, accent]);
  if (texCache.has(key)) return texCache.get(key)!;
  const t = canvas(w, h, (g) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, bg[0]); gr.addColorStop(1, bg[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,0.04)"; for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 2);
    g.fillStyle = accent; g.fillRect(0, h - 18, w, 18); g.fillRect(0, 0, w, 8);
    const total = lines.reduce((a, l) => a + l[1] * 1.15, 0); let y = h / 2 - total / 2;
    for (const [s, size, col, font] of lines) { y += size * 0.575; text(g, s, w / 2, y, size, col ?? "#ffffff", font ?? ANTON); y += size * 0.575; }
  });
  texCache.set(key, t); return t;
};
const chainTex = () => {
  const t = canvas(256, 256, (g) => { g.clearRect(0, 0, 256, 256); g.strokeStyle = "rgba(30,32,36,1)"; g.lineWidth = 5; for (let k = -256; k < 512; k += 32) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 256, 256); g.stroke(); g.beginPath(); g.moveTo(k + 256, 0); g.lineTo(k, 256); g.stroke(); } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
};
const matTex = () => canvas(1024, 1024, (g) => {
  g.fillStyle = "#d6d9de"; g.fillRect(0, 0, 1024, 1024);
  const r = rng(5); for (let k = 0; k < 3000; k++) { g.fillStyle = `rgba(0,0,0,${r() * 0.05})`; g.fillRect(r() * 1024, r() * 1024, 3, 3); }
  g.strokeStyle = "rgba(20,30,60,0.6)"; g.lineWidth = 10; g.beginPath(); g.arc(512, 512, 170, 0, 7); g.stroke();
  text(g, "WORLD", 512, 470, 110, "rgba(20,30,60,0.75)"); text(g, "TITLE", 512, 575, 110, "rgba(170,20,30,0.8)");
  g.save(); g.translate(512, 512); for (let k = 0; k < 8; k++) { g.rotate(Math.PI / 4); g.fillStyle = "rgba(20,30,60,0.35)"; g.fillRect(260, -60, 150, 120); g.fillStyle = "rgba(255,255,255,0.7)"; g.font = `40px ${ANTON}`; g.textAlign = "center"; g.fillText("FIGHT", 335, -8); g.fillText("NIGHT", 335, 34); } g.restore();
});
const neonTex = (s: string, col: string) => canvas(512, 160, (g) => { g.clearRect(0, 0, 512, 160); g.shadowColor = col; g.shadowBlur = 24; text(g, s, 256, 84, 96, col); g.shadowBlur = 0; text(g, s, 256, 84, 96, "#ffffff"); });

/** an instanced crowd: bodies + heads, varied colours; returns the phone-light sprites */
const crowd = (parent: THREE.Object3D, spots: [number, number, number, number][], seed: number, phones = 0.12) => {
  const r = rng(seed), n = spots.length;
  const bodyG = new THREE.CapsuleGeometry(0.2, 0.32, 4, 10), headG = new THREE.SphereGeometry(0.17, 12, 10);
  const bodies = new THREE.InstancedMesh(bodyG, M("#ffffff", 0.7), n), heads = new THREE.InstancedMesh(headG, M("#ffffff", 0.6), n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1);
  const shirts = ["#d8262e", "#1d3a8a", "#2a2a30", "#e8e4da", "#1a7a3a", "#ff8a20", "#5a2a6a", "#3a3a40"], skins = ["#f1c7a2", "#d9a47e", "#a8714f", "#7a4a2e", "#f3d1b0"];
  const lightPos: THREE.Vector3[] = [];
  spots.forEach(([x, y, z, ry], i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry); const s = 0.9 + r() * 0.25; sc.set(s, s, s);
    m.compose(new THREE.Vector3(x, y + 0.45 * s, z), q, sc); bodies.setMatrixAt(i, m); bodies.setColorAt(i, new THREE.Color(shirts[Math.floor(r() * shirts.length)]));
    m.compose(new THREE.Vector3(x, y + 0.95 * s, z), q, sc); heads.setMatrixAt(i, m); heads.setColorAt(i, new THREE.Color(skins[Math.floor(r() * skins.length)]));
    if (r() < phones) lightPos.push(new THREE.Vector3(x + Math.sin(ry) * 0.25, y + 1.25 * s, z + Math.cos(ry) * 0.25));
  });
  bodies.castShadow = heads.castShadow = false; bodies.receiveShadow = heads.receiveShadow = true;
  parent.add(bodies, heads);
  const pm = new THREE.SpriteMaterial({ color: "#d8ecff", transparent: true, opacity: 0.95, depthWrite: false });
  const lights = lightPos.map((p) => { const s = new THREE.Sprite(pm); s.position.copy(p); s.scale.set(0.09, 0.14, 1); parent.add(s); return s; });
  return lights;
};

export class World {
  root = new THREE.Group();
  g: Record<SetName, THREE.Group> = {} as Record<SetName, THREE.Group>;
  big: THREE.MeshStandardMaterial[] = []; stageWall!: THREE.MeshStandardMaterial; tv!: THREE.MeshStandardMaterial; billboard!: THREE.MeshStandardMaterial; board!: THREE.MeshStandardMaterial; cardBoard!: THREE.MeshStandardMaterial;
  phoneL!: THREE.MeshStandardMaterial; phoneR!: THREE.MeshStandardMaterial; doorSign!: THREE.MeshStandardMaterial; backSign!: THREE.MeshStandardMaterial;
  flashes: THREE.Sprite[] = []; stageFlashes: THREE.Sprite[] = []; beams: THREE.Mesh[] = [];
  bus!: THREE.Group; busWin: number[] = []; glassOk!: THREE.Mesh; glassBroken!: THREE.Mesh; shards: THREE.Mesh[] = []; dolly!: THREE.Group; police!: THREE.Group; policeLights: THREE.MeshStandardMaterial[] = [];
  plane!: THREE.Group; belts: THREE.Group[] = []; gloves!: THREE.Group; pressTable!: THREE.Group; scale!: THREE.Group; interview!: THREE.Group; newsDesk!: THREE.Group;
  bubbles: THREE.Mesh[] = []; stageCrowd!: THREE.Group; arenaKey!: THREE.SpotLight;
  constructor() {
    for (const [k, v] of Object.entries(SETS)) { const g = grp(this.root, v.x, v.y, v.z); this.g[k as SetName] = g; }
    this.buildArena(this.g.arena); this.buildStage(this.g.stage); this.buildHotel(this.g.hotel); this.buildDock(this.g.dock);
    this.buildStudio(this.g.studio); this.buildStreet(this.g.street); this.buildPhone(this.g.phone);
  }
  show(k: SetName) { (Object.keys(this.g) as SetName[]).forEach((n) => (this.g[n].visible = n === k)); }

  // ------------------------------------------------------------------ arena
  buildArena(R: THREE.Group) {
    put(R, new THREE.CircleGeometry(40, 48), M("#0c0d12", 0.9), 0, -0.01, 0, { rx: -Math.PI / 2, cast: false });
    const RAD = 4.6, edge = 2 * RAD * Math.sin(Math.PI / 8), apo = RAD * Math.cos(Math.PI / 8);
    put(R, new THREE.CircleGeometry(RAD, 8, Math.PI / 8), MP("#ffffff", 0.75, { map: matTex(), clearcoat: 0.1 }), 0, 0.005, 0, { rx: -Math.PI / 2, cast: false });
    put(R, new THREE.CylinderGeometry(RAD + 1.2, RAD + 1.3, 0.3, 8, 1, false, Math.PI / 8), M("#15161c", 0.7), 0, -0.15, 0, { cast: false });
    const ch = chainTex(); ch.repeat.set(edge * 3, 1.8 * 3);
    const fenceM = new THREE.MeshStandardMaterial({ color: "#2a2c32", metalness: 0.7, roughness: 0.4, map: ch, alphaMap: ch, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide });
    const padM = MP("#141418", 0.5), postM = MP("#141418", 0.45);
    const postT = canvas(128, 512, (g) => { g.fillStyle = "#141418"; g.fillRect(0, 0, 128, 512); g.save(); g.translate(64, 256); g.rotate(-Math.PI / 2); text(g, "FIGHT NIGHT", 0, 4, 70, "#d8262e"); g.restore(); });
    for (let k = 0; k < 8; k++) {
      const a = Math.PI / 8 + k * Math.PI / 4 + Math.PI / 8, mid = a;   // side centre angle
      const cx = Math.sin(mid) * apo, cz = Math.cos(mid) * apo;
      put(R, new THREE.PlaneGeometry(edge, 1.8), fenceM, cx, 0.95, cz, { ry: mid, cast: false });
      put(R, rbox(edge, 0.16, 0.16, 0.06), padM, cx, 1.9, cz, { ry: mid });
      const va = k * Math.PI / 4 + Math.PI / 8; const vx = Math.sin(va) * RAD, vz = Math.cos(va) * RAD;
      put(R, cyl(0.1, 0.1, 2.0, 16), postM, vx, 1.0, vz); put(R, cyl(0.13, 0.13, 1.4, 16), MP("#ffffff", 0.5, { map: postT }), vx, 1.0, vz);
    }
    // tiered crowd around the cage
    const spots: [number, number, number, number][] = []; const r = rng(3);
    for (let row = 0; row < 11; row++) { const rr_ = 8 + row * 1.0, y = row * 0.45; const n = Math.floor(2 * Math.PI * rr_ / 0.62); for (let k = 0; k < n; k++) { const a = (k + r() * 0.4) / n * Math.PI * 2; spots.push([Math.sin(a) * rr_, y, Math.cos(a) * rr_, a + Math.PI]); } }
    for (let row = 0; row < 11; row++) put(R, new THREE.CylinderGeometry(8 + row + 0.5, 8 + row + 0.5, 0.45, 48, 1, true), M("#121218", 0.9, 0, { side: THREE.DoubleSide }), 0, row * 0.45 - 0.2, 0, { cast: false });
    for (let row = 0; row < 11; row++) put(R, new THREE.RingGeometry(8 + row - 0.5, 8 + row + 0.5, 48), M("#16161c", 0.9), 0, row * 0.45 + 0.02, 0, { rx: -Math.PI / 2, cast: false });
    this.flashes = crowd(R, spots, 9, 0.1);
    // lighting rig + big screen
    const rig = grp(R, 0, 7.5, 0);
    for (const sx of [-1, 1]) { put(rig, rbox(9, 0.3, 0.3, 0.02), M("#2a2a30", 0.5, 0.6), 0, 0, sx * 4.5); put(rig, rbox(0.3, 0.3, 9, 0.02), M("#2a2a30", 0.5, 0.6), sx * 4.5, 0, 0); }
    const lt = canvas(8, 8, (g) => { g.fillStyle = "#fff6e8"; g.fillRect(0, 0, 8, 8); });
    for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; put(rig, cyl(0.22, 0.22, 0.12, 16), glow(lt, 6), Math.sin(a) * 4.4, -0.2, Math.cos(a) * 4.4, { cast: false }); }
    const beamM = new THREE.MeshBasicMaterial({ color: "#c8dcff", transparent: true, opacity: 0.022, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + 0.2; const b = put(R, new THREE.ConeGeometry(1.6, 7.3, 24, 1, true), beamM, Math.sin(a) * 3.0, 3.65, Math.cos(a) * 3.0, { cast: false }); this.beams.push(b); }
    const scr = grp(R, 0, 10.2, 0);
    put(scr, rbox(4.4, 2.6, 4.4, 0.05), M("#0a0a0e", 0.5), 0, 0, 0);
    for (let k = 0; k < 4; k++) { const m = new THREE.MeshStandardMaterial({ color: "#000", emissive: "#ffffff", emissiveIntensity: 1.25, emissiveMap: screenTex([["", 10]]) }); this.big.push(m); put(scr, new THREE.PlaneGeometry(4.2, 2.36), m, Math.sin(k * Math.PI / 2) * 2.21, 0, Math.cos(k * Math.PI / 2) * 2.21, { ry: k * Math.PI / 2, cast: false }); }
    // lights: one strong key from above (shadows), cool rims from two sides, a dim fill
    this.arenaKey = new THREE.SpotLight("#fff4e6", 260, 30, 0.75, 0.5, 1.6); this.arenaKey.position.set(0, 12, 0); this.arenaKey.target.position.set(0, 0, 0);
    this.arenaKey.castShadow = true; this.arenaKey.shadow.mapSize.set(2048, 2048); this.arenaKey.shadow.bias = -0.0004; R.add(this.arenaKey, this.arenaKey.target);
    R.add(new THREE.HemisphereLight("#3a4a7a", "#0a0a10", 0.5));
    for (const [x, z, c] of [[10, 6, "#4a7dff"], [-10, -6, "#ff4a7a"]] as const) { const p = new THREE.PointLight(c, 120, 30, 2); p.position.set(x, 6, z); R.add(p); }
    // championship belts (gold plate + leather strap) and a pair of gloves for the last scene
    for (let k = 0; k < 2; k++) this.belts.push(this.belt(R));
    this.gloves = grp(R, 0, 0, 0);
    for (const sx of [-1, 1]) { const g = grp(this.gloves, sx * 0.12, 0.07, 0, sx * 0.4); put(g, new THREE.SphereGeometry(0.1, 18, 14), MP("#141416", 0.35), 0, 0.02, 0, { s: [1, 0.8, 1.3] }); put(g, cyl(0.07, 0.08, 0.1, 16), MP("#141416", 0.35), 0, 0.0, -0.12, { rx: Math.PI / 2 }); }
    this.gloves.visible = false;
  }
  belt(parent: THREE.Object3D) {
    const b = grp(parent); const gold = MP("#e8b83a", 0.22, { metalness: 1, clearcoat: 1 });
    const bt = canvas(256, 256, (g) => { g.fillStyle = "#e8b83a"; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill(); g.strokeStyle = "#8a6a1a"; g.lineWidth = 10; g.stroke(); g.fillStyle = "#d8262e"; g.beginPath(); g.arc(128, 128, 60, 0, 7); g.fill(); text(g, "CHAMP", 128, 132, 40, "#ffffff"); });
    put(b, rbox(0.75, 0.16, 0.03, 0.01), MP("#1a1a1a", 0.5), 0, 0, 0);
    put(b, cyl(0.17, 0.17, 0.03, 32), MP("#ffffff", 0.2, { map: bt, metalness: 0.8 }), 0, 0, 0.02, { rx: Math.PI / 2 });
    for (const sx of [-1, 1]) put(b, rbox(0.13, 0.14, 0.035, 0.01), gold, sx * 0.27, 0, 0.01);
    b.visible = false; return b;
  }

  // ------------------------------------------------------------------ stage (weigh-ins / press conference) + backstage
  buildStage(R: THREE.Group) {
    put(R, new THREE.PlaneGeometry(60, 40), M("#0e0f14", 0.85), 0, 0, 4, { rx: -Math.PI / 2, cast: false });
    put(R, rbox(12, 1.0, 4.5, 0.03), MP("#15161c", 0.5), 0, 0.5, -2.25);
    put(R, rbox(12, 0.06, 0.1, 0.01), glow(canvas(8, 8, (g) => { g.fillStyle = "#3a7dff"; g.fillRect(0, 0, 8, 8); }), 3), 0, 1.0, 0.0, { cast: false });
    this.stageWall = new THREE.MeshStandardMaterial({ color: "#000", emissive: "#ffffff", emissiveIntensity: 1.1, emissiveMap: screenTex([["", 10]]) });
    put(R, new THREE.PlaneGeometry(11, 5.2), this.stageWall, 0, 3.6, -4.45, { cast: false });
    put(R, rbox(11.6, 5.8, 0.3, 0.03), M("#0a0a0e", 0.5), 0, 3.6, -4.65);
    // truss + spotlights + haze beams
    put(R, rbox(13, 0.3, 0.3, 0.02), M("#2a2a30", 0.5, 0.6), 0, 7.0, 1.0);
    const beamM = new THREE.MeshBasicMaterial({ color: "#d8e4ff", transparent: true, opacity: 0.022, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    for (const x of [-4, 0, 4]) { const s = new THREE.SpotLight("#fff2e0", 75, 22, 0.5, 0.6, 1.5); s.position.set(x, 7, 1.2); s.target.position.set(x * 0.4, 1, -2); s.castShadow = x === 0; if (s.castShadow) s.shadow.mapSize.set(2048, 2048); R.add(s, s.target); put(R, new THREE.ConeGeometry(1.3, 6.4, 20, 1, true), beamM, x * 0.7, 3.9, -0.4, { rz: x * 0.05, rx: -0.35, cast: false }); }
    R.add(new THREE.HemisphereLight("#4a5a8a", "#0a0a10", 0.45));
    for (const [x, c] of [[-9, "#ff4a7a"], [9, "#4a9dff"]] as const) { const p = new THREE.PointLight(c, 90, 26, 2); p.position.set(x, 4, 3); R.add(p); }
    // the scale (weigh-ins) and the press table (press conference)
    this.scale = grp(R, 0, 1.0, -1.6); put(this.scale, rbox(0.8, 0.12, 0.8, 0.03), MP("#c8ccd4", 0.3, { metalness: 0.6 }), 0, 0.06, 0); put(this.scale, cyl(0.05, 0.05, 1.1, 12), MP("#c8ccd4", 0.3, { metalness: 0.6 }), 0, 0.6, -0.35);
    put(this.scale, rbox(0.4, 0.25, 0.08, 0.02), glow(screenTex([["155.0", 260, "#7dff9a"]], 512, 256, ["#000", "#000"], "#000"), 1.4), 0, 1.2, -0.35, { cast: false });
    this.pressTable = grp(R, 0, 1.0, -1.4);
    put(this.pressTable, rbox(6.4, 0.08, 1.0, 0.02), M("#101014", 0.4), 0, 0.78, 0); put(this.pressTable, rbox(6.4, 0.74, 0.05, 0.01), MP("#ffffff", 0.4, { map: screenTex([["PRESS CONFERENCE", 120, "#ffffff"]], 2048, 256, ["#101018", "#2a0a12"]) }), 0, 0.4, 0.48);
    for (const x of [-2.2, 2.2]) { put(this.pressTable, cyl(0.012, 0.012, 0.3, 8), M("#111", 0.4), x, 0.95, 0.15, { rx: -0.3 }); put(this.pressTable, new THREE.SphereGeometry(0.035, 12, 10), M("#222", 0.4), x, 1.1, 0.2); }
    this.pressTable.visible = false;
    // crowd in front of the stage
    this.stageCrowd = grp(R); const spots: [number, number, number, number][] = []; const r = rng(21);
    for (let row = 0; row < 12; row++) for (let k = 0; k < 22; k++) { const x = -10 + k * 0.95 + (row % 2) * 0.4 + r() * 0.2, z = 2.2 + row * 0.9 + r() * 0.2; spots.push([x, 0, z, Math.PI + Math.atan2(x, z + 2) * 0.6]); }
    this.stageFlashes = crowd(this.stageCrowd, spots, 22, 0.22);
    // backstage (behind the LED wall): dark walls, road cases, a sign
    const BS = grp(R, 0, 0, -10);
    put(BS, new THREE.PlaneGeometry(14, 8), M("#1a1a20", 0.8), 0, 0, 0, { rx: -Math.PI / 2, cast: false });
    put(BS, new THREE.PlaneGeometry(14, 5), M("#24242c", 0.85), 0, 2.5, -3.5, { cast: false }); put(BS, new THREE.PlaneGeometry(8, 5), M("#24242c", 0.85), -5, 2.5, 0, { ry: Math.PI / 2, cast: false });
    for (const [x, z, w] of [[-3.6, -2.6, 1.2], [-2.3, -2.8, 0.9], [3.4, -2.6, 1.4], [4.2, -1.2, 1.0]] as const) { const c = put(BS, rbox(w, 0.9, 0.7, 0.03), MP("#141418", 0.5), x, 0.45, z); put(c, rbox(w + 0.02, 0.06, 0.72, 0.01), M("#8a8e96", 0.3, 0.8), 0, 0.3, 0); }
    this.backSign = new THREE.MeshStandardMaterial({ color: "#000", emissive: "#ffffff", emissiveIntensity: 1.3, emissiveMap: screenTex([["BACKSTAGE", 130, "#ffd23a"], ["WEIGH-INS · NEW YORK · NOV 2016", 46, "#ffffff", INTER]], 1024, 360) });
    put(BS, new THREE.PlaneGeometry(3.2, 1.12), this.backSign, 0.6, 2.7, -3.48, { cast: false });
    for (const x of [-3, 0, 3]) { const p = new THREE.PointLight("#ffd8a8", 18, 7, 2); p.position.set(x, 3.6, -1.5); BS.add(p); put(BS, cyl(0.15, 0.15, 0.08, 12), glow(canvas(8, 8, (g) => { g.fillStyle = "#ffe6c0"; g.fillRect(0, 0, 8, 8); }), 4), x, 4.2, -1.5, { cast: false }); }
    const bk = new THREE.SpotLight("#fff0e0", 60, 12, 0.7, 0.6, 1.5); bk.position.set(1, 4.5, 1.5); bk.target.position.set(0, 0.8, -1.2); bk.castShadow = true; bk.shadow.mapSize.set(1024, 1024); BS.add(bk, bk.target);
  }

  // ------------------------------------------------------------------ hotel corridor
  buildHotel(R: THREE.Group) {
    const carpet = rep(canvas(256, 256, (g) => { g.fillStyle = "#4a1a22"; g.fillRect(0, 0, 256, 256); g.strokeStyle = "#c8a24a"; g.lineWidth = 6; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(128, 128, 30 + k * 30, 0, 7); g.stroke(); } g.fillStyle = "#2a0e14"; g.fillRect(0, 0, 256, 18); g.fillRect(0, 238, 256, 18); }), 2, 12);
    put(R, new THREE.PlaneGeometry(3.4, 24), MP("#ffffff", 0.9, { map: carpet, clearcoat: 0 }), 0, 0, -9, { rx: -Math.PI / 2, cast: false });
    const wallT = rep(canvas(256, 256, (g) => { g.fillStyle = "#d8c8a8"; g.fillRect(0, 0, 256, 256); g.fillStyle = "rgba(120,90,50,0.15)"; for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 6, 256); g.fillStyle = "#6a4a2a"; g.fillRect(0, 200, 256, 56); }), 12, 1);
    for (const sx of [-1, 1]) put(R, new THREE.PlaneGeometry(24, 3.2), M("#ffffff", 0.85, 0, { map: wallT }), sx * 1.7, 1.6, -9, { ry: -sx * Math.PI / 2, cast: false });
    put(R, new THREE.PlaneGeometry(3.4, 24), M("#efe6d6", 0.9), 0, 3.2, -9, { rx: Math.PI / 2, cast: false });
    put(R, new THREE.PlaneGeometry(3.4, 3.2), M("#b8a888", 0.8), 0, 1.6, -21, { cast: false });
    const doorT = canvas(256, 512, (g) => { g.fillStyle = "#5a3a22"; g.fillRect(0, 0, 256, 512); g.strokeStyle = "#3a2412"; g.lineWidth = 10; g.strokeRect(30, 30, 196, 200); g.strokeRect(30, 270, 196, 210); });
    const lt = canvas(8, 8, (g) => { g.fillStyle = "#ffd89a"; g.fillRect(0, 0, 8, 8); });
    for (let k = 0; k < 6; k++) for (const sx of [-1, 1]) {
      const z = -2 - k * 3.4 + (sx > 0 ? 1.5 : 0);
      put(R, rbox(0.06, 2.2, 1.0, 0.01), MP("#ffffff", 0.5, { map: doorT }), sx * 1.67, 1.1, z);
      put(R, new THREE.SphereGeometry(0.035, 10, 8), M("#d8b84a", 0.3, 1), sx * 1.62, 1.05, z + 0.35);
      put(R, new THREE.SphereGeometry(0.12, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), glow(lt, 3.5), sx * 1.66, 2.2, z - 1.0, { rz: sx * Math.PI / 2, cast: false });
    }
    for (let k = 0; k < 6; k++) { const p = new THREE.PointLight("#ffcf8a", 9, 6, 2); p.position.set(0, 2.9, -1 - k * 3.6); R.add(p); put(R, cyl(0.2, 0.2, 0.04, 16), glow(lt, 3), 0, 3.18, -1 - k * 3.6, { cast: false }); }
    this.doorSign = new THREE.MeshStandardMaterial({ color: "#000", emissive: "#ffffff", emissiveIntensity: 1.0, emissiveMap: screenTex([["FIGHT WEEK", 120, "#ffd23a"], ["NEW YORK", 70, "#ffffff"]], 1024, 400) });
    put(R, new THREE.PlaneGeometry(2.2, 0.86), this.doorSign, 0, 2.3, -20.98, { cast: false });
    R.add(new THREE.HemisphereLight("#ffe0b0", "#2a1a10", 0.35));
    const k = new THREE.SpotLight("#ffe8c8", 40, 14, 0.8, 0.6, 1.5); k.position.set(0.5, 3.1, 1.0); k.target.position.set(0, 0.8, -4); k.castShadow = true; k.shadow.mapSize.set(1024, 1024); R.add(k, k.target);
  }

  // ------------------------------------------------------------------ loading dock + bus + police car
  buildDock(R: THREE.Group) {
    const conc = rep(canvas(256, 256, (g) => { g.fillStyle = "#6a6a6e"; g.fillRect(0, 0, 256, 256); const r = rng(4); for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,255,255"},${r() * 0.08})`; g.fillRect(r() * 256, r() * 256, 4, 4); } g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, 126, 256, 4); }), 10, 8);
    put(R, new THREE.PlaneGeometry(40, 30), MP("#ffffff", 0.7, { map: conc, clearcoat: 0.2 }), 0, 0, 0, { rx: -Math.PI / 2, cast: false });
    put(R, new THREE.PlaneGeometry(40, 9), M("#3a3a40", 0.85), 0, 4.5, -8, { cast: false });
    put(R, new THREE.PlaneGeometry(40, 30), M("#1a1a20", 0.9), 0, 9, 0, { rx: Math.PI / 2, cast: false });
    const doorT = rep(canvas(128, 128, (g) => { g.fillStyle = "#8a8e96"; g.fillRect(0, 0, 128, 128); g.fillStyle = "#6a6e76"; for (let y = 0; y < 128; y += 16) g.fillRect(0, y, 128, 5); }), 1, 6);
    for (const x of [-8, -3, 2, 7]) { put(R, new THREE.PlaneGeometry(4, 4.5), M("#ffffff", 0.6, 0.4, { map: doorT }), x, 2.25, -7.98, { cast: false }); put(R, new THREE.PlaneGeometry(4.2, 0.3), M("#ffc928", 0.6), x, 4.7, -7.97, { cast: false }); }
    const stripes = rep(canvas(128, 32, (g) => { g.fillStyle = "#ffc928"; g.fillRect(0, 0, 128, 32); g.fillStyle = "#111"; for (let x = -32; x < 160; x += 32) { g.beginPath(); g.moveTo(x, 32); g.lineTo(x + 16, 0); g.lineTo(x + 32, 0); g.lineTo(x + 16, 32); g.fill(); } }), 10, 1);
    put(R, new THREE.PlaneGeometry(40, 0.25), M("#ffffff", 0.6, 0, { map: stripes }), 0, 0.006, -6.5, { rx: -Math.PI / 2, cast: false });
    for (const x of [-12, -6, 6, 12]) put(R, cyl(0.15, 0.15, 1.1, 14), MP("#ffc928", 0.4), x, 0.55, -6.9);
    const sod = canvas(8, 8, (g) => { g.fillStyle = "#ffb060"; g.fillRect(0, 0, 8, 8); });
    for (const x of [-9, -3, 3, 9]) { put(R, rbox(1.2, 0.12, 0.4, 0.02), glow(sod, 4), x, 8.9, -1, { cast: false }); const p = new THREE.PointLight("#ffa850", 40, 16, 2); p.position.set(x, 8.2, -1); R.add(p); }
    R.add(new THREE.HemisphereLight("#6a7aa0", "#1a1410", 0.4));
    const key = new THREE.SpotLight("#ffd0a0", 220, 30, 0.8, 0.6, 1.5); key.position.set(-4, 8.5, 5); key.target.position.set(0, 1, -2); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); R.add(key, key.target);
    // the bus (long along x), windows on the +z side, one breakable window at x = 1.2
    this.bus = grp(R, 0, 0, -3.5);
    const busT = canvas(1024, 256, (g) => { g.fillStyle = "#f2f2f4"; g.fillRect(0, 0, 1024, 256); g.fillStyle = "#1d2a5a"; g.fillRect(0, 170, 1024, 40); g.fillStyle = "#d8262e"; g.fillRect(0, 214, 1024, 12); text(g, "FIGHTER TRANSPORT", 512, 190, 34, "#ffffff", INTER); });
    // built from panels so the cabin (and the fighters in it) shows through the window gaps
    const body = MP("#ffffff", 0.3, { map: busT }), white = MP("#f2f2f4", 0.3);
    put(this.bus, rbox(11, 1.4, 2.5, 0.2), body, 0, 1.15, 0); put(this.bus, rbox(11, 0.4, 2.5, 0.2), white, 0, 3.0, 0);
    for (const x of [-5.3, 5.3]) put(this.bus, rbox(0.4, 1.0, 2.5, 0.05), white, x, 2.35, 0);
    const winX = [-4.2, -2.75, -1.3, 0.15, 1.6, 3.05, 4.5].map((x) => x - 0.4);
    for (let k = 0; k <= winX.length; k++) { const x = k === 0 ? winX[0] - 0.72 : k === winX.length ? winX[winX.length - 1] + 0.72 : (winX[k - 1] + winX[k]) / 2; if (Math.abs(x) < 5.1) put(this.bus, rbox(0.18, 1.0, 2.5, 0.03), white, x, 2.35, 0); }
    put(this.bus, new THREE.PlaneGeometry(10.6, 1.1), M("#141620", 0.7), 0, 2.35, -1.2, { cast: false });   // far cabin wall
    put(this.bus, new THREE.PlaneGeometry(10.6, 2.3), M("#2a2c34", 0.8), 0, 0.95, 0, { rx: -Math.PI / 2, cast: false });  // cabin floor
    for (const x of winX) { put(this.bus, rbox(0.9, 0.5, 0.5, 0.06), MP("#2a3a6a", 0.6), x, 1.3, -0.1); put(this.bus, rbox(0.9, 1.0, 0.12, 0.05), MP("#2a3a6a", 0.6), x, 1.95, -0.42); }
    const winM = MP("#1a2230", 0.05, { metalness: 0.2, transparent: true, opacity: 0.32, clearcoat: 1, depthWrite: false });
    this.busWin = winX;
    for (const x of winX) { if (Math.abs(x - BUS_WIN) < 0.05) continue; put(this.bus, new THREE.PlaneGeometry(1.25, 0.95), winM, x, 2.35, 1.24, { cast: false }); }
    this.glassOk = put(this.bus, new THREE.PlaneGeometry(1.25, 0.95), winM, BUS_WIN, 2.35, 1.242, { cast: false });
    const crackT = canvas(256, 192, (g) => { g.clearRect(0, 0, 256, 192); g.strokeStyle = "rgba(240,248,255,0.95)"; g.lineWidth = 3; const r = rng(8); for (let k = 0; k < 18; k++) { g.beginPath(); g.moveTo(128, 96); let x = 128, y = 96; const a = k / 18 * Math.PI * 2; for (let s = 0; s < 6; s++) { x += Math.cos(a + (r() - 0.5) * 0.6) * 24; y += Math.sin(a + (r() - 0.5) * 0.6) * 24; g.lineTo(x, y); } g.stroke(); } g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000"; g.beginPath(); g.ellipse(128, 96, 50, 40, 0.3, 0, 7); g.fill(); });
    this.glassBroken = put(this.bus, new THREE.PlaneGeometry(1.25, 0.95), new THREE.MeshStandardMaterial({ map: crackT, transparent: true, roughness: 0.1, depthWrite: false }), BUS_WIN, 2.35, 1.243, { cast: false }); this.glassBroken.visible = false;
    const cab = new THREE.PointLight("#bcd0ff", 6, 4, 2); cab.position.set(0, 2.8, 0); this.bus.add(cab);
    for (const x of [-3.8, 3.6]) for (const sz of [-1, 1]) put(this.bus, cyl(0.5, 0.5, 0.4, 24), M("#111", 0.6), x, 0.5, sz * 1.15, { rx: Math.PI / 2 });
    const hl = canvas(8, 8, (g) => { g.fillStyle = "#fff8e0"; g.fillRect(0, 0, 8, 8); });
    for (const z of [-0.8, 0.8]) put(this.bus, cyl(0.16, 0.16, 0.06, 16), glow(hl, 5), 5.52, 0.95, z, { rz: Math.PI / 2, cast: false });
    const shardM = MP("#dff0ff", 0.05, { transparent: true, opacity: 0.8 });
    for (let k = 0; k < 26; k++) { const m = put(R, new THREE.TetrahedronGeometry(0.05 + (k % 5) * 0.012), shardM, 0, -5, 0, { cast: false }); this.shards.push(m); }
    // the hand truck ("dolly")
    this.dolly = grp(R, 6, 0, 2);
    const steel = M("#9aa0a8", 0.35, 0.9);
    for (const sx of [-1, 1]) put(this.dolly, cyl(0.02, 0.02, 1.2, 8), steel, sx * 0.2, 0.6, 0);
    for (let k = 0; k < 3; k++) put(this.dolly, cyl(0.015, 0.015, 0.4, 8), steel, 0, 0.3 + k * 0.4, 0, { rz: Math.PI / 2 });
    put(this.dolly, rbox(0.45, 0.02, 0.25, 0.005), steel, 0, 0.02, 0.12); for (const sx of [-1, 1]) put(this.dolly, cyl(0.1, 0.1, 0.05, 16), M("#111", 0.6), sx * 0.26, 0.1, -0.05, { rz: Math.PI / 2 });
    // police car with a light bar
    this.police = grp(R, -9, 0, 3, 0.4);
    const pT = canvas(512, 128, (g) => { g.fillStyle = "#f4f4f6"; g.fillRect(0, 0, 512, 128); g.fillStyle = "#1d3a8a"; g.fillRect(0, 70, 512, 30); text(g, "POLICE", 256, 86, 34, "#ffffff", INTER); });
    put(this.police, rbox(4.4, 0.8, 1.9, 0.2), MP("#ffffff", 0.25, { map: pT }), 0, 0.75, 0); put(this.police, rbox(2.4, 0.6, 1.7, 0.2), MP("#1a2230", 0.1, { clearcoat: 1 }), -0.2, 1.4, 0);
    for (const x of [-1.4, 1.4]) for (const sz of [-1, 1]) put(this.police, cyl(0.35, 0.35, 0.3, 20), M("#111", 0.6), x, 0.35, sz * 0.9, { rx: Math.PI / 2 });
    for (const [x, c] of [[-0.6, "#ff2a3a"], [0.2, "#2a6aff"]] as const) { const m = new THREE.MeshStandardMaterial({ color: "#000", emissive: c, emissiveIntensity: 4 }); this.policeLights.push(m); put(this.police, rbox(0.7, 0.14, 0.4, 0.04), m, x, 1.78, 0, { cast: false }); }
    this.police.visible = false;
    // the bout board on the wall (cancelled fights)
    this.board = new THREE.MeshStandardMaterial({ color: "#000", emissive: "#ffffff", emissiveIntensity: 1.1, emissiveMap: screenTex([["", 10]]) });
    put(R, rbox(5.2, 3.0, 0.1, 0.03), M("#0a0a0e", 0.5), -9, 4.6, -7.9); put(R, new THREE.PlaneGeometry(5.0, 2.8), this.board, -9, 4.6, -7.84, { cast: false });
  }

  // ------------------------------------------------------------------ TV studio (interview + news desk)
  buildStudio(R: THREE.Group) {
    put(R, new THREE.PlaneGeometry(30, 20), MP("#1a1c24", 0.25, { clearcoat: 0.8 }), 0, 0, 0, { rx: -Math.PI / 2, cast: false });
    put(R, new THREE.CylinderGeometry(9, 9, 6, 48, 1, true, -Math.PI / 2, Math.PI), M("#141824", 0.7, 0, { side: THREE.BackSide }), 0, 3, 0, { cast: false });
    const strip = canvas(8, 8, (g) => { g.fillStyle = "#3a8aff"; g.fillRect(0, 0, 8, 8); });
    for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + (k + 0.5) / 9 * Math.PI; put(R, rbox(0.06, 5, 0.06, 0.01), glow(strip, 3), Math.sin(a) * 8.9, 3, -Math.cos(a) * 8.9, { cast: false }); }
    this.tv = new THREE.MeshStandardMaterial({ color: "#000", emissive: "#ffffff", emissiveIntensity: 1.15, emissiveMap: screenTex([["", 10]]) });
    put(R, rbox(6.4, 3.7, 0.12, 0.04), M("#0a0a0e", 0.4), 0, 2.9, -6.0); put(R, new THREE.PlaneGeometry(6.2, 3.5), this.tv, 0, 2.9, -5.93, { cast: false });
    // interview set: two chairs + a low table
    this.interview = grp(R, 0, 0, -2.2);
    for (const sx of [-1, 1]) { const c = grp(this.interview, sx * 1.1, 0, 0, -sx * 0.6); put(c, rbox(0.7, 0.12, 0.65, 0.05), MP("#2a3a5a", 0.6), 0, 0.5, 0); put(c, rbox(0.7, 0.7, 0.12, 0.05), MP("#2a3a5a", 0.6), 0, 0.85, -0.3); put(c, cyl(0.04, 0.04, 0.45, 8), M("#888", 0.3, 0.9), 0, 0.22, 0); }
    put(this.interview, cyl(0.4, 0.4, 0.05, 24), MP("#0e0e12", 0.2), 0, 0.45, 0.3); put(this.interview, cyl(0.03, 0.03, 0.42, 8), M("#888", 0.3, 0.9), 0, 0.22, 0.3);
    // news desk
    this.newsDesk = grp(R, 0, 0, -2.6);
    put(this.newsDesk, rbox(3.2, 1.0, 0.9, 0.08), MP("#0e1426", 0.25, { clearcoat: 1 }), 0, 0.5, 0); put(this.newsDesk, rbox(3.3, 0.06, 1.0, 0.02), MP("#c8ccd4", 0.3, { metalness: 0.7 }), 0, 1.02, 0);
    put(this.newsDesk, rbox(3.0, 0.12, 0.02, 0.01), glow(strip, 2.5), 0, 0.7, 0.46, { cast: false }); this.newsDesk.visible = false;
    // studio camera on a tripod
    const cam = grp(R, 3.6, 0, 1.6, -0.9); put(cam, rbox(0.4, 0.35, 0.7, 0.04), M("#1a1a1e", 0.4), 0, 1.5, 0); put(cam, cyl(0.1, 0.12, 0.3, 16), M("#111", 0.3), 0, 1.5, 0.45, { rx: Math.PI / 2 }); for (let k = 0; k < 3; k++) put(cam, cyl(0.02, 0.02, 1.5, 6), M("#333", 0.4), Math.sin(k * 2.1) * 0.3, 0.7, Math.cos(k * 2.1) * 0.3, { rz: Math.sin(k * 2.1) * 0.2, rx: -Math.cos(k * 2.1) * 0.2 });
    put(cam, rbox(0.14, 0.08, 0.02, 0.01), glow(canvas(8, 8, (g) => { g.fillStyle = "#ff2a2a"; g.fillRect(0, 0, 8, 8); }), 5), 0, 1.72, 0.36, { cast: false });
    R.add(new THREE.HemisphereLight("#5a6a9a", "#0a0a12", 0.5));
    const key = new THREE.SpotLight("#fff2e6", 120, 18, 0.7, 0.5, 1.5); key.position.set(2.5, 5.5, 4); key.target.position.set(0, 1, -2.4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); R.add(key, key.target);
    const p = new THREE.PointLight("#ff6a8a", 30, 12, 2); p.position.set(-5, 3, -3); R.add(p);
  }

  // ------------------------------------------------------------------ city street at night (Brooklyn / Las Vegas)
  buildStreet(R: THREE.Group) {
    put(R, new THREE.PlaneGeometry(80, 40), MP("#15161c", 0.18, { clearcoat: 1, clearcoatRoughness: 0.1 }), 0, 0, 0, { rx: -Math.PI / 2, cast: false });
    put(R, new THREE.PlaneGeometry(80, 6), M("#2a2a30", 0.7), 0, 0.12, -6, { rx: -Math.PI / 2, cast: false });
    put(R, rbox(80, 0.12, 0.3, 0.02), M("#5a5a60", 0.6), 0, 0.06, -3.0);
    const r = rng(31);
    const winT = (c: string) => canvas(256, 512, (g) => { g.fillStyle = "#0c0e16"; g.fillRect(0, 0, 256, 512); for (let y = 10; y < 512; y += 28) for (let x = 10; x < 256; x += 30) { if (r() < 0.45) { g.fillStyle = r() < 0.7 ? c : "#9ac8ff"; g.fillRect(x, y, 18, 16); } } });
    const wt = [winT("#ffd890"), winT("#ffe8c0")];
    let x = -40;
    while (x < 40) { const w = 5 + r() * 6, h = 10 + r() * 26; const m = M("#ffffff", 0.8, 0, { map: wt[Math.floor(r() * 2)], emissive: "#ffffff", emissiveMap: wt[Math.floor(r() * 2)], emissiveIntensity: 0.9 }); put(R, new THREE.BoxGeometry(w, h, 6), m, x + w / 2, h / 2, -13 - r() * 4, { cast: false }); x += w + 0.5; }
    const neon: [string, string, number, number, number][] = [["FIGHT", "#ff2a6a", -9, 6, -9.9], ["OPEN", "#2affd0", 5, 3.5, -9.9], ["HOTEL", "#ffd23a", 13, 9, -10.9], ["CASINO", "#c42aff", -16, 8, -12.9], ["24H", "#2a9dff", 18, 4, -9.9]];
    for (const [s, c, nx, ny, nz] of neon) { put(R, new THREE.PlaneGeometry(3.2, 1.0), new THREE.MeshStandardMaterial({ color: "#000", emissive: "#ffffff", emissiveMap: neonTex(s, c), emissiveIntensity: 2.6, transparent: true }), nx, ny, nz, { cast: false }); const p = new THREE.PointLight(c, 25, 10, 2); p.position.set(nx, ny, nz + 1.5); R.add(p); }
    for (const sx of [-12, -4, 4, 12]) { const l = grp(R, sx, 0, -3.6); put(l, cyl(0.06, 0.08, 5, 10), M("#222", 0.5, 0.6), 0, 2.5, 0); put(l, rbox(0.8, 0.12, 0.3, 0.03), glow(canvas(8, 8, (g) => { g.fillStyle = "#ffd8a0"; g.fillRect(0, 0, 8, 8); }), 4), 0.3, 5.0, 0, { cast: false }); const p = new THREE.PointLight("#ffc890", 30, 10, 2); p.position.set(sx + 0.3, 4.8, -3.6); R.add(p); }
    // the billboard on a frame
    this.billboard = new THREE.MeshStandardMaterial({ color: "#000", emissive: "#ffffff", emissiveIntensity: 1.3, emissiveMap: screenTex([["", 10]]) });
    put(R, rbox(10.4, 5.4, 0.3, 0.05), M("#111", 0.5), 0, 8.5, -9.2); put(R, new THREE.PlaneGeometry(10, 5), this.billboard, 0, 8.5, -9.0, { cast: false });
    for (const sx of [-1, 1]) put(R, rbox(0.3, 6, 0.3, 0.02), M("#222", 0.5, 0.6), sx * 3.5, 3, -9.3);
    // the arena entrance sign (for Brooklyn) + fight-card board
    this.cardBoard = new THREE.MeshStandardMaterial({ color: "#000", emissive: "#ffffff", emissiveIntensity: 1.2, emissiveMap: screenTex([["", 10]]) });
    put(R, rbox(3.2, 4.4, 0.2, 0.05), M("#111", 0.5), 8.5, 2.6, -4.0); put(R, new THREE.PlaneGeometry(3.0, 4.2), this.cardBoard, 8.5, 2.6, -3.88, { cast: false });
    // a small jet that crosses the sky
    this.plane = grp(R, -40, 22, -30);
    put(this.plane, cyl(0.5, 0.4, 7, 14), MP("#e8ecf2", 0.3), 0, 0, 0, { rz: Math.PI / 2 }); put(this.plane, rbox(1.4, 0.12, 8, 0.05), MP("#e8ecf2", 0.3), 0.2, 0, 0); put(this.plane, rbox(1.0, 1.6, 0.12, 0.04), MP("#e8ecf2", 0.3), -3.2, 0.9, 0);
    for (const [z, c] of [[-4, "#ff2a2a"], [4, "#2aff6a"]] as const) put(this.plane, new THREE.SphereGeometry(0.15, 8, 6), new THREE.MeshStandardMaterial({ color: "#000", emissive: c, emissiveIntensity: 6 }), 0.2, 0, z, { cast: false });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(70, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }", fragmentShader: "varying vec3 vP; void main(){ float h = clamp(vP.y, 0.0, 1.0); vec3 c = mix(vec3(0.32, 0.12, 0.30), vec3(0.03, 0.03, 0.10), smoothstep(0.0, 0.5, h)); gl_FragColor = vec4(c, 1.0); }" }));
    sky.name = "sky"; R.add(sky);
    R.add(new THREE.HemisphereLight("#4a3a7a", "#0a0a10", 0.5));
    const moon = new THREE.DirectionalLight("#9ab8ff", 1.2); moon.position.set(-10, 20, 10); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); Object.assign(moon.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 60 }); R.add(moon, moon.target);
  }

  // ------------------------------------------------------------------ the giant phones (online messages)
  buildPhone(R: THREE.Group) {
    put(R, new THREE.PlaneGeometry(40, 40), MP("#0c0c14", 0.2, { clearcoat: 1 }), 0, 0, 0, { rx: -Math.PI / 2, cast: false });
    const bgT = canvas(512, 512, (g) => { const gr = g.createRadialGradient(256, 256, 20, 256, 256, 300); gr.addColorStop(0, "#2a1a4a"); gr.addColorStop(1, "#06060c"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512); });
    put(R, new THREE.PlaneGeometry(30, 16), new THREE.MeshBasicMaterial({ map: bgT }), 0, 6, -8, { cast: false });
    const mk = (x: number, ry: number) => {
      const g = grp(R, x, 0, -2.5, ry);
      put(g, rbox(2.3, 4.4, 0.2, 0.25), MP("#111116", 0.2, { metalness: 0.5 }), 0, 2.6, 0);
      const m = new THREE.MeshStandardMaterial({ color: "#000", emissive: "#ffffff", emissiveIntensity: 1.1, emissiveMap: screenTex([["", 10]], 512, 1024) });
      put(g, new THREE.PlaneGeometry(2.1, 4.1), m, 0, 2.6, 0.105, { cast: false }); return m;
    };
    this.phoneL = mk(-1.9, 0.25); this.phoneR = mk(1.9, -0.25);
    R.add(new THREE.HemisphereLight("#6a5aaa", "#0a0a10", 0.5));
    const key = new THREE.SpotLight("#ffffff", 90, 16, 0.8, 0.6, 1.5); key.position.set(0, 6, 5); key.target.position.set(0, 1, 0); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); R.add(key, key.target);
    for (const [x, c] of [[-6, "#4a8aff"], [6, "#ff4a6a"]] as const) { const p = new THREE.PointLight(c, 40, 14, 2); p.position.set(x, 3, 0); R.add(p); }
  }
}

/** a chat-style phone screen: header + bubbles (left / right) with icons instead of quoted words */
export const chatTex = (header: string, bubbles: ("L" | "R" | "Lheart" | "Rheart" | "Lthumb" | "Rthumb" | "Lmad" | "Rmad")[], accent = "#3a8aff") => {
  const key = "chat|" + header + bubbles.join(",") + accent;
  if (texCache.has(key)) return texCache.get(key)!;
  const t = canvas(512, 1024, (g) => {
    g.fillStyle = "#0e1018"; g.fillRect(0, 0, 512, 1024); g.fillStyle = accent; g.fillRect(0, 0, 512, 120); text(g, header, 256, 66, 58, "#ffffff");
    let y = 170;
    for (const b of bubbles) {
      const left = b[0] === "L", w = 300, h = 120, x = left ? 30 : 512 - 30 - w;
      g.fillStyle = left ? "#2a2e3a" : accent; rr(g, x, y, w, h, 34); g.fill();
      const icon = b.slice(1), cx = x + w / 2, cy = y + h / 2;
      if (icon === "heart") { g.fillStyle = "#ff4a6a"; g.beginPath(); g.moveTo(cx, cy + 34); g.bezierCurveTo(cx - 70, cy - 10, cx - 30, cy - 60, cx, cy - 22); g.bezierCurveTo(cx + 30, cy - 60, cx + 70, cy - 10, cx, cy + 34); g.fill(); }
      else if (icon === "thumb") { g.fillStyle = "#ffd23a"; rr(g, cx - 34, cy - 10, 50, 50, 10); g.fill(); rr(g, cx - 6, cy - 48, 26, 50, 12); g.fill(); }
      else if (icon === "mad") { g.fillStyle = "#ff3a2a"; g.beginPath(); g.arc(cx, cy, 44, 0, 7); g.fill(); g.strokeStyle = "#1a0a0a"; g.lineWidth = 8; g.beginPath(); g.moveTo(cx - 28, cy - 22); g.lineTo(cx - 8, cy - 12); g.moveTo(cx + 28, cy - 22); g.lineTo(cx + 8, cy - 12); g.moveTo(cx - 20, cy + 22); g.quadraticCurveTo(cx, cy + 8, cx + 20, cy + 22); g.stroke(); }
      else { g.fillStyle = "rgba(255,255,255,0.75)"; g.fillRect(x + 30, y + 34, w - 60, 16); g.fillRect(x + 30, y + 70, w - 120, 16); }
      y += h + 26;
    }
  });
  texCache.set(key, t); return t;
};
