// ---------------------------------------------------------------- world: chunks of snow and scenery, built ahead and dropped behind
const CHUNKS = new Map(), worldG = new T.Group(); scene.add(worldG);
const ckey = (ci, cj) => (ci + 512) * 65536 + (cj + 512);
function buildChunk(ci, cj) {
  const N = 32, x0 = ci * CH, z0 = cj * CH, d = CH / N, W = N + 3, hs = new Float32Array(W * W);
  const hb = new Float32Array(W * W);
  for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) { const x = x0 + (i - 1) * d, z = z0 + (j - 1) * d, h = Hg(x, z); hs[j * W + i] = h; hb[j * W + i] = h + .55 * noise2(x * .3, z * .19) + .2 * noise2(x * .55, z * .5); }
  const V = (N + 1) * (N + 1), pos = new Float32Array(V * 3), nor = new Float32Array(V * 3), cl = new Float32Array(V * 3), idx = [];
  const cm = col(0xb9c6ee), cs = col(PAL.snow), cb = col(PAL.snowB), ci1 = col(PAL.ice), ci2 = col(PAL.iceD);
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { const k = j * (N + 1) + i, a = (j + 1) * W + i + 1, x = x0 + i * d, z = z0 + j * d;
    pos[k * 3] = x; pos[k * 3 + 1] = hs[a]; pos[k * 3 + 2] = z;
    const nx = -(hb[a + 1] - hb[a - 1]) / (2 * d), nz = -(hb[a + W] - hb[a - W]) / (2 * d), l = Math.hypot(nx, 1, nz); nor[k * 3] = nx / l; nor[k * 3 + 1] = 1 / l; nor[k * 3 + 2] = nz / l;
    const mw = mogW(x, z), tr = mw > 0 ? mw * (1 - mogAt(x, z) / (MOGA * mw)) * .8 : 0;
    const t = clamp(.5 + noise2(x * .11, z * .11) * 1.6, 0, 1), ic = iceAt(x, z), t2 = clamp(.5 + noise2(x * .5, z * .5) * 2, 0, 1);
    for (let c = 0; c < 3; c++) { const q = c === 0 ? 'r' : c === 1 ? 'g' : 'b'; cl[k * 3 + c] = lerp(lerp(lerp(cs[q], cb[q], t * .8), cm[q], tr), lerp(ci1[q], ci2[q], t2), ic * .92); } }
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + N + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('color', new T.BufferAttribute(cl, 3)); geo.setIndex(idx); geo.computeBoundingSphere();
  const grp = new T.Group(), ground = new T.Mesh(geo, MAT); ground.receiveShadow = true; grp.add(ground);
  const g = new GB(), obs = [], n = CH / CELL;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const o = cellObstacle(ci * n + i, cj * n + j); if (!o) continue; const y = Hg(o.x, o.z); obs.push(o);
    if (o.type === 'pine') addPine(g, o.x, y, o.z, o.h, o.sd); else if (o.type === 'bare') addBare(g, o.x, y, o.z, o.h, o.sd); else if (o.type === 'stump') addStump(g, o.x, y, o.z, o.s, o.sd); else if (o.type === 'rock') addRock(g, o.x, y, o.z, o.s, o.sd);
    else { const m = o.type === 'snowman' ? snowmanMesh() : signMesh(o.sd); m.position.set(o.x, y - .08, o.z); if (o.type === 'snowman') m.rotation.y = (hsh(o.sd, 1, 20) - .5) * 1.2; grp.add(m); o.mesh = m; } }
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = ci * n + i, b = cj * n + j, r = hsh(a, b, SEED + 51); if (r > .22) continue;       // soft drifts and the odd twig: scenery only
    const x = a * CELL + hsh(a, b, SEED + 52) * CELL, z = b * CELL + hsh(a, b, SEED + 53) * CELL, y = Hg(x, z), s = .7 + hsh(a, b, SEED + 54) * 1.5;
    if (r < .15) { g.base(x, y - .06, z, r * 40); g.at(0, 0, 0, 0, 0, 0, s * 1.5, .07 + s * .04, s).ball(1, 1, PAL.snow, { smooth: true }); }
    else if (!rampAt(x, z) && !iceAt(x, z)) { g.base(x, y - .05, z, r * 90); for (let q = 0; q < 3; q++) g.dir(0, 0, 0, Math.cos(q * 2.1) * .5, 1, Math.sin(q * 2.1) * .5).frustum(.025, .008, .45 + q * .12, 3, PAL.barkD, PAL.bark, { cap: false }); } }
  if (g.P.length) grp.add(g.mesh());
  if (ci === 0 && cj === -1 || ci === -1 && cj === -1) { if (!G.hut) { G.hut = hutMeshes(); worldG.add(G.hut); } }
  worldG.add(grp); return { grp, obs, ci, cj };
}
function dropGroup(grp) { grp.traverse(m => { if (m.geometry && !GATEGEO.includes(m.geometry)) m.geometry.dispose(); }); if (grp.parent) grp.parent.remove(grp); }
function forEachObs(x0, x1, z0, z1, fn) { for (let ci = Math.floor(x0 / CH); ci <= Math.floor(x1 / CH); ci++) for (let cj = Math.floor(z0 / CH); cj <= Math.floor(z1 / CH); cj++) { const c = CHUNKS.get(ckey(ci, cj)); if (!c) continue; for (const o of c.obs) if (o.x >= x0 && o.x <= x1 && o.z >= z0 && o.z <= z1) fn(o); } }
const VIEW = { x0: -60, x1: 60, z0: -40, z1: 60 };
function upkeepWorld(all) {
  const a0 = Math.floor((VIEW.x0 - 8) / CH), a1 = Math.floor((VIEW.x1 + 8) / CH), b0 = Math.floor((VIEW.z0 - 6) / CH), b1 = Math.floor((VIEW.z1 + 18) / CH); let built = 0;
  for (let cj = b1; cj >= b0; cj--) for (let ci = a0; ci <= a1; ci++) { const k = ckey(ci, cj); if (CHUNKS.has(k)) continue; if (!all && built >= 1) continue; CHUNKS.set(k, buildChunk(ci, cj)); built++; }
  for (const [k, c] of CHUNKS) if (c.ci < a0 - 1 || c.ci > a1 + 1 || c.cj < b0 - 1 || c.cj > b1 + 1) { dropGroup(c.grp); CHUNKS.delete(k); }
  const k0 = Math.floor((VIEW.z0 - 30) / SEG), k1 = Math.floor((VIEW.z1 + 80) / SEG);
  for (let k = Math.max(0, k0); k <= k1; k++) { const s = seg(k); if (s.group) continue; s.group = new T.Group(); worldG.add(s.group);
    for (const r of s.ramps) s.group.add(rampMesh(r));
    for (const gt of s.gates) { gt.m = []; for (const sd of [-1, 1]) { const m = new T.Mesh(GATEGEO[gt.col], MAT); m.castShadow = true; const x = gt.x + sd * gt.hw; m.position.set(x, Hg(x, gt.z) - .1, gt.z); m.scale.x = -sd; m.rotation.y = sd > 0 ? 0 : 0; s.group.add(m); gt.m.push(m); } }
    for (const e of s.npc) spawnNPC(e); }
  for (const [k, s] of SEGS) if (k < k0 - 1) { if (s.group) dropGroup(s.group); SEGS.delete(k); }
}
function pushOut(o, r) { let hit = false; forEachObs(o.x - 4, o.x + 4, o.z - 4, o.z + 4, b => { if (b.dead) return; const dx = o.x - b.x, dz = o.z - b.z, rr = b.r + r, d2 = dx * dx + dz * dz; if (d2 < rr * rr) { const d = Math.sqrt(d2) || .01; o.x = b.x + dx / d * rr; o.z = b.z + dz / d * rr; hit = true; } }); return hit; }

// ---------------------------------------------------------------- state
const DT = 1 / 120, GA = 13, GS = 14, GSTICK = 45, PR = .55, CHASE_AT = 2000;
let RUNSEED = (Math.random() * 1e9) | 0;
const G = { mode: 'attract', t: 0, crashes: 0, style: 0, dist: 0, best: 0, runId: 0, hut: null, pops: [], warn: 0, over: 0, newBest: false, gates: 0, streak: 0, shake: 0, flash: 0 };
try { G.best = +(localStorage.getItem('grumblepeak.best') || 0) || 0; } catch (e) { }
const P = { phase: 'intro' };
const GM = { st: 'off' };
const NPCS = [], NEAR = [];
let A = null, GRUM = null;
const pop = (s, c = 'cream') => { G.pops.push({ s, c, t: 0 }); if (G.pops.length > 4) G.pops.shift(); };
const addStyle = n => { G.style = Math.max(0, G.style + n); };

function newRun(mode) {
  G.mode = mode; setSeed(RUNSEED); RUNSEED = (Math.imul(RUNSEED, 1664525) + 1013904223) | 0; G.runId++;
  for (const [, c] of CHUNKS) dropGroup(c.grp); CHUNKS.clear();
  for (const [, s] of SEGS) if (s.group) dropGroup(s.group); SEGS.clear();
  if (G.hut) { dropGroup(G.hut); G.hut = null; }
  for (const n of NPCS) killNPC(n); NPCS.length = 0; NEAR.length = 0;
  G.style = 0; G.dist = 0; G.pops.length = 0; G.warn = 0; G.over = 0; G.newBest = false; G.gates = 0; G.streak = 0; G.rt = 0;
  Object.assign(P, { phase: 'intro', it: 0, x: 0, z: 0, y: H(0, 0), px: 0, pz: 0, py: H(0, 0), vx: 0, vz: 0, vy: 0, vyG: 0, th: 0, pth: 0, steer: 0, air: false, airT: 0, airH: 0, spin: 0, pspin: 0, spinV: 0, sup: 0, supT: 0,
    ice: 0, scrub: 0, speed: 0, tuck: false, dig: false, jcd: 0, inv: 0, cr: null, squash: 0, nmcd: 0 });
  Object.assign(GM, { st: 'off', x: 0, y: 0, z: 0, px: 0, py: 0, pz: 0, vx: 0, sp: 0, ph: 0, t: 0, tc: 0, yaw: 0, gap: 99, roar: 0, av: 0 });
  if (GRUM) GRUM.root.visible = false;
  if (A) { scene.add(A.sled, A.body); A.body.scale.setScalar(A.sc); A.body.visible = A.sled.visible = true; A.scarfInit = false; }
  resetFx(); VIEW.x0 = -70; VIEW.x1 = 70; VIEW.z0 = -45; VIEW.z1 = 70; upkeepWorld(true); snapCamera();
}

// ---------------------------------------------------------------- the sled
function startAir(dt) { const p = P; p.air = true; p.airT = 0; p.spin = 0; p.spinV = 0; p.sup = 0; p.supT = 0; p.y += p.vy * dt; }
function land(hN) { const p = P; p.air = false; p.y = hN; p.jcd = .12;
  const turns = Math.round(p.spin / TAU), err = Math.abs(p.spin - turns * TAU);
  if ((Math.abs(p.spin) > 1.0 && err > .7) || p.sup > .5) { crash(null); return; }
  const sp = Math.hypot(p.vx, p.vz);
  if (p.airT > .3) { let pts = 0, msg = ''; const nT = Math.abs(turns);
    if (nT > 0) { pts += 200 * nT + 150 * (nT - 1); msg = (nT * 360) + ' SPIN'; }
    if (p.supT > .25) { pts += Math.round(p.supT * 15) * 10 + 50; msg = msg ? msg + ' + SUPERMAN' : 'SUPERMAN'; }
    if (p.airT > .7) { pts += Math.round(p.airT * 8) * 5; if (!msg) msg = p.airT > 1.25 ? 'HUGE AIR' : 'NICE AIR'; }
    if (pts) { addStyle(pts); pop(msg + ' +' + pts, 'gold'); }
    if (p.airT > .5 && sp > 1) { const k = (sp + Math.min(3, 1 + p.airT)) / sp; p.vx *= k; p.vz *= k; }
    sfx.thump(Math.min(1, .4 + p.airT * .5)); puff(p.x, hN + .2, p.z, 10 + (p.airT * 14 | 0), 3.2, 2.2, .3, .7, p.vx * .3, p.vz * .3); G.shake = Math.max(G.shake, .12 + p.airT * .12); p.squash = 1; }
  p.spin = 0; p.pspin = 0; p.spinV = 0; p.sup = 0; p.vyG = (H(p.x + p.vx * .01, p.z + p.vz * .01) - hN) / .01; }
function stepRun(dt, I) { const p = P;
  p.px = p.x; p.py = p.y; p.pz = p.z; p.pth = p.th; p.pspin = p.spin;
  p.steer = damp(p.steer, I.steer, p.air ? 16 : 8, dt);
  if (p.jcd > 0) p.jcd -= dt; if (p.inv > 0) p.inv -= dt; if (p.nmcd > 0) p.nmcd -= dt;
  if (!p.air) {
    const ice = iceAt(p.x, p.z); p.ice = ice;
    const sp = Math.hypot(p.vx, p.vz);
    p.th += p.steer * (2.5 - .035 * Math.min(sp, 26)) * (1 - .4 * ice) * dt; p.th -= p.th * .4 * dt * (1 - Math.abs(p.steer)); p.th = clamp(p.th, -1.3, 1.3);
    const dx = Math.sin(p.th), dz = Math.cos(p.th), e = .6;
    const gx = (Hg(p.x + e, p.z) - Hg(p.x - e, p.z)) / (2 * e), gz = (Hg(p.x, p.z + e) - Hg(p.x, p.z - e)) / (2 * e);
    let vf = p.vx * dx + p.vz * dz, vl = p.vx * dz - p.vz * dx;
    const af = -GS * (gx * dx + gz * dz), al = -GS * (gx * dz - gz * dx);
    p.tuck = I.tuck && !I.brake; p.dig = I.brake;
    vf += (af - .03 * vf - (p.tuck ? .0041 : .0091) * vf * Math.abs(vf)) * dt;
    if (p.dig && vf > 2.5) vf = Math.max(2.5, vf - 10 * dt);
    if (vf < 1.5 && !p.dig) vf += 2.5 * dt;
    const k = Math.exp(-lerp(7.5, .45, ice) * dt); vl += al * dt; p.scrub = Math.abs(vl) * (1 - k) / dt; vl *= k;
    p.vx = dx * vf + dz * vl; p.vz = dz * vf - dx * vl; p.x += p.vx * dt; p.z += p.vz * dt;
    const hN = H(p.x, p.z);
    if (hN - p.y > .55) { p.x = p.px; p.z = p.pz; crash({ x: p.x + dx, z: p.z + dz, type: 'ramp' }); return; }
    if (I.jump && p.jcd <= 0) { p.vy = Math.max(p.vyG, -SLOPE * sp - 1) + (rampAt(p.x, p.z) > .25 ? 6.5 : 4.8); startAir(dt); sfx.hop(); puff(p.x, p.y + .1, p.z, 6, 2, 1.5, .22, .5, p.vx * .2, p.vz * .2); }
    else { const yb = p.y + p.vyG * dt - .5 * GSTICK * dt * dt; if (hN < yb - .003) { p.vy = p.vyG; startAir(dt); } else { p.vyG = (hN - p.y) / dt; p.y = hN; } }
    p.airH = 0;
  } else {
    p.airT += dt; p.vy -= GA * dt; p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt;
    const hN = H(p.x, p.z); p.airH = p.y - hN; p.scrub = 0; p.tuck = false; p.dig = false;
    const raw = Math.abs(I.steer) > .3 && (p.airH > .7 || Math.abs(p.spin) > .2) ? Math.sign(I.steer) : 0;
    if (raw) p.spinV = damp(p.spinV, raw * 9, 7, dt); else { const tg = Math.round(p.spin / TAU) * TAU; p.spinV = damp(p.spinV, clamp((tg - p.spin) * 7, -6.5, 6.5), 12, dt); }
    p.spin += p.spinV * dt;
    const wantSup = I.brake && p.airH > .7; p.sup = damp(p.sup, wantSup ? 1 : 0, wantSup ? 9 : 8, dt); if (p.sup > .8) p.supT += dt;
    if (p.y <= hN) { land(hN); if (p.phase !== 'run') return; }
  }
  p.speed = Math.hypot(p.vx, p.vz); G.dist = Math.max(G.dist, p.z);
  // things you can hit
  if (p.inv <= 0) { let hit = null;
    forEachObs(p.x - 5, p.x + 5, p.z - 5, p.z + 5, o => { if (o.dead) return; const dx = p.x - o.x, dz = p.z - o.z, rr = o.r + PR, d2 = dx * dx + dz * dz;
      if (d2 < rr * rr) { if (p.air && p.y - Hg(o.x, o.z) > o.ht) return; hit = o; }
      else if (d2 < (rr + 1.25) * (rr + 1.25) && p.speed > 10 && o.nm !== G.runId) { o.nm = G.runId; NEAR.push(o); } });
    if (hit) { crash(hit); return; }
    for (const n of NPCS) { if (n.st === 'bonk') continue; const dx = p.x - n.x, dz = p.z - n.z; if (dx * dx + dz * dz < (PR + n.r) * (PR + n.r) && Math.abs(p.y - n.y) < 1.4) { n.st = 'bonk'; n.t = 0; if (n.type === 'dog') sfx.bark(); crash(n); return; } } }
  for (let i = NEAR.length - 1; i >= 0; i--) { const o = NEAR[i]; if (p.z > o.z + o.r + 1.2) { NEAR.splice(i, 1); if (p.nmcd <= 0 && !p.air && G.mode === 'play' || p.nmcd <= 0 && !p.air) { p.nmcd = 1.4; addStyle(15); pop('CLOSE ONE +15', 'cream'); sfx.swish(); } } }
  // slalom gates
  const s = segAt(p.z); for (const gt of s.gates) if (gt.state === 0 && p.pz < gt.z && p.z >= gt.z) {
    if (Math.abs(p.x - gt.x) < gt.hw) { gt.state = 1; G.streak++; const pts = 50 + 10 * Math.min(5, G.streak - 1); addStyle(pts); pop('SLALOM +' + pts, 'teal'); sfx.chime(G.streak); gt.bv = 5; confetti(gt.x - gt.hw, p.y + 2.2, gt.z, gt.col); confetti(gt.x + gt.hw, p.y + 2.2, gt.z, gt.col); }
    else if (Math.abs(p.x - gt.x) < 30) { gt.state = 2; G.streak = 0; addStyle(-20); pop('MISSED GATE -20', 'red'); sfx.miss(); } }
}
function crash(o) { const p = P; if (p.phase !== 'run') return; p.phase = 'crash'; const sp = Math.hypot(p.vx, p.vz);
  let vx = p.vx * .5, vz = p.vz * .5, sx = p.vx * .8, sz = p.vz * .8;
  if (o) { let nx = p.x - o.x, nz = p.z - o.z; const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l; let vn = vx * nx + vz * nz; if (vn < 0) { vx -= 1.6 * vn * nx; vz -= 1.6 * vn * nz; } vn = sx * nx + sz * nz; if (vn < 0) { sx -= 1.35 * vn * nx; sz -= 1.35 * vn * nz; }
    const sd = (nx * p.vz - nz * p.vx) > 0 ? 1 : -1; sx += nz * sd * 2.5; sz -= nx * sd * 2.5; vx -= nz * sd * 1.2; vz += nx * sd * 1.2; }
  p.cr = { t: 0, bx: p.x, by: p.y + .6, bz: p.z, bvx: vx, bvy: 3.5 + sp * .14, bvz: vz, rot: 0, rotV: 7 + sp * .45, yaw: Math.atan2(p.vx, p.vz) || 0, sx: p.x, sy: p.y, sz: p.z, svx: sx, svz: sz, sroll: 0, syaw: p.th, sspin: (p.steer > 0 ? 1 : -1) * (3 + sp * .2), fromX: 0, fromY: 0, fromZ: 0 };
  p.vx = p.vz = 0; p.air = false; p.airH = 0; p.speed = 0; p.scrub = 0; p.spin = p.pspin = 0; p.sup = 0; NEAR.length = 0; G.streak = 0;
  G.crashes++; pop('WIPEOUT!', 'red'); sfx.crash(); puff(p.x, p.y + .5, p.z, 34, 5, 4.5, .36, 1.0, vx * .5, vz * .5); G.shake = Math.max(G.shake, .55); G.flash = 1;
  if (o && o.type === 'snowman') { o.dead = true; o.mesh.visible = false; puff(o.x, p.y + 1.2, o.z, 26, 6, 5, .5, 1.3, vx, vz); chips(o.x, p.y + 2, o.z, [PAL.orange, PAL.mustard, PAL.red, PAL.dark], 8); }
  else if (o && (o.type === 'pine' || o.type === 'bare')) puff(o.x, p.y + o.h * .55, o.z, 22, 2.5, .5, .32, 1.2, 0, 0);
  else if (o && o.type === 'ramp') chips(p.x, p.y + .6, p.z, [PAL.wood, PAL.woodD, PAL.woodL], 8);
}
const CR_TUMBLE = 1.3, CR_UP = 1.7, CR_BRUSH = 2.15, CR_END = 2.6;
function stepCrash(dt) { const p = P, c = p.cr; c.t += dt; const o = { x: 0, z: 0 };
  if (c.t < CR_TUMBLE) { c.bx += c.bvx * dt; c.bz += c.bvz * dt; c.bvy -= GA * dt; c.by += c.bvy * dt; const h = Hg(c.bx, c.bz) + .45;
    if (c.by < h) { c.by = h; if (c.bvy < -2.5) { c.bvy = -c.bvy * .36; puff(c.bx, h, c.bz, 7, 2.5, 2, .28, .6, c.bvx * .3, c.bvz * .3); sfx.thump(.35); } else c.bvy = 0; const f = Math.exp(-2.6 * dt); c.bvx *= f; c.bvz *= f; }
    c.rot += c.rotV * dt; c.rotV = damp(c.rotV, Math.hypot(c.bvx, c.bvz) * 1.1, 3, dt);
    o.x = c.bx; o.z = c.bz; if (pushOut(o, .5)) { c.bx = o.x; c.bz = o.z; c.bvx *= .5; c.bvz *= .5; }
    if (c.t + dt >= CR_TUMBLE) { c.rot0 = c.rot; c.by0 = c.by; } }
  c.sx += c.svx * dt; c.sz += c.svz * dt; const f = Math.exp(-1.7 * dt); c.svx *= f; c.svz *= f; c.syaw += c.sspin * dt; c.sspin *= Math.exp(-1.6 * dt); c.sroll = damp(c.sroll, c.t < CR_BRUSH ? Math.PI : 0, c.t < CR_BRUSH ? 5 : 14, dt);
  o.x = c.sx; o.z = c.sz; if (pushOut(o, .7)) { c.sx = o.x; c.sz = o.z; c.svx *= .3; c.svz *= .3; } c.sy = H(c.sx, c.sz);
  if (c.t >= CR_BRUSH && c.t - dt < CR_BRUSH) { c.fromX = c.bx; c.fromY = Hg(c.bx, c.bz); c.fromZ = c.bz; c.svx = c.svz = 0; c.syaw0 = c.syaw; }
  p.x = c.bx; p.z = c.bz; p.y = Hg(c.bx, c.bz);                          // what the camera and the Grumble follow
  if (c.t >= CR_END) { p.px = p.x = c.sx; p.pz = p.z = c.sz; p.py = p.y = H(p.x, p.z); p.th = p.pth = 0; p.vx = 0; p.vz = 1.5; p.vyG = 0; p.steer = 0; p.phase = 'run'; p.inv = .5; p.cr = null; p.squash = .7; }
}

// ---------------------------------------------------------------- attract-mode pilot (also the reference for capture/autopilot.js)
const AI = { list: [], trick: 0, th: 0, margin: 1.7 };
function aiThink(I) { const p = P; I.steer = 0; I.tuck = false; I.brake = false; I.jump = false;
  if (p.phase !== 'run') return;
  if (p.air) { if (AI.trick && p.airT > .06 && Math.abs(p.spin) < 4.3 && p.vy > -6) I.steer = AI.trick; return; }
  AI.trick = 0; const list = AI.list; list.length = 0;
  forEachObs(p.x - 34, p.x + 34, p.z - 2, p.z + 48, o => { if (!o.dead) list.push(o); });
  for (const n of NPCS) list.push({ x: n.x + (n.vx || 0) * .6, z: n.z + (n.vz || 0) * .6, r: n.r + .8 });
  const s = segAt(p.z), s2 = seg(s.k + 1); let gate = null, ramp = null;
  for (const g of s.gates) if (g.z > p.z + 1.5) { gate = g; break; }
  if (!gate) for (const g of s2.gates) { if (g.z - p.z < 40) gate = g; break; }
  for (const r of s.ramps.concat(s2.ramps)) { list.push({ x: r.x - r.W, z: r.z + r.L * .65, r: .9 }, { x: r.x + r.W, z: r.z + r.L * .65, r: .9 }); if (!ramp && r.z + r.L > p.z + 1 && r.z - p.z < 60 && Math.abs(r.x - p.x) < 5 + (r.z - p.z) * .45) ramp = r; }
  const look = clamp(Math.max(7, p.speed) * 2.1, 22, 44); let best = 1e9, bth = 0;
  for (let k = 0; k < 15; k++) { const th = -1.05 + k * .15, sx = Math.sin(th), sz = Math.cos(th); let c = Math.abs(th) * 1.0 + Math.abs(th - p.th) * 1.5;
    for (let d = 2.5; d <= look; d += 2.5) { const x = p.x + sx * d, z = p.z + sz * d;
      for (const o of list) { const dx = o.x - x, dz = o.z - z, rr = o.r + AI.margin; if (dx * dx + dz * dz < rr * rr) { c += 95 * (1 - d / (look + 10)); break; } }
      const off = Math.abs(x - pisteC(z)) - (pisteHalf(z) - 3.5); if (off > 0) c += off * .5; }
    if (gate) { const xa = p.x + sx * (gate.z - p.z) / sz; c += Math.max(0, Math.abs(xa - gate.x) - .8) * (gate.z - p.z < 50 ? 1.7 : .4); }
    else if (ramp) { const xa = p.x + sx * Math.max(0, ramp.z + 2 - p.z) / sz; c += Math.abs(xa - ramp.x) * .8; }
    if (c < best) { best = c; bth = th; } }
  const rh = rampAt(p.x, p.z); if (rh > .05) bth = clamp(-p.th * .5, -.2, .2) + p.th;
  AI.th = bth; I.steer = clamp((bth - p.th) * 3.5, -1, 1);
  I.tuck = best < 3.5 && Math.abs(bth - p.th) < .3; I.brake = best > 70 && p.speed > 9;
  if (rh > 1.25) { I.jump = true; AI.trick = hsh(p.z | 0, 3, SEED) < .8 ? (hsh(p.z | 0, 4, SEED) < .5 ? -1 : 1) : 0; }
}

// ---------------------------------------------------------------- other slope life
function spawnNPC(e) { const n = { type: e.type, x: e.x, z: e.z, y: Hg(e.x, e.z), px: e.x, pz: e.z, py: 0, vx: 0, vz: 0, th: 0, st: 'wait', t: 0, r: .6, seed: hsh(e.x * 10, e.z * 10, 5) * 100, dir: e.dir || 1, spin: 0, ph: 0, k: 0, av: 0 }; n.py = n.y;
  if (e.type === 'dog') { n.D = makeDog(); n.r = .45; } else { n.A = makeRider(RIDER_PALS[1 + ((n.seed | 0) % 3)], e.type === 'saucer' ? 'saucer' : e.type === 'boarder' ? 'board' : 'sled', e.type === 'boarder' ? 4 : 3); }
  NPCS.push(n); }
function killNPC(n) { if (n.A) disposeRider(n.A); if (n.D) dropGroup(n.D.root); }
function stepNPCs(dt) { const p = P;
  for (let i = NPCS.length - 1; i >= 0; i--) { const n = NPCS[i]; n.px = n.x; n.py = n.y; n.pz = n.z; n.t += dt; const dz = n.z - p.z;
    if (dz < -50 || dz > 190) { killNPC(n); NPCS.splice(i, 1); continue; }
    let v = 0, th = 0;
    if (n.st === 'bonk') { n.vx *= Math.exp(-3 * dt); n.vz *= Math.exp(-3 * dt); n.spin += (10 - n.t * 9) * dt; if (n.t > 1.1) { n.st = n.type === 'dog' ? 'sit' : 'go'; n.t = 0; } }
    else if (n.type === 'dog') {
      if (n.st === 'wait') { if (dz < 16 && p.phase === 'run' && Math.abs(n.x - p.x) < 40) { n.st = 'go'; n.t = 0; sfx.bark(); n.side = n.x > p.x ? 1 : -1; } }
      else if (n.st === 'go') { if ((n.x - p.x) * n.side < 0) n.side = -n.side; const tx = p.x + n.side * (Math.abs(n.x - p.x) < 2.4 ? 6 : 3.4), tz = p.z + .5 + p.vz * .1, dx = tx - n.x, dzz = tz - n.z, l = Math.hypot(dx, dzz) || 1, sp = clamp(p.speed * 1.03 + (l > 3 ? 3 : -1), 5, 21);
        n.vx = damp(n.vx, dx / l * sp, 5, dt); n.vz = damp(n.vz, dzz / l * sp, 5, dt); n.ph += Math.hypot(n.vx, n.vz) * dt * 2.6; if (((n.t * 1.2) | 0) !== (((n.t - dt) * 1.2) | 0)) sfx.bark();
        if (n.t > 7.5 || p.phase !== 'run' && n.t > 1) { n.st = 'sit'; n.t = 0; } }
      else { n.vx *= Math.exp(-4 * dt); n.vz *= Math.exp(-4 * dt); } }
    else if (n.st === 'wait') { if (dz < (n.type === 'saucer' ? 58 : 80)) { n.st = 'go'; n.t = 0; } }
    else { if (n.type === 'sledder') { v = 9.5; th = .4 * Math.sin(n.t * .7 + n.seed); } else if (n.type === 'boarder') { v = 11; th = .9 * Math.sin(n.t * 1.05 + n.seed); } else { v = 8.5; const edge = (n.x - pisteC(n.z)) * n.dir > pisteHalf(n.z) - 5; if (edge) n.dir = -n.dir; th = n.dir * .62; n.spin += 3.2 * dt; }
      if (((n.k++) & 7) === 0) { let av = 0; forEachObs(n.x - 3.5, n.x + 3.5, n.z + .5, n.z + 13, o => { if (!o.dead) av += (n.x > o.x ? 1 : -1) * (1 - (o.z - n.z) / 14) * 5; }); n.av = clamp(av, -6, 6); }
      n.th = damp(n.th, th, 3, dt); n.vx = damp(n.vx, v * Math.sin(n.th) + n.av, 4, dt); n.vz = damp(n.vz, v * Math.cos(n.th), 2, dt); }
    n.x += n.vx * dt; n.z += n.vz * dt; if (pushOut(n, n.r)) { n.vx *= .9; }
    n.y = H(n.x, n.z); }
}

// ---------------------------------------------------------------- the Grumble's chase
function stepGrumble(dt) { const p = P, m = GM;
  if (m.st === 'off') { if (p.z >= CHASE_AT && p.phase === 'run' && !p.air) { const sd = p.x - pisteC(p.z) > 0 ? -1 : 1; m.st = 'burst'; m.t = 0; m.tc = 0; m.z = p.z - 13; m.x = clamp(pisteC(m.z) + sd * (pisteHalf(m.z) * .55), p.x - 14, p.x + 14); m.y = Hg(m.x, m.z); m.px = m.x; m.py = m.y; m.pz = m.z; m.sp = 6; m.vx = 0; m.ph = 0; m.yaw = Math.atan2(p.x - m.x, 13);
      G.warn = 3.2; sfx.roar(); G.shake = 1; puff(m.x, m.y + 2, m.z, 70, 9, 7, .6, 1.6, 0, 3); pop('THE GRUMBLE IS AWAKE!', 'red'); }
    return; }
  m.px = m.x; m.py = m.y; m.pz = m.z; m.t += dt;
  const tx = p.x, tz = p.z; m.gap = Math.hypot(tx - m.x, tz - m.z);
  if (m.st === 'burst') { m.z += 3 * dt; if (m.t > 1.1) { m.st = 'chase'; m.t = 0; } }
  else if (m.st === 'chase') { m.tc += dt;
    const sl = (Hg(m.x, m.z - 4) - Hg(m.x, m.z + 4)) / 8, sf = clamp(1 - 2.2 * (sl - SLOPE), .82, 1.12);
    let v = (17.2 + Math.min(5.5, m.tc * .05)) * sf; const gz = tz - m.z; if (gz > 19) v = Math.max(v, p.vz * (gz > 24 ? 1.12 : 1)); if (p.phase === 'crash') v = Math.min(v, 15);
    m.sp = damp(m.sp, v, 2.2, dt);
    if (((m.k = (m.k | 0) + 1) & 3) === 0) { let av = 0; forEachObs(m.x - 4.5, m.x + 4.5, m.z + 1, m.z + 14, o => { if (!o.dead && (o.type === 'pine' || o.type === 'bare' || o.type === 'rock')) av += (m.x > o.x ? 1 : -1) * (1 - (o.z - m.z) / 15) * 7; }); m.av = clamp(av, -8, 8); }
    m.vx = damp(m.vx, clamp((tx - m.x) * 2.4, -10, 10) + (m.gap > 7 ? m.av : 0), 5, dt);
    let vz = Math.sqrt(Math.max(9, m.sp * m.sp - m.vx * m.vx)); if (gz < 2) vz = Math.max(0, gz * 4);
    m.x += m.vx * dt; m.z += vz * dt; m.yaw = damp(m.yaw, Math.atan2(m.vx, Math.max(vz, 3)), 8, dt);
    const ph0 = m.ph; m.ph += m.sp * dt / 3.3 * Math.PI;
    if (Math.floor(m.ph / Math.PI) !== Math.floor(ph0 / Math.PI)) { const near = clamp(1 - m.gap / 45, 0, 1); G.shake = Math.max(G.shake, .32 * near); sfx.step(near); puff(m.x, m.y + .3, m.z, 9, 4, 3, .42, .8, 0, m.sp * .2); }
    if (m.roar > 0) m.roar -= dt; if (m.gap < 14 && m.roar <= 0 && hsh(m.t * 10 | 0, 2, 3) < .02) { m.roar = 1.2; sfx.growl(); }
    if (m.gap < 2.7 && p.airH < 2.6) grab(); }
  else { // grab -> stomp -> leave
    if (m.st === 'grab' && m.t > .45) { m.st = 'stomp'; sfx.laugh(); }
    if (m.st === 'stomp') { const k0 = Math.floor((m.t - dt) * 2.9), k1 = Math.floor(m.t * 2.9); if (k1 !== k0) { G.shake = Math.max(G.shake, .4); sfx.step(1); puff(m.x + (k1 % 2 ? 1 : -1) * .9, m.y + .2, m.z, 12, 4, 3, .4, .8, 0, 0); } if (m.t > 2.5) { m.st = 'leave'; m.side = m.x > pisteC(m.z) ? 1 : -1; } }
    if (m.st === 'leave' && m.t > 9) { m.st = 'gone'; }
    if (m.st === 'leave') { m.yaw = damp(m.yaw, m.side * 2.2, 2.5, dt); m.x += Math.sin(m.yaw) * 4.6 * dt; m.z += Math.cos(m.yaw) * 4.6 * dt; const ph0 = m.ph; m.ph += 4.6 * dt / 2.2 * Math.PI; if (Math.floor(m.ph / Math.PI) !== Math.floor(ph0 / Math.PI)) { sfx.step(.6); G.shake = Math.max(G.shake, .15); puff(m.x, m.y + .2, m.z, 6, 3, 2, .36, .7, 0, 0); } }
    if (m.t > 3.1 && p.phase === 'caught') { p.phase = 'over'; G.over = 0; G.newBest = G.mode === 'play' && G.dist > G.best + .5; if (G.mode === 'play' && G.dist > G.best) { G.best = Math.floor(G.dist); try { localStorage.setItem('grumblepeak.best', String(G.best)); } catch (e) { } } sfx.over(); } }
  m.y = Hg(m.x, m.z);
}
function grab() { const p = P, m = GM; m.st = 'grab'; m.t = 0; p.phase = 'caught'; p.air = false; p.vx = p.vz = 0; p.speed = 0; p.scrub = 0; p.cr = null; p.x = m.x; p.z = m.z; p.y = m.y;
  GRUM.fore[1].add(A.body); A.body.position.set(-.55, -1.25, .75); A.body.rotation.set(-.2, 1.2, 1.45);
  GRUM.fore[0].add(A.sled); A.sled.position.set(0, -2.0, .7); A.sled.rotation.set(1.25, 0, .3);
  sfx.grab(); G.shake = Math.max(G.shake, .7); puff(m.x, m.y + 1, m.z + 1, 40, 6, 5, .45, 1.1, 0, 2); pop('GOTCHA!', 'red'); G.warn = 0; }

// ---------------------------------------------------------------- one fixed step
const INPUT = { steer: 0, tuck: false, brake: false, jump: false };
function step(dt) { G.t += dt; const I = INPUT;
  if (G.mode === 'attract') aiThink(I); else readInput(I);
  const p = P;
  if (p.phase === 'intro') { p.px = p.x; p.py = p.y; p.pz = p.z; p.it += dt; if (p.it > .45) { p.vz = Math.min(5, p.vz + 7 * dt); p.z += p.vz * dt; p.y = H(p.x, p.z); } p.speed = p.vz; if (p.it > 1.15) { p.phase = 'run'; p.vyG = -SLOPE * p.vz; } }
  else if (p.phase === 'run') { G.rt += dt; stepRun(dt, I); }
  else if (p.phase === 'crash') { p.px = p.x; p.py = p.y; p.pz = p.z; stepCrash(dt); }
  else if (p.phase === 'over') { G.over += dt; if (G.mode === 'attract' && G.over > 3.5) newRun('attract'); }
  I.jump = false; KEY.jump = false;
  stepNPCs(dt); stepGrumble(dt);
  for (const s of SEGS.values()) for (const gt of s.gates) if (gt.bv || gt.bend) { gt.bv += (-gt.bend * 90 - gt.bv * 5) * dt; gt.bend += gt.bv * dt; if (Math.abs(gt.bend) < .002 && Math.abs(gt.bv) < .02) gt.bend = gt.bv = 0; }
  if (G.warn > 0) G.warn -= dt;
  for (let i = G.pops.length - 1; i >= 0; i--) { G.pops[i].t += dt; if (G.pops[i].t > 1.7) G.pops.splice(i, 1); }
}
