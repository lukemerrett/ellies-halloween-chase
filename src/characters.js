// Matilda and Miss Trunchbull, built from simple shapes.
// Both stand with their feet at y = 0 and face +Z. Limbs hang from pivot groups so the game can animate a walk.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mat, matU, basic } from './materials.js';

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
function sphere(m, r, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const o = mesh(geo('sph', () => new THREE.SphereGeometry(1, 16, 12)), m, x, y, z);
  o.scale.set(r * sx, r * sy, r * sz);
  return o;
}
// a tapered cylinder standing on (x, y, z)
function cyl(m, rTop, rBot, h, x = 0, y = 0, z = 0, seg = 12) {
  const ratio = Math.round((rTop / rBot) * 100) / 100;
  const g = geo(`cyl${ratio}_${seg}`, () => new THREE.CylinderGeometry(ratio, 1, 1, seg).translate(0, 0.5, 0));
  const o = mesh(g, m, x, y, z);
  o.scale.set(rBot, h, rBot);
  return o;
}
function rbox(m, w, h, d, r, x = 0, y = 0, z = 0) {
  const g = geo(`rb${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 3, r));
  return mesh(g, m, x, y, z);
}
// a rounded limb hanging straight down from the pivot, `len` long
function limb(m, r0, r1, len, seg = 10) {
  const g = new THREE.Group();
  g.add(cyl(m, r0, r1, len, 0, -len, 0, seg));
  g.add(sphere(m, r1, 0, -len, 0));
  return g;
}
function pivot(x, y, z) { const p = new THREE.Group(); p.position.set(x, y, z); return p; }
// a thin curved stroke (eyebrow, mouth) as part of a torus
function arc(m, r, tube, a, x, y, z, rotZ = 0) {
  const g = geo(`arc${r},${tube},${a}`, () => new THREE.TorusGeometry(r, tube, 6, 12, a));
  const o = mesh(g, m, x, y, z);
  o.rotation.z = rotZ;
  return o;
}

// ---------------------------------------------------------------------------
// Matilda: about 1.4 tall
// ---------------------------------------------------------------------------
export function makeMatilda() {
  const g = new THREE.Group();
  const skin = mat('#f2c9a6', { roughness: 0.7 });
  const hair = mat('#4a2d1b', { roughness: 0.6, side: THREE.DoubleSide });
  const navy = mat('#1f2f6b', { roughness: 0.7 });
  const white = mat('#f4f1ea', { roughness: 0.8 });
  const shoe = mat('#141016', { roughness: 0.35, metalness: 0.2 });
  const red = mat('#d0182b', { roughness: 0.5 });
  const dark = basic('#1a0f0a');

  // legs: skin knees, white knee socks and shiny black shoes
  const legs = [];
  for (const s of [-1, 1]) {
    const p = pivot(s * 0.085, 0.56, 0);
    p.add(cyl(skin, 0.055, 0.05, 0.18, 0, -0.18, 0));
    p.add(cyl(white, 0.058, 0.052, 0.3, 0, -0.47, 0));
    const toe = rbox(shoe, 0.13, 0.09, 0.22, 0.04, 0, -0.51, 0.035);
    p.add(toe);
    g.add(p);
    legs.push(p);
  }

  // pinafore: a flared skirt and a bodice over a white blouse
  // lathe profiles run bottom to top so the faces point outwards
  const skirtG = geo('mskirt', () => new THREE.LatheGeometry([
    new THREE.Vector2(0.001, 0.46), new THREE.Vector2(0.33, 0.46), new THREE.Vector2(0.3, 0.55),
    new THREE.Vector2(0.22, 0.75), new THREE.Vector2(0.17, 0.86), new THREE.Vector2(0.001, 0.86),
  ], 16));
  g.add(mesh(skirtG, navy));
  g.add(rbox(white, 0.34, 0.24, 0.22, 0.08, 0, 0.94, 0));   // blouse
  g.add(rbox(navy, 0.3, 0.2, 0.235, 0.05, 0, 0.92, 0));      // bodice
  for (const s of [-1, 1]) {                                  // straps
    const strap = rbox(navy, 0.06, 0.16, 0.25, 0.02, s * 0.1, 1.02, 0);
    g.add(strap);
  }
  // a round white collar
  const collar = mesh(geo('mcollar', () => new THREE.TorusGeometry(0.1, 0.035, 6, 14)), white, 0, 1.05, 0);
  collar.rotation.x = Math.PI / 2;
  g.add(collar);

  // arms with puffed sleeves
  const arms = [];
  for (const s of [-1, 1]) {
    const p = pivot(s * 0.2, 1.0, 0);
    p.add(sphere(white, 0.075, 0, -0.03, 0));
    const a = limb(skin, 0.042, 0.038, 0.32);
    a.position.y = -0.04;
    p.add(a);
    p.add(sphere(skin, 0.05, 0, -0.38, 0.01));
    p.rotation.z = s * 0.12;
    g.add(p);
    arms.push(p);
  }

  // head
  const head = pivot(0, 1.12, 0);
  head.add(cyl(skin, 0.045, 0.05, 0.08, 0, -0.08, 0));
  head.add(sphere(skin, 0.215, 0, 0.03, 0, 1, 1.02, 0.98));
  // bob haircut: open at the face, falling to the jaw, with a straight fringe
  const bobG = geo('mbob', () => new THREE.SphereGeometry(0.245, 18, 12, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0, Math.PI * 0.66));
  const bob = mesh(bobG, hair, 0, 0.05, -0.005);
  bob.scale.set(1.08, 1.08, 1.04);
  head.add(bob);
  const fringeG = geo('mfringe', () => new THREE.SphereGeometry(0.24, 14, 8, Math.PI / 2 - 1.05, 2.1, 0, Math.PI * 0.3));
  const fringe = mesh(fringeG, hair, 0, 0.05, 0.004);
  fringe.scale.set(1.06, 1.06, 1.08);
  head.add(fringe);
  // the bob's rounded ends at the jaw
  for (const s of [-1, 1]) head.add(sphere(hair, 0.09, s * 0.2, -0.08, -0.02, 0.7, 1, 1.1));
  head.add(sphere(hair, 0.16, 0, -0.06, -0.1, 1.45, 0.8, 1));
  // a red ribbon bow on the back of her head, easy to see from behind
  const bow = new THREE.Group();
  for (const s of [-1, 1]) {
    const loop = sphere(red, 0.085, s * 0.09, 0, 0, 1.1, 0.75, 0.45);
    loop.rotation.z = s * 0.35;
    bow.add(loop);
    const tail = rbox(red, 0.04, 0.12, 0.02, 0.01, s * 0.04, -0.09, 0);
    tail.rotation.z = s * 0.35;
    bow.add(tail);
  }
  bow.add(sphere(mat('#a8101f', { roughness: 0.5 }), 0.04, 0, 0, 0.01));
  bow.scale.setScalar(1.35);
  bow.position.set(0, 0.17, -0.2);
  bow.rotation.x = -0.6;
  head.add(bow);

  // big friendly eyes; the irises glow when she uses her power
  const eyeMats = [];
  for (const s of [-1, 1]) {
    head.add(sphere(white, 0.055, s * 0.075, 0.04, 0.185, 1, 1.15, 0.5));
    const im = matU('#4a2c16', { roughness: 0.3, emissive: '#000000', ei: 1 });
    eyeMats.push(im);
    head.add(sphere(im, 0.035, s * 0.075, 0.035, 0.205, 1, 1.15, 0.5));
    head.add(sphere(dark, 0.017, s * 0.075, 0.035, 0.222, 1, 1, 0.4));
    head.add(sphere(basic('#ffffff'), 0.008, s * 0.065, 0.05, 0.226));
    // little eyebrows
    head.add(arc(hair, 0.045, 0.008, Math.PI * 0.7, s * 0.075, 0.1, 0.205, Math.PI * 0.15));
    head.add(sphere(mat('#f29a9a', { roughness: 0.8 }), 0.035, s * 0.13, -0.03, 0.17, 1, 0.6, 0.4));
  }
  head.add(sphere(mat('#e9b48f', { roughness: 0.7 }), 0.022, 0, -0.01, 0.215));
  head.add(arc(mat('#9c3b3b'), 0.04, 0.009, Math.PI * 0.8, 0, -0.06, 0.2, Math.PI * 1.1));
  g.add(head);

  g.userData = { legL: legs[0], legR: legs[1], armL: arms[0], armR: arms[1], head, eyeMats, height: 1.4 };
  return g;
}

// ---------------------------------------------------------------------------
// Miss Trunchbull: about 2.5 tall and nearly as wide as a doorway
// ---------------------------------------------------------------------------
export function makeTrunchbull() {
  const g = new THREE.Group();
  const skin = mat('#d99a7c', { roughness: 0.7 });
  const smock = mat('#7d6840', { roughness: 0.85 });
  const smockDark = mat('#54442a', { roughness: 0.85 });
  const breeches = mat('#3d5a2e', { roughness: 0.8 });
  const stocking = mat('#7d7b80', { roughness: 0.95 });
  const boot = mat('#110d10', { roughness: 0.3, metalness: 0.25 });
  const leather = mat('#3a2414', { roughness: 0.5 });
  const brass = mat('#c9a13a', { roughness: 0.3, metalness: 0.8 });
  const hair = mat('#8d8a90', { roughness: 0.8 });
  const brow = mat('#4a4448', { roughness: 0.9 });
  const silver = mat('#d8d8e0', { roughness: 0.2, metalness: 0.9 });

  // legs: huge boots, thick stockings and puffed riding breeches
  const legs = [];
  for (const s of [-1, 1]) {
    const p = pivot(s * 0.27, 1.05, 0);
    p.add(sphere(breeches, 0.25, 0, -0.18, 0, 1, 1.25, 1));                 // puffed thigh
    p.add(cyl(breeches, 0.2, 0.15, 0.25, 0, -0.5, 0));
    p.add(cyl(stocking, 0.15, 0.13, 0.32, 0, -0.78, 0));                    // stocking
    p.add(cyl(boot, 0.16, 0.18, 0.2, 0, -0.97, 0));                         // boot top
    p.add(rbox(boot, 0.36, 0.2, 0.58, 0.08, 0, -0.95, 0.1));                // boot foot
    p.add(rbox(mat('#2a1f1a'), 0.38, 0.05, 0.6, 0.02, 0, -1.03, 0.1));      // sole
    g.add(p);
    legs.push(p);
  }

  // body: a long smock with a flared hem, a wide belt and a brass buckle
  const smockG = geo('tsmock', () => new THREE.LatheGeometry([
    new THREE.Vector2(0.001, 0.86), new THREE.Vector2(0.68, 0.86), new THREE.Vector2(0.6, 1.1),
    new THREE.Vector2(0.56, 1.3), new THREE.Vector2(0.62, 1.55), new THREE.Vector2(0.6, 1.85),
    new THREE.Vector2(0.38, 1.98), new THREE.Vector2(0.001, 2.0),
  ], 16));
  const body = mesh(smockG, smock);
  body.scale.set(1, 1, 0.72);
  g.add(body);
  const beltG = geo('tbelt', () => new THREE.CylinderGeometry(0.585, 0.585, 0.16, 16, 1, true));
  const belt = mesh(beltG, leather, 0, 1.3, 0);
  belt.scale.set(1, 1, 0.74);
  g.add(belt);
  g.add(rbox(brass, 0.2, 0.17, 0.05, 0.02, 0, 1.3, 0.43));
  g.add(rbox(leather, 0.11, 0.08, 0.06, 0.02, 0, 1.3, 0.45));
  // pockets and buttons down the front
  for (const s of [-1, 1]) g.add(rbox(smockDark, 0.24, 0.2, 0.04, 0.03, s * 0.3, 1.05, 0.45));
  for (const y of [1.5, 1.68, 1.86]) g.add(sphere(brass, 0.03, 0, y, 0.44, 1, 1, 0.5));

  // massive shoulders and arms ending in big fists
  const arms = [];
  for (const s of [-1, 1]) {
    g.add(sphere(smock, 0.24, s * 0.58, 1.86, 0, 1, 0.85, 0.9));
    const p = pivot(s * 0.66, 1.84, 0);
    p.add(limb(smock, 0.17, 0.15, 0.45));                                   // sleeve
    const fore = limb(skin, 0.13, 0.12, 0.38);
    fore.position.y = -0.45;
    p.add(fore);
    p.add(sphere(skin, 0.17, 0, -0.92, 0.02, 1, 0.95, 1.05));               // fist
    p.add(sphere(skin, 0.07, s * -0.06, -0.86, 0.13));                      // thumb
    p.rotation.z = s * 0.14;
    g.add(p);
    arms.push(p);
  }

  // thick neck and a square, scowling head
  g.add(cyl(skin, 0.17, 0.2, 0.18, 0, 1.95, 0));
  const head = pivot(0, 2.12, 0);
  head.add(rbox(skin, 0.5, 0.46, 0.46, 0.16, 0, 0.12, 0));                  // skull
  head.add(rbox(skin, 0.56, 0.24, 0.44, 0.1, 0, -0.04, 0.02));              // square jaw
  // grey hair scraped back into a tight bun
  const capG = geo('tcap', () => new THREE.SphereGeometry(0.29, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.42));
  const cap = mesh(capG, hair, 0, 0.18, -0.04);
  cap.scale.set(0.95, 1, 0.95);
  head.add(cap);
  head.add(sphere(hair, 0.13, 0, 0.36, -0.22));
  head.add(sphere(hair, 0.06, 0, 0.3, -0.31));
  for (const s of [-1, 1]) head.add(sphere(skin, 0.07, s * 0.27, 0.08, 0, 0.5, 1, 0.8)); // ears
  // small mean eyes under heavy angry brows; they glow red when she spots you
  const eyeMats = [];
  for (const s of [-1, 1]) {
    head.add(sphere(mat('#f1e8dc'), 0.06, s * 0.12, 0.16, 0.225, 1, 0.7, 0.45));
    const em = matU('#1b1214', { roughness: 0.3, emissive: '#000000', ei: 2 });
    eyeMats.push(em);
    head.add(sphere(em, 0.028, s * 0.12, 0.16, 0.245, 1, 1, 0.5));
    const b = rbox(brow, 0.2, 0.06, 0.07, 0.02, s * 0.12, 0.25, 0.235);
    b.rotation.z = s * 0.4; // inner ends down: a fierce scowl
    head.add(b);
  }
  head.add(sphere(mat('#c97f63'), 0.07, 0, 0.07, 0.25, 0.9, 1.1, 0.9));     // bulbous nose
  const mouth = arc(mat('#5a1f1f'), 0.07, 0.014, Math.PI * 0.7, 0, -0.07, 0.235, Math.PI * 0.15);
  head.add(mouth);
  head.add(sphere(skin, 0.05, 0, -0.17, 0.22, 2, 0.8, 0.8));                // chin
  g.add(head);

  // a whistle on a cord
  const cord = mesh(geo('tcord', () => new THREE.TorusGeometry(0.22, 0.012, 5, 18, Math.PI)), mat('#2a2a2a'), 0, 1.97, 0.12);
  cord.rotation.set(Math.PI / 2 + 0.9, 0, Math.PI);
  g.add(cord);
  const whistle = new THREE.Group();
  whistle.add(cyl(silver, 0.045, 0.045, 0.12, 0, 0, 0));
  const mouthpiece = rbox(silver, 0.05, 0.03, 0.1, 0.01, 0, 0.1, 0.03);
  whistle.add(mouthpiece);
  whistle.position.set(0, 1.62, 0.45);
  whistle.rotation.x = 0.4;
  g.add(whistle);

  g.userData = { legL: legs[0], legR: legs[1], armL: arms[0], armR: arms[1], head, eyeMats, body, height: 2.5 };
  return g;
}
