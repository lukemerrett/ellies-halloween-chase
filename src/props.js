// Props for the spooky school: collectable books, hiding cupboards, desks, doors, windows and more.
// Everything stands on y = 0 and faces +Z, sized for a level grid of 3-unit tiles with 4.2-unit walls.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mat, matU, basic, makeGlow, rng } from './materials.js';

const cache = new Map();
function geo(key, make) {
  let g = cache.get(key);
  if (!g) { g = make(); cache.set(key, g); }
  return g;
}
function mesh(g, m, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  return o;
}
const unitBox = () => geo('box', () => new THREE.BoxGeometry(1, 1, 1));
function box(m, w, h, d, x = 0, y = 0, z = 0) {
  const o = mesh(unitBox(), m, x, y, z);
  o.scale.set(w, h, d);
  return o;
}
function rbox(m, w, h, d, r, x = 0, y = 0, z = 0) {
  return mesh(geo(`rb${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 2, r)), m, x, y, z);
}
function sphere(m, r, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const o = mesh(geo('sph', () => new THREE.SphereGeometry(1, 14, 10)), m, x, y, z);
  o.scale.set(r * sx, r * sy, r * sz);
  return o;
}
function cyl(m, r, h, x = 0, y = 0, z = 0, seg = 12, rTop = r) {
  const ratio = Math.round((rTop / r) * 100) / 100;
  const o = mesh(geo(`cyl${ratio}_${seg}`, () => new THREE.CylinderGeometry(ratio, 1, 1, seg).translate(0, 0.5, 0)), m, x, y, z);
  o.scale.set(r, h, r);
  return o;
}
// a thin rod from point a to point b
function rod(m, a, b, r, seg = 6) {
  const d = new THREE.Vector3().subVectors(b, a);
  const o = mesh(geo(`rod${seg}`, () => new THREE.CylinderGeometry(1, 1, 1, seg).translate(0, 0.5, 0)), m, a.x, a.y, a.z);
  o.scale.set(r, d.length(), r);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return o;
}
// merge geometries that may differ in indexing or attributes (position + normal only)
function mergeAll(geos) {
  const list = geos.map((g) => {
    const n = g.index ? g.toNonIndexed() : g.clone();
    for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k);
    return n;
  });
  const m = mergeGeometries(list, false);
  m.computeVertexNormals();
  return m;
}

// ---------------------------------------------------------------------------
// Collectable book
// ---------------------------------------------------------------------------
const BOOK_COLORS = ['#e63946', '#2ec4b6', '#ffb703', '#8338ec', '#3a86ff', '#ff6d00', '#06d6a0'];
export function makeBook(i = 0) {
  const g = new THREE.Group();
  const color = BOOK_COLORS[((i % BOOK_COLORS.length) + BOOK_COLORS.length) % BOOK_COLORS.length];
  const cover = mat(color, { roughness: 0.45, emissive: color, ei: 0.35 });
  const pages = mat('#fff6dc', { roughness: 0.9, emissive: '#ffe9a8', ei: 0.25 });
  const gold = mat('#ffd166', { roughness: 0.3, metalness: 0.8 });
  const inner = new THREE.Group();
  for (const s of [-1, 1]) {
    const half = new THREE.Group();
    half.add(box(cover, 0.42, 0.6, 0.05, s * 0.21, 0.3, 0));
    half.add(box(pages, 0.38, 0.54, 0.07, s * 0.2, 0.3, 0.05));
    half.add(box(gold, 0.3, 0.04, 0.052, s * 0.21, 0.48, -0.003));
    half.add(box(gold, 0.3, 0.04, 0.052, s * 0.21, 0.12, -0.003));
    half.add(sphere(gold, 0.05, s * 0.21, 0.3, -0.03, 1, 1, 0.3));
    half.rotation.y = -s * 0.55; // the covers open towards the viewer like a V
    inner.add(half);
  }
  inner.add(cyl(cover, 0.045, 0.6, 0, 0, -0.01, 10));
  g.add(inner);
  // magic sparkles around it
  const sparkM = basic('#fff3b0');
  const sg = geo('spark', () => new THREE.OctahedronGeometry(0.05));
  for (let k = 0; k < 5; k++) {
    const a = k * 1.26;
    const sp = mesh(sg, sparkM, Math.cos(a) * 0.42, 0.25 + (k % 3) * 0.2, Math.sin(a) * 0.3);
    inner.add(sp);
  }
  const glow = makeGlow(color, 2, 0.75);
  glow.position.y = 0.32;
  g.add(glow);
  g.userData = { glow, inner, color };
  return g;
}

// ---------------------------------------------------------------------------
// Hiding cupboard
// ---------------------------------------------------------------------------
export function makeCupboard() {
  const g = new THREE.Group();
  const wood = mat('#5a3a22', { roughness: 0.75 });
  const dark = mat('#3e2716', { roughness: 0.8 });
  const brass = mat('#c9a13a', { roughness: 0.3, metalness: 0.8 });
  const W = 1.5, H = 3.2, D = 1.1;
  g.add(box(wood, 0.08, H - 0.2, D, -W / 2 + 0.04, 0.1 + (H - 0.2) / 2, 0));
  g.add(box(wood, 0.08, H - 0.2, D, W / 2 - 0.04, 0.1 + (H - 0.2) / 2, 0));
  g.add(box(wood, W, H - 0.2, 0.06, 0, 0.1 + (H - 0.2) / 2, -D / 2 + 0.03));
  g.add(box(dark, W + 0.16, 0.2, D + 0.12, 0, 0.1, 0.02));                    // plinth
  g.add(box(dark, W + 0.24, 0.16, D + 0.16, 0, H - 0.04, 0.02));              // crown
  g.add(box(wood, W + 0.08, 0.1, D + 0.08, 0, H - 0.17, 0.02));
  // the dark inside, with a few coats hanging
  g.add(box(basic('#07040a'), W - 0.16, H - 0.4, D - 0.12, 0, H / 2, -0.02));
  const rail = box(brass, W - 0.2, 0.03, 0.03, 0, H - 0.5, 0);
  g.add(rail);
  for (const [x, c] of [[-0.35, '#2b2140'], [0.25, '#3b1d1d']]) {
    g.add(box(mat(c, { roughness: 0.9 }), 0.36, 1.4, 0.12, x, H - 1.25, 0.05));
  }
  // creaky doors on hinge pivots, left slightly ajar
  const doors = [];
  for (const s of [-1, 1]) {
    const p = new THREE.Group();
    p.position.set(s * (W / 2 - 0.04), 0, D / 2);
    const leaf = new THREE.Group();
    leaf.add(box(wood, W / 2 - 0.06, H - 0.46, 0.06, 0, 0, 0));
    leaf.add(box(dark, W / 2 - 0.26, 1.1, 0.03, 0, 0.55, 0.04));
    leaf.add(box(dark, W / 2 - 0.26, 0.9, 0.03, 0, -0.7, 0.04));
    leaf.add(sphere(brass, 0.045, -s * (W / 4 - 0.12), 0, 0.07));
    leaf.position.set(-s * (W / 4 - 0.01), H / 2 - 0.02, 0.03);
    p.add(leaf);
    p.rotation.y = s * 0.42;
    g.add(p);
    doors.push(p);
  }
  // little feet
  for (const x of [-W / 2 + 0.08, W / 2 - 0.08]) for (const z of [-D / 2 + 0.1, D / 2 - 0.05]) g.add(sphere(dark, 0.08, x, 0.02, z));
  g.rotation.z = 0.015;
  g.userData = { doorL: doors[0], doorR: doors[1] };
  return g;
}

// ---------------------------------------------------------------------------
// School desk
// ---------------------------------------------------------------------------
export function makeDesk() {
  const g = new THREE.Group();
  const wood = mat('#6b4426', { roughness: 0.7 });
  const iron = mat('#26222a', { roughness: 0.4, metalness: 0.6 });
  // sloping lid
  const lid = box(wood, 1.7, 0.08, 0.7, 0, 0.98, 0.1);
  lid.rotation.x = 0.12;
  g.add(lid);
  g.add(box(wood, 1.7, 0.05, 0.18, 0, 1.03, -0.3));                   // flat pen ledge
  g.add(box(mat('#4f321b'), 1.62, 0.32, 0.72, 0, 0.78, 0.08));        // box under the lid
  // iron legs and a bench behind
  for (const x of [-0.75, 0.75]) {
    g.add(box(iron, 0.07, 0.62, 0.07, x, 0.31, 0.38));
    g.add(box(iron, 0.07, 0.62, 0.07, x, 0.31, -0.25));
    g.add(box(iron, 0.07, 0.07, 1.3, x, 0.05, -0.2));
    g.add(box(iron, 0.07, 0.5, 0.07, x, 0.25, -0.75));
  }
  g.add(box(wood, 1.6, 0.07, 0.36, 0, 0.5, -0.72));                   // bench seat
  g.add(box(wood, 1.6, 0.3, 0.05, 0, 0.75, -0.92));                   // bench back
  // inkwell and a pencil
  g.add(cyl(mat('#1f2f6b', { roughness: 0.2, metalness: 0.3 }), 0.07, 0.09, 0.6, 1.07, -0.3, 10));
  g.add(cyl(basic('#0b0b14'), 0.04, 0.02, 0.6, 1.16, -0.3, 8));
  const pencil = box(mat('#ffb703'), 0.4, 0.035, 0.035, -0.3, 1.075, -0.28);
  pencil.rotation.y = 0.3;
  g.add(pencil);
  return g;
}

// ---------------------------------------------------------------------------
// Bookshelf
// ---------------------------------------------------------------------------
const SHELF_BOOKS = ['#6b2d2d', '#2d4a6b', '#3e5a2c', '#6b5a2d', '#4a2d6b', '#2f2f3a'];
export function makeBookshelf(seed = 3) {
  const g = new THREE.Group();
  const wood = mat('#4a2e1a', { roughness: 0.75 });
  const W = 2.8, H = 3.6, D = 0.8;
  g.add(box(wood, 0.1, H, D, -W / 2 + 0.05, H / 2, 0));
  g.add(box(wood, 0.1, H, D, W / 2 - 0.05, H / 2, 0));
  g.add(box(wood, W, 0.1, D, 0, H - 0.05, 0));
  g.add(box(wood, W + 0.12, 0.14, D + 0.06, 0, H + 0.05, 0.02));
  g.add(box(mat('#2a1a0e'), W - 0.1, H - 0.1, 0.04, 0, H / 2, -D / 2 + 0.02));
  const r = rng(seed * 101 + 7);
  const mats = SHELF_BOOKS.map((c) => mat(c, { roughness: 0.85 }));
  const shelves = [0.12, 0.98, 1.84, 2.7];
  for (const y of shelves) {
    g.add(box(wood, W - 0.1, 0.07, D - 0.04, 0, y, 0));
    let x = -W / 2 + 0.15;
    while (x < W / 2 - 0.25) {
      const w = 0.07 + r() * 0.08, h = 0.5 + r() * 0.28;
      if (r() < 0.08) { x += 0.2; continue; } // a gap now and then
      const b = box(mats[Math.floor(r() * mats.length)], w, h, 0.5 + r() * 0.1, x + w / 2, y + 0.035 + h / 2, 0.05);
      if (r() < 0.12) { b.rotation.z = -0.25; b.position.x += 0.05; }
      g.add(b);
      x += w + 0.01;
    }
  }
  const web = makeCobweb();
  web.scale.setScalar(0.7);
  web.position.set(-W / 2 + 0.1, H - 0.1, D / 2 - 0.02);
  g.add(web);
  return g;
}

// ---------------------------------------------------------------------------
// Stack of crates (the blocker Matilda floats away)
// ---------------------------------------------------------------------------
function crate(s) {
  const g = new THREE.Group();
  const plank = mat('#8a6236', { roughness: 0.85 });
  const edge = mat('#5c3d1e', { roughness: 0.85 });
  g.add(box(plank, s * 0.94, s * 0.94, s * 0.94, 0, s / 2, 0));
  const t = s * 0.1;
  for (const [x, z] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) g.add(box(edge, t, s, t, x * (s - t) / 2, s / 2, z * (s - t) / 2));
  for (const y of [t / 2, s - t / 2]) {
    for (const z of [-1, 1]) g.add(box(edge, s, t, t, 0, y, z * (s - t) / 2));
    for (const x of [-1, 1]) g.add(box(edge, t, t, s, x * (s - t) / 2, y, 0));
  }
  for (const z of [-1, 1]) {
    const brace = box(edge, s * 1.2, t * 0.8, t * 0.5, 0, s / 2, z * s * 0.48);
    brace.rotation.z = Math.PI / 4;
    g.add(brace);
  }
  return g;
}
export function makeCrate() {
  const g = new THREE.Group();
  const a = crate(1.28); a.position.set(-0.65, 0, 0.05); a.rotation.y = 0.05; g.add(a);
  const b = crate(1.28); b.position.set(0.65, 0, -0.05); b.rotation.y = -0.08; g.add(b);
  const c = crate(1.25); c.position.set(0.05, 1.28, 0); c.rotation.y = 0.25; g.add(c);
  return g;
}

// ---------------------------------------------------------------------------
// Water jug with a newt on a side table
// ---------------------------------------------------------------------------
export function makeJug() {
  const g = new THREE.Group();
  const wood = mat('#5a3a22', { roughness: 0.7 });
  g.add(cyl(wood, 0.42, 0.06, 0, 0.94, 0, 16));
  g.add(cyl(wood, 0.06, 0.9, 0, 0.04, 0, 8, 0.05));
  for (let k = 0; k < 3; k++) {
    const a = k * Math.PI * 2 / 3;
    const foot = box(wood, 0.36, 0.06, 0.08, Math.cos(a) * 0.15, 0.04, Math.sin(a) * 0.15);
    foot.rotation.y = -a;
    g.add(foot);
  }
  const jug = new THREE.Group();
  const glass = mat('#cfeeff', { roughness: 0.05, metalness: 0.1, opacity: 0.35, side: THREE.DoubleSide });
  const water = mat('#5fb8ff', { roughness: 0.1, opacity: 0.55, emissive: '#1f6aa8', ei: 0.4 });
  const jg = geo('jug', () => new THREE.LatheGeometry([
    new THREE.Vector2(0.001, 0), new THREE.Vector2(0.15, 0), new THREE.Vector2(0.18, 0.12),
    new THREE.Vector2(0.17, 0.3), new THREE.Vector2(0.12, 0.45), new THREE.Vector2(0.13, 0.55), new THREE.Vector2(0.16, 0.6),
  ], 16));
  jug.add(mesh(jg, glass));
  const wg = geo('jugw', () => new THREE.LatheGeometry([
    new THREE.Vector2(0.001, 0.01), new THREE.Vector2(0.14, 0.01), new THREE.Vector2(0.165, 0.12),
    new THREE.Vector2(0.155, 0.3), new THREE.Vector2(0.115, 0.4), new THREE.Vector2(0.001, 0.4),
  ], 16));
  jug.add(mesh(wg, water));
  const handle = mesh(geo('jugh', () => new THREE.TorusGeometry(0.11, 0.02, 6, 12, Math.PI * 1.2)), glass, -0.18, 0.33, 0);
  handle.rotation.z = Math.PI * 0.4;
  jug.add(handle);
  // the newt, swimming happily
  const newt = new THREE.Group();
  const skin = mat('#ff8c2a', { roughness: 0.5, emissive: '#5a2a00', ei: 0.4 });
  newt.add(sphere(skin, 0.06, 0, 0, 0, 1.6, 0.6, 0.7));
  newt.add(sphere(skin, 0.045, 0.09, 0.01, 0, 1, 0.75, 0.9));
  const tail = mesh(geo('newtTail', () => new THREE.ConeGeometry(0.03, 0.14, 8).rotateZ(Math.PI / 2)), skin, -0.14, 0, 0);
  newt.add(tail);
  for (const z of [-0.03, 0.03]) newt.add(sphere(basic('#111111'), 0.012, 0.115, 0.03, z));
  for (const [x, z] of [[0.04, -0.06], [0.04, 0.06], [-0.05, -0.06], [-0.05, 0.06]]) newt.add(sphere(skin, 0.018, x, -0.02, z, 1.4, 0.6, 1));
  newt.position.set(0, 0.2, 0);
  newt.rotation.y = -0.5;
  jug.add(newt);
  jug.position.y = 0.97;
  g.add(jug);
  g.userData = { jug, newt };
  return g;
}

// ---------------------------------------------------------------------------
// The exit door, locked until all the books are found
// ---------------------------------------------------------------------------
export function makeExitDoor() {
  const g = new THREE.Group();
  const stone = mat('#6a6474', { roughness: 0.9 });
  const wood = mat('#4a2a18', { roughness: 0.75 });
  const iron = mat('#1e1b22', { roughness: 0.4, metalness: 0.6 });
  const W = 2.6, H = 3.6;
  g.add(box(stone, 0.45, H + 0.3, 0.6, -W / 2 - 0.22, (H + 0.3) / 2, 0));
  g.add(box(stone, 0.45, H + 0.3, 0.6, W / 2 + 0.22, (H + 0.3) / 2, 0));
  g.add(box(stone, W + 1.0, 0.45, 0.66, 0, H + 0.22, 0));
  g.add(box(stone, 0.5, 0.5, 0.7, 0, H + 0.35, 0.02)); // keystone
  g.add(box(basic('#060308'), W, H, 0.1, 0, H / 2, -0.15));
  const doors = [];
  const studG = geo('stud', () => new THREE.SphereGeometry(0.035, 6, 4));
  for (const s of [-1, 1]) {
    const p = new THREE.Group();
    p.position.set(s * W / 2, 0, 0);
    const leaf = new THREE.Group();
    leaf.add(box(wood, W / 2 - 0.02, H - 0.02, 0.14, 0, 0, 0));
    for (const y of [-1.2, 0, 1.2]) leaf.add(box(iron, W / 2 - 0.1, 0.1, 0.03, 0, y, 0.085));
    for (let yi = 0; yi < 3; yi++) for (let xi = 0; xi < 3; xi++) {
      leaf.add(mesh(studG, iron, -0.4 + xi * 0.4, -1.2 + yi * 1.2, 0.1));
    }
    const ring = mesh(geo('ring', () => new THREE.TorusGeometry(0.1, 0.02, 6, 14)), iron, -s * 0.45, -0.25, 0.11);
    leaf.add(ring);
    leaf.position.set(-s * (W / 4), H / 2, 0);
    p.add(leaf);
    g.add(p);
    doors.push(p);
  }
  // a chain across both doors with a big glowing padlock
  const lock = new THREE.Group();
  const lockMat = matU('#c81d25', { roughness: 0.3, metalness: 0.4, emissive: '#ff2a2a', ei: 1.2 });
  lock.add(rbox(lockMat, 0.42, 0.38, 0.16, 0.06, 0, 0, 0));
  const shackle = mesh(geo('shackle', () => new THREE.TorusGeometry(0.13, 0.035, 6, 14, Math.PI)), mat('#b8b8c4', { metalness: 0.9, roughness: 0.2 }), 0, 0.18, 0);
  lock.add(shackle);
  lock.add(box(basic('#1a0505'), 0.05, 0.12, 0.02, 0, -0.03, 0.09));
  const linkG = geo('link', () => new THREE.TorusGeometry(0.07, 0.022, 5, 10));
  const linkM = mat('#8a8a96', { metalness: 0.8, roughness: 0.35 });
  for (let k = -5; k <= 5; k++) {
    if (k === 0) continue;
    const l = mesh(linkG, linkM, k * 0.12, 0.3 + Math.abs(k) * 0.015, -0.02);
    l.rotation.y = k % 2 ? Math.PI / 2 : 0;
    lock.add(l);
  }
  const lockGlow = makeGlow('#ff3030', 1.6, 0.7);
  lock.add(lockGlow);
  lock.position.set(0, 1.55, 0.14);
  g.add(lock);
  g.userData = { lockMat, lock, lockGlow, doorL: doors[0], doorR: doors[1] };
  return g;
}

// ---------------------------------------------------------------------------
// Arched window (flat, to fix onto a wall)
// ---------------------------------------------------------------------------
function archShape(w, h) {
  const s = new THREE.Shape();
  const r = w / 2;
  s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, h - r); s.absarc(0, h - r, r, 0, Math.PI, false); s.lineTo(-r, 0);
  return s;
}
export function makeWindow() {
  const g = new THREE.Group();
  const W = 1.6, H = 2.6;
  const glassMat = matU('#2c4f96', { roughness: 0.15, metalness: 0.3, emissive: '#3a62c4', ei: 0.7 });
  const glass = mesh(geo('winGlass', () => new THREE.ShapeGeometry(archShape(W, H), 12)), glassMat, 0, 0, 0.01);
  g.add(glass);
  const frameG = geo('winFrame', () => {
    const outer = archShape(W + 0.3, H + 0.15);
    const inner = archShape(W, H);
    const hole = new THREE.Path(inner.getPoints(12));
    outer.holes.push(hole);
    return new THREE.ExtrudeGeometry(outer, { depth: 0.08, bevelEnabled: false, curveSegments: 12 }).translate(0, -0.075, 0);
  });
  g.add(mesh(frameG, mat('#3a3442', { roughness: 0.85 })));
  const bar = mat('#121015', { roughness: 0.5, metalness: 0.4 });
  for (const x of [-0.4, 0, 0.4]) g.add(box(bar, 0.05, H - 0.1, 0.05, x, (H - 0.1) / 2, 0.04));
  for (const y of [0.8, 1.6]) g.add(box(bar, W, 0.05, 0.05, 0, y, 0.04));
  g.add(box(mat('#4a4452'), W + 0.5, 0.12, 0.22, 0, -0.06, 0.1)); // sill
  // a sliver of moon in the glass
  const moon = mesh(geo('winMoon', () => new THREE.CircleGeometry(0.16, 16)), basic('#fff4c8'), 0.38, H - 0.75, 0.02);
  g.add(moon);
  g.userData = { glassMat };
  return g;
}

// ---------------------------------------------------------------------------
// Creepy portrait of an old headmaster (eyes that follow you)
// ---------------------------------------------------------------------------
export function makePainting() {
  const g = new THREE.Group();
  const W = 1.2, H = 1.5;
  const frameG = geo('paintFrame', () => {
    const o = new THREE.Shape();
    o.moveTo(-W / 2 - 0.12, -0.12); o.lineTo(W / 2 + 0.12, -0.12); o.lineTo(W / 2 + 0.12, H + 0.12); o.lineTo(-W / 2 - 0.12, H + 0.12); o.lineTo(-W / 2 - 0.12, -0.12);
    const h = new THREE.Path();
    h.moveTo(-W / 2, 0); h.lineTo(W / 2, 0); h.lineTo(W / 2, H); h.lineTo(-W / 2, H); h.lineTo(-W / 2, 0);
    o.holes.push(h);
    return new THREE.ExtrudeGeometry(o, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 });
  });
  g.add(mesh(frameG, mat('#c9a13a', { roughness: 0.35, metalness: 0.8 })));
  g.add(box(mat('#22301f', { roughness: 0.9 }), W, H, 0.02, 0, H / 2, 0.02));
  const flat = (m, r, x, y, sx = 1, sy = 1, z = 0.04) => {
    const o = mesh(geo('disc', () => new THREE.CircleGeometry(1, 20)), m, x, y, z);
    o.scale.set(r * sx, r * sy, 1);
    return o;
  };
  // black coat, white collar and bow tie
  g.add(flat(mat('#121014', { roughness: 0.9 }), 0.55, 0, 0.12, 1, 0.65, 0.035));
  g.add(flat(mat('#e8e2d4'), 0.14, 0, 0.5, 1, 0.8, 0.04));
  g.add(flat(mat('#6b1a1a'), 0.06, -0.07, 0.5, 1.4, 0.7, 0.045));
  g.add(flat(mat('#6b1a1a'), 0.06, 0.07, 0.5, 1.4, 0.7, 0.045));
  // a long, pale, stern face with a bald head and wild white side hair
  const skin = mat('#d8c7a6', { roughness: 0.8 });
  g.add(flat(skin, 0.28, 0, 0.88, 0.9, 1.15, 0.04));
  for (const s of [-1, 1]) {
    g.add(flat(mat('#e9e9ee'), 0.12, s * 0.27, 0.9, 0.9, 1.3, 0.045));   // side hair
    g.add(flat(mat('#e9e9ee'), 0.1, s * 0.15, 0.68, 0.9, 1.1, 0.05));    // mutton chops
  }
  const eyes = [];
  for (const s of [-1, 1]) {
    g.add(flat(mat('#f4efe2', { emissive: '#3a3a20', ei: 0.4 }), 0.07, s * 0.1, 0.94, 1, 0.85, 0.05));
    const pupil = flat(basic('#120a06'), 0.032, s * 0.1, 0.94, 1, 1, 0.056);
    g.add(pupil);
    eyes.push(pupil);
    const brow = box(mat('#e9e9ee'), 0.16, 0.035, 0.01, s * 0.1, 1.03, 0.055);
    brow.rotation.z = s * -0.35;
    g.add(brow);
  }
  // a monocle on one eye
  const mono = mesh(geo('mono', () => new THREE.TorusGeometry(0.085, 0.01, 6, 16)), mat('#c9a13a', { metalness: 0.8, roughness: 0.3 }), 0.1, 0.94, 0.06);
  g.add(mono);
  g.add(flat(mat('#c8b08e'), 0.04, 0, 0.84, 0.8, 1.4, 0.05));          // long nose
  g.add(box(mat('#5a2020'), 0.14, 0.02, 0.01, 0, 0.74, 0.055));         // thin frown
  g.userData = { eyes };
  return g;
}

// ---------------------------------------------------------------------------
// Hanging ceiling lamp (origin at the top)
// ---------------------------------------------------------------------------
export function makeCeilingLamp() {
  const g = new THREE.Group();
  const iron = mat('#1e1b22', { roughness: 0.4, metalness: 0.6 });
  g.add(cyl(iron, 0.12, 0.05, 0, -0.05, 0, 10));
  g.add(cyl(iron, 0.02, 0.75, 0, -0.75, 0, 6));
  const shadeG = geo('shade', () => new THREE.LatheGeometry([
    new THREE.Vector2(0.06, 0), new THREE.Vector2(0.12, -0.05), new THREE.Vector2(0.32, -0.3), new THREE.Vector2(0.4, -0.38),
  ], 14));
  const shade = mesh(shadeG, mat('#2f4a35', { roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide }), 0, -0.78, 0);
  g.add(shade);
  const bulbMat = matU('#fff1c4', { emissive: '#ffcf70', ei: 2 });
  g.add(sphere(bulbMat, 0.12, 0, -1.2, 0, 1, 1.2, 1));
  const glow = makeGlow('#ffcf70', 2.6, 0.7);
  glow.position.y = -1.22;
  g.add(glow);
  g.userData = { bulbMat, glow };
  return g;
}

// ---------------------------------------------------------------------------
// Hedge block for the outdoor maze (3 x 3 footprint)
// ---------------------------------------------------------------------------
export function makeHedge(seed = 0) {
  const v = ((seed % 4) + 4) % 4;
  const hg = geo('hedge' + v, () => {
    const r = rng(v * 977 + 31);
    const parts = [new THREE.BoxGeometry(2.8, 3.1, 2.8).translate(0, 1.55, 0)];
    const ico = (rad) => new THREE.IcosahedronGeometry(rad, 0);
    for (let i = 0; i < 40; i++) {
      const face = Math.floor(r() * 5), rad = 0.45 + r() * 0.4;
      let x = (r() - 0.5) * 2.4, y = 0.5 + r() * 2.6, z = (r() - 0.5) * 2.4;
      if (face === 0) x = 1.4 - rad * 0.6;
      else if (face === 1) x = -1.4 + rad * 0.6;
      else if (face === 2) z = 1.4 - rad * 0.6;
      else if (face === 3) z = -1.4 + rad * 0.6;
      else y = 3.1 + rad * 0.1;
      parts.push(ico(rad).translate(x, Math.min(y, 3.25), z));
    }
    return mergeAll(parts);
  });
  const g = new THREE.Group();
  g.add(mesh(hg, mat('#23401e', { roughness: 0.95, flat: true })));
  // a few darker leaves for depth
  const r = rng(v * 13 + 5);
  const leafM = mat('#1a3016', { roughness: 1, flat: true });
  for (let i = 0; i < 4; i++) {
    const s = sphere(leafM, 0.3 + r() * 0.2, (r() - 0.5) * 2.6, 0.4 + r() * 2.5, 1.38);
    if (i % 2) { s.position.z = -1.38; }
    g.add(s);
  }
  return g;
}

// ---------------------------------------------------------------------------
// Creepy playground swing
// ---------------------------------------------------------------------------
export function makeSwing() {
  const g = new THREE.Group();
  const metal = mat('#5a4a4c', { roughness: 0.6, metalness: 0.5 });
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  for (const s of [-1, 1]) {
    g.add(rod(metal, V(s * 1.5, 0, -0.9), V(s * 1.45, 3, 0), 0.06, 8));
    g.add(rod(metal, V(s * 1.5, 0, 0.9), V(s * 1.45, 3, 0), 0.06, 8));
  }
  g.add(rod(metal, V(-1.55, 3, 0), V(1.55, 3, 0), 0.07, 8));
  const seat = new THREE.Group();
  seat.position.set(0, 3, 0);
  const chain = mat('#8a8a90', { metalness: 0.8, roughness: 0.4 });
  for (const x of [-0.38, 0.38]) seat.add(rod(chain, V(x, 0, 0), V(x, -2.35, 0), 0.02, 4));
  seat.add(box(mat('#3a2a1e', { roughness: 0.8 }), 0.95, 0.08, 0.36, 0, -2.38, 0));
  g.add(seat);
  g.userData = { seat };
  return g;
}

// ---------------------------------------------------------------------------
// Chalkboard on an easel
// ---------------------------------------------------------------------------
export function makeChalkboard() {
  const g = new THREE.Group();
  const wood = mat('#6b4426', { roughness: 0.7 });
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  g.add(rod(wood, V(-1.0, 0, 0.3), V(-0.9, 2.9, -0.05), 0.05, 6));
  g.add(rod(wood, V(1.0, 0, 0.3), V(0.9, 2.9, -0.05), 0.05, 6));
  g.add(rod(wood, V(0, 0, -0.9), V(0, 2.85, -0.1), 0.045, 6));
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 300;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const board = new THREE.Group();
  board.add(box(wood, 2.4, 1.5, 0.08, 0, 0, -0.02));
  const face = new THREE.Mesh(geo('boardFace', () => new THREE.PlaneGeometry(2.2, 1.3)), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.12 }));
  face.position.z = 0.025;
  board.add(face);
  board.add(box(wood, 2.3, 0.06, 0.18, 0, -0.78, 0.07)); // chalk ledge
  board.add(box(basic('#f4f1ea'), 0.18, 0.04, 0.04, 0.6, -0.73, 0.1));
  board.position.set(0, 2.0, 0.1);
  board.rotation.x = -0.12;
  g.add(board);
  function setText(str) {
    const c = canvas.getContext('2d');
    c.fillStyle = '#1d2b22'; c.fillRect(0, 0, 512, 300);
    // old smudges
    for (let i = 0; i < 18; i++) {
      c.fillStyle = `rgba(220,230,220,${0.03 + Math.random() * 0.04})`;
      c.beginPath(); c.ellipse(Math.random() * 512, Math.random() * 300, 30 + Math.random() * 60, 10 + Math.random() * 20, Math.random(), 0, Math.PI * 2); c.fill();
    }
    if (str) {
      c.fillStyle = 'rgba(245,245,240,0.92)';
      c.font = 'bold 54px "Chalkboard SE", "Comic Sans MS", "Marker Felt", cursive';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      const words = String(str).split(' ');
      const lines = [];
      let line = '';
      for (const w of words) {
        const t = line ? line + ' ' + w : w;
        if (c.measureText(t).width > 470 && line) { lines.push(line); line = w; } else line = t;
      }
      if (line) lines.push(line);
      const lh = 62, y0 = 150 - (lines.length - 1) * lh / 2;
      lines.forEach((l, i) => {
        c.save();
        c.translate(256, y0 + i * lh);
        c.rotate((Math.random() - 0.5) * 0.04);
        c.fillText(l, 0, 0);
        c.restore();
      });
    }
    tex.needsUpdate = true;
  }
  setText('');
  g.userData = { setText, board };
  return g;
}

// ---------------------------------------------------------------------------
// Corner cobweb: origin at the corner (top left), strands spread right and down
// ---------------------------------------------------------------------------
export function makeCobweb() {
  const wg = geo('cobweb', () => {
    const parts = [];
    const strand = (a, b) => {
      const d = new THREE.Vector3().subVectors(b, a);
      const c = new THREE.CylinderGeometry(0.01, 0.01, d.length(), 4).translate(0, d.length() / 2, 0);
      c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
      c.translate(a.x, a.y, a.z);
      parts.push(c);
    };
    const N = 6, R = 1.2;
    const dirs = [];
    for (let i = 0; i < N; i++) {
      const a = (i / (N - 1)) * Math.PI / 2;
      dirs.push(new THREE.Vector3(Math.cos(a), -Math.sin(a), 0));
      strand(new THREE.Vector3(0, 0, 0), dirs[i].clone().multiplyScalar(R));
    }
    for (let ring = 1; ring <= 5; ring++) {
      const rr = R * ring / 5.6;
      for (let i = 0; i < N - 1; i++) {
        const sag = 0.92;
        const a = dirs[i].clone().multiplyScalar(rr), b = dirs[i + 1].clone().multiplyScalar(rr);
        const mid = a.clone().add(b).multiplyScalar(0.5 * sag);
        strand(a, mid); strand(mid, b);
      }
    }
    return mergeAll(parts);
  });
  const g = new THREE.Group();
  g.add(mesh(wg, basic('#d8d8e6', { opacity: 0.6 })));
  return g;
}

// ---------------------------------------------------------------------------
// Wrought-iron gate / fence section (3 wide x 3.5 tall)
// ---------------------------------------------------------------------------
export function makeGate() {
  const ig = geo('gateIron', () => {
    const parts = [];
    for (let i = 0; i < 10; i++) {
      const x = -1.2 + i * (2.4 / 9);
      const h = 3.0 - Math.abs(x) * 0.18;
      parts.push(new THREE.CylinderGeometry(0.035, 0.035, h, 6).translate(x, h / 2, 0));
      parts.push(new THREE.ConeGeometry(0.08, 0.25, 6).translate(x, h + 0.1, 0));
    }
    for (const y of [0.35, 2.4]) parts.push(new THREE.BoxGeometry(2.5, 0.07, 0.07).translate(0, y, 0));
    for (let i = 0; i < 4; i++) {
      const c = new THREE.TorusGeometry(0.14, 0.025, 5, 12).translate(-0.9 + i * 0.6, 2.62, 0);
      parts.push(c);
    }
    return mergeAll(parts);
  });
  const g = new THREE.Group();
  g.add(mesh(ig, mat('#1c1a22', { roughness: 0.4, metalness: 0.6 })));
  const stone = mat('#5d5868', { roughness: 0.9 });
  for (const s of [-1, 1]) {
    g.add(box(stone, 0.3, 3.3, 0.36, s * 1.35, 1.65, 0));
    g.add(box(stone, 0.4, 0.2, 0.46, s * 1.35, 3.4, 0));
  }
  return g;
}
