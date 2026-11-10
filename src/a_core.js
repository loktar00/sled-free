'use strict';
const T = THREE;
// ---------------------------------------------------------------- palette (three families + warm accents)
const PAL = {
  snow: 0xffffff, snowB: 0xe6ecfb, ice: 0xa6d8e8, iceD: 0x7dbcd9,
  pine1: 0x2c5a4c, pine2: 0x3a7460, pine3: 0x214538, bark: 0x6e4a33, barkD: 0x54382a,
  wood: 0xb97a43, woodD: 0x8e5a31, woodL: 0xd9a76a, rock1: 0x8a90a6, rock2: 0x6b7088, rock3: 0x555a72,
  red: 0xd8403f, orange: 0xf08a3c, mustard: 0xf2bf45, teal: 0x2fa3a0, navy: 0x34406b, skin: 0xf3c9a4, dark: 0x23263f, cream: 0xfff3dc,
  fur: 0x565d92, furL: 0x8b93c9, furD: 0x3d4270, belly: 0xa9b0df, frost: 0xeef2ff, horn: 0x7fdbe8, hornL: 0xe2fbff,
  mask: 0x23263f, eye: 0xffc247, tusk: 0xfff1d0, mouth: 0x4a1b33, pink: 0xe98a8a, dog: 0xa56a3a, dogL: 0xe9c79a
};
const _cc = new Map();
const col = h => { let c = _cc.get(h); if (!c) { c = new T.Color(h); _cc.set(h, c); } return c; };

// ---------------------------------------------------------------- maths
const clamp = (x, a, b) => x < a ? a : x > b ? b : x, lerp = (a, b, t) => a + (b - a) * t;
const sst = (a, b, x) => { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const TAU = Math.PI * 2;
function hsh(i, j, k) { let h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul(k | 0, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
let SEED = 1; const PH = [0, 0, 0, 0, 0, 0];
function setSeed(s) { SEED = s | 0; for (let i = 0; i < 6; i++) PH[i] = hsh(i, 7, SEED) * TAU; }
function noise2(x, z) { const ix = Math.floor(x), iz = Math.floor(z); let fx = x - ix, fz = z - iz; fx = fx * fx * (3 - 2 * fx); fz = fz * fz * (3 - 2 * fz);
  const a = hsh(ix, iz, SEED + 91), b = hsh(ix + 1, iz, SEED + 91), c = hsh(ix, iz + 1, SEED + 91), d = hsh(ix + 1, iz + 1, SEED + 91);
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fz) - .5; }

// ---------------------------------------------------------------- the mountain: height field, piste, features
const SLOPE = 0.2, SEG = 110, CELL = 5, CH = 40;
const pisteC = z => sst(25, 170, z) * (15 * Math.sin(z * .0063 + PH[0]) + 8 * Math.sin(z * .0151 + PH[1]));
const pisteHalf = z => 19.5 - 3.5 * sst(400, 4000, z) + 1.5 * Math.sin(z * .021 + PH[5]);
function baseH(x, z) {
  const d = Math.abs(x - pisteC(z)) - pisteHalf(z) * .72;
  let h = -SLOPE * z + 2.4 * Math.sin(z * .0187 + PH[2]) + 1.0 * Math.sin(z * .041 + PH[3]) + .8 * Math.sin(x * .043 + z * .012 + PH[4]) + 1.5 * noise2(x * .06, z * .06);
  if (d > 0) h += 7 * (1 - Math.exp(-d * d * .0022));
  return h;
}
const SEGS = new Map();
const SCRIPT = [[null, 'ramp'], ['slalom'], ['mog', 'ramp'], ['dog', 'ice'], ['ramp', 'boarder'], ['slalom'], ['saucer', 'ramp'], ['mog', 'sledder']];
function seg(k) {
  let s = SEGS.get(k); if (s) return s;
  const z0 = k * SEG; s = { k, z0, ramps: [], gates: [], mog: [], ice: [], npc: [], clear: [], group: null };
  SEGS.set(k, s); if (k < 0) return s;
  const R = n => hsh(k, n, SEED + 77);
  const slot = (b, kind) => { const zb = z0 + b * 55;
    if (kind === 'ramp') { const z = zb + 8 + R(10 + b) * 8, x = pisteC(z + 3) + (R(12 + b) - .5) * 11; s.ramps.push({ x, z, L: 7, W: 2.7, h: 2.0 }); s.clear.push({ x, z: z + 12, rx: 6.5, rz: 30 }); }
    else if (kind === 'mog') { const z = zb + 27, x = pisteC(z) + (R(14 + b) - .5) * 5; s.mog.push({ x, z, rx: 11.5, rz: 22 }); s.clear.push({ x, z, rx: 11.5, rz: 23 }); }
    else if (kind === 'ice') { for (let i = 0; i < 2; i++) { const z = zb + 12 + i * 24 + R(16 + b + i) * 6, x = pisteC(z) + (R(18 + b + i * 3) - .5) * 17; s.ice.push({ x, z, rx: 6 + R(20 + i) * 3, rz: 9 + R(22 + i) * 4 }); s.clear.push({ x, z, rx: 7.5, rz: 12 }); } }
    else if (kind === 'dog') { const z = zb + 30, sd = R(30 + b) < .5 ? -1 : 1; s.npc.push({ type: 'dog', x: pisteC(z) + sd * (pisteHalf(z) - 4), z }); s.clear.push({ x: pisteC(z) + sd * (pisteHalf(z) - 4), z, rx: 4, rz: 4 }); }
    else if (kind === 'sledder') { const z = zb + 20; s.npc.push({ type: 'sledder', x: pisteC(z) + (R(32 + b) - .5) * 12, z }); }
    else if (kind === 'boarder') { const z = zb + 22; s.npc.push({ type: 'boarder', x: pisteC(z) + (R(34 + b) - .5) * 10, z }); }
    else if (kind === 'saucer') { const z = zb + 26, sd = R(36 + b) < .5 ? -1 : 1; s.npc.push({ type: 'saucer', x: pisteC(z) + sd * (pisteHalf(z) - 4), z, dir: -sd }); }
  };
  let pair;
  if (k < SCRIPT.length) pair = SCRIPT[k];
  else if (R(1) < .22) pair = ['slalom'];
  else { const pick = r => r < .28 ? 'ramp' : r < .42 ? 'mog' : r < .56 ? 'ice' : r < .64 ? 'dog' : r < .73 ? 'sledder' : r < .81 ? 'boarder' : r < .88 ? 'saucer' : null; pair = [pick(R(2)), pick(R(3))]; }
  if (pair[0] === 'slalom') { const dir = R(4) < .5 ? -1 : 1;
    for (let i = 0; i < 5; i++) { const z = z0 + 12 + i * 22, x = pisteC(z) + (i % 2 ? 1 : -1) * 5 * dir; s.gates.push({ x, z, hw: 3.4, col: i % 2, state: 0, bend: 0, bv: 0 }); s.clear.push({ x, z, rx: 8, rz: 10 }); } }
  else { slot(0, pair[0]); slot(1, pair[1]); }
  return s;
}
const segAt = z => seg(Math.floor(z / SEG));
function cleared(x, z) { const s = segAt(z); for (const c of s.clear) { const dx = (x - c.x) / c.rx, dz = (z - c.z) / c.rz; if (dx * dx + dz * dz < 1) return true; } return false; }
function iceAt(x, z) { const s = segAt(z); let m = 0; for (const c of s.ice) { const dx = (x - c.x) / c.rx, dz = (z - c.z) / c.rz, w = 1 - dx * dx - dz * dz; if (w > 0) m = Math.max(m, sst(0, .22, w)); } return m; }
function mogAt(x, z) { const s = segAt(z); let m = 0; for (const c of s.mog) { const dx = (x - c.x) / c.rx, dz = (z - c.z) / c.rz, w = 1 - dx * dx - dz * dz; if (w > 0) m += MOGA * sst(0, .4, w) * (.5 + .5 * Math.sin(x * 1.5) * Math.sin(z * 1.25)); } return m; }
const MOGA = .36;
function mogW(x, z) { const s = segAt(z); let m = 0; for (const c of s.mog) { const dx = (x - c.x) / c.rx, dz = (z - c.z) / c.rz, w = 1 - dx * dx - dz * dz; if (w > 0) m = Math.max(m, sst(0, .4, w)); } return m; }
function rampAt(x, z) { const s = segAt(z); for (const r of s.ramps) { const u = z - r.z; if (u >= 0 && u <= r.L && Math.abs(x - r.x) < r.W) return r.h * Math.pow(u / r.L, 1.3); } return 0; }
const Hg = (x, z) => baseH(x, z) + mogAt(x, z);        // snow surface
const H = (x, z) => Hg(x, z) + rampAt(x, z);            // what a sled rides on

// one possible obstacle per 5 m cell, decided by hashing the cell: the same mountain for the same seed
function cellObstacle(i, j) {
  const r = hsh(i, j, SEED + 11), x = i * CELL + .6 + hsh(i, j, SEED + 12) * (CELL - 1.2), z = j * CELL + .6 + hsh(i, j, SEED + 13) * (CELL - 1.2);
  if (z < 16 && z > -16 && Math.abs(x) < 15) return null;
  const c = pisteC(z), half = pisteHalf(z), d = Math.abs(x - c);
  let dens; const forest = d > half;
  if (forest) dens = .22 + .62 * sst(half, half + 9, d); else dens = (.06 + .1 * sst(0, 3000, z)) * (.55 + .9 * sst(0, half, d));
  if (z < 0) dens = forest ? dens : .0;
  if (r > dens) return null;
  if (!forest && cleared(x, z)) return null;
  const t = hsh(i, j, SEED + 14), u = hsh(i, j, SEED + 15), sd = (i * 7919 + j * 104729) | 0;
  let o;
  if (forest) { if (t < .82) { const h = 6 + u * 5.5; o = { type: 'pine', h, r: h * .1 + .25, ht: h }; } else if (t < .94) { const h = 4.5 + u * 2.5; o = { type: 'bare', h, r: .42, ht: h }; } else { const s = .9 + u * .9; o = { type: 'rock', s, r: s * 1.0, ht: s * .8 }; } }
  else if (t < .34) { const h = 4.2 + u * 4.2; o = { type: 'pine', h, r: h * .1 + .25, ht: h }; }
  else if (t < .46) { const h = 4 + u * 2; o = { type: 'bare', h, r: .42, ht: h }; }
  else if (t < .62) { const s = .8 + u * .5; o = { type: 'stump', s, r: s * .5, ht: s * .7 }; }
  else if (t < .86) { const s = .7 + u * .8; o = { type: 'rock', s, r: s * 1.0, ht: s * .8 }; }
  else if (t < .93) o = { type: 'snowman', r: .7, ht: 2.5 };
  else o = { type: 'sign', r: .4, ht: 2.7 };
  o.x = x; o.z = z; o.sd = sd; o.dead = false; o.nm = -1;
  return o;
}
