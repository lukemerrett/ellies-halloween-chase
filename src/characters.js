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
  const o = mesh(geo('sph', () => new THREE.SphereGeometry(1, 20, 14)), m, x, y, z);
  o.scale.set(r * sx, r * sy, r * sz);
  return o;
}
// a tapered cylinder standing on (x, y, z)
function cyl(m, rTop, rBot, h, x = 0, y = 0, z = 0, seg = 16) {
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
// a capsule hanging down from (x, y, z), `len` long overall
function capsule(m, r, len, x = 0, y = 0, z = 0) {
  const g = geo(`cap${r},${len}`, () => new THREE.CapsuleGeometry(r, Math.max(0.001, len - 2 * r), 6, 14).translate(0, -len / 2, 0));
  return mesh(g, m, x, y, z);
}
// a solid of revolution; `pts` are [radius, y] pairs from the bottom up so the faces point outwards
function lathe(m, key, pts, seg = 24, sz = 1, phiStart = 0, phiLen = Math.PI * 2) {
  const g = geo(key, () => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg, phiStart, phiLen));
  const o = mesh(g, m);
  o.scale.z = sz;
  return o;
}
// a skirt or coat tail: an open cone whose rim folds in and out, with an optional opening at the front
function folds(m, key, rTop, rBot, h, n, depth, sharp, gap = 0) {
  const g = geo(key, () => {
    const seg = n * 2;
    const c = new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, true, gap / 2, Math.PI * 2 - gap);
    const p = c.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const j = i % (seg + 1);
      const k = sharp ? (j % 2 ? 1 : -1) : Math.sin((j / seg) * n * Math.PI * 2);
      // folds grow towards the hem
      const f = 1 + depth * k * (p.getY(i) < 0 ? 1 : 0.35);
      p.setXYZ(i, p.getX(i) * f, p.getY(i), p.getZ(i) * f);
    }
    c.translate(0, h / 2, 0);
    const out = sharp ? c.toNonIndexed() : c;
    out.computeVertexNormals();
    return out;
  });
  return mesh(g, m);
}
// a curved strap, cord or seam through a list of points
function tube(m, pts, r, seg = 32) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  return mesh(new THREE.TubeGeometry(curve, seg, r, 6, false), m);
}
function pivot(x, y, z) { const p = new THREE.Group(); p.position.set(x, y, z); return p; }
// a thin curved stroke (eyebrow, mouth, lash line) as part of a torus; the arc is centred on angle `mid`
function arc(m, r, tube, a, x, y, z, mid = Math.PI / 2) {
  const g = geo(`arc${r},${tube},${a}`, () => new THREE.TorusGeometry(r, tube, 6, 16, a));
  const o = mesh(g, m, x, y, z);
  o.rotation.z = mid - a / 2;
  return o;
}
// A hand hanging from the wrist, palm towards the body (`s` is -1 for the right side, +1 for the left).
// An open hand has four fingers and a thumb; a fist has a row of knuckles and curled fingers.
function hand(m, size, s, fist) {
  const h = new THREE.Group();
  if (!fist) {
    h.add(sphere(m, size, 0, -size * 0.85, 0, 0.5, 0.95, 0.85));
    for (let i = 0; i < 4; i++) {
      const f = capsule(m, size * 0.19, size * (i === 0 || i === 3 ? 0.7 : 0.85), 0, -size * 1.45, (i - 1.5) * size * 0.36);
      f.rotation.z = s * 0.15;
      f.rotation.x = (i - 1.5) * -0.06;
      h.add(f);
    }
    const th = capsule(m, size * 0.2, size * 0.75, -s * size * 0.15, -size * 0.6, size * 0.6);
    th.rotation.set(0.7, 0, s * 0.3);
    h.add(th);
  } else {
    h.add(sphere(m, size, 0, -size, 0, 0.8, 1, 0.95));
    for (let i = 0; i < 4; i++) {
      const z = (i - 1.5) * size * 0.46;
      h.add(sphere(m, size * 0.3, s * size * 0.12, -size * 1.72, z));                 // knuckle
      const f = capsule(m, size * 0.26, size * 0.75, -s * size * 0.1, -size * 1.55, z); // curled finger
      f.rotation.z = s * Math.PI / 2;
      h.add(f);
    }
    const th = capsule(m, size * 0.27, size * 0.8, -s * size * 0.45, -size * 0.9, size * 0.72);
    th.rotation.z = s * 0.25;
    h.add(th);
  }
  return h;
}

// ---------------------------------------------------------------------------
// Matilda: about 1.4 tall. A clever, bright-eyed schoolgirl with a dark bob, a red ribbon,
// a navy pleated pinafore over a white blouse, a red tie and a leather satchel on her back.
// ---------------------------------------------------------------------------
export function makeMatilda() {
  const g = new THREE.Group();
  const skin = mat('#f3cba8', { roughness: 0.65 });
  const skinShade = mat('#e3a987', { roughness: 0.7 });
  const hair = mat('#4a2a17', { roughness: 0.45, side: THREE.DoubleSide });
  const hairShine = mat('#7a5034', { roughness: 0.35 });
  const navy = mat('#22306e', { roughness: 0.75 });
  const navyDark = mat('#161f4a', { roughness: 0.8 });
  const white = mat('#f4f1ea', { roughness: 0.8 });
  const sock = mat('#9c9aa6', { roughness: 0.95 });
  const shoe = mat('#141016', { roughness: 0.3, metalness: 0.25 });
  const red = mat('#d3192e', { roughness: 0.5 });
  const leather = mat('#93602f', { roughness: 0.6 });
  const leatherDark = mat('#62401f', { roughness: 0.65 });
  const brass = mat('#d8b14a', { roughness: 0.3, metalness: 0.8 });
  const dark = basic('#1a0f0a');

  // legs: knees, grey knee socks with a turned-down cuff, and shiny buckled Mary Jane shoes
  const legs = [];
  for (const s of [-1, 1]) {
    const p = pivot(s * 0.085, 0.56, 0);
    p.add(capsule(skin, 0.05, 0.28, 0, 0, 0));                           // thigh and knee
    p.add(cyl(sock, 0.053, 0.046, 0.25, 0, -0.5, 0));                   // knee sock
    const cuff = mesh(geo('mcuff', () => new THREE.TorusGeometry(0.052, 0.014, 6, 16)), sock, 0, -0.25, 0);
    cuff.rotation.x = Math.PI / 2;
    p.add(cuff);
    p.add(sphere(shoe, 0.07, 0, -0.515, 0.045, 0.85, 0.62, 1.55));      // rounded toe and vamp
    p.add(rbox(shoe, 0.12, 0.07, 0.1, 0.03, 0, -0.52, -0.035));         // heel
    p.add(rbox(mat('#2a1e1c'), 0.13, 0.025, 0.24, 0.01, 0, -0.553, 0.02)); // sole
    p.add(rbox(shoe, 0.135, 0.02, 0.03, 0.008, 0, -0.475, 0.025));      // strap over the instep
    p.add(rbox(brass, 0.025, 0.026, 0.035, 0.006, -s * 0.066, -0.476, 0.025)); // buckle on the outside
    g.add(p);
    legs.push(p);
  }

  // pleated pinafore skirt
  const skirt = folds(navy, 'mskirt', 0.17, 0.28, 0.4, 12, 0.06, true);
  skirt.position.y = 0.44;
  skirt.scale.z = 0.86;
  g.add(skirt);
  const hem = mesh(geo('mhem', () => new THREE.TorusGeometry(0.28, 0.008, 4, 36)), navyDark, 0, 0.445, 0);
  hem.rotation.x = Math.PI / 2;
  hem.scale.y = 0.86;
  g.add(hem);

  // white blouse, with the pinafore bodice over the front and back
  g.add(lathe(white, 'mblouse', [[0.001, 0.8], [0.16, 0.8], [0.165, 0.88], [0.178, 0.96], [0.175, 1.02], [0.14, 1.06], [0.07, 1.085], [0.001, 1.09]], 24, 0.76));
  g.add(lathe(navy, 'mbodice', [[0.001, 0.79], [0.172, 0.79], [0.176, 0.86], [0.186, 0.94], [0.186, 0.955], [0.001, 0.956]], 24, 0.78));
  g.add(rbox(navy, 0.2, 0.13, 0.03, 0.012, 0, 0.955, 0.128));            // bib
  g.add(rbox(navyDark, 0.3, 0.035, 0.015, 0.008, 0, 0.82, 0.13));        // waistband seam
  // straps over the shoulders, crossing at the back
  for (const s of [-1, 1]) {
    g.add(tube(navy, [[s * 0.075, 0.95, 0.14], [s * 0.1, 1.03, 0.11], [s * 0.115, 1.075, 0.02], [s * 0.1, 1.06, -0.08], [s * 0.02, 1.0, -0.13], [-s * 0.08, 0.95, -0.14]], 0.017, 20));
    g.add(sphere(white, 0.016, s * 0.075, 0.95, 0.15, 1, 1, 0.5));     // strap buttons
  }
  // round collar and a red tie
  for (const s of [-1, 1]) {
    const c = sphere(white, 0.055, s * 0.042, 1.075, 0.072, 1, 0.3, 0.8);
    c.rotation.set(0.5, 0, -s * 0.35);
    g.add(c);
  }
  g.add(sphere(red, 0.02, 0, 1.065, 0.105, 1, 0.9, 0.7));                // knot
  const tie = rbox(red, 0.04, 0.09, 0.012, 0.005, 0, 1.015, 0.13);
  tie.rotation.x = -0.25;
  g.add(tie);

  // a leather satchel on her back, worn across the body from the left shoulder
  const bag = new THREE.Group();
  bag.add(rbox(leather, 0.24, 0.17, 0.075, 0.025, 0, 0, 0));
  bag.add(rbox(leatherDark, 0.245, 0.1, 0.02, 0.012, 0, 0.045, -0.035));  // flap
  for (const x of [-0.06, 0.06]) {
    bag.add(rbox(leatherDark, 0.025, 0.09, 0.012, 0.004, x, 0.0, -0.045)); // buckle straps
    bag.add(rbox(brass, 0.032, 0.024, 0.012, 0.004, x, -0.01, -0.05));
  }
  bag.position.set(0.05, 0.84, -0.195);
  bag.rotation.set(0.12, 0, -0.1);
  g.add(bag);
  g.add(tube(leatherDark, [[0.16, 0.89, -0.18], [0.04, 0.99, -0.155], [-0.1, 1.07, -0.06], [-0.12, 1.085, 0.03], [-0.07, 1.02, 0.14], [0.06, 0.92, 0.145], [0.15, 0.86, 0.1], [0.19, 0.84, -0.04], [0.17, 0.86, -0.16]], 0.013, 40));

  // arms: long white sleeves with cuffs, and small hands
  const arms = [];
  for (const s of [-1, 1]) {
    const p = pivot(s * 0.19, 1.02, 0);
    p.add(sphere(white, 0.058, 0, -0.02, 0, 1, 1.1, 1));                  // shoulder
    p.add(capsule(white, 0.046, 0.3, 0, 0, 0));
    p.add(cyl(white, 0.044, 0.046, 0.04, 0, -0.31, 0));                   // cuff
    const hd = hand(skin, 0.04, s, false);
    hd.position.y = -0.31;
    p.add(hd);
    p.rotation.z = s * 0.2;
    g.add(p);
    arms.push(p);
  }

  // head: everything inside `hd` is measured from the middle of her face
  const head = pivot(0, 1.07, 0);
  head.add(cyl(skin, 0.04, 0.045, 0.07, 0, -0.01, 0));                  // neck
  const hd = new THREE.Group();
  hd.position.y = 0.15;
  head.add(hd);
  const R = 0.19;
  hd.add(sphere(skin, R, 0, 0, 0, 1, 1.02, 0.97));
  for (const s of [-1, 1]) hd.add(sphere(skin, 0.04, s * 0.185, -0.01, -0.01, 0.5, 1, 0.8)); // ears

  // a glossy bob: fuller at the sides and tucked under at the jaw, with a straight fringe
  const GAP = 1.45;
  hd.add(lathe(hair, 'mbob', [[0.165, -0.118], [0.198, -0.102], [0.216, -0.065], [0.222, -0.005], [0.216, 0.055], [0.2, 0.11], [0.166, 0.157], [0.1, 0.193], [0.001, 0.208]], 32, 1, GAP / 2, Math.PI * 2 - GAP));
  // the ends at the front corners curl in towards her chin
  for (const s of [-1, 1]) hd.add(sphere(hair, 0.034, s * 0.168, -0.098, 0.1, 0.9, 0.6, 1.2));
  const fringe = mesh(geo('mfringe', () => new THREE.SphereGeometry(0.207, 32, 12, 0, Math.PI * 2, 0, Math.PI * 0.35)), hair, 0, 0.003, 0.004);
  fringe.scale.set(1, 1, 1.03);
  hd.add(fringe);
  // glossy strands catching the light down the back and sides
  for (let k = 0; k < 9; k++) {
    const phi = GAP / 2 + 0.25 + (k / 8) * (Math.PI * 2 - GAP - 0.5);
    const st = mesh(geo('mstrand', () => new THREE.TorusGeometry(0.221, 0.0045, 4, 14, 1.05)), hairShine, 0, 0, 0);
    st.rotation.set(0, phi - Math.PI / 2, -0.32);
    hd.add(st);
  }
  // red ribbon: a band over the top of her head and a big bow, easy to spot from behind
  const band = mesh(geo('mband', () => new THREE.TorusGeometry(0.214, 0.013, 6, 28, Math.PI)), red, 0, 0, -0.01);
  band.rotation.x = -0.45;
  hd.add(band);
  const bow = new THREE.Group();
  for (const s of [-1, 1]) {
    const loop = sphere(red, 0.06, s * 0.062, 0, 0, 1.15, 0.72, 0.42);
    loop.rotation.z = s * 0.3;
    bow.add(loop);
    const tail = rbox(red, 0.03, 0.09, 0.012, 0.006, s * 0.025, -0.07, -0.01);
    tail.rotation.z = s * 0.3;
    bow.add(tail);
  }
  bow.add(sphere(mat('#a5101f', { roughness: 0.5 }), 0.028, 0, 0, 0.012));
  bow.scale.setScalar(1.45);
  bow.position.set(0.09, 0.17, -0.11);
  bow.rotation.set(-0.6, 0.6, 0.3);
  hd.add(bow);

  // big bright eyes with lashes; the irises glow when she uses her power
  const eyeMats = [];
  for (const s of [-1, 1]) {
    const ex = s * 0.07, ey = 0.0;
    hd.add(sphere(white, 0.05, ex, ey, 0.163, 1, 1.18, 0.45));
    const im = matU('#5a3214', { roughness: 0.3, emissive: '#000000', ei: 1 });
    eyeMats.push(im);
    hd.add(sphere(im, 0.033, ex + s * 0.003, ey - 0.004, 0.178, 1, 1.12, 0.45));
    hd.add(sphere(dark, 0.017, ex + s * 0.003, ey - 0.004, 0.188, 1, 1.1, 0.4));
    hd.add(sphere(basic('#ffffff'), 0.009, ex - 0.011, ey + 0.016, 0.193));
    hd.add(arc(dark, 0.051, 0.0075, Math.PI * 0.85, ex, ey + 0.002, 0.172));        // upper lash line
    const flick = capsule(dark, 0.006, 0.026, ex + s * 0.048, ey + 0.03, 0.163);     // outer lash
    flick.rotation.z = s * 2.2;
    hd.add(flick);
    // eyebrows, the left one raised a little: bright and curious
    hd.add(arc(hair, 0.05, 0.009, Math.PI * 0.55, ex, ey + (s > 0 ? 0.042 : 0.032), 0.18, Math.PI / 2 + s * 0.12));
    hd.add(sphere(mat('#f3a0a0', { roughness: 0.8 }), 0.03, s * 0.112, -0.055, 0.15, 1.1, 0.65, 0.4)); // cheeks
  }
  hd.add(sphere(skinShade, 0.018, 0, -0.04, 0.188, 1, 0.9, 1));          // button nose
  // a small confident smile, a little higher on one side
  hd.add(arc(mat('#a23a3a'), 0.034, 0.0075, Math.PI * 0.7, 0.004, -0.072, 0.17, -Math.PI / 2 + 0.18));
  g.add(head);

  g.userData = { legL: legs[0], legR: legs[1], armL: arms[0], armR: arms[1], head, eyeMats, height: 1.4 };
  return g;
}

// ---------------------------------------------------------------------------
// Miss Trunchbull: about 2.5 tall and nearly as wide as a doorway. An army-green belted greatcoat with
// lapels, epaulettes and medal ribbons over a shirt and red tie; khaki jodhpurs, laced brown boots,
// a gold whistle, a ring of keys, and grey hair scraped back into a tight bun.
// ---------------------------------------------------------------------------
export function makeTrunchbull() {
  const g = new THREE.Group();
  const skin = mat('#dd9e80', { roughness: 0.7 });
  const skinShade = mat('#c47c62', { roughness: 0.75 });
  const coat = mat('#4e5a30', { roughness: 0.85 });
  const coatIn = mat('#4e5a30', { roughness: 0.85, side: THREE.DoubleSide });
  const coatDark = mat('#38421f', { roughness: 0.85 });
  const khaki = mat('#77693f', { roughness: 0.85 });
  const boot = mat('#4b2c17', { roughness: 0.4, metalness: 0.15 });
  const sole = mat('#1c1410', { roughness: 0.8 });
  const lace = mat('#c9b48a', { roughness: 0.9 });
  const belt = mat('#5c3a1c', { roughness: 0.55 });
  const brass = mat('#d2a83c', { roughness: 0.28, metalness: 0.85 });
  const white = mat('#ece8de', { roughness: 0.8 });
  const red = mat('#a01c24', { roughness: 0.6 });
  const lip = mat('#8a3b35', { roughness: 0.7 });
  const hair = mat('#9a979c', { roughness: 0.75 });
  const hairDark = mat('#6c6970', { roughness: 0.8 });
  const brow = mat('#4b454a', { roughness: 0.9 });
  const cord = mat('#2a2a2a');
  const dark = basic('#1a0d0d');

  // legs: puffed jodhpurs, tall laced boots with thick soles
  const legs = [];
  for (const s of [-1, 1]) {
    const p = pivot(s * 0.26, 1.05, 0);
    const jod = lathe(khaki, 'tjod', [[0.13, -0.6], [0.15, -0.52], [0.22, -0.36], [0.265, -0.2], [0.25, -0.05], [0.21, 0.05], [0.001, 0.07]], 20);
    jod.scale.x = 1.12;
    p.add(jod);
    p.add(lathe(boot, 'tboot', [[0.155, -1.0], [0.16, -0.82], [0.152, -0.66], [0.16, -0.54], [0.15, -0.52], [0.001, -0.515]], 20));
    p.add(rbox(boot, 0.3, 0.17, 0.42, 0.08, 0, -0.95, 0.1));             // foot
    p.add(sphere(boot, 0.15, 0, -0.95, 0.26, 1, 0.62, 0.9));              // round toe cap
    p.add(rbox(sole, 0.33, 0.06, 0.56, 0.02, 0, -1.02, 0.1));             // sole
    p.add(rbox(sole, 0.28, 0.08, 0.15, 0.02, 0, -0.99, -0.12));           // heel
    // criss-cross laces up the front of the boot, with brass hooks
    for (let k = 0; k < 4; k++) {
      const y = -0.87 + k * 0.075;
      for (const d of [-1, 1]) {
        const l = rbox(lace, 0.11, 0.014, 0.012, 0.005, 0, y, 0.162);
        l.rotation.z = d * 0.45;
        p.add(l);
        p.add(sphere(brass, 0.012, d * 0.055, y + 0.03, 0.155));
      }
    }
    p.add(rbox(boot, 0.34, 0.035, 0.1, 0.012, 0, -0.53, 0.06));           // boot top fold at the front
    g.add(p);
    legs.push(p);
  }
  g.add(sphere(khaki, 0.3, 0, 1.06, 0, 1.25, 0.5, 0.8));                // seat, so there's no gap between the legs

  // greatcoat body: a barrel chest, and long tails split at the front
  const body = lathe(coat, 'tbody', [[0.001, 1.2], [0.565, 1.2], [0.58, 1.34], [0.615, 1.52], [0.64, 1.7], [0.6, 1.86], [0.46, 1.97], [0.25, 2.03], [0.001, 2.04]], 28, 0.74);
  g.add(body);
  const tails = folds(coatIn, 'ttails', 0.585, 0.72, 0.56, 9, 0.035, false, 0.42);
  tails.position.y = 0.74;
  tails.scale.z = 0.78;
  g.add(tails);
  // the back vent
  g.add(rbox(coatDark, 0.025, 0.4, 0.04, 0.01, 0, 0.98, -0.53));
  // wide belt with a big brass buckle, a pouch at the back and a ring of keys
  const bl = mesh(geo('tbelt', () => new THREE.CylinderGeometry(0.61, 0.61, 0.15, 28, 1, true)), belt, 0, 1.29, 0);
  bl.scale.z = 0.8;
  g.add(bl);
  g.add(rbox(brass, 0.21, 0.17, 0.04, 0.025, 0, 1.29, 0.49));
  g.add(rbox(belt, 0.13, 0.09, 0.05, 0.015, 0, 1.29, 0.497));
  g.add(rbox(brass, 0.02, 0.1, 0.06, 0.005, 0.02, 1.29, 0.505));
  g.add(rbox(belt, 0.22, 0.22, 0.1, 0.04, 0.3, 1.2, -0.43));             // pouch
  g.add(rbox(mat('#46290f', { roughness: 0.55 }), 0.23, 0.08, 0.11, 0.03, 0.3, 1.28, -0.43));
  const ring = mesh(geo('tring', () => new THREE.TorusGeometry(0.05, 0.008, 6, 16)), brass, -0.52, 1.2, 0.2);
  ring.rotation.y = 1.0;
  g.add(ring);
  for (const [a, l] of [[-0.3, 0.12], [0.1, 0.1], [0.45, 0.13]]) {
    const key = rbox(brass, 0.022, l, 0.008, 0.004, -0.52 + Math.sin(a) * 0.03, 1.13 - l / 2 + 0.03, 0.22 + Math.sin(a) * 0.03);
    key.rotation.set(0, 1.0, a);
    g.add(key);
  }

  // shirt collar and red tie in the V of the lapels
  const vee = rbox(white, 0.2, 0.22, 0.03, 0.02, 0, 1.9, 0.37);
  vee.rotation.x = -0.55;
  g.add(vee);
  for (const s of [-1, 1]) {
    const c = rbox(white, 0.11, 0.07, 0.02, 0.01, s * 0.065, 1.97, 0.33);
    c.rotation.set(-0.6, 0, s * 0.5);
    g.add(c);
  }
  g.add(sphere(red, 0.035, 0, 1.955, 0.37, 1.1, 0.9, 0.6));
  const tie = rbox(red, 0.07, 0.13, 0.02, 0.01, 0, 1.885, 0.4);
  tie.rotation.x = -0.45;
  g.add(tie);
  // wide lapels
  for (const s of [-1, 1]) {
    const lp = rbox(coatDark, 0.17, 0.44, 0.03, 0.02, s * 0.15, 1.8, 0.425);
    lp.rotation.set(-0.42, 0, -s * 0.38);
    g.add(lp);
  }
  // double row of brass buttons
  for (const [y, z] of [[1.4, 0.445], [1.54, 0.46], [1.68, 0.47]]) {
    for (const s of [-1, 1]) g.add(sphere(brass, 0.034, s * 0.15, y, z, 1, 1, 0.5));
  }
  // medal ribbons and a medal on her left breast
  ['#a01c24', '#2b4c9a', '#2f6b34'].forEach((c, k) => g.add(rbox(mat(c, { roughness: 0.6 }), 0.07, 0.035, 0.02, 0.006, 0.28 + k * 0.075, 1.74, 0.44)));
  g.add(rbox(red, 0.03, 0.07, 0.01, 0.004, 0.36, 1.67, 0.452));
  const medal = cyl(brass, 0.04, 0.04, 0.012, 0.36, 1.61, 0.455);
  medal.rotation.x = Math.PI / 2;
  g.add(medal);

  // huge shoulders with epaulettes, and full sleeves ending in big fists
  const arms = [];
  for (const s of [-1, 1]) {
    g.add(sphere(coat, 0.25, s * 0.57, 1.86, 0, 1, 0.85, 0.9));
    const ep = rbox(coatDark, 0.3, 0.045, 0.2, 0.02, s * 0.52, 2.0, 0);
    ep.rotation.z = -s * 0.32;
    g.add(ep);
    g.add(sphere(brass, 0.025, s * 0.4, 2.04, 0.02, 1, 0.6, 1));
    const p = pivot(s * 0.66, 1.84, 0);
    p.add(capsule(coat, 0.175, 0.55, 0, 0.05, 0));                         // upper sleeve
    p.add(capsule(coat, 0.155, 0.45, 0, -0.38, 0));                        // forearm
    p.add(cyl(coatDark, 0.165, 0.165, 0.09, 0, -0.84, 0));                // cuff
    p.add(sphere(brass, 0.022, 0, -0.8, 0.16, 1, 1, 0.5));
    const fist = hand(skin, 0.13, s, true);
    fist.position.y = -0.84;
    p.add(fist);
    p.rotation.z = s * 0.14;
    g.add(p);
    arms.push(p);
  }

  // a gold whistle on a cord
  g.add(tube(cord, [[-0.18, 2.02, 0.22], [-0.24, 1.9, 0.36], [-0.27, 1.72, 0.46], [-0.27, 1.6, 0.48]], 0.011, 16));
  g.add(tube(cord, [[0.18, 2.02, 0.22], [0.0, 1.98, 0.36], [-0.2, 1.75, 0.46], [-0.27, 1.6, 0.48]], 0.011, 16));
  const whistle = new THREE.Group();
  whistle.add(cyl(brass, 0.04, 0.04, 0.1, 0, 0, 0));
  whistle.add(rbox(brass, 0.045, 0.03, 0.09, 0.01, 0, 0.09, 0.03));
  whistle.position.set(-0.27, 1.5, 0.5);
  whistle.rotation.x = 0.35;
  g.add(whistle);

  // thick neck and a big square scowling head
  g.add(cyl(skin, 0.17, 0.2, 0.18, 0, 1.94, 0));
  const head = pivot(0, 2.1, 0);
  const hd = new THREE.Group();
  hd.position.y = 0.17;
  hd.scale.setScalar(1.08);
  head.add(hd);
  hd.add(rbox(skin, 0.48, 0.44, 0.44, 0.17, 0, 0.04, 0));                // skull
  hd.add(rbox(skin, 0.54, 0.25, 0.42, 0.11, 0, -0.12, 0.02));             // square jaw
  hd.add(sphere(skin, 0.1, 0, -0.2, 0.17, 1.6, 0.85, 1.0));                // jutting chin
  for (const s of [-1, 1]) {
    hd.add(sphere(skin, 0.1, s * 0.19, -0.13, 0.11, 1, 1.1, 1));          // jowls
    hd.add(sphere(skin, 0.065, s * 0.25, 0.02, -0.01, 0.5, 1, 0.8));      // ears
    hd.add(sphere(mat('#e0786a', { roughness: 0.8 }), 0.065, s * 0.165, -0.04, 0.18, 1, 0.75, 0.45)); // ruddy cheeks
  }
  // grey hair scraped back flat, with comb lines, into a tight bun
  const cap = mesh(geo('tcap', () => new THREE.SphereGeometry(0.27, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.43)), hair, 0, 0.07, -0.035);
  cap.scale.set(0.97, 1, 0.98);
  hd.add(cap);
  for (let i = -3; i <= 3; i++) {
    const x = i * 0.055;
    const line = mesh(geo('tcomb', () => new THREE.TorusGeometry(0.27, 0.006, 4, 20, Math.PI * 0.42)), hairDark, x * 0.97, 0.07, -0.035);
    line.rotation.set(0, Math.PI / 2, Math.PI * 0.36);
    line.scale.setScalar(Math.sqrt(0.27 * 0.27 - x * x) / 0.27 * 0.985);
    hd.add(line);
  }
  const back = mesh(geo('tback', () => new THREE.SphereGeometry(0.28, 20, 12, Math.PI, Math.PI, 0, Math.PI * 0.7)), hair, 0, 0.05, -0.012);
  back.scale.set(0.97, 1, 0.92);
  hd.add(back);
  hd.add(sphere(hair, 0.13, 0, 0.21, -0.26, 1, 0.95, 0.9));               // bun
  const wrap = mesh(geo('twrap', () => new THREE.TorusGeometry(0.11, 0.025, 6, 18)), hairDark, 0, 0.21, -0.26);
  wrap.rotation.x = 0.4;
  hd.add(wrap);
  for (const s of [-1, 1]) {
    const pin = capsule(cord, 0.008, 0.2, s * 0.05, 0.32, -0.25);
    pin.rotation.z = s * 0.9;
    hd.add(pin);
  }
  // small mean eyes under heavy lids and thick slanting brows
  const eyeMats = [];
  const EY = 0.05;
  for (const s of [-1, 1]) {
    const ex = s * 0.105;
    hd.add(sphere(white, 0.052, ex, EY, 0.212, 1, 0.7, 0.42));
    const em = matU('#2a1a14', { roughness: 0.3, emissive: '#000000', ei: 2 });
    eyeMats.push(em);
    hd.add(sphere(em, 0.028, ex - s * 0.006, EY - 0.004, 0.229, 1, 1, 0.5));
    hd.add(sphere(dark, 0.013, ex - s * 0.006, EY - 0.004, 0.236, 1, 1, 0.4));
    const lid = sphere(skinShade, 0.06, ex, EY + 0.026, 0.214, 1.05, 0.5, 0.48);
    lid.rotation.z = s * 0.3;
    hd.add(lid);
    hd.add(sphere(skinShade, 0.045, ex, EY - 0.045, 0.205, 1.1, 0.35, 0.4)); // bags under the eyes
    const b = rbox(brow, 0.19, 0.055, 0.075, 0.025, s * 0.11, EY + 0.085, 0.225);
    b.rotation.z = s * 0.42;
    hd.add(b);
    hd.add(rbox(skinShade, 0.01, 0.05, 0.01, 0.004, s * 0.013, EY + 0.06, 0.245)); // frown crease
  }
  // big nose with nostrils
  const bridge = capsule(skin, 0.035, 0.12, 0, 0.06, 0.235);
  bridge.rotation.x = -0.35;
  hd.add(bridge);
  hd.add(sphere(skin, 0.068, 0, -0.03, 0.255, 1, 0.9, 0.85));
  for (const s of [-1, 1]) {
    hd.add(sphere(skinShade, 0.034, s * 0.05, -0.048, 0.24, 0.9, 0.8, 0.9));
    hd.add(sphere(dark, 0.014, s * 0.025, -0.07, 0.29, 1.1, 0.7, 0.8));
  }
  // a downturned scowl with clenched teeth
  hd.add(rbox(mat('#5a1a1c', { roughness: 0.7 }), 0.15, 0.04, 0.03, 0.015, 0, -0.135, 0.236));
  hd.add(rbox(white, 0.12, 0.022, 0.02, 0.006, 0, -0.135, 0.245));
  for (const s of [-1, 1]) {
    const corner = capsule(lip, 0.011, 0.05, s * 0.085, -0.13, 0.226);
    corner.rotation.z = s * 0.7;
    hd.add(corner);
  }
  hd.add(rbox(lip, 0.17, 0.016, 0.02, 0.008, 0, -0.112, 0.243));           // thin upper lip
  g.add(head);

  g.userData = { legL: legs[0], legR: legs[1], armL: arms[0], armR: arms[1], head, eyeMats, body, height: 2.5 };
  return g;
}
