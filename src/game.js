// Ellie's Halloween Chase: help Matilda collect her library books and escape Miss Trunchbull.
import * as THREE from 'three';
import { mat, basic, makeGlow, glowTexture, rng, flatten } from './materials.js';
import * as MD from './models.js';
import * as CH from './characters.js';
import * as PR from './props.js';
import { initAudio, play, setMuted, startDrone, setDrone } from './audio.js';
import { LEVELS } from './levels.js';

const TILE = 3, WALL_H = 4.2;
const RUN = 5.0, M_R = 0.38, T_R = 0.6;
const SEE_DIST = 15, CATCH_R = 1.2, POWER_RANGE = 14, POWER_COOLDOWN = 5, STUN_TIME = 5.5, GRACE = 3;
const BLOCK = new Set(['#', 'G', 'D', 'S', 'J', 'K', 'W', 'E', 'X']);
const SIGHT = new Set(['#', 'G', 'S', 'E', 'X']);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };

const LINES = {
  spot: ['THERE you are!', 'Come HERE, you little worm!', 'No running in MY school!', 'DETENTION!', 'I can SEE you!'],
  search: ['Where are you hiding...?', "I know you're in here...", 'Sniff sniff... I smell a child!'],
  giveUp: ['Hmph! Slippery little thing...', 'I WILL find you...'],
  stunned: ['Ooof! My head!', 'Wha...? Who did that?!', 'Ooooh... stars...'],
  caught: ['GOTCHA!', 'Caught you!'],
  angry: ['Those are MY books! GET BACK HERE!'],
};

// ---------------------------------------------------------------------------
// Renderer, scene, camera, lights
// ---------------------------------------------------------------------------
const canvas = document.getElementById('game');
const TOUCH = matchMedia('(pointer: coarse)').matches;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, TOUCH ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#0d0718', 6, 34);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 140);

const hemi = new THREE.HemisphereLight('#7a6ad8', '#1a1426', 0.9);
scene.add(hemi);
const moon = new THREE.DirectionalLight('#b8c4ff', 1.2);
moon.castShadow = true;
moon.shadow.mapSize.set(TOUCH ? 1024 : 2048, TOUCH ? 1024 : 2048);
moon.shadow.bias = -0.0008; moon.shadow.normalBias = 0.04;
Object.assign(moon.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 120 });
scene.add(moon, moon.target);
const MOON_OFF = new THREE.Vector3(-18, 40, -26);

let cw = 1, ch = 1;
function resize() {
  cw = canvas.clientWidth || 1; ch = canvas.clientHeight || 1;
  renderer.setSize(cw, ch, false);
  camera.aspect = cw / ch;
  camera.fov = cw / ch > 1.6 ? 58 : 66;
  camera.updateProjectionMatrix();
  checkOrientation();
}

// ---------------------------------------------------------------------------
// Textures drawn in code
// ---------------------------------------------------------------------------
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 4;
  return t;
}
const R = rng(77);
const brickTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#1f1419'; g.fillRect(0, 0, w, h);
  const bh = 12, bw = 30;
  for (let y = 0, row = 0; y < h * 0.78; y += bh, row++) {
    for (let x = -(row % 2) * bw / 2; x < w; x += bw) {
      const v = 40 + R() * 22;
      g.fillStyle = `rgb(${v + 30},${v * 0.55},${v * 0.75})`;
      g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
    }
  }
  // dark wooden panelling along the bottom
  g.fillStyle = '#2b1a12'; g.fillRect(0, h * 0.78, w, h * 0.22);
  g.fillStyle = '#3b2518'; for (let x = 0; x < w; x += 64) g.fillRect(x + 6, h * 0.8, 52, h * 0.17);
  g.fillStyle = '#4a2f1c'; g.fillRect(0, h * 0.78, w, 5);
});
const floorTex = canvasTex(256, 256, (g, w, h) => {
  for (let i = 0; i < 8; i++) {
    const v = 52 + R() * 20;
    g.fillStyle = `rgb(${v},${v * 0.62},${v * 0.4})`;
    g.fillRect(0, i * 32, w, 32);
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, i * 32, w, 2);
    const off = R() * w; g.fillRect(off, i * 32, 2, 32);
    for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(R() * w, i * 32 + R() * 30, 30 + R() * 50, 1); }
  }
});
const grassTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#1f3319'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) {
    const v = R();
    g.fillStyle = v < 0.5 ? 'rgba(45,72,35,0.8)' : v < 0.85 ? 'rgba(20,34,18,0.8)' : 'rgba(80,70,40,0.6)';
    g.fillRect(R() * w, R() * h, 1 + R() * 3, 1 + R() * 3);
  }
});

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------
const G = {
  level: 0, lv: null, grid: [], W: 0, H: 0, root: null,
  books: [], booksGot: 0, checkpoints: [], cpTile: null, exit: null, crates: [], jugs: [], cupboards: [], lamps: [], windows: [], paintings: [], swings: [],
  waypoints: [], playing: false, paused: false, time: 0, grace: 0, frozen: 0, power: 0, hidden: false, hideT: 0,
  unlocked: false, done: false, angry: false, tipsShown: new Set(), nextThunder: 10, flash: 0, nextBats: 6,
};
const M = { obj: null, pos: new THREE.Vector3(), yaw: 0, speed: 0, phase: 0, glow: 0, light: null, stepAcc: 0 };
const T = { obj: null, pos: new THREE.Vector3(), yaw: 0, state: 'patrol', wp: 0, path: [], pathT: 0, seeT: 0, lost: 0, lastSeen: new THREE.Vector3(), searchT: 0, stun: 0, phase: 0, stepAcc: 0, red: 0, sayT: -9 };
const camState = { yaw: 0, pos: new THREE.Vector3(), look: new THREE.Vector3(), shake: 0 };

// ---------------------------------------------------------------------------
// Grid helpers
// ---------------------------------------------------------------------------
const tileOf = (x, z) => [Math.floor(x / TILE), Math.floor(z / TILE)];
const centre = (tx, tz, y = 0) => new THREE.Vector3(tx * TILE + TILE / 2, y, tz * TILE + TILE / 2);
const cell = (tx, tz) => (G.grid[tz] && G.grid[tz][tx]) || '#';
const blocked = (tx, tz) => BLOCK.has(cell(tx, tz));
const opaque = (tx, tz) => SIGHT.has(cell(tx, tz));
function lineOfSight(a, b) {
  const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.ceil(d / 0.4);
  for (let i = 1; i < n; i++) {
    const t = i / n, [tx, tz] = tileOf(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t);
    if (opaque(tx, tz)) return false;
  }
  return true;
}
// shortest route over the grid, as a list of tiles; `avoid` lists tiles the walker may not enter
function findPath(from, to, avoidHide) {
  const [sx, sz] = from, [gx, gz] = to;
  const key = (x, z) => z * G.W + x;
  const prev = new Map([[key(sx, sz), -1]]);
  const q = [[sx, sz]];
  while (q.length) {
    const [x, z] = q.shift();
    if (x === gx && z === gz) break;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz, k = key(nx, nz);
      if (prev.has(k) || blocked(nx, nz) || (avoidHide && cell(nx, nz) === 'H' && !(nx === gx && nz === gz))) continue;
      prev.set(k, key(x, z));
      q.push([nx, nz]);
    }
  }
  if (!prev.has(key(gx, gz))) return null;
  const out = [];
  for (let k = key(gx, gz); k !== -1; k = prev.get(k)) out.push([k % G.W, Math.floor(k / G.W)]);
  return out.reverse();
}
// push a circle out of any blocked tiles around it
function collide(p, r, forTrunch) {
  const [tx, tz] = tileOf(p.x, p.z);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const x = tx + dx, z = tz + dz;
    if (!blocked(x, z) && !(forTrunch && cell(x, z) === 'H')) continue;
    const x0 = x * TILE, x1 = x0 + TILE, z0 = z * TILE, z1 = z0 + TILE;
    const cx = clamp(p.x, x0, x1), cz = clamp(p.z, z0, z1);
    const ddx = p.x - cx, ddz = p.z - cz, d = Math.hypot(ddx, ddz);
    if (d < r) {
      if (d > 1e-5) { p.x = cx + ddx / d * r; p.z = cz + ddz / d * r; }
      else { p.x += r; }
    }
  }
}

// ---------------------------------------------------------------------------
// Building a level
// ---------------------------------------------------------------------------
const anim = [];
function openSides(tx, tz) {
  return [[0, -1], [1, 0], [0, 1], [-1, 0]].filter(([dx, dz]) => !blocked(tx + dx, tz + dz) || cell(tx + dx, tz + dz) === 'X');
}
// yaw that turns a model's +z towards the given neighbour direction
const yawTo = (dx, dz) => Math.atan2(dx, dz);

function buildLevel(i) {
  if (G.root) scene.remove(G.root);
  anim.length = 0;
  const lv = LEVELS[i];
  G.level = i; G.lv = lv;
  G.grid = lv.map.map((r) => r.split(''));
  G.H = G.grid.length; G.W = G.grid[0].length;
  Object.assign(G, { books: [], booksGot: 0, checkpoints: [], crates: [], jugs: [], cupboards: [], lamps: [], windows: [], paintings: [], swings: [], waypoints: [], unlocked: false, done: false, angry: false, power: 0, grace: 0, hidden: false });
  const root = new THREE.Group();
  G.root = root;
  scene.add(root);
  const W = G.W * TILE, H = G.H * TILE;

  // floor
  const floorMat = lv.outdoor
    ? new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 })
    : new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.8 });
  const fTex = (lv.outdoor ? grassTex : floorTex).clone();
  fTex.needsUpdate = true;
  fTex.repeat.set(G.W * (lv.outdoor ? 0.5 : 1), G.H * (lv.outdoor ? 0.5 : 1));
  floorMat.map = fTex;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W + 80, H + 80), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(W / 2, 0, H / 2);
  fTex.repeat.set((W + 80) / TILE * (lv.outdoor ? 0.5 : 1), (H + 80) / TILE * (lv.outdoor ? 0.5 : 1));
  floor.receiveShadow = true;
  root.add(floor);

  scene.fog.color.set(lv.outdoor ? '#140c26' : '#0d0718');
  scene.fog.near = lv.outdoor ? 8 : 5; scene.fog.far = lv.outdoor ? 48 : 32;
  hemi.intensity = lv.outdoor ? 1.0 : 0.75;
  moon.intensity = lv.outdoor ? 1.4 : 0.8;

  // walls
  const wallTiles = [];
  G.grid.forEach((row, z) => row.forEach((c, x) => { if (c === '#') wallTiles.push([x, z]); }));
  if (lv.outdoor) {
    const hedges = new THREE.Group();
    for (const [x, z] of wallTiles) { const h = PR.makeHedge((x * 7 + z * 13) % 4); h.position.copy(centre(x, z)); hedges.add(h); }
    root.add(flatten(hedges));
  } else {
    const wallMat = new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.9 });
    const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(TILE, WALL_H, TILE), wallMat, wallTiles.length);
    const m4 = new THREE.Matrix4();
    wallTiles.forEach(([x, z], k) => { m4.makeTranslation(x * TILE + TILE / 2, WALL_H / 2, z * TILE + TILE / 2); walls.setMatrixAt(k, m4); });
    walls.castShadow = walls.receiveShadow = true;
    root.add(walls);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat('#1a1016', { roughness: 1 }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(W / 2, WALL_H, H / 2);
    root.add(ceil);
  }

  // things in the squares
  const deco = new THREE.Group();
  const r = rng(i * 101 + 5);
  G.grid.forEach((row, z) => row.forEach((c, x) => {
    const p = centre(x, z);
    const open = openSides(x, z);
    const face = open.length ? yawTo(...open[0]) : 0;
    if (c === 'G') {
      // railings run along the edge of the board
      const g = PR.makeGate();
      g.position.copy(p);
      g.rotation.y = (x === 0 || x === G.W - 1) ? Math.PI / 2 : 0;
      deco.add(g);
    } else if (c === 'D') { const d = PR.makeDesk(); d.position.copy(p); d.rotation.y = r() < 0.5 ? 0 : Math.PI; deco.add(d); }
    else if (c === 'S') { const s = PR.makeBookshelf((x * 5 + z) % 7); s.position.copy(p); s.rotation.y = face; deco.add(s); }
    else if (c === 'K') { const k = PR.makeChalkboard(); k.position.copy(p); k.rotation.y = face; root.add(k); G.chalkboard = k; if (k.userData.setText) k.userData.setText(pick(['NO RUNNING!', 'SILENCE!', 'I must not\ntalk in class', 'BEHAVE!'])); }
    else if (c === 'W') { const w = PR.makeSwing(); w.position.copy(p); w.rotation.y = face; root.add(w); G.swings.push(w); }
    else if (c === 'J') { const j = PR.makeJug(); j.position.copy(p); j.rotation.y = r() * 6; root.add(j); G.jugs.push({ obj: j, tile: [x, z], used: false }); }
    else if (c === 'X') {
      const cr = PR.makeCrate(); cr.position.copy(p); cr.rotation.y = (r() - 0.5) * 0.3; root.add(flatten(cr));
      const sp = makeGlow('#c084ff', 3, 0); sp.position.set(0, 2.8, 0); cr.add(sp);
      G.crates.push({ obj: cr, tile: [x, z], gone: false, sparkle: sp });
    } else if (c === 'H') {
      // the wardrobe stands against a wall at the back of its square, facing into the room
      const walls4 = [[0, -1], [1, 0], [0, 1], [-1, 0]].filter(([dx, dz]) => blocked(x + dx, z + dz));
      const back = walls4[0] || [0, -1];
      const cb = PR.makeCupboard();
      cb.position.set(p.x + back[0] * (TILE / 2 - 0.6), 0, p.z + back[1] * (TILE / 2 - 0.6));
      cb.rotation.y = yawTo(-back[0], -back[1]);
      root.add(cb);
      const glow = makeGlow('#7cff9a', 3.4, 0.25); glow.position.set(0, 1.6, 0.4); cb.add(glow);
      G.cupboards.push({ obj: cb, tile: [x, z], inside: cb.position.clone(), open: 0.25, glow });
    } else if (c === 'B') {
      const b = flatten(PR.makeBook(G.books.length));
      b.position.set(p.x, 0.9, p.z);
      root.add(b);
      G.books.push({ obj: b, tile: [x, z], got: false, ph: r() * 6 });
    } else if (c === 'C' || c === 'M') {
      const pk = MD.makePumpkin(1.1, Math.floor(r() * 1e6));
      const off = open.length ? open[open.length - 1] : [1, 0];
      pk.position.set(p.x - off[0] * 1.0, 0, p.z - off[1] * 1.0);
      pk.rotation.y = face;
      root.add(pk);
      const cp = { obj: pk, tile: [x, z], lit: c === 'M' };
      setPumpkin(cp, cp.lit);
      G.checkpoints.push(cp);
      if (c === 'M') { G.cpTile = [x, z]; G.cp = cp; }
    } else if (c === 'E') {
      const side = open[0] || [-1, 0];
      const d = PR.makeExitDoor();
      d.position.set(p.x + side[0] * (TILE / 2 - 0.15), 0, p.z + side[1] * (TILE / 2 - 0.15));
      d.rotation.y = yawTo(...side);
      root.add(d);
      G.exit = { obj: d, tile: [x, z], front: [x + side[0], z + side[1]], open: 0 };
      if (d.userData.lockMat) { d.userData.lockMat.color.set('#ff3030'); d.userData.lockMat.emissive && d.userData.lockMat.emissive.set('#ff2020'); }
      const glow = makeGlow('#ff4040', 3, 0.6); glow.position.set(0, 1.8, 0.4); d.add(glow); G.exit.glow = glow;
    } else if (/[a-h]/.test(c)) {
      G.waypoints[c.charCodeAt(0) - 97] = [x, z];
    }
    if (c === 'M') { M.pos.copy(p); M.yaw = open.length ? yawTo(...open[0]) : 0; }
    if (c === 'T') { T.pos.copy(p); }
  }));
  G.waypoints = G.waypoints.filter(Boolean);

  // decorations on the walls: windows, creepy portraits, cobwebs and lamps
  if (!lv.outdoor) {
    G.grid.forEach((row, z) => row.forEach((c, x) => {
      if (blocked(x, z) || c === 'H') return;
      for (const [dx, dz] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        if (cell(x + dx, z + dz) !== '#') continue;
        const outer = x + dx === 0 || z + dz === 0 || x + dx === G.W - 1 || z + dz === G.H - 1;
        const p = centre(x, z), q = r();
        const at = (obj, y) => { obj.position.set(p.x + dx * (TILE / 2 - 0.03), y, p.z + dz * (TILE / 2 - 0.03)); obj.rotation.y = yawTo(-dx, -dz); root.add(obj); };
        if (outer && q < 0.35) { const w = flatten(PR.makeWindow()); at(w, 1.1); G.windows.push(w); }
        else if (!outer && q < 0.07) { const pt = PR.makePainting(); flatten(pt, pt.userData.eyes || []); at(pt, 1.6); G.paintings.push(pt); }
        else if (q > 0.93) { const cw2 = flatten(PR.makeCobweb()); at(cw2, 3.4); }
      }
      if ((x + z * 3) % 7 === 0) {
        const l = flatten(PR.makeCeilingLamp());
        l.position.copy(centre(x, z, WALL_H));
        root.add(l);
        G.lamps.push({ obj: l, ph: r() * 6, flicker: r() < 0.4 });
      }
    }));
  } else {
    // dead trees, a moon and the school beyond the railings
    for (let k = 0; k < 26; k++) {
      const t = flatten(MD.makeDeadTree(Math.floor(r() * 1e6)));
      const side = k % 4, u = r();
      const x = side === 0 ? -4 - r() * 8 : side === 1 ? W + 4 + r() * 8 : u * W;
      const z = side === 2 ? -4 - r() * 8 : side === 3 ? H + 4 + r() * 8 : u * H;
      t.position.set(side < 2 ? x : x, 0, side < 2 ? u * H : z);
      t.scale.setScalar(0.8 + r() * 0.5);
      deco.add(t);
    }
    const school = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(W * 0.8, 16, 8), mat('#2a2030', { roughness: 1 }));
    body.position.set(W / 2, 8, H + 22);
    school.add(body);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(8, 26, 8), mat('#2a2030', { roughness: 1 }));
    tower.position.set(W / 2, 13, H + 22); school.add(tower);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(6, 9, 4), mat('#1a1420')); spire.position.set(W / 2, 30.5, H + 22); spire.rotation.y = Math.PI / 4; school.add(spire);
    for (let k = 0; k < 14; k++) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), basic(k % 3 ? '#1b1530' : '#ffb347'));
      win.position.set(W * 0.15 + (k % 7) * W * 0.1, 5 + Math.floor(k / 7) * 6, H + 17.9);
      win.rotation.y = Math.PI;
      school.add(win);
    }
    root.add(school);
    for (let k = 0; k < 18; k++) {
      const ts = flatten(MD.makeToadstool(Math.floor(r() * 1e6)));
      let tx, tz;
      do { tx = Math.floor(r() * G.W); tz = Math.floor(r() * G.H); } while (cell(tx, tz) !== '.');
      const p = centre(tx, tz);
      ts.position.set(p.x + (r() - 0.5) * 2, 0, p.z + (r() - 0.5) * 2);
      deco.add(ts);
    }
  }
  // a few lit pumpkins in corners for Halloween
  G.grid.forEach((row, z) => row.forEach((c, x) => {
    if (c !== '.' || r() > 0.08) return;
    const pk = MD.makePumpkin(0.8 + r() * 0.5, Math.floor(r() * 1e6));
    // decorative pumpkins don't flicker, so they can share one face and merge into one mesh
    const fm = pk.userData.faceMat;
    pk.traverse((o) => { if (o.isMesh && o.material === fm) o.material = sharedFace(fm); });
    const p = centre(x, z);
    pk.position.set(p.x + (r() - 0.5) * 1.6, 0, p.z + (r() - 0.5) * 1.6);
    pk.rotation.y = r() * 6;
    deco.add(pk);
  }));
  root.add(flatten(deco));
  root.traverse((o) => { if (o.isMesh && !o.material.transparent && !o.material.isMeshBasicMaterial && o !== floor) { o.castShadow = true; o.receiveShadow = true; } });

  // the characters
  if (!M.obj) {
    M.obj = flattenRig(CH.makeMatilda());
    M.light = new THREE.PointLight('#ffb870', 9, 11, 1.6);
    M.light.position.set(0.4, 1.3, 0.5);
    M.obj.add(M.light);
    M.obj.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    T.obj = flattenRig(CH.makeTrunchbull());
    T.obj.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    T.eyeGlow = makeGlow('#ff2020', 1.6, 0);
    T.obj.add(T.eyeGlow);
    const tb = new THREE.Box3().setFromObject(T.obj);
    T.height = tb.max.y;
    T.eyeGlow.position.set(0, T.height * 0.86, 0.35);
    T.stars = new THREE.Group();
    for (let k = 0; k < 4; k++) {
      const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), basic('#ffe14d'));
      s.position.set(Math.cos(k * Math.PI / 2) * 0.55, 0, Math.sin(k * Math.PI / 2) * 0.55);
      T.stars.add(s);
    }
    T.stars.position.y = T.height + 0.25;
    T.obj.add(T.stars);
    G.wisp = makeGlow('#9ef0ff', 1.1, 0.9);
    G.wispCore = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), basic('#e8fdff'));
    G.wisp.add(G.wispCore);
  }
  root.add(M.obj, T.obj, G.wisp);
  M.obj.position.copy(M.pos); M.obj.rotation.y = M.yaw; M.obj.visible = true;
  resetTrunchbull(true);
  camState.yaw = M.yaw;
  camState.pos.copy(M.pos).add(new THREE.Vector3(-Math.sin(M.yaw) * 3.5, 2.4, -Math.cos(M.yaw) * 3.5));
  G.wisp.position.copy(M.pos).setY(1.6);
  updateHud();
}
// merge each limb, and the body, of a character so it draws in a few calls but can still walk
function flattenRig(o) {
  const u = o.userData, parts = [u.legL, u.legR, u.armL, u.armR, u.head].filter(Boolean);
  for (const p of parts) flatten(p);
  return flatten(o, parts);
}
let sharedFaceMat = null;
function sharedFace(m) { if (!sharedFaceMat) sharedFaceMat = m.clone(); return sharedFaceMat; }
function setPumpkin(cp, lit) {
  cp.lit = lit;
  const u = cp.obj.userData;
  if (u.faceMat) { u.faceMat.emissiveIntensity = lit ? 1.6 : 0.05; }
  if (u.glow) u.glow.visible = lit;
}
function resetTrunchbull(start) {
  T.state = 'patrol'; T.path = []; T.stun = 0; T.red = 0; T.lost = 0; T.searchT = 0;
  if (start) {
    T.wp = 0;
    const [mx, mz] = G.lv.map.reduce((a, row, z) => { const x = row.indexOf('T'); return x >= 0 ? [x, z] : a; }, [1, 1]);
    T.pos.copy(centre(mx, mz));
  } else {
    // send her to the patrol point furthest from where Matilda is now
    let best = 0, bd = -1;
    G.waypoints.forEach((w, k) => { const d = centre(...w).distanceTo(M.pos); if (d > bd) { bd = d; best = k; } });
    T.wp = best;
    T.pos.copy(centre(...G.waypoints[best]));
  }
  T.obj.position.copy(T.pos);
}

// ---------------------------------------------------------------------------
// Input: a joystick on the left, POWER on the right, keys on a computer
// ---------------------------------------------------------------------------
const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const joyBase = document.getElementById('joyBase'), joyKnob = document.getElementById('joyKnob');
const keys = new Set();
function joyRadius() { return Math.min(70, ch * 0.17); }
canvas.addEventListener('pointerdown', (e) => {
  initAudio();
  if (!G.playing || G.paused) return;
  if (e.clientX > window.innerWidth * 0.55 || joy.id !== null) return;
  e.preventDefault();
  joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = joy.y = 0;
  canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
  showJoy(true);
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId !== joy.id) return;
  const rr = joyRadius();
  let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
  const d = Math.hypot(dx, dy);
  if (d > rr) {
    // drag the joystick along if the thumb wanders off it
    joy.ox += dx / d * (d - rr); joy.oy += dy / d * (d - rr);
    dx = e.clientX - joy.ox; dy = e.clientY - joy.oy;
  }
  joy.x = dx / rr; joy.y = -dy / rr;
  showJoy(true);
});
const endJoy = (e) => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; showJoy(false); };
canvas.addEventListener('pointerup', endJoy);
canvas.addEventListener('pointercancel', endJoy);
function showJoy(active) {
  const rr = joyRadius();
  if (active) {
    joyBase.style.transform = `translate(${joy.ox}px, ${joy.oy}px) translate(-50%, -50%)`;
    joyKnob.style.transform = `translate(${joy.ox + joy.x * rr}px, ${joy.oy - joy.y * rr}px) translate(-50%, -50%)`;
    joyBase.classList.add('active'); joyKnob.classList.add('active');
  } else {
    // rest in the bottom-left corner as a reminder of where to press
    const x = Math.max(rr + 26, window.innerWidth * 0.14), y = window.innerHeight - rr - 30;
    joyBase.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    joyKnob.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    joyBase.classList.remove('active'); joyKnob.classList.remove('active');
  }
}
window.addEventListener('keydown', (e) => {
  keys.add(e.key.toLowerCase());
  if (e.key === ' ' && G.playing) { e.preventDefault(); usePower(); }
  if (e.key === 'Escape' && G.playing) setPaused(!G.paused);
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
function inputVector() {
  let x = joy.x, y = joy.y;
  if (keys.has('arrowup') || keys.has('w')) y += 1;
  if (keys.has('arrowdown') || keys.has('s')) y -= 1;
  if (keys.has('arrowleft') || keys.has('a')) x -= 1;
  if (keys.has('arrowright') || keys.has('d')) x += 1;
  const m = Math.hypot(x, y);
  if (m > 1) { x /= m; y /= m; }
  return { x, y, m: Math.min(1, m) };
}
const powerBtn = document.getElementById('powerBtn');
powerBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); initAudio(); if (G.playing && !G.paused) usePower(); });

// ---------------------------------------------------------------------------
// Matilda's power
// ---------------------------------------------------------------------------
const orbs = [];
function magicStream(from, to, color = '#c084ff', n = 14) {
  for (let k = 0; k < n; k++) {
    const s = makeGlow(color, rand(0.4, 0.8), 0.9);
    s.position.copy(from);
    s.userData = { from: from.clone(), to: to.clone(), t0: G.time + k * 0.025, dur: 0.45, wob: rand(0, 6), amp: rand(0.2, 0.7) };
    scene.add(s); orbs.push(s);
  }
}
function usePower() {
  if (G.frozen > 0 || G.done) return;
  if (G.power > 0) { play('fizzle'); bump(powerBtn); return; }
  const eye = M.pos.clone().setY(1.25);
  M.glow = 1.2;
  const dT = T.pos.distanceTo(M.pos);
  if (T.state !== 'stunned' && dT < POWER_RANGE && lineOfSight(M.pos, T.pos)) {
    // the nearest jug of water flies at her, or a stream of magic if there isn't one
    play('whoosh');
    const head = T.pos.clone().setY(T.height * 0.9);
    const jug = G.jugs.filter(j => !j.used).map(j => ({ j, d: j.obj.position.distanceTo(T.pos) })).sort((a, b) => a.d - b.d)[0];
    if (jug && jug.d < 12) {
      jug.j.used = true;
      const part = jug.j.obj.userData.jug || jug.j.obj;
      const start = part.getWorldPosition(new THREE.Vector3());
      scene.attach(part);
      tween(0.7, (u) => { part.position.lerpVectors(start, head, u); part.position.y += Math.sin(u * Math.PI) * 2; part.rotation.z = u * 8; }, () => { part.visible = false; play('splash2'); splashAt(head); });
    }
    magicStream(eye, head);
    later(0.45, stunTrunchbull);
    G.power = POWER_COOLDOWN;
    return;
  }
  const crate = G.crates.filter(c => !c.gone).map(c => ({ c, d: c.obj.position.distanceTo(M.pos) })).sort((a, b) => a.d - b.d)[0];
  if (crate && crate.d < 7.5) {
    play('whoosh');
    const c = crate.c;
    c.gone = true;
    magicStream(eye, c.obj.position.clone().setY(1.4));
    const y0 = c.obj.position.y, rz = (Math.random() - 0.5) * 2;
    tween(1.6, (u) => { c.obj.position.y = y0 + u * u * 7; c.obj.rotation.z = rz * u; c.obj.rotation.y += 0.05; c.obj.scale.setScalar(Math.max(0.01, 1 - Math.max(0, u - 0.5) * 2)); },
      () => { c.obj.visible = false; play('pop'); });
    G.grid[c.tile[1]][c.tile[0]] = '.';
    G.power = 1.5;
    say(M.obj, 'Whoosh!');
    return;
  }
  const jug = G.jugs.filter(j => !j.used).map(j => ({ j, d: j.obj.position.distanceTo(M.pos) })).sort((a, b) => a.d - b.d)[0];
  if (jug && jug.d < 8) {
    play('whoosh');
    const part = jug.j.obj.userData.jug || jug.j.obj, y0 = part.position.y;
    magicStream(eye, part.getWorldPosition(new THREE.Vector3()));
    tween(1.6, (u) => { part.position.y = y0 + Math.sin(u * Math.PI) * 1.5; part.rotation.y = u * Math.PI * 4; });
    G.power = 1.5;
    return;
  }
  // nothing to use it on: a little sparkle
  play('fizzle');
  magicStream(eye, eye.clone().add(new THREE.Vector3(Math.sin(M.yaw) * 3, 0.5, Math.cos(M.yaw) * 3)), '#c084ff', 8);
  G.power = 0.8;
}
function stunTrunchbull() {
  T.state = 'stunned'; T.stun = STUN_TIME; T.red = 0;
  play('dizzy');
  say(T.obj, pick(LINES.stunned));
  burst(T.pos.clone().setY(T.height), 14, ['#ffe14d', '#c084ff', '#ffffff']);
}
function bump(el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }

// ---------------------------------------------------------------------------
// Effects: tweens, sparks, speech bubbles
// ---------------------------------------------------------------------------
const tweens = [];
function tween(dur, fn, done) { tweens.push({ t0: G.time, dur, fn, done }); }
// run something after a delay in game time, so pausing the game pauses it too
function later(sec, fn) { tween(sec, () => {}, fn); }
const sparks = [];
const sparkGeo = new THREE.OctahedronGeometry(0.1);
function burst(pos, n, colors, speed = 4) {
  for (let k = 0; k < n; k++) {
    const m = new THREE.Mesh(sparkGeo, basic(pick(colors)));
    m.position.copy(pos);
    const a = rand(0, Math.PI * 2), e = rand(0.2, 1.2), sp = rand(speed * 0.4, speed);
    m.userData = { v: new THREE.Vector3(Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp + 1.5, Math.sin(a) * Math.cos(e) * sp), t0: G.time, life: rand(0.6, 1.1) };
    scene.add(m); sparks.push(m);
  }
}
function splashAt(p) { burst(p, 18, ['#9fd8ff', '#ffffff', '#5fb4ff'], 4); }
const bubbleLayer = document.getElementById('bubbles');
const bubbles = [];
function say(obj, text, life = 2) {
  const el = document.createElement('div');
  el.className = 'bubble' + (obj === T.obj ? ' trunch' : '');
  el.textContent = text;
  bubbleLayer.appendChild(el);
  const h = obj === T.obj ? T.height + 0.5 : 1.8;
  bubbles.push({ el, anchor: () => obj.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, h, 0)), t0: G.time, life });
}

// ---------------------------------------------------------------------------
// HUD and messages
// ---------------------------------------------------------------------------
const hudBooks = document.getElementById('books');
const banner = document.getElementById('banner');
const danger = document.getElementById('danger');
let bannerQ = [], bannerT = 0;
function showBanner(text, dur = 3.2, urgent = false) {
  if (urgent) { bannerQ = []; bannerT = 0; }
  bannerQ.push({ text, dur });
}
function tip(key, text, urgent) { if (!G.lv.tips || G.tipsShown.has(key)) return; G.tipsShown.add(key); showBanner(text, 4, urgent); }
const BOOK_SVG = '<svg viewBox="0 0 24 24"><path d="M4 4.5 C7 3.5 10 3.5 12 5 C14 3.5 17 3.5 20 4.5 V19 C17 18 14 18 12 19.5 C10 18 7 18 4 19 Z"/><path d="M12 5 V19.5" fill="none" stroke-width="1.4"/></svg>';
function updateHud() {
  hudBooks.innerHTML = G.books.map((b) => `<span class="book ${b.got ? 'got' : ''}">${BOOK_SVG}</span>`).join('');
  document.getElementById('levelName').textContent = `${G.level + 1}. ${G.lv.name}`;
}

// ---------------------------------------------------------------------------
// Game flow
// ---------------------------------------------------------------------------
const screens = ['start', 'story', 'complete', 'win', 'pause'].reduce((o, id) => (o[id] = document.getElementById(id), o), {});
function show(id) { for (const k in screens) screens[k].classList.toggle('show', k === id); document.body.classList.toggle('playing', !id); }
function loadProgress() { try { return +localStorage.getItem('ellie-chase-level') || 0; } catch (_) { return 0; } }
function saveProgress(n) { try { localStorage.setItem('ellie-chase-level', String(Math.max(n, loadProgress()))); } catch (_) { /* private mode */ } }
function startLevel(i) {
  buildLevel(i);
  document.getElementById('storyTitle').textContent = `Level ${i + 1}: ${LEVELS[i].name}`;
  document.getElementById('storyText').textContent = LEVELS[i].intro;
  show('story');
  G.playing = false;
}
function beginPlay() {
  show(null);
  G.playing = true; G.paused = false; G.frozen = 0;
  startDrone();
  showBanner(`Find ${G.books.length} books!`, 2.6);
  if (G.lv.tips) tip('move', TOUCH ? 'Press and drag on the left to walk. Follow the fairy light!' : 'Use the arrow keys to walk. Follow the fairy light!');
}
function levelComplete() {
  G.done = true; G.playing = false;
  play('win');
  saveProgress(G.level + 1);
  if (G.level === LEVELS.length - 1) {
    later(0.9, () => show('win'));
  } else {
    later(0.9, () => show('complete'));
  }
}
function caught() {
  G.frozen = 1.8;
  play('caught');
  say(T.obj, pick(LINES.caught), 1.6);
  document.getElementById('caught').classList.add('show');
  later(1.5, () => {
    document.getElementById('caught').classList.remove('show');
    M.pos.copy(centre(...G.cpTile));
    M.obj.position.copy(M.pos);
    resetTrunchbull(false);
    G.grace = GRACE;
    camState.pos.copy(M.pos).add(new THREE.Vector3(-Math.sin(M.yaw) * 3.5, 2.4, -Math.cos(M.yaw) * 3.5));
    camState.yaw = M.yaw;
  });
}
function setPaused(p) { G.paused = p; show(p ? 'pause' : null); }

document.getElementById('playBtn').addEventListener('click', () => { initAudio(); goFullscreen(); startLevel(0); });
document.getElementById('goBtn').addEventListener('click', () => { initAudio(); beginPlay(); });
document.getElementById('nextBtn').addEventListener('click', () => startLevel(G.level + 1));
document.getElementById('againBtn').addEventListener('click', () => { show('start'); renderLevelButtons(); });
document.getElementById('pauseBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (G.playing) setPaused(true); });
document.getElementById('resumeBtn').addEventListener('click', () => setPaused(false));
document.getElementById('restartBtn').addEventListener('click', () => { G.playing = false; startLevel(G.level); });
document.getElementById('menuBtn').addEventListener('click', () => { G.playing = false; show('start'); renderLevelButtons(); });
let muted = false;
for (const id of ['muteBtn', 'muteBtn2']) {
  document.getElementById(id).addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    muted = !muted; setMuted(muted);
    document.querySelectorAll('.mute').forEach((b) => b.classList.toggle('off', muted));
  });
}
function renderLevelButtons() {
  const got = loadProgress(), box = document.getElementById('levels');
  box.innerHTML = '';
  if (got < 1) return;
  LEVELS.forEach((lv, i) => {
    const b = document.createElement('button');
    b.className = 'lvl'; b.textContent = String(i + 1);
    b.disabled = i > got;
    b.setAttribute('aria-label', `Level ${i + 1}: ${lv.name}`);
    b.addEventListener('click', () => { initAudio(); goFullscreen(); startLevel(i); });
    box.appendChild(b);
  });
}
function goFullscreen() {
  if (!TOUCH) return;
  const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (req && !document.fullscreenElement) {
    try {
      const p = req.call(el);
      if (p && p.then) p.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
    } catch (_) { /* not allowed */ }
  }
}
function checkOrientation() {
  document.body.classList.toggle('portrait', TOUCH && window.innerHeight > window.innerWidth);
}
window.addEventListener('resize', resize);
window.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('visibilitychange', () => { if (document.hidden && G.playing && !G.paused) setPaused(true); });

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
function update(dt) {
  if (G.paused) return;
  G.time += dt;
  const t = G.time;
  if (G.playing && !G.paused) {
    updateMatilda(dt);
    updateTrunchbull(dt);
    updateWorld(dt);
  }
  updateEffects(dt);
  updateCamera(dt);
}

function updateMatilda(dt) {
  if (G.grace > 0) G.grace -= dt;
  if (G.power > 0) G.power = Math.max(0, G.power - dt);
  const inp = G.frozen > 0 ? { x: 0, y: 0, m: 0 } : inputVector();
  if (G.frozen > 0) G.frozen -= dt;
  const f = new THREE.Vector3(Math.sin(camState.yaw), 0, Math.cos(camState.yaw));
  const rgt = new THREE.Vector3(-Math.cos(camState.yaw), 0, Math.sin(camState.yaw));
  const move = f.multiplyScalar(inp.y).add(rgt.multiplyScalar(inp.x));
  const sp = RUN * inp.m;
  if (inp.m > 0.08) {
    move.normalize();
    M.pos.addScaledVector(move, sp * dt);
    const want = Math.atan2(move.x, move.z);
    M.yaw += angDiff(M.yaw, want) * Math.min(1, dt * 12);
  }
  collide(M.pos, M_R, false);
  M.speed += (sp - M.speed) * Math.min(1, dt * 10);
  M.obj.position.copy(M.pos);
  M.obj.rotation.y = M.yaw;

  // walk cycle
  const u = M.obj.userData;
  M.phase += dt * (3 + M.speed * 2.2);
  const sw = Math.min(1, M.speed / RUN) * 0.8;
  if (u.legL) { u.legL.rotation.x = Math.sin(M.phase) * sw; u.legR.rotation.x = -Math.sin(M.phase) * sw; }
  if (u.armL) {
    const powerArm = M.glow > 0 ? -1.4 : 0;
    u.armL.rotation.x = -Math.sin(M.phase) * sw * 0.9 + powerArm;
    u.armR.rotation.x = Math.sin(M.phase) * sw * 0.9 + powerArm;
  }
  M.obj.position.y = Math.abs(Math.sin(M.phase)) * 0.06 * sw;
  if (M.speed > 1) { M.stepAcc += dt * M.speed; if (M.stepAcc > 1.4) { M.stepAcc = 0; play('step'); } }
  // glowing eyes while using her power
  M.glow = Math.max(0, M.glow - dt);
  if (u.eyeMats) for (const m of u.eyeMats) { m.emissive && m.emissive.set('#b05cff'); m.emissiveIntensity = M.glow > 0 ? 2.5 : 0; }
  // blink while protected after being caught
  M.obj.visible = !(G.grace > 0 && Math.floor(t2() * 8) % 2 === 0);

  const [tx, tz] = tileOf(M.pos.x, M.pos.z);
  // hiding in a wardrobe
  const wasHidden = G.hidden;
  G.hidden = cell(tx, tz) === 'H';
  if (G.hidden && !wasHidden) { play('creak'); showBanner('Shhh... you are hiding!', 2, true); }
  document.body.classList.toggle('hiding', G.hidden);
  G.hideCb = null;
  for (const c of G.cupboards) {
    const inside = G.hidden && c.tile[0] === tx && c.tile[1] === tz;
    if (inside) G.hideCb = c;
    c.open += ((inside ? 0.55 : 0.3) - c.open) * Math.min(1, dt * 6);
    const ud = c.obj.userData;
    if (ud.doorL) ud.doorL.rotation.y = -c.open * 1.6;
    if (ud.doorR) ud.doorR.rotation.y = c.open * 1.6;
    c.glow.material.opacity = inside ? 0.05 : 0.18 + Math.sin(t2() * 3) * 0.08;
    if (inside) {
      // tuck Matilda inside, out of sight
      M.obj.position.lerp(c.inside, 0.5);
      M.obj.visible = false;
    }
    if (!inside && c.obj.position.distanceTo(M.pos) < 6) tip('hide', 'Wardrobes are hiding places. Walk inside to hide!');
  }
  // books
  for (const b of G.books) {
    if (b.got) continue;
    if (Math.hypot(b.obj.position.x - M.pos.x, b.obj.position.z - M.pos.z) < 1.4) {
      b.got = true;
      play('chime');
      burst(b.obj.position, 20, ['#ffe14d', '#ffffff', '#c084ff']);
      tween(0.5, (k) => { b.obj.scale.setScalar(1 + k * 0.8); b.obj.position.y += 0.08; }, () => { b.obj.visible = false; });
      G.booksGot++;
      updateHud();
      const left = G.books.length - G.booksGot;
      if (left > 0) showBanner(left === 1 ? 'Just 1 more book!' : `${left} more books to find!`, 2.2);
      else unlockExit();
    }
  }
  // checkpoints
  for (const cp of G.checkpoints) {
    if (cp.obj.position.distanceTo(M.pos) < 2 && G.cp !== cp) {
      if (!cp.lit) { play('lit'); burst(cp.obj.position.clone().setY(1), 12, ['#ff9a2a', '#ffe14d']); showBanner('Checkpoint! The pumpkin will remember you.', 2.4); }
      setPumpkin(cp, true);
      G.cp = cp; G.cpTile = cp.tile;
    }
  }
  // crates nearby
  for (const c of G.crates) if (!c.gone && c.obj.position.distanceTo(M.pos) < 7.5) tip('crate', 'Crates in the way! Tap POWER to float them away!');
  // the way out
  if (G.exit && tx === G.exit.front[0] && tz === G.exit.front[1]) {
    if (G.unlocked) {
      levelComplete();
      tween(1, (k) => { const ud = G.exit.obj.userData; if (ud.doorL) ud.doorL.rotation.y = -k * 1.4; if (ud.doorR) ud.doorR.rotation.y = k * 1.4; });
      play('door');
    } else if (!G.exitNag || t2() - G.exitNag > 4) {
      G.exitNag = t2();
      showBanner(`The door is locked! Find all ${G.books.length} books first.`, 2.6);
    }
  }
}
const t2 = () => G.time;

function unlockExit() {
  G.unlocked = true;
  play('unlock');
  const ud = G.exit.obj.userData;
  if (ud.lockMat) { ud.lockMat.color.set('#3dff6a'); ud.lockMat.emissive && ud.lockMat.emissive.set('#20ff50'); }
  if (ud.lockGlow) ud.lockGlow.material.color.set('#4dff7a');
  G.exit.glow.material.color.set('#4dff7a');
  if (G.lv.finale) {
    G.angry = true;
    showBanner('All the books! Now RUN to the door!', 3, true);
    T.state = 'chase'; T.lost = 0;
    play('spot');
    say(T.obj, LINES.angry[0], 2.6);
  } else showBanner('All the books! Now find the green door!', 3, true);
}

function updateTrunchbull(dt) {
  const u = T.obj.userData;
  const toM = new THREE.Vector3().subVectors(M.pos, T.pos); toM.y = 0;
  const dist = toM.length();
  // can she see Matilda?
  T.seeT -= dt;
  let sees = false;
  if (!G.hidden && G.grace <= 0 && G.frozen <= 0 && dist < SEE_DIST && lineOfSight(T.pos, M.pos)) {
    const facing = Math.abs(angDiff(T.yaw, Math.atan2(toM.x, toM.z)));
    sees = facing < 1.3 || dist < 4.5 || T.state === 'chase';
  }
  const speedChase = G.lv.trunchSpeed + (G.angry ? 0.5 : 0);
  let target = null, speed = 0;

  if (T.state === 'stunned') {
    T.stun -= dt;
    T.yaw += dt * 5;
    if (T.stun <= 0) { T.state = 'search'; T.searchT = 2.5; T.lastSeen.copy(T.pos); }
  } else if (T.state === 'patrol') {
    if (sees) startChase();
    else {
      const wp = G.waypoints[T.wp];
      if (wp) {
        target = followPath(wp, dt);
        speed = 1.9;
        if (centre(...wp).distanceTo(T.pos) < 0.6) T.wp = (T.wp + 1) % G.waypoints.length;
      }
    }
  } else if (T.state === 'chase') {
    if (sees || G.angry && !G.hidden) { T.lost = 0; T.lastSeen.copy(M.pos); }
    else T.lost += dt;
    if (T.lost > 0.6) {
      T.state = 'search'; T.searchT = 3; T.sayT = -9;
    } else {
      speed = speedChase;
      target = dist < 5 && lineOfSight(T.pos, M.pos) ? M.pos.clone() : followPath(tileOf(M.pos.x, M.pos.z), dt);
    }
    if (dist < CATCH_R && !G.hidden && G.grace <= 0 && G.frozen <= 0) caught();
  } else if (T.state === 'search') {
    if (sees) startChase();
    else if (T.lastSeen.distanceTo(T.pos) > 1) { target = followPath(tileOf(T.lastSeen.x, T.lastSeen.z), dt); speed = 2.6; }
    else {
      T.searchT -= dt;
      T.yaw += Math.sin(t2() * 1.5) * dt * 2;
      if (T.sayT < 0) { T.sayT = 1; say(T.obj, pick(LINES.search), 2.2); }
      if (T.searchT <= 0) {
        say(T.obj, pick(LINES.giveUp), 2);
        T.state = 'patrol';
        // carry on from the nearest patrol point
        let best = 0, bd = Infinity;
        G.waypoints.forEach((w, k) => { const d = centre(...w).distanceTo(T.pos); if (d < bd) { bd = d; best = k; } });
        T.wp = best;
      }
    }
  }
  if (target && speed > 0) {
    const d = new THREE.Vector3().subVectors(target, T.pos); d.y = 0;
    const len = d.length();
    if (len > 0.05) {
      d.multiplyScalar(1 / len);
      T.pos.addScaledVector(d, Math.min(len, speed * dt));
      T.yaw += angDiff(T.yaw, Math.atan2(d.x, d.z)) * Math.min(1, dt * 7);
    }
    collide(T.pos, T_R, true);
  } else speed = 0;
  T.obj.position.copy(T.pos);
  T.obj.rotation.y = T.yaw;

  // stomping walk, arms reaching forward when she chases
  T.phase += dt * (2 + speed * 1.6);
  const sw = Math.min(1, speed / 3) * 0.7;
  if (u.legL) { u.legL.rotation.x = Math.sin(T.phase) * sw; u.legR.rotation.x = -Math.sin(T.phase) * sw; }
  if (u.armL) {
    const reach = T.state === 'chase' ? -1.25 : 0;
    u.armL.rotation.x = reach - Math.sin(T.phase) * sw * (reach ? 0.3 : 0.8);
    u.armR.rotation.x = reach + Math.sin(T.phase) * sw * (reach ? 0.3 : 0.8);
  }
  T.obj.position.y = Math.abs(Math.sin(T.phase)) * 0.08 * sw;
  if (speed > 0.5) {
    T.stepAcc += dt * (2 + speed * 1.6);
    if (T.stepAcc > Math.PI) { T.stepAcc = 0; play('stomp', clamp(1 - dist / 26, 0, 1)); if (dist < 7) camState.shake = Math.max(camState.shake, 0.12 * (1 - dist / 7)); }
  }
  // red eyes when she's after you
  T.red += ((T.state === 'chase' ? 1 : 0) - T.red) * Math.min(1, dt * 4);
  if (u.eyeMats) for (const m of u.eyeMats) { m.emissive && m.emissive.set('#ff1a1a'); m.emissiveIntensity = T.red * 3; }
  T.eyeGlow.material.opacity = T.red * 0.7;
  T.stars.visible = T.state === 'stunned';
  T.stars.rotation.y += dt * 4;

  // fear: heartbeat and drone
  const fear = T.state === 'chase' ? clamp(1.2 - dist / 16, 0.3, 1) : 0;
  setDrone(fear);
  if (fear > 0) {
    G.heart = (G.heart || 0) - dt;
    if (G.heart <= 0) { G.heart = 0.9 - fear * 0.45; play('heartbeat', 0.6 + fear * 0.6); }
  }
  danger.classList.toggle('on', T.state === 'chase');
  danger.classList.toggle('hidden', G.hidden);
  danger.classList.toggle('stunned', T.state === 'stunned');
}
function startChase() {
  T.state = 'chase'; T.lost = 0;
  play('spot');
  say(T.obj, pick(LINES.spot), 1.8);
  tip('spotted', "She's seen you! Run away, hide in a wardrobe, or tap POWER!", true);
}
function followPath(goal, dt) {
  T.pathT -= dt;
  const from = tileOf(T.pos.x, T.pos.z);
  if (T.pathT <= 0 || !T.path.length || T.goalKey !== goal.join(',')) {
    T.path = findPath(from, goal, true) || [];
    T.pathT = 0.35; T.goalKey = goal.join(',');
    if (T.path.length && T.path[0][0] === from[0] && T.path[0][1] === from[1]) T.path.shift();
  }
  while (T.path.length && centre(...T.path[0]).distanceTo(T.pos) < 0.5) T.path.shift();
  return T.path.length ? centre(...T.path[0]) : centre(...goal);
}

function updateWorld(dt) {
  const t = G.time;
  for (const b of G.books) if (!b.got) { b.obj.rotation.y += dt * 1.5; b.obj.position.y = 0.9 + Math.sin(t * 2 + b.ph) * 0.15; }
  for (const l of G.lamps) {
    const on = l.flicker ? (Math.sin(t * 13 + l.ph) * Math.sin(t * 3.1 + l.ph * 2) > -0.6 ? 1 : 0.15) : 1;
    const ud = l.obj.userData;
    if (ud.bulbMat) ud.bulbMat.emissiveIntensity = 1.6 * on;
    if (ud.glow) ud.glow.material.opacity = 0.6 * on;
  }
  for (const c of G.crates) if (!c.gone) c.sparkle.material.opacity = c.obj.position.distanceTo(M.pos) < 7.5 ? 0.5 + Math.sin(t * 6) * 0.3 : 0;
  for (const s of G.swings) if (s.userData.seat) s.userData.seat.rotation.x = Math.sin(t * 1.3) * 0.5;
  // portraits watch you
  for (const p of G.paintings) {
    const eyes = p.userData.eyes || [];
    const local = p.worldToLocal(M.pos.clone().setY(1.2));
    const ex = clamp(local.x * 0.02, -0.035, 0.035), ey = clamp(local.y * 0.02, -0.025, 0.025);
    for (const e of eyes) { if (e.userData.x0 == null) { e.userData.x0 = e.position.x; e.userData.y0 = e.position.y; } e.position.x = e.userData.x0 + ex; e.position.y = e.userData.y0 + ey; }
  }
  if (G.exit) G.exit.glow.material.opacity = 0.4 + Math.sin(t * 4) * 0.2;
  // lightning and thunder
  G.nextThunder -= dt;
  if (G.nextThunder <= 0) {
    G.nextThunder = rand(14, 26);
    G.flash = 1;
    later(0.5, () => play('thunder'));
  }
  G.flash = Math.max(0, G.flash - dt * 3);
  const fl = G.flash > 0.66 || (G.flash > 0.2 && G.flash < 0.4) ? 1 : 0;
  hemi.intensity = (G.lv.outdoor ? 1.0 : 0.75) + fl * 2.2;
  for (const w of G.windows) if (w.userData.glassMat) w.userData.glassMat.emissiveIntensity = 0.6 + fl * 4;
  document.getElementById('flash').style.opacity = fl * 0.35;
  // the fairy light leads to the next book, or the door
  G.wispT = (G.wispT || 0) - dt;
  if (G.wispT <= 0) {
    G.wispT = 0.4;
    const from = tileOf(M.pos.x, M.pos.z);
    const goals = G.unlocked ? [G.exit.front] : G.books.filter(b => !b.got).map(b => b.tile);
    let best = null;
    for (const g of goals) {
      const p = findPathPlayer(from, g);
      if (p && (!best || p.length < best.length)) best = p;
    }
    G.wispGoal = best ? centre(...best[Math.min(best.length - 1, 2)], 1.7) : M.pos.clone().setY(1.7);
  }
  if (G.wispGoal) {
    const target = G.wispGoal.clone().add(new THREE.Vector3(Math.sin(t * 2.3) * 0.4, Math.sin(t * 3.1) * 0.25, Math.cos(t * 1.9) * 0.4));
    G.wisp.position.lerp(target, Math.min(1, dt * 2.2));
    G.wisp.material.opacity = 0.7 + Math.sin(t * 9) * 0.2;
  }
  // bats over the playground
  if (G.lv.outdoor) {
    G.nextBats -= dt;
    if (G.nextBats <= 0) {
      G.nextBats = rand(10, 18);
      const dir = new THREE.Vector3(rand(-1, 1), 0, rand(-1, 1)).normalize();
      for (let k = 0; k < 4; k++) {
        const b = MD.makeBat();
        b.position.copy(M.pos).addScaledVector(dir, -25).add(new THREE.Vector3(rand(-3, 3), 7 + rand(0, 3), rand(-3, 3)));
        b.rotation.y = Math.atan2(dir.x, dir.z);
        scene.add(b);
        const ph = rand(0, 6), t0 = G.time;
        tween(5, () => {
          b.position.addScaledVector(dir, 10 * 0.016);
          const fl2 = Math.sin(G.time * 18 + ph) * 0.8;
          if (b.userData.wingL) { b.userData.wingL.rotation.z = fl2; b.userData.wingR.rotation.z = -fl2; }
        }, () => scene.remove(b));
        if (k === 0) later(1.2, () => play('squeak'));
      }
    }
  }
}
function findPathPlayer(from, to) {
  // like findPath, but crates count as passable so the light still points at books behind them
  const saved = [];
  for (const c of G.crates) if (!c.gone) { saved.push(c); G.grid[c.tile[1]][c.tile[0]] = '.'; }
  const p = findPath(from, to, false);
  for (const c of saved) G.grid[c.tile[1]][c.tile[0]] = 'X';
  return p;
}

function updateEffects(dt) {
  const t = G.time;
  for (let k = tweens.length - 1; k >= 0; k--) {
    const tw = tweens[k], u = Math.min(1, (t - tw.t0) / tw.dur);
    tw.fn(u);
    if (u >= 1) { tweens.splice(k, 1); tw.done && tw.done(); }
  }
  for (let k = sparks.length - 1; k >= 0; k--) {
    const m = sparks[k], d = m.userData, u = (t - d.t0) / d.life;
    if (u >= 1) { scene.remove(m); sparks.splice(k, 1); continue; }
    d.v.y -= 9 * dt;
    m.position.addScaledVector(d.v, dt);
    m.scale.setScalar(1 - u * 0.8);
  }
  for (let k = orbs.length - 1; k >= 0; k--) {
    const s = orbs[k], d = s.userData, u = (t - d.t0) / d.dur;
    if (u < 0) continue;
    if (u >= 1) { scene.remove(s); orbs.splice(k, 1); continue; }
    s.position.lerpVectors(d.from, d.to, u);
    s.position.y += Math.sin(u * Math.PI) * d.amp + Math.sin(u * 12 + d.wob) * 0.15;
    s.material.opacity = 0.9 * (1 - u * 0.5);
  }
  // power button charge ring
  const charge = G.power > 0 ? 1 - G.power / POWER_COOLDOWN : 1;
  powerBtn.style.setProperty('--p', String(clamp(charge, 0, 1)));
  powerBtn.classList.toggle('ready', G.power <= 0);
  // banners
  bannerT -= dt;
  if (bannerT <= 0) {
    if (bannerQ.length) { const b = bannerQ.shift(); banner.textContent = b.text; banner.classList.add('show'); bannerT = b.dur; }
    else banner.classList.remove('show');
  }
}

function updateCamera(dt) {
  // the camera swings round behind Matilda as she runs, unless she's running towards it
  const inp = G.playing && !G.paused ? inputVector() : { x: 0, y: 0, m: 0 };
  if (inp.m > 0.1 && inp.y > -0.5) camState.yaw += angDiff(camState.yaw, M.yaw) * Math.min(1, dt * (1.2 + inp.m * 1.4));
  const f = new THREE.Vector3(Math.sin(camState.yaw), 0, Math.cos(camState.yaw));
  const rgt = new THREE.Vector3(-Math.cos(camState.yaw), 0, Math.sin(camState.yaw));
  const pivot = M.pos.clone().setY(1.35);
  const back = G.hidden ? 4.4 : 3.6;
  const want = pivot.clone().addScaledVector(f, -back).addScaledVector(rgt, 0.75).add(new THREE.Vector3(0, 1.05, 0));
  // pull in so walls never come between the camera and Matilda
  const steps = 24;
  let ok = pivot.clone();
  for (let k = 1; k <= steps; k++) {
    const p = pivot.clone().lerp(want, k / steps);
    const [tx, tz] = tileOf(p.x, p.z);
    const c = cell(tx, tz);
    if (c === '#' || c === 'G' || c === 'S' || c === 'E' || (c === 'X' && p.y < 2.6)) break;
    ok = p;
  }
  ok.lerp(pivot, 0.08);
  let look = pivot.clone().addScaledVector(f, 2.4).addScaledVector(rgt, 0.3).add(new THREE.Vector3(0, -0.1, 0));
  if (G.hidden && G.hideCb) {
    // peek out through the gap in the wardrobe doors
    const cb = G.hideCb.obj;
    ok = cb.localToWorld(new THREE.Vector3(0, 1.3, 0.2));
    look = cb.localToWorld(new THREE.Vector3(0, 1.1, 6));
    camState.yaw += angDiff(camState.yaw, cb.rotation.y) * Math.min(1, dt * 4);
  }
  camState.pos.lerp(ok, Math.min(1, dt * 8));
  camState.look.lerp(look, Math.min(1, dt * 10));
  camera.position.copy(camState.pos);
  if (camState.shake > 0) {
    camState.shake = Math.max(0, camState.shake - dt * 0.6);
    camera.position.add(new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(camState.shake));
  }
  camera.lookAt(camState.look);
  moon.target.position.copy(M.pos);
  moon.position.copy(M.pos).add(MOON_OFF);
  // speech bubbles
  for (let k = bubbles.length - 1; k >= 0; k--) {
    const b = bubbles[k], u = (G.time - b.t0) / b.life;
    if (u >= 1) { b.el.remove(); bubbles.splice(k, 1); continue; }
    const p = b.anchor().project(camera);
    const x = (p.x + 1) / 2 * cw, y = (1 - p.y) / 2 * ch;
    b.el.style.visibility = p.z > 1 ? 'hidden' : 'visible';
    b.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%) scale(${Math.min(1, u * 8)})`;
    b.el.style.opacity = u > 0.8 ? (1 - u) * 5 : 1;
  }
}

// ---------------------------------------------------------------------------
// Start up
// ---------------------------------------------------------------------------
resize();
showJoy(false);
buildLevel(0);
show('start');
renderLevelButtons();
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
document.body.classList.add('ready');

// handy for automated tests
window.__game = { camState, camYaw: () => camState.yaw, G, M, T, update, render: () => renderer.render(scene, camera), startLevel, beginPlay, usePower, joy, keys, info: () => renderer.info.render, findPath, centre, tileOf, LEVELS, stunTrunchbull, caught };
