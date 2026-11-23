// Look test: 3D cartoon characters with costume detail (cap + logo, hair tufts, apron, name tag, buttons, pocket pen,
// backpack, shoes), thin ink outlines, a painted face that blinks and talks, and tube arms posed per frame.
import * as THREE from "three";
import { M, MP, canvas, put, grp, ink, rr, text, INTER, cyl, rbox } from "./kit";

export type Mouth = "smile" | "talk" | "grin" | "o" | "laugh" | "dazed" | "flat";
const faceCache = new Map<string, THREE.Texture>();
const faceTex = (blink: number, mouth: Mouth, brow: number, skin: string, stache = "") => {
  const key = `${blink.toFixed(1)}|${mouth}|${brow.toFixed(1)}|${skin}|${stache}`;
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
      if (mouth === "laugh") { g.strokeStyle = "#141018"; g.lineWidth = 9; g.beginPath(); g.arc(x, ey + 8, 16, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke(); continue; }
      if (mouth === "dazed") { g.strokeStyle = "#141018"; g.lineWidth = 5; g.beginPath(); for (let a = 0; a < 14; a += 0.2) { const r = 1.6 * a; g.lineTo(x + Math.cos(a * (s > 0 ? 1 : -1)) * r, ey + Math.sin(a) * r); } g.stroke(); continue; }
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
    else if (mouth === "flat") { g.beginPath(); g.moveTo(cx - 22, my); g.lineTo(cx + 22, my); g.stroke(); }
    else if (mouth === "dazed") { g.beginPath(); for (let k = 0; k <= 8; k++) g.lineTo(cx - 32 + k * 8, my + (k % 2 ? 7 : -7)); g.stroke(); }
    else {
      const open = mouth === "grin" || mouth === "laugh" ? [44, 26] : mouth === "talk" ? [26, 20] : [15, 19];
      g.fillStyle = "#3b1018"; g.beginPath();
      if (mouth === "o") g.ellipse(cx, my, open[0], open[1], 0, 0, 7); else { g.moveTo(cx - open[0], my - 6); g.quadraticCurveTo(cx, my + open[1] * 2, cx + open[0], my - 6); g.closePath(); }
      g.fill(); g.stroke();
      g.fillStyle = "#e9606b"; g.beginPath(); g.ellipse(cx, my + open[1] * 0.55, open[0] * 0.45, open[1] * 0.35, 0, 0, 7); g.fill();
      if (mouth === "grin" || mouth === "laugh") { g.fillStyle = "#ffffff"; g.fillRect(cx - 30, my - 4, 60, 9); }
    }
    if (stache) { g.fillStyle = stache; g.beginPath(); g.ellipse(cx - 24, 338, 28, 12, 0.25, 0, 7); g.ellipse(cx + 24, 338, 28, 12, -0.25, 0, 7); g.fill(); }
    // nose
    g.fillStyle = skin; g.strokeStyle = "rgba(120,60,40,0.55)"; g.lineWidth = 5; g.beginPath(); g.arc(cx + 2, 322, 9, 0.1 * Math.PI, 0.95 * Math.PI); g.stroke();
  });
  faceCache.set(key, t); return t;
};

export type CharSpec = {
  skin: string; shirt: string; cap: string; capLogo: string; hair: string;
  bodyR: number; bodyLen: number; headR: number; legLen: number;
  apron?: string; tag?: string; backpack?: string; shorts?: string; pen?: boolean;
  hat?: "cap" | "paper" | "none" | "flat" | "bowler" | "sailor" | "helmet" | "lady" | "slouch" | "bush" | "officer" | "boater"; belt?: string; bib?: string; sleeves?: boolean; dress?: string; coat?: string; stache?: string; hatColor?: string; hairStyle?: "tufts" | "bun" | "top" | "long"; glasses?: string; scarf?: string; stripes?: string; logo?: string;
};
export type Pose = { blink: number; mouth: Mouth; brow: number; headYaw: number; headPitch: number; armL: THREE.Vector3[]; armR: THREE.Vector3[]; bob: number; walk?: number; dazed?: boolean };

export class Toon {
  root: THREE.Group; head: THREE.Group; body: THREE.Group;
  face: THREE.Mesh; faceMat: THREE.MeshStandardMaterial;
  arms: THREE.Mesh[] = []; hands: THREE.Mesh[] = []; legs: THREE.Group[] = []; held: (THREE.Object3D | null)[] = [null, null]; bodyCy = 0;
  shoulderY: number; spec: CharSpec;
  constructor(parent: THREE.Object3D, s: CharSpec, x: number, z: number, ry: number) {
    this.spec = s;
    this.root = grp(parent, x, 0, z, ry);
    this.body = grp(this.root);
    const bodyCy = s.legLen + s.bodyR + s.bodyLen / 2;
    this.bodyCy = bodyCy;
    const stripeT = s.stripes ? canvas(512, 256, (g) => { g.fillStyle = s.shirt; g.fillRect(0, 0, 512, 256); g.fillStyle = s.stripes!; for (let x = 0; x < 512; x += 64) g.fillRect(x, 0, 30, 256); }) : undefined;
    const shirt = MP(s.shirt, 0.55, { clearcoat: 0.1, sheen: 0.6, sheenColor: new THREE.Color("#ffffff"), ...(stripeT ? { map: stripeT, color: "#ffffff" } : {}) });
    const torso = ink(put(this.body, new THREE.CapsuleGeometry(s.bodyR, s.bodyLen, 8, 24), shirt, 0, bodyCy, 0), 0.012);
    void torso;
    if (s.dress) { ink(put(this.body, new THREE.CylinderGeometry(s.bodyR * 1.02, s.bodyR * 1.9, s.legLen + s.bodyR * 0.6, 28, 1, true), MP(s.dress, 0.6, { side: THREE.DoubleSide }), 0, (s.legLen + s.bodyR * 0.6) / 2 + 0.03, 0), 0.008); }
    if (s.coat) { put(this.body, new THREE.CylinderGeometry(s.bodyR * 1.04, s.bodyR * 1.35, s.legLen * 0.55, 28, 1, true), MP(s.coat, 0.65, { side: THREE.DoubleSide }), 0, s.legLen * 0.75 + 0.05, 0); }
    if (s.belt) put(this.body, new THREE.TorusGeometry(s.bodyR * 1.0, 0.025, 8, 32), M(s.belt, 0.5), 0, bodyCy - s.bodyLen * 0.25, 0, { rx: Math.PI / 2 });
    if (s.bib) {
      const bt = canvas(256, 200, (g) => { g.fillStyle = "#f8f6ee"; g.fillRect(0, 0, 256, 200); g.strokeStyle = "#1c1814"; g.lineWidth = 6; g.strokeRect(6, 6, 244, 188); text(g, s.bib!, 128, 104, 120, "#1c1814"); });
      put(this.body, new THREE.CylinderGeometry(s.bodyR + 0.006, s.bodyR + 0.006, s.bodyLen * 0.75, 24, 1, true, -0.55, 1.1), M("#ffffff", 0.7, 0, { map: bt }), 0, bodyCy + s.bodyLen * 0.08, 0, { cast: false });
    }
    if (s.sleeves) for (const sx of [-1, 1]) put(this.body, new THREE.SphereGeometry(s.bodyR * 0.42, 14, 10), MP(s.shirt, 0.6), sx * s.bodyR * 0.95, bodyCy + s.bodyLen * 0.35, 0, { s: [1, 0.9, 1] });
    // legs + shoes
    const legM = M("#17141c", 0.5);
    for (const sx of [-1, 1]) {
      const hip = grp(this.body, sx * s.bodyR * 0.42, s.legLen + 0.02, 0);
      this.legs.push(hip);
      put(hip, cyl(0.02, 0.02, s.legLen + 0.05, 10), legM, 0, -s.legLen / 2, 0);
      const shoe = put(hip, new THREE.SphereGeometry(0.06, 20, 12), M("#2a2630", 0.45), sx * 0.005, -s.legLen + 0.01, 0.035, { s: [0.75, 0.5, 1.25] });
      ink(shoe, 0.01);
      put(hip, new THREE.SphereGeometry(0.06, 20, 8, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), M("#f4f1ea", 0.6), sx * 0.005, -s.legLen + 0.014, 0.035, { s: [0.78, 0.5, 1.28] });
    }
    if (s.scarf) put(this.body, new THREE.TorusGeometry(s.bodyR * 0.62, 0.045, 12, 32), MP(s.scarf, 0.7), 0, bodyCy + s.bodyLen / 2 + s.bodyR * 0.55, 0, { rx: Math.PI / 2 });
    if (s.logo) {
      const lt = canvas(256, 256, (g) => { g.fillStyle = "#ffffff"; g.beginPath(); g.arc(128, 128, 110, 0, 7); g.fill(); text(g, s.logo!, 128, 136, 120, s.shirt); });
      put(this.body, cyl(0.06, 0.06, 0.006, 24), M("#ffffff", 0.5, 0, { map: lt }), 0, bodyCy + s.bodyLen * 0.12, s.bodyR + 0.002, { rx: Math.PI / 2 });
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
    this.faceMat = new THREE.MeshStandardMaterial({ map: faceTex(0, "smile", 0, s.skin, s.stache), transparent: false, alphaTest: 0.5, roughness: 0.55 });
    this.face = put(this.head, new THREE.SphereGeometry(s.headR * 1.004, 48, 32), this.faceMat, 0, 0, 0, { cast: false });
    // ears
    for (const sx of [-1, 1]) ink(put(this.head, new THREE.SphereGeometry(s.headR * 0.16, 16, 12), skin, sx * s.headR * 0.98, -s.headR * 0.08, 0, { s: [0.55, 1, 0.8] }), 0.006);
    const hairM = M(s.hair, 0.8);
    const hat = s.hat ?? "cap";
    if (hat !== "cap") {
      // hair dome + style
      ink(put(this.head, new THREE.SphereGeometry(s.headR * 1.035, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.42), hairM, 0, s.headR * 0.02, -s.headR * 0.03, { ry: Math.PI }), 0.011);
      put(this.head, new THREE.SphereGeometry(s.headR * 1.03, 32, 16, Math.PI * 0.15, Math.PI * 0.7, Math.PI * 0.3, Math.PI * 0.35), hairM, 0, 0, -s.headR * 0.02, { ry: Math.PI / 2 + Math.PI });
      if (s.hairStyle === "bun") ink(put(this.head, new THREE.SphereGeometry(s.headR * 0.33, 20, 14), hairM, 0, s.headR * 0.95, -s.headR * 0.35), 0.01);
      if (s.hairStyle === "top") for (let k = 0; k < 5; k++) put(this.head, new THREE.ConeGeometry(s.headR * 0.12, s.headR * 0.35, 8), hairM, -s.headR * 0.3 + k * s.headR * 0.15, s.headR * 1.0, s.headR * 0.1 - (k % 2) * 0.03, { rz: (k - 2) * 0.25, rx: 0.3 });
      if (s.hairStyle === "long") ink(put(this.head, new THREE.CylinderGeometry(s.headR * 1.0, s.headR * 1.08, s.headR * 1.2, 32, 1, true, Math.PI * 0.62, Math.PI * 1.76), hairM, 0, -s.headR * 0.35, 0), 0.008);
      if (hat === "paper") {
        const paper = M("#fbfaf6", 0.7);
        const h = ink(put(this.head, new THREE.CylinderGeometry(s.headR * 0.55, s.headR * 0.55, s.headR * 1.75, 3, 1), paper, 0, s.headR * 0.92, 0, { rz: Math.PI / 2, s: [1, 1, 0.55] }), 0.008);
        void h;
        put(this.head, new THREE.CylinderGeometry(s.headR * 0.56, s.headR * 0.56, s.headR * 0.4, 3, 1), MP("#d8262e", 0.5), 0, s.headR * 0.92, 0, { rz: Math.PI / 2, s: [1, 1, 0.56] });
      }
      const hc = MP(s.hatColor ?? "#2a2a2e", 0.55);
      if (hat === "flat") {
        ink(put(this.head, new THREE.SphereGeometry(s.headR * 1.08, 32, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), hc, 0, s.headR * 0.3, -s.headR * 0.02, { s: [1, 0.45, 1.05], rx: 0.1 }), 0.01);
        ink(put(this.head, new THREE.CylinderGeometry(s.headR * 0.6, s.headR * 0.6, 0.015, 32), hc, 0, s.headR * 0.33, s.headR * 0.8, { s: [1, 1, 0.6], rx: 0.2 }), 0.006);
        put(this.head, new THREE.SphereGeometry(s.headR * 0.07, 10, 6), hc, 0, s.headR * 0.78, 0);
      }
      if (hat === "bowler") {
        ink(put(this.head, new THREE.SphereGeometry(s.headR * 0.85, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hc, 0, s.headR * 0.62, 0, { s: [1, 0.95, 1] }), 0.01);
        ink(put(this.head, new THREE.CylinderGeometry(s.headR * 1.25, s.headR * 1.25, 0.02, 40), hc, 0, s.headR * 0.55, 0), 0.006);
        put(this.head, new THREE.CylinderGeometry(s.headR * 0.86, s.headR * 0.86, s.headR * 0.12, 32, 1, true), M("#111", 0.5), 0, s.headR * 0.62, 0);
      }
      if (hat === "sailor") {
        ink(put(this.head, new THREE.CylinderGeometry(s.headR * 0.8, s.headR * 0.85, s.headR * 0.45, 32), MP("#fbfaf6", 0.5), 0, s.headR * 0.88, 0), 0.008);
        put(this.head, new THREE.TorusGeometry(s.headR * 0.82, s.headR * 0.12, 10, 32), MP("#fbfaf6", 0.5), 0, s.headR * 1.02, 0, { rx: Math.PI / 2 });
      }
      if (hat === "helmet") {
        const hm = MP(s.hatColor ?? "#1b1b1f", 0.25, { clearcoat: 1 });
        ink(put(this.head, new THREE.SphereGeometry(s.headR * 1.1, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), hm, 0, s.headR * 0.25, 0), 0.01);
        ink(put(this.head, new THREE.CylinderGeometry(s.headR * 1.2, s.headR * 1.2, 0.02, 40), hm, 0, s.headR * 0.28, -s.headR * 0.3, { s: [1, 1, 1.35] }), 0.006);
        const shield = canvas(128, 160, (g) => { g.fillStyle = "#c9a55a"; g.beginPath(); g.moveTo(64, 0); g.lineTo(128, 40); g.lineTo(110, 160); g.lineTo(18, 160); g.lineTo(0, 40); g.fill(); text(g, "FD", 64, 95, 54, "#7a1515"); });
        put(this.head, new THREE.PlaneGeometry(s.headR * 0.55, s.headR * 0.7), M("#ffffff", 0.3, 0.6, { map: shield, transparent: true }), 0, s.headR * 0.85, s.headR * 0.75, { rx: -0.5, cast: false });
      }
      if (hat === "slouch" || hat === "bush") {
        const sm = MP(s.hatColor ?? "#8a7450", 0.75);
        ink(put(this.head, new THREE.CylinderGeometry(s.headR * 0.78, s.headR * 0.86, s.headR * 0.55, 28), sm, 0, s.headR * 0.85, 0), 0.008);
        put(this.head, new THREE.CylinderGeometry(s.headR * 0.87, s.headR * 0.87, s.headR * 0.13, 28, 1, true), M(hat === "slouch" ? "#5a4a2a" : "#3a2a1a", 0.7), 0, s.headR * 0.66, 0);
        ink(put(this.head, new THREE.CylinderGeometry(s.headR * 1.65, s.headR * 1.65, 0.02, 40), sm, 0, s.headR * 0.6, 0, { rx: 0.06 }), 0.006);
        if (hat === "slouch") {
          // the left side of the brim pinned up, with the rising-sun badge
          put(this.head, new THREE.CylinderGeometry(s.headR * 0.85, s.headR * 0.85, 0.021, 24, 1, false, Math.PI * 1.15, Math.PI * 0.7), sm, -s.headR * 0.95, s.headR * 1.05, 0, { rz: -1.35 });
          put(this.head, new THREE.SphereGeometry(s.headR * 0.12, 12, 8), M("#c9a55a", 0.3, 1), -s.headR * 0.93, s.headR * 0.95, s.headR * 0.12, { s: [0.5, 1, 1] });
        }
      }
      if (hat === "boater") {
        const straw = canvas(256, 64, (g) => { g.fillStyle = "#e8cf8a"; g.fillRect(0, 0, 256, 64); for (let x = 0; x < 256; x += 6) { g.fillStyle = "rgba(150,110,40,0.35)"; g.fillRect(x, 0, 2, 64); } g.fillStyle = s.hatColor ?? "#1d2a5a"; g.fillRect(0, 22, 256, 22); });
        const bm = MP("#ffffff", 0.7, { map: straw });
        ink(put(this.head, new THREE.CylinderGeometry(s.headR * 0.82, s.headR * 0.85, s.headR * 0.42, 28), bm, 0, s.headR * 0.82, 0), 0.008);
        ink(put(this.head, new THREE.CylinderGeometry(s.headR * 1.4, s.headR * 1.4, 0.018, 36), MP("#e8cf8a", 0.7), 0, s.headR * 0.62, 0), 0.006);
      }
      if (hat === "officer") {
        const om = MP(s.hatColor ?? "#5a5a3a", 0.6);
        ink(put(this.head, new THREE.CylinderGeometry(s.headR * 1.02, s.headR * 0.82, s.headR * 0.38, 32), om, 0, s.headR * 0.85, -s.headR * 0.03), 0.008);
        put(this.head, new THREE.CylinderGeometry(s.headR * 0.84, s.headR * 0.84, s.headR * 0.12, 32, 1, true), M("#8a1d1d", 0.5), 0, s.headR * 0.7, -s.headR * 0.02);
        ink(put(this.head, new THREE.CylinderGeometry(s.headR * 0.7, s.headR * 0.7, 0.02, 32, 1, false, -Math.PI / 2, Math.PI), M("#1a1410", 0.25, 0.2), 0, s.headR * 0.62, s.headR * 0.45, { rx: 0.25 }), 0.006);
        put(this.head, new THREE.SphereGeometry(s.headR * 0.1, 12, 8), M("#c9a55a", 0.3, 1), 0, s.headR * 0.85, s.headR * 0.86, { s: [1, 1, 0.4] });
      }
      if (hat === "lady") {
        ink(put(this.head, new THREE.CylinderGeometry(s.headR * 1.55, s.headR * 1.55, 0.02, 40), hc, 0, s.headR * 0.6, 0, { rx: 0.12 }), 0.006);
        put(this.head, new THREE.CylinderGeometry(s.headR * 0.7, s.headR * 0.8, s.headR * 0.4, 28), hc, 0, s.headR * 0.8, 0);
        for (let k = 0; k < 3; k++) put(this.head, new THREE.SphereGeometry(s.headR * 0.13, 10, 8), MP(["#ff6a8a", "#ffc928", "#ffffff"][k], 0.5), s.headR * (0.45 + k * 0.12), s.headR * 0.85, s.headR * 0.35);
      }
    } else {
      for (const [a, y] of [[-1.25, 0.05], [-1.55, 0.02], [1.25, 0.05], [1.55, 0.02], [2.4, 0.08], [3.14, 0.1], [-2.4, 0.08]] as const) {
        const x = Math.sin(a) * s.headR * 0.95, z = Math.cos(a) * s.headR * 0.95;
        put(this.head, new THREE.SphereGeometry(s.headR * 0.2, 12, 8), hairM, x, s.headR * (0.2 + y), z, { s: [1, 0.75, 1], ry: a });
      }
      const capM = MP(s.cap, 0.45, { clearcoat: 0.3 });
      ink(put(this.head, new THREE.SphereGeometry(s.headR * 1.05, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.44), capM, 0, s.headR * 0.05, 0), 0.012);
      put(this.head, new THREE.SphereGeometry(s.headR * 0.09, 12, 8), capM, 0, s.headR * 1.1, 0, { s: [1, 0.45, 1] });
      ink(put(this.head, new THREE.CylinderGeometry(s.headR * 0.78, s.headR * 0.78, 0.02, 40), capM, 0, s.headR * 0.22, s.headR * 0.72, { rx: 0.16, s: [1, 1, 0.85] }), 0.006);
      const logoT = canvas(128, 128, (g) => { g.fillStyle = "#ffffff"; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill(); g.fillStyle = s.capLogo; g.beginPath(); g.arc(64, 64, 50, 0, 7); g.fill(); text(g, s.tag ? "T" : "M", 64, 70, 70, "#ffffff"); });
      put(this.head, cyl(s.headR * 0.22, s.headR * 0.22, 0.01, 24), M("#ffffff", 0.5, 0, { map: logoT }), 0, s.headR * 0.62, s.headR * 0.82, { rx: Math.PI / 2 - 0.75 });
    }
    if (s.glasses) {
      const gm = M(s.glasses, 0.3, 0.2);
      for (const sx of [-1, 1]) put(this.head, new THREE.TorusGeometry(s.headR * 0.17, s.headR * 0.025, 8, 24), gm, sx * s.headR * 0.27, -s.headR * 0.2, s.headR * 0.99, { ry: sx * 0.28, cast: false });
      put(this.head, cyl(s.headR * 0.02, s.headR * 0.02, s.headR * 0.22, 6), gm, 0, -s.headR * 0.17, s.headR * 1.03, { rz: Math.PI / 2, cast: false });
    }
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
    this.faceMat.map = faceTex(p.blink, p.mouth, p.brow, s.skin, s.stache);
    [p.armL, p.armR].forEach((pts, k) => {
      const sx = k ? 1 : -1;
      const sh = new THREE.Vector3(sx * s.bodyR * 0.92, this.shoulderY + p.bob, 0);
      const all = [sh, ...pts.map((v) => v.clone().add(new THREE.Vector3(0, p.bob, 0)))];
      const curve = new THREE.CatmullRomCurve3(all);
      this.arms[k].geometry.dispose();
      this.arms[k].geometry = new THREE.TubeGeometry(curve, 16, 0.021, 8, false);
      this.hands[k].position.copy(all[all.length - 1]);
      const h = this.held[k];
      if (h) { h.position.copy(all[all.length - 1]); h.position.y += 0.02; }
    });
    const w = p.walk ?? 0, sw = Math.sin(w) * 0.45 * Math.min(1, Math.abs(p.walk ?? 0));
    if (this.legs.length) { this.legs[0].rotation.x = p.walk === undefined ? 0 : sw; this.legs[1].rotation.x = p.walk === undefined ? 0 : -sw; }
  }
}
const STEELISH = M("#d0d4da", 0.3, 1);

export type ArmName = "rest" | "hold" | "raise" | "point" | "shrug" | "wave" | "counter" | "hip" | "cheer";
/** arm keyframes in the character's local space (elbow, hand) for side sx (-1 = left of the body, +1 = right) */
export const armPts = (c: Toon, name: ArmName, sx: number, t = 0): THREE.Vector3[] => {
  const R = c.spec.bodyR, y = c.shoulderY, V = (x: number, yy: number, z: number) => new THREE.Vector3(sx * x, yy, z);
  switch (name) {
    case "rest": return [V(R + 0.06, y - 0.16, 0.02), V(R + 0.05, y - 0.34, 0.06)];
    case "hold": return [V(R + 0.05, y - 0.16, 0.12), V(R * 0.55, y - 0.12, R + 0.2)];
    case "raise": return [V(R + 0.1, y + 0.06, 0.1), V(R + 0.04, y + 0.3, 0.16)];
    case "point": return [V(R + 0.08, y + 0.02, 0.16), V(R + 0.12, y + 0.2, 0.42)];
    case "shrug": return [V(R + 0.1, y - 0.12, 0.05), V(R + 0.24, y - 0.02, 0.16)];
    case "wave": return [V(R + 0.12, y + 0.05, 0.05), V(R + 0.15 + 0.05 * Math.sin(t * 12), y + 0.32, 0.08)];
    case "counter": return [V(R + 0.08, y - 0.2, 0.2), V(R - 0.02, y - 0.3, 0.5)];
    case "hip": return [V(R + 0.16, y - 0.12, -0.02), V(R + 0.02, y - 0.26, 0.04)];
    case "cheer": return [V(R + 0.14, y + 0.12, 0.02), V(R + 0.12, y + 0.38 + 0.03 * Math.sin(t * 10), 0.06)];
  }
};
export const armMix = (c: Toon, a: ArmName, b: ArmName, u: number, sx: number, t = 0) => {
  const A = armPts(c, a, sx, t), B = armPts(c, b, sx, t);
  return A.map((v, i) => v.clone().lerp(B[i], Math.min(1, Math.max(0, u))));
};
