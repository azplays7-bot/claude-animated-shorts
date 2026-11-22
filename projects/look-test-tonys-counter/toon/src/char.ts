// Look test: 3D cartoon characters with costume detail (cap + logo, hair tufts, apron, name tag, buttons, pocket pen,
// backpack, shoes), thin ink outlines, a painted face that blinks and talks, and tube arms posed per frame.
import * as THREE from "three";
import { M, MP, canvas, put, grp, ink, rr, text, INTER, cyl, rbox } from "./kit";

export type Mouth = "smile" | "talk" | "grin" | "o";
const faceCache = new Map<string, THREE.Texture>();
const faceTex = (blink: number, mouth: Mouth, brow: number, skin: string) => {
  const key = `${blink.toFixed(1)}|${mouth}|${brow.toFixed(1)}|${skin}`;
  if (faceCache.has(key)) return faceCache.get(key)!;
  // sphere UV: +z (the face) sits at u = 0.25; 1024x512 is isotropic around the equator
  const t = canvas(1024, 512, (g) => {
    g.clearRect(0, 0, 1024, 512);
    const cx = 256, ey = 292, dx = 46;
    g.lineCap = "round"; g.lineJoin = "round";
    // cheeks
    g.fillStyle = "rgba(240,120,110,0.28)";
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * 80, 340, 26, 15, 0, 0, 7); g.fill(); }
    // eyes
    for (const s of [-1, 1]) {
      const x = cx + s * dx;
      if (blink > 0.5) { g.strokeStyle = "#141018"; g.lineWidth = 9; g.beginPath(); g.arc(x, ey - 4, 15, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); continue; }
      g.fillStyle = "#141018"; g.beginPath(); g.ellipse(x, ey, 14, 21 * (1 - 0.6 * blink), 0, 0, 7); g.fill();
      g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(x + 4, ey - 8, 5, 6, 0, 0, 7); g.fill();
    }
    // brows
    g.strokeStyle = "#2a1a12"; g.lineWidth = 10;
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * (dx - 20), ey - 40 - brow * 6 + (s < 0 ? 0 : 0)); g.quadraticCurveTo(cx + s * dx, ey - 52 - brow * 8, cx + s * (dx + 22), ey - 42 - brow * 4); g.stroke(); }
    // mouth
    g.strokeStyle = "#141018"; g.lineWidth = 9; const my = 362;
    if (mouth === "smile") { g.beginPath(); g.arc(cx, my - 22, 30, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke(); }
    else {
      const open = mouth === "grin" ? [44, 26] : mouth === "talk" ? [26, 20] : [15, 19];
      g.fillStyle = "#3b1018"; g.beginPath();
      if (mouth === "o") g.ellipse(cx, my, open[0], open[1], 0, 0, 7); else { g.moveTo(cx - open[0], my - 6); g.quadraticCurveTo(cx, my + open[1] * 2, cx + open[0], my - 6); g.closePath(); }
      g.fill(); g.stroke();
      g.fillStyle = "#e9606b"; g.beginPath(); g.ellipse(cx, my + open[1] * 0.55, open[0] * 0.45, open[1] * 0.35, 0, 0, 7); g.fill();
      if (mouth === "grin") { g.fillStyle = "#ffffff"; g.fillRect(cx - 30, my - 4, 60, 9); }
    }
    // nose
    g.fillStyle = skin; g.strokeStyle = "rgba(120,60,40,0.55)"; g.lineWidth = 5; g.beginPath(); g.arc(cx + 2, 322, 9, 0.1 * Math.PI, 0.95 * Math.PI); g.stroke();
  });
  faceCache.set(key, t); return t;
};

export type CharSpec = {
  skin: string; shirt: string; cap: string; capLogo: string; hair: string;
  bodyR: number; bodyLen: number; headR: number; legLen: number;
  apron?: string; tag?: string; backpack?: string; shorts?: string; pen?: boolean;
};
export type Pose = { blink: number; mouth: Mouth; brow: number; headYaw: number; headPitch: number; armL: THREE.Vector3[]; armR: THREE.Vector3[]; bob: number };

export class Toon {
  root: THREE.Group; head: THREE.Group; body: THREE.Group;
  face: THREE.Mesh; faceMat: THREE.MeshStandardMaterial;
  arms: THREE.Mesh[] = []; hands: THREE.Mesh[] = [];
  shoulderY: number; spec: CharSpec;
  constructor(parent: THREE.Object3D, s: CharSpec, x: number, z: number, ry: number) {
    this.spec = s;
    this.root = grp(parent, x, 0, z, ry);
    this.body = grp(this.root);
    const bodyCy = s.legLen + s.bodyR + s.bodyLen / 2;
    const shirt = MP(s.shirt, 0.55, { clearcoat: 0.1, sheen: 0.6, sheenColor: new THREE.Color("#ffffff") });
    const torso = ink(put(this.body, new THREE.CapsuleGeometry(s.bodyR, s.bodyLen, 8, 24), shirt, 0, bodyCy, 0), 0.012);
    void torso;
    // legs + shoes
    const legM = M("#17141c", 0.5);
    for (const sx of [-1, 1]) {
      put(this.body, cyl(0.018, 0.018, s.legLen + 0.05, 10), legM, sx * s.bodyR * 0.42, s.legLen / 2, 0);
      const shoe = put(this.body, new THREE.SphereGeometry(0.06, 20, 12), M("#2a2630", 0.45), sx * s.bodyR * 0.45, 0.03, 0.035, { s: [0.75, 0.5, 1.25] });
      ink(shoe, 0.01);
      put(this.body, new THREE.SphereGeometry(0.06, 20, 8, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), M("#f4f1ea", 0.6), sx * s.bodyR * 0.45, 0.034, 0.035, { s: [0.78, 0.5, 1.28] });
    }
    if (s.shorts) put(this.body, cyl(s.bodyR * 1.01, s.bodyR * 1.03, s.bodyR * 0.75, 28, true), M(s.shorts, 0.7), 0, s.legLen + s.bodyR * 0.45, 0, { recv: true });
    // buttons down the front
    const btnM = MP("#1e6b3c", 0.25);
    for (let k = 0; k < 3; k++) {
      const y = bodyCy + s.bodyLen * 0.35 - k * s.bodyLen * 0.38;
      const zf = Math.sqrt(Math.max(0, s.bodyR * s.bodyR)) + 0.002;
      put(this.body, new THREE.SphereGeometry(0.014, 12, 8), s.apron ? MP("#e8e4da", 0.3) : btnM, 0, y, zf, { s: [1, 1, 0.5] });
    }
    // apron: a front shell + neck strap + pocket
    if (s.apron) {
      const ap = M(s.apron, 0.75);
      put(this.body, new THREE.CylinderGeometry(s.bodyR + 0.012, s.bodyR + 0.02, s.bodyLen * 0.95, 32, 1, true, -Math.PI * 0.36, Math.PI * 0.72), ap, 0, bodyCy - s.bodyLen * 0.18, 0, { recv: true });
      const pocket = put(this.body, rbox(0.12, 0.07, 0.012, 0.004), M("#16683a", 0.75), 0.0, bodyCy - s.bodyLen * 0.3, s.bodyR + 0.026);
      void pocket;
      const strap = new THREE.TorusGeometry(s.bodyR * 0.62, 0.008, 6, 24, Math.PI);
      put(this.body, strap, ap, 0, bodyCy + s.bodyLen * 0.36, s.bodyR * 0.55, { rx: -0.35 });
    }
    if (s.tag) {
      const tagT = canvas(256, 96, (g) => { g.fillStyle = "#f6f3ea"; rr(g, 4, 4, 248, 88, 14); g.fill(); g.fillStyle = "#d8262e"; g.fillRect(4, 4, 248, 24); text(g, s.tag!, 128, 60, 44, "#1b1b22", INTER); });
      put(this.body, rbox(0.1, 0.038, 0.006, 0.003), M("#ffffff", 0.4, 0, { map: tagT }), -s.bodyR * 0.48, bodyCy + s.bodyLen * 0.38, s.bodyR * 0.88 + 0.006, { ry: -0.5 });
    }
    if (s.pen) {
      put(this.body, cyl(0.007, 0.007, 0.09, 8), M("#1b5fd8", 0.3), s.bodyR * 0.5, bodyCy + s.bodyLen * 0.42, s.bodyR * 0.82, { rz: 0.1 });
      put(this.body, cyl(0.008, 0.008, 0.02, 8), STEELISH, s.bodyR * 0.505, bodyCy + s.bodyLen * 0.42 + 0.05, s.bodyR * 0.82);
    }
    if (s.backpack) {
      const bp = ink(put(this.body, rbox(s.bodyR * 1.3, s.bodyLen * 1.15 + s.bodyR * 0.6, 0.13, 0.04), MP(s.backpack, 0.6), 0, bodyCy + 0.03, -s.bodyR - 0.05), 0.006);
      put(bp, rbox(s.bodyR * 0.95, s.bodyLen * 0.5, 0.05, 0.02), MP("#2b3f7a", 0.6), 0, -s.bodyLen * 0.2, -0.075);
      put(bp, cyl(0.006, 0.006, s.bodyR * 0.9, 6), M("#d7d7d7", 0.3, 1), 0, -s.bodyLen * 0.02, -0.1, { rz: Math.PI / 2 });
      for (const sx of [-1, 1]) put(this.body, new THREE.TorusGeometry(s.bodyR * 0.55, 0.012, 6, 16, Math.PI), MP(s.backpack, 0.6), sx * s.bodyR * 0.5, bodyCy + s.bodyLen * 0.25, 0, { ry: Math.PI / 2, rz: Math.PI / 2 });
    }
    // head
    this.shoulderY = bodyCy + s.bodyLen * 0.38;
    this.head = grp(this.body, 0, bodyCy + s.bodyLen / 2 + s.bodyR * 0.55 + s.headR * 0.78, 0);
    const skin = MP(s.skin, 0.5, { clearcoat: 0.2, sheen: 0.4, emissive: new THREE.Color(s.skin), emissiveIntensity: 0.12 });
    ink(put(this.head, new THREE.SphereGeometry(s.headR, 48, 32), skin, 0, 0, 0), 0.013);
    this.faceMat = new THREE.MeshStandardMaterial({ map: faceTex(0, "smile", 0, s.skin), transparent: false, alphaTest: 0.5, roughness: 0.55 });
    this.face = put(this.head, new THREE.SphereGeometry(s.headR * 1.004, 48, 32), this.faceMat, 0, 0, 0, { cast: false });
    // ears
    for (const sx of [-1, 1]) ink(put(this.head, new THREE.SphereGeometry(s.headR * 0.16, 16, 12), skin, sx * s.headR * 0.98, -s.headR * 0.08, 0, { s: [0.55, 1, 0.8] }), 0.006);
    // hair tufts under the cap
    const hairM = M(s.hair, 0.8);
    for (const [a, y] of [[-1.25, 0.05], [-1.55, 0.02], [1.25, 0.05], [1.55, 0.02], [2.4, 0.08], [3.14, 0.1], [-2.4, 0.08]] as const) {
      const x = Math.sin(a) * s.headR * 0.95, z = Math.cos(a) * s.headR * 0.95;
      put(this.head, new THREE.SphereGeometry(s.headR * 0.2, 12, 8), hairM, x, s.headR * (0.2 + y), z, { s: [1, 0.75, 1], ry: a });
    }
    // cap: crown + band + brim + logo button
    const capM = MP(s.cap, 0.45, { clearcoat: 0.3 });
    ink(put(this.head, new THREE.SphereGeometry(s.headR * 1.05, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.44), capM, 0, s.headR * 0.05, 0), 0.012);
    put(this.head, new THREE.SphereGeometry(s.headR * 0.09, 12, 8), capM, 0, s.headR * 1.1, 0, { s: [1, 0.45, 1] });
    const brim = ink(put(this.head, new THREE.CylinderGeometry(s.headR * 0.78, s.headR * 0.78, 0.02, 40), capM, 0, s.headR * 0.22, s.headR * 0.72, { rx: 0.16, s: [1, 1, 0.85] }), 0.006);
    void brim;
    const logoT = canvas(128, 128, (g) => { g.fillStyle = "#ffffff"; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.fillStyle = s.capLogo; g.beginPath(); g.arc(64, 64, 50, 0, 7); g.fill(); text(g, s.tag ? "T" : "M", 64, 70, 70, "#ffffff"); });
    put(this.head, cyl(s.headR * 0.22, s.headR * 0.22, 0.01, 24), M("#ffffff", 0.5, 0, { map: logoT }), 0, s.headR * 0.62, s.headR * 0.82, { rx: Math.PI / 2 - 0.75 });
    // arms (tubes, rebuilt per pose) + hands
    const armM = M("#17141c", 0.5);
    for (let k = 0; k < 2; k++) {
      this.arms.push(put(this.root, new THREE.BufferGeometry(), armM, 0, 0, 0));
      this.hands.push(ink(put(this.root, new THREE.SphereGeometry(0.042, 16, 12), skin, 0, 0, 0), 0.007));
    }
  }
  pose(p: Pose) {
    const s = this.spec;
    this.body.position.y = p.bob;
    this.head.rotation.set(p.headPitch, p.headYaw, 0);
    this.faceMat.map = faceTex(p.blink, p.mouth, p.brow, s.skin);
    [p.armL, p.armR].forEach((pts, k) => {
      const sx = k ? 1 : -1;
      const sh = new THREE.Vector3(sx * s.bodyR * 0.92, this.shoulderY + p.bob, 0);
      const all = [sh, ...pts.map((v) => v.clone().add(new THREE.Vector3(0, p.bob, 0)))];
      const curve = new THREE.CatmullRomCurve3(all);
      this.arms[k].geometry.dispose();
      this.arms[k].geometry = new THREE.TubeGeometry(curve, 16, 0.021, 8, false);
      this.hands[k].position.copy(all[all.length - 1]);
    });
  }
}
const STEELISH = M("#d0d4da", 0.3, 1);
