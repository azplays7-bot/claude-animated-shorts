// Look test: shared helpers (materials, canvas textures, mesh builders, ink hull) for the detailed PBR style.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export const ANTON = "Anton, Impact, sans-serif";
export const INTER = "Inter, Arial, sans-serif";

export const rng = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export type G = CanvasRenderingContext2D;
export const canvas = (w: number, h: number, draw: (g: G, w: number, h: number) => void, color = true) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d")!; draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
};
export const rep = (t: THREE.Texture, x: number, y: number) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(x, y); return t; };

export const M = (color: string, roughness = 0.6, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
export const MP = (color: string, roughness = 0.3, extra: THREE.MeshPhysicalMaterialParameters = {}) =>
  new THREE.MeshPhysicalMaterial({ color, roughness, clearcoat: 0.6, clearcoatRoughness: 0.15, ...extra });
export const STEEL = () => M("#cfd4dc", 0.26, 1.0);
export const BRUSHED = () => M("#b9bec6", 0.4, 1.0);
export const glow = (map: THREE.Texture, k = 1.6) => new THREE.MeshStandardMaterial({ color: "#000000", roughness: 0.65, metalness: 0, emissive: "#ffffff", emissiveMap: map, emissiveIntensity: k });

export const rbox = (w: number, h: number, d: number, r = 0.015) => (r > 0 ? new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2.01, h / 2.01, d / 2.01)) : new THREE.BoxGeometry(w, h, d));
export const cyl = (rt: number, rb: number, h: number, seg = 24, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);

type Opt = { rx?: number; ry?: number; rz?: number; s?: number | [number, number, number]; cast?: boolean; recv?: boolean };
export const put = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, o: Opt = {}) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
  if (o.s !== undefined) { if (typeof o.s === "number") m.scale.setScalar(o.s); else m.scale.set(...o.s); }
  m.castShadow = o.cast ?? true; m.receiveShadow = o.recv ?? true;
  parent.add(m); return m;
};
export const grp = (parent: THREE.Object3D, x = 0, y = 0, z = 0, ry = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); return g; };

/** inverted-hull ink line: a black back-face copy pushed out along the normals (the cartoon outline on characters) */
const inkCache = new Map<number, THREE.ShaderMaterial>();
export const inkMat = (w: number) => {
  if (!inkCache.has(w)) inkCache.set(w, new THREE.ShaderMaterial({
    side: THREE.BackSide, uniforms: { w: { value: w } },
    // constant on-screen width: extrude along the projected normal in clip space (w = metres -> ~px at 1080 wide: w * 330)
    vertexShader: "uniform float w; void main(){ vec4 c = projectionMatrix * modelViewMatrix * vec4(position, 1.0); vec3 n = normalize(normalMatrix * normal); vec2 d = (projectionMatrix * vec4(n, 0.0)).xy; float l = length(d); d = l > 1e-5 ? d / l : vec2(0.0); c.xy += d * vec2(2.0 / 1080.0, 2.0 / 1920.0) * (w * 330.0) * c.w; c.z += 0.00002 * c.w; gl_Position = c; }",
    fragmentShader: "void main(){ gl_FragColor = vec4(0.03, 0.025, 0.035, 1.0); }",
  }));
  return inkCache.get(w)!;
};
export const ink = (m: THREE.Mesh, w = 0.008) => { const h = new THREE.Mesh(m.geometry, inkMat(w)); h.castShadow = false; h.receiveShadow = false; m.add(h); return m; };

/** rounded-rect path */
export const rr = (g: G, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
};
export const text = (g: G, s: string, x: number, y: number, size: number, col: string, font = ANTON, align: CanvasTextAlign = "center") => {
  g.font = `${size}px ${font}`; g.fillStyle = col; g.textAlign = align; g.textBaseline = "middle"; g.fillText(s, x, y);
};
/** a tiny cartoon burger icon */
export const burgerIcon = (g: G, x: number, y: number, s: number) => {
  g.fillStyle = "#e9a23b"; g.beginPath(); g.ellipse(x, y - 0.18 * s, 0.5 * s, 0.32 * s, 0, Math.PI, 0); g.fill();
  g.fillStyle = "#4bbf4b"; g.fillRect(x - 0.52 * s, y - 0.2 * s, 1.04 * s, 0.1 * s);
  g.fillStyle = "#ffcf3a"; g.fillRect(x - 0.5 * s, y - 0.1 * s, 1.0 * s, 0.08 * s);
  g.fillStyle = "#6b3a1e"; rr(g, x - 0.5 * s, y - 0.04 * s, 1.0 * s, 0.17 * s, 0.06 * s); g.fill();
  g.fillStyle = "#e9a23b"; rr(g, x - 0.48 * s, y + 0.13 * s, 0.96 * s, 0.14 * s, 0.07 * s); g.fill();
  g.fillStyle = "#fff6d8"; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(x - 0.25 * s + k * 0.12 * s, y - 0.3 * s + (k % 2) * 0.06 * s, 0.025 * s, 0.012 * s, 0.4, 0, 7); g.fill(); }
};
