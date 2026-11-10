// ---------------------------------------------------------------- effects: snow chunks, runner tracks, falling snow
const PN = 720, PARTS = [];
const pmesh = new T.InstancedMesh(new T.IcosahedronGeometry(1, 0), new T.MeshLambertMaterial({ color: 0xffffff }), PN);
pmesh.frustumCulled = false; pmesh.instanceMatrix.setUsage(T.DynamicDrawUsage); pmesh.castShadow = false; pmesh.receiveShadow = false;
for (let i = 0; i < PN; i++) pmesh.setColorAt(i, col(PAL.snow)); pmesh.instanceColor.setUsage(T.DynamicDrawUsage); pmesh.count = 0; scene.add(pmesh);
function part(x, y, z, vx, vy, vz, s, life, c, g) { if (PARTS.length >= PN) return; PARTS.push({ x, y, z, vx, vy, vz, s, life, t: 0, c: c || PAL.snow, g: g === undefined ? 9 : g }); }
let _rs = 12345; const rnd = () => { _rs = (Math.imul(_rs, 1664525) + 1013904223) | 0; return (_rs >>> 0) / 4294967296; };
function puff(x, y, z, n, spd, up, size, life, bx, bz) { for (let i = 0; i < n; i++) { const a = rnd() * TAU, r = spd * (.3 + rnd() * .7); part(x + Math.cos(a) * .3, y + rnd() * .3, z + Math.sin(a) * .3, Math.cos(a) * r + bx, up * (.3 + rnd() * .8), Math.sin(a) * r + bz, size * (.35 + rnd() * .6), life * (.6 + rnd() * .6), rnd() < .3 ? PAL.snowB : PAL.snow, 8); } }
function chips(x, y, z, cols, n) { for (let i = 0; i < n; i++) { const a = rnd() * TAU, r = 2 + rnd() * 4; part(x, y, z, Math.cos(a) * r, 3 + rnd() * 5, Math.sin(a) * r, .1 + rnd() * .1, 1 + rnd() * .6, cols[i % cols.length], 13); } }
function confetti(x, y, z, c) { chips(x, y, z, [c ? PAL.teal : PAL.red, PAL.mustard, PAL.cream], 9); }
function updateParts(dt) { const im = pmesh.instanceMatrix.array, ic = pmesh.instanceColor.array; let n = 0;
  for (let i = PARTS.length - 1; i >= 0; i--) { const p = PARTS[i]; p.t += dt; if (p.t >= p.life) { PARTS[i] = PARTS[PARTS.length - 1]; PARTS.pop(); continue; }
    p.vy -= p.g * dt; const f = Math.exp(-1.6 * dt); p.vx *= f; p.vz *= f; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; }
  for (const p of PARTS) { const u = p.t / p.life, s = p.s * (u < .15 ? u / .15 : 1 - (u - .15) / .85 * .9), o = n * 16, k = col(p.c);
    im[o] = s; im[o + 1] = 0; im[o + 2] = 0; im[o + 3] = 0; im[o + 4] = 0; im[o + 5] = s; im[o + 6] = 0; im[o + 7] = 0; im[o + 8] = 0; im[o + 9] = 0; im[o + 10] = s; im[o + 11] = 0; im[o + 12] = p.x; im[o + 13] = p.y; im[o + 14] = p.z; im[o + 15] = 1;
    ic[n * 3] = k.r; ic[n * 3 + 1] = k.g; ic[n * 3 + 2] = k.b; n++; }
  pmesh.count = n; pmesh.instanceMatrix.needsUpdate = true; pmesh.instanceColor.needsUpdate = true; }
const TN = 200, TRK = [], tpos = new Float32Array(TN * 12), tcol = new Float32Array(TN * 16), tgeo = new T.BufferGeometry();
{ const idx = []; for (let i = 0; i < TN - 1; i++) for (const o of [0, 2]) { const a = i * 4 + o, b = a + 4; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  tgeo.setAttribute('position', new T.BufferAttribute(tpos, 3).setUsage(T.DynamicDrawUsage)); tgeo.setAttribute('color', new T.BufferAttribute(tcol, 4).setUsage(T.DynamicDrawUsage)); tgeo.setIndex(idx); }
const tmesh = new T.Mesh(tgeo, new T.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); tmesh.frustumCulled = false; scene.add(tmesh);
let trackGap = true;
function trackPoint(x, z, th) { const last = TRK[TRK.length - 1]; if (last && !trackGap && (x - last.x) * (x - last.x) + (z - last.z) * (z - last.z) < .36) return;
  const rx = Math.cos(th), rz = -Math.sin(th), v = []; for (const o of [-.4, -.28, .28, .4]) { const px = x + rx * o, pz = z + rz * o; v.push(px, Hg(px, pz) + .07, pz); }
  TRK.push({ x, z, v, t: G.t, brk: trackGap }); trackGap = false; if (TRK.length > TN) TRK.shift(); }
function updateTracks() { const n = TRK.length, c = col(0x8f9fd6);
  for (let i = 0; i < n; i++) { const p = TRK[i]; tpos.set(p.v, i * 12); let al = clamp(1 - (G.t - p.t) / 16, 0, 1) * .6; if (p.brk || (i + 1 < n && TRK[i + 1].brk)) al = 0;
    for (let k = 0; k < 4; k++) { const o = i * 16 + k * 4; tcol[o] = c.r; tcol[o + 1] = c.g; tcol[o + 2] = c.b; tcol[o + 3] = al; } }
  tgeo.setDrawRange(0, Math.max(0, n - 1) * 12); tgeo.attributes.position.needsUpdate = true; tgeo.attributes.color.needsUpdate = true; }
const FN = 420, fpos = new Float32Array(FN * 3), fseed = new Float32Array(FN * 3), fgeo = new T.BufferGeometry();
for (let i = 0; i < FN * 3; i++) fseed[i] = hsh(i, 5, 9);
fgeo.setAttribute('position', new T.BufferAttribute(fpos, 3).setUsage(T.DynamicDrawUsage));
const flakes = new T.Points(fgeo, new T.PointsMaterial({ color: 0xffffff, size: .34, sizeAttenuation: true, transparent: true, opacity: .92, depthWrite: false, fog: false })); flakes.frustumCulled = false; scene.add(flakes);
function updateFlakes(t) { const wrap = (w, c, s) => w + Math.round((c - w) / s) * s;
  for (let i = 0; i < FN; i++) { const a = fseed[i * 3], b = fseed[i * 3 + 1], c = fseed[i * 3 + 2];
    fpos[i * 3] = wrap(a * 150 + t * (1.2 + b) + Math.sin(t * .8 + i) * 1.2, CAM.fx, 150); fpos[i * 3 + 1] = wrap(b * 64 - t * (2.2 + a * 1.6), CAM.fy + 24, 64); fpos[i * 3 + 2] = wrap(c * 120 + t * .6, CAM.fz + 8, 120); }
  fgeo.attributes.position.needsUpdate = true; }
function resetFx() { PARTS.length = 0; TRK.length = 0; trackGap = true; G.shake = 0; G.flash = 0; }

// ---------------------------------------------------------------- camera: high three-quarter view from down the hill, looking back up at the rider
const CAM = { fx: 0, fy: 0, fz: 0, dist: 80 }, CPITCH = .54, _c = new T.Vector3(), _c2 = new T.Vector3();
let ASPECT = 1.78;
function camGoal() { const p = P; let lead = 8 + p.speed * .5, dist = lerp(54, 76, sst(5, 24, p.speed)), tx = p.x + clamp(p.vx * .3, -5, 5), tz = p.z, ty = p.y - p.airH * .65;
  if (GM.st === 'chase') { const near = 1 - sst(14, 42, GM.gap); lead -= 9 * near + 3; dist += 8; }
  if (GM.st === 'burst') { tx = (p.x + GM.x) / 2; tz = (p.z + GM.z) / 2; ty = (p.y + GM.y) / 2; lead = 3; dist = 70; }
  if (p.phase === 'crash') { lead = 4; dist = 52; }
  if (p.phase === 'intro') { lead = 1 + p.it * 3; dist = 46; }
  if (p.phase === 'caught' || p.phase === 'over') { tx = GM.x; tz = GM.z; ty = GM.y; lead = 2; dist = 44; }
  if (ASPECT < 1.3) dist *= clamp(1.3 / ASPECT, 1, 1.9);
  return [tx, ty - SLOPE * lead, tz + lead, dist]; }
function snapCamera() { const g = camGoal(); CAM.fx = g[0]; CAM.fy = g[1]; CAM.fz = g[2]; CAM.dist = g[3]; }
function updateCamera(dt) { const g = camGoal(); CAM.fx = damp(CAM.fx, g[0], 5, dt); CAM.fy = damp(CAM.fy, g[1], 5, dt); CAM.fz = damp(CAM.fz, g[2], GM.st === 'burst' ? 9 : 6, dt); CAM.dist = damp(CAM.dist, g[3], 1.6, dt);
  G.shake = Math.max(0, G.shake - dt * 2.4); const sh = G.shake * G.shake * 2.2, sx = Math.sin(G.t * 71) * sh, sy = Math.sin(G.t * 93 + 1) * sh;
  camera.position.set(CAM.fx + sx, CAM.fy + sy + CAM.dist * Math.sin(CPITCH), CAM.fz + CAM.dist * Math.cos(CPITCH)); camera.lookAt(CAM.fx + sx, CAM.fy + sy, CAM.fz); camera.updateMatrixWorld();
  scene.fog.near = CAM.dist - 2; scene.fog.far = CAM.dist + 78;
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; const nl = Math.hypot(1, SLOPE);
  for (const [nx, ny] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { _c.set(nx, ny, .5).unproject(camera).sub(camera.position); const dn = (_c.y + _c.z * SLOPE) / nl;
    const t = dn < -1e-4 ? ((CAM.fx - camera.position.x) * 0 + (CAM.fy - camera.position.y) + (CAM.fz - camera.position.z) * SLOPE) / nl / dn : 300; const hx = camera.position.x + _c.x * t, hz = camera.position.z + _c.z * t;
    x0 = Math.min(x0, hx); x1 = Math.max(x1, hx); z0 = Math.min(z0, hz); z1 = Math.max(z1, hz); }
  VIEW.x0 = x0; VIEW.x1 = x1; VIEW.z0 = Math.max(z0, CAM.fz - 110); VIEW.z1 = Math.min(z1, CAM.fz + 90);
  placeSun((x0 + x1) / 2, CAM.fy, (VIEW.z0 + VIEW.z1) / 2); }

// ---------------------------------------------------------------- putting the cast on screen
const VW = { pitch: 0, roll: 0, lean: 0, tuck: 0, dig: 0, air: 0, spray: 0 }, _qa = new T.Quaternion(), _ea = new T.Euler();
function placeRider(Ar, x, y, z, yaw, pitch, roll) { Ar.sled.position.set(x, y, z); Ar.sled.rotation.set(pitch, yaw, roll, 'YXZ'); Ar.body.position.copy(Ar.sled.position); Ar.body.quaternion.copy(Ar.sled.quaternion); }
const wrapPi = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const ease = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
function viewPlayer(dt, a) { const p = P, t = G.t; let vx = p.vx, vy = p.air ? p.vy : p.vyG, vz = p.vz;
  p.squash = damp(p.squash, 0, 7, dt);
  if (p.phase === 'caught' || p.phase === 'over') { poseRider(A, { flail: .65, t }); vx = vz = 0; vy = 0; }
  else if (p.phase === 'crash') { const c = p.cr, ct = c.t; vx = c.bvx; vy = c.bvy; vz = c.bvz;
    A.sled.position.set(c.sx, c.sy + Math.pow(Math.sin(c.sroll / 2), 2) * .46, c.sz); A.sled.rotation.set(0, ct > CR_BRUSH ? wrapPi(c.syaw0) * (1 - ease((ct - CR_BRUSH) / .3)) : c.syaw, c.sroll, 'YXZ');
    const gy = Hg(c.bx, c.bz);
    if (ct < CR_TUMBLE) { A.body.rotation.set(c.rot, c.yaw, 0, 'YXZ'); _c.set(0, .62 * A.sc, -.2 * A.sc).applyQuaternion(A.body.quaternion); A.body.position.set(c.bx - _c.x, c.by - _c.y, c.bz - _c.z); poseRider(A, { flail: 1, t }); }
    else if (ct < CR_UP) { const u = ease((ct - CR_TUMBLE) / (CR_UP - CR_TUMBLE)), r0 = wrapPi(c.rot0); A.body.rotation.set(r0 * (1 - u), wrapPi(c.yaw) * (1 - u), 0, 'YXZ'); _c.set(0, .62 * A.sc, -.2 * A.sc).applyQuaternion(A.body.quaternion).multiplyScalar(1 - u); A.body.position.set(c.bx - _c.x, lerp(c.by0, gy, u) - _c.y, c.bz - _c.z); poseRider(A, { flail: 1 - u, stand: u, t }); vx = vz = 0; }
    else if (ct < CR_BRUSH) { A.body.rotation.set(0, 0, 0); A.body.position.set(c.bx, gy, c.bz); poseRider(A, { stand: 1, brush: 1, t }); if (rnd() < dt * 30) part(c.bx + (rnd() - .5) * .5, gy + 1 + rnd() * .5, c.bz + .3, (rnd() - .5) * 2, 1, 1 + rnd(), .12, .5); vx = vz = 0; }
    else { const u = clamp((ct - CR_BRUSH) / (CR_END - CR_BRUSH), 0, 1), e = ease(u); A.body.rotation.set(0, 0, 0); A.body.position.set(lerp(c.fromX, c.sx, e), lerp(c.fromY, c.sy, e) + 1.2 * 4 * u * (1 - u), lerp(c.fromZ, c.sz, e)); poseRider(A, { stand: 1 - e * e, air: Math.sin(u * Math.PI) * .8, t }); vx = (c.sx - c.fromX) * 2; vz = (c.sz - c.fromZ) * 2; vy = 0; } }
  else { const x = lerp(p.px, p.x, a), y = lerp(p.py, p.y, a), z = lerp(p.pz, p.z, a), th = lerp(p.pth, p.th, a), yaw = th + lerp(p.pspin, p.spin, a); let pitch, roll;
    if (!p.air) { const dx = Math.sin(th), dz = Math.cos(th), e = .8; pitch = -Math.atan(clamp((H(x + dx * e, z + dz * e) - H(x - dx * e, z - dz * e)) / (2 * e), -.8, .8)); roll = Math.atan((Hg(x + dz * e, z - dx * e) - Hg(x - dz * e, z + dx * e)) / (2 * e)); }
    else { pitch = -Math.atan2(p.vy, Math.max(5, p.speed)) * .6; roll = 0; }
    VW.pitch = damp(VW.pitch, pitch, p.air ? 7 : 20, dt); VW.roll = damp(VW.roll, roll, 14, dt);
    VW.lean = damp(VW.lean, p.air ? p.spinV * .06 : p.steer * sst(2, 13, p.speed), 10, dt); VW.tuck = damp(VW.tuck, p.tuck ? 1 : 0, 10, dt); VW.dig = damp(VW.dig, p.dig ? 1 : 0, 10, dt); VW.air = damp(VW.air, p.air && p.airT > .1 ? 1 : 0, 12, dt);
    placeRider(A, x, y, z, yaw, VW.pitch, VW.roll - VW.lean * .34);
    if (p.sup > .01) { A.body.quaternion.multiply(_qa.setFromEuler(_ea.set(p.sup * 1.2, 0, 0))); A.body.translateY(p.sup * .15); A.body.translateZ(-p.sup * .55); A.body.translateY(p.sup * .5); }
    const intro = p.phase === 'intro';
    poseRider(A, { lean: VW.lean, tuck: VW.tuck, dig: VW.dig, air: VW.air * (1 - p.sup), sup: p.sup, push: intro && p.it > .3 ? 1 : 0, t, squash: p.squash });
    // snow thrown by the runners
    const sp = p.speed; if (!p.air && sp > 2) { const rx = Math.cos(th), rz = -Math.sin(th), carve = clamp(p.scrub * .13 + (p.dig ? 1.3 : 0) + sp * .02, 0, 3); VW.spray += carve * dt * 60;
      while (VW.spray > 1) { VW.spray -= 1; const sd = (p.steer > 0 ? -1 : 1) * (rnd() < .78 ? 1 : -1), bz = -.5 + rnd() * .9; part(x + rx * sd * .4 + Math.sin(th) * bz, y + .1, z + rz * sd * .4 + Math.cos(th) * bz, rx * sd * (1.5 + rnd() * 3 * Math.min(1.5, carve)) + p.vx * .25, 1.2 + rnd() * 2.6 * Math.min(1.4, carve + .3), rz * sd * (1.5 + rnd() * 3) + p.vz * .25, .07 + rnd() * .15, .45 + rnd() * .45, rnd() < .3 ? PAL.snowB : PAL.snow, 8); }
      if (p.phase === 'run') trackPoint(x, z, th); } else if (p.air) trackGap = true; }
  A.bobble.position.x = -VW.lean * .07 + Math.sin(t * 21) * .014 * Math.min(1, p.speed * .08); A.bobble.position.z = A.bobP.z - Math.min(.07, p.speed * .004); A.bobble.position.y = A.bobP.y + Math.abs(Math.sin(t * 17)) * .012 - p.squash * .05;
  A.body.updateMatrixWorld(true); updateScarf(A, dt, vx, vy, vz, t);
}
function viewNPCs(dt, a) { const t = G.t;
  for (const n of NPCS) { const x = lerp(n.px, n.x, a), y = lerp(n.py, n.y, a), z = lerp(n.pz, n.z, a), sp = Math.hypot(n.vx, n.vz);
    if (n.D) { const D = n.D; D.root.position.set(x, y, z); const run = n.st === 'go', sit = !run && n.st !== 'bonk';
      n.yaw = sp > .5 ? Math.atan2(n.vx, n.vz) : damp(n.yaw || 0, Math.atan2(P.x - n.x, P.z - n.z), 4, dt); D.root.rotation.y = n.yaw + (n.st === 'bonk' ? n.spin : 0);
      const ph = n.ph, g = run ? 1 : 0; D.body.position.y = g * Math.abs(Math.sin(ph)) * .22; D.body.rotation.x = g * Math.sin(ph * 2) * .16 - (sit ? .5 : 0);
      D.legs[0].rotation.x = D.legs[1].rotation.x = g * Math.sin(ph) * 1.0 + (sit ? .5 : 0); D.legs[2].rotation.x = D.legs[3].rotation.x = -g * Math.sin(ph) * 1.0 + (sit ? -1.3 : 0);
      D.tail.rotation.z = Math.sin(t * 16) * .7; D.head.rotation.x = sit ? .35 + Math.sin(t * 3) * .05 : -.1; D.head.rotation.z = sit ? Math.sin(t * 1.3) * .2 : 0; continue; }
    const Ar = n.A, e = .8, th = n.th, dx = Math.sin(th), dz = Math.cos(th), pitch = -Math.atan(clamp((H(x + dx * e, z + dz * e) - H(x - dx * e, z - dz * e)) / (2 * e), -.6, .6));
    const bonk = n.st === 'bonk', yaw = (n.type === 'saucer' ? n.spin : th) + (bonk ? n.spin : 0), ln = n.type === 'boarder' ? Math.cos(n.t * 1.05 + n.seed) * .9 : Math.cos(n.t * .7 + n.seed) * .4;
    placeRider(Ar, x, y, z, yaw, pitch, n.st === 'go' ? -ln * .25 : 0);
    if (n.type === 'boarder') poseRider(Ar, { stand: .8, crouch: .55, hipYaw: 1.25, armsOut: 1, lean: ln * .5, flail: bonk ? 1 : 0, t: t + n.seed });
    else poseRider(Ar, { lean: n.st === 'go' ? ln : 0, air: n.type === 'saucer' && n.st === 'go' ? .9 : 0, flail: bonk ? 1 : 0, t: t + n.seed });
    Ar.body.updateMatrixWorld(true); updateScarf(Ar, dt, n.vx, 0, n.vz, t + n.seed);
    if (n.st === 'go' && rnd() < dt * 14) part(x - dx * .6, y + .1, z - dz * .6, (rnd() - .5) * 3, 1 + rnd() * 1.5, (rnd() - .5) * 3 + n.vz * .2, .12 + rnd() * .14, .5, PAL.snow, 8); }
  for (const s of SEGS.values()) for (const gt of s.gates) if (gt.m) for (const m of gt.m) { m.rotation.x = gt.bend * .8 + Math.sin(t * 3 + gt.z) * .03; m.rotation.z = Math.sin(t * 2.3 + gt.x) * .03; }
}
const GV = { tx: .36, tz: 0, bob: 0, jaw: .3, a0x: 0, a0z: 0, a1x: 0, a1z: 0, f0: 0, f1: 0, l0: 0, l1: 0, eye: 1, hop: 0 };
function viewGrumble(dt, a) { const m = GM, M = GRUM; if (m.st === 'off' || m.st === 'gone') { M.root.visible = false; return; } M.root.visible = true;
  const s = Math.sin(m.ph), c = Math.cos(m.ph), t = G.t; let g;
  if (m.st === 'burst') g = { tx: -.22 + .05 * Math.sin(t * 38), tz: 0, bob: .5 * Math.sin(Math.min(1, m.t / 1.1) * Math.PI), jaw: 1.1, a0x: -2.6, a0z: -.55, a1x: -2.6, a1z: .55, f0: -.4, f1: -.4, l0: 0, l1: 0, eye: 1.25, hop: 0 };
  else if (m.st === 'chase') { const reach = 1 - sst(4, 12, m.gap); g = { tx: .36 + .07 * Math.sin(2 * m.ph), tz: .09 * s, bob: .32 * Math.abs(s), jaw: .3 + .15 * Math.sin(2 * m.ph) + (m.roar > 0 ? .6 : 0) + reach * .5,
    a0x: -.2 + .95 * s, a0z: -.12, a1x: lerp(-.2 - .95 * s, -1.6, reach), a1z: .12, f0: -.3 - .5 * Math.max(0, -c), f1: lerp(-.3 - .5 * Math.max(0, c), -.15, reach), l0: -.15 - .8 * s, l1: -.15 + .8 * s, eye: 1, hop: 0 }; }
  else if (m.st === 'grab') g = { tx: 0, tz: 0, bob: .1, jaw: .9, a0x: -2.2, a0z: -.3, a1x: -.75, a1z: -.2, f0: -.3, f1: -1.3, l0: 0, l1: 0, eye: 1.2, hop: 0 };
  else if (m.st === 'stomp') { const w = m.t * 2.9 * Math.PI, sw = Math.sin(w); g = { tx: -.1, tz: sw * .22, bob: 0, jaw: .65 + .3 * Math.sin(2 * w), a0x: -2.55 + .3 * Math.sin(2 * w), a0z: -.35, a1x: -.75, a1z: -.2, f0: -.3, f1: -1.3, l0: -Math.max(0, sw) * 1.0, l1: -Math.max(0, -sw) * 1.0, eye: .45, hop: Math.abs(sw) * .6 }; }
  else g = { tx: .16, tz: .1 * s, bob: .22 * Math.abs(s), jaw: .45, a0x: -2.4 + .15 * s, a0z: -.3, a1x: -.75, a1z: -.2, f0: -.3, f1: -1.3, l0: -.1 - .6 * s, l1: -.1 + .6 * s, eye: .6, hop: 0 };
  const k = m.st === 'chase' || m.st === 'leave' ? 30 : 14; for (const q in g) GV[q] = damp(GV[q], g[q], k, dt);
  M.root.position.set(lerp(m.px, m.x, a), lerp(m.py, m.y, a) + GV.hop, lerp(m.pz, m.z, a)); M.root.rotation.y = m.yaw;
  M.tilt.position.y = 1.3 + GV.bob; M.tilt.rotation.set(GV.tx, 0, GV.tz); M.tilt.scale.y = 1 + .04 * Math.sin(2 * m.ph + 1);
  M.arms[0].rotation.set(GV.a0x, 0, GV.a0z); M.arms[1].rotation.set(GV.a1x, 0, GV.a1z); M.fore[0].rotation.x = GV.f0; M.fore[1].rotation.x = GV.f1; M.legs[0].rotation.x = GV.l0; M.legs[1].rotation.x = GV.l1;
  M.legs[0].position.y = M.legs[1].position.y = 1.3 + GV.bob * .3;
  M.jaw.rotation.x = -.5 + GV.jaw * .7; const blink = (t * .37) % 1 < .04 ? .1 : 1; M.eyes.scale.y = GV.eye * blink; M.eyes.position.y = (1 - GV.eye * blink) * 2.4;
}

// ---------------------------------------------------------------- HUD: a 5x7 pixel font drawn in code
const FONT = { ' ': [0, 0, 0, 0, 0], '!': [0, 0, 95, 0, 0], "'": [0, 5, 3, 0, 0], '+': [8, 8, 62, 8, 8], ',': [0, 80, 48, 0, 0], '-': [8, 8, 8, 8, 8], '.': [0, 96, 96, 0, 0], '/': [32, 16, 8, 4, 2], ':': [0, 54, 54, 0, 0],
  0: [62, 81, 73, 69, 62], 1: [0, 66, 127, 64, 0], 2: [66, 97, 81, 73, 70], 3: [33, 65, 69, 75, 49], 4: [24, 20, 18, 127, 16], 5: [39, 69, 69, 69, 57], 6: [60, 74, 73, 73, 48], 7: [1, 113, 9, 5, 3], 8: [54, 73, 73, 73, 54], 9: [6, 73, 73, 41, 30],
  A: [126, 17, 17, 17, 126], B: [127, 73, 73, 73, 54], C: [62, 65, 65, 65, 34], D: [127, 65, 65, 34, 28], E: [127, 73, 73, 73, 65], F: [127, 9, 9, 9, 1], G: [62, 65, 73, 73, 122], H: [127, 8, 8, 8, 127], I: [0, 65, 127, 65, 0], J: [32, 64, 65, 63, 1], K: [127, 8, 20, 34, 65], L: [127, 64, 64, 64, 64], M: [127, 2, 12, 2, 127],
  N: [127, 4, 8, 16, 127], O: [62, 65, 65, 65, 62], P: [127, 9, 9, 9, 6], Q: [62, 65, 81, 33, 94], R: [127, 9, 25, 41, 70], S: [70, 73, 73, 73, 49], T: [1, 1, 127, 1, 1], U: [63, 64, 64, 64, 63], V: [31, 32, 64, 32, 31], W: [63, 64, 56, 64, 63], X: [99, 20, 8, 20, 99], Y: [7, 8, 112, 8, 7], Z: [97, 81, 73, 69, 67] };
const hudC = document.getElementById('hud'), hud = hudC.getContext('2d'); let HW = 0, HH = 0, HS = 3;
const HC = { cream: '#fff3dc', gold: '#f2bf45', red: '#ff5d52', teal: '#4fd1c8', navy: '#23263f', white: '#ffffff', orange: '#f08a3c' };
const tw = (s, k) => s.length * 6 * k - k;
function glyphs(str, x, y, k, color, rows) { hud.fillStyle = color; for (let i = 0; i < str.length; i++) { const g = FONT[str[i]]; if (!g) continue; for (let c = 0; c < 5; c++) { const b = g[c]; if (!b) continue; for (let r = 0; r < 7; r++) if (b >> r & 1) { if (rows) hud.fillStyle = rows[r]; hud.fillRect(x + (i * 6 + c) * k, y + r * k, k, k); } } } }
function txt(str, x, y, k, color, mode = 1, align = 0, rows) { x = Math.round(align === 1 ? x - tw(str, k) / 2 : align === 2 ? x - tw(str, k) : x); y = Math.round(y);
  if (mode === 2) { const o = k >= 6 ? Math.round(k * .4) : k >= 4 ? 2 : 1; for (const [dx, dy] of [[-o, 0], [o, 0], [0, -o], [0, o], [-o, -o], [o, -o], [-o, o], [o, o], [0, o * 2], [o, o * 2], [-o, o * 2]]) glyphs(str, x + dx, y + dy, k, HC.navy); }
  else if (mode === 1) glyphs(str, x + k, y + k, k, 'rgba(35,38,63,.85)');
  glyphs(str, x, y, k, color, rows); }
function chip(x, y, w, h) { hud.fillStyle = 'rgba(35,38,63,.62)'; hud.fillRect(x, y, w, h); hud.fillStyle = 'rgba(255,243,220,.35)'; hud.fillRect(x, y + h - HS, w, HS); }
function sprite(rows, x, y, k, pal) { for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) { const ch = rows[r][c]; if (ch === '.') continue; hud.fillStyle = pal[ch]; hud.fillRect(x + c * k, y + r * k, k, k); } }
const SPR_G = ['h.......h', 'hh.....hh', '.fffffff.', 'fmmmmmmmf', 'fmemmmemf', 'fmmmmmmmf', 'ftmwwwmtf', '.fffffff.'], SPR_S = ['..yy...', '..rr...', '.rrrr..', 'wwwwwww', 'r.....r'];
const SPAL = { h: '#7fdbe8', f: '#565d92', m: '#23263f', e: '#ffc247', t: '#fff1d0', w: '#fff1d0', y: '#f2bf45', r: '#d8403f' };
function drawHUD() { const k = HS, W = HW, Hh = HH, t = G.t; hud.clearRect(0, 0, W, Hh); const m = k * 4;
  if (G.flash > 0) { hud.fillStyle = 'rgba(255,255,255,' + (G.flash * .28).toFixed(3) + ')'; hud.fillRect(0, 0, W, Hh); }
  const attract = G.mode === 'attract';
  if (!attract) {
    const d = Math.floor(G.dist) + ' M', sp = Math.round(P.speed * 3.6) + ' KM/H', st = String(G.style), k2 = Math.max(1, k - 1), k1 = Math.max(1, k >> 1);
    chip(m, m, k * 76, k * 22); txt('DISTANCE', m + k * 3, m + k * 3, k1, HC.gold, 0); txt(d, m + k * 3, m + k * 9, k2, HC.cream); txt('BEST ' + Math.max(G.best, 0) + ' M', m + k * 73, m + k * 3, k1, HC.cream, 0, 2);
    txt(sp, m + k * 73, m + k * 12, k1, HC.cream, 0, 2);
    
    const sw = Math.max(k * 44, tw(st, k2) + k * 8); chip(W - m - sw, m, sw, k * 22); txt('STYLE', W - m - k * 3, m + k * 3, k1, HC.gold, 0, 2); txt(st, W - m - k * 3, m + k * 9, k2, HC.cream, 1, 2);
    if (GM.st === 'chase' || GM.st === 'burst') { const bw = k * 70, bx = W / 2 - bw / 2, by = m + k * 2, f = clamp(1 - GM.gap / 50, 0, 1), dang = GM.gap < 12 && (t * 6 | 0) % 2;
      hud.fillStyle = 'rgba(35,38,63,.62)'; hud.fillRect(bx, by + k * 3, bw, k * 2); hud.fillStyle = dang ? HC.red : HC.gold; hud.fillRect(bx + (bw - k * 16) * f, by + k * 3, (bw - k * 16) * (1 - f) + k * 4, k * 2);
      sprite(SPR_S, bx + bw - k * 8, by + k, k, SPAL); sprite(SPR_G, bx + (bw - k * 18) * f, by, k, SPAL); txt(Math.round(GM.gap) + ' M', W / 2, by + k * 10, k1, dang ? HC.red : HC.cream, 2, 1); }
  }
  if (G.warn > 0 && (t * 7 | 0) % 2) { txt('!', W / 2 - k * 50, m + k * 26, k * 2, HC.red, 2, 1); txt('!', W / 2 + k * 50, m + k * 26, k * 2, HC.red, 2, 1); hud.fillStyle = 'rgba(216,64,63,.5)'; hud.fillRect(0, 0, W, k * 2); hud.fillRect(0, Hh - k * 2, W, k * 2); hud.fillRect(0, 0, k * 2, Hh); hud.fillRect(W - k * 2, 0, k * 2, Hh); }
  let py = Hh * .47; for (let i = G.pops.length - 1; i >= 0; i--) { const p = G.pops[i], u = p.t / 1.7, kk = k + (p.t < .12 ? 1 : 0); hud.globalAlpha = u > .75 ? (1 - u) / .25 : 1; txt(p.s, W / 2, py - u * k * 9, kk, HC[p.c], 2, 1); py += k * 12; } hud.globalAlpha = 1;
  if (attract) { const tk = Math.max(2, Math.min(k * 3, Math.floor(W * .92 / 72))), ty = Math.round(Hh * .055);
    txt('GRUMBLE PEAK', W / 2, ty, tk, HC.cream, 2, 1, ['#ffffff', '#fff3dc', '#fff3dc', '#ffe3a8', '#f9cf6a', '#f2bf45', '#f08a3c']);
    txt('A DOWNHILL SLED CHASE', W / 2, ty + tk * 9.5, Math.max(1, k - 1), HC.cream, 2, 1);
    if ((t * 1.6 | 0) % 2 === 0) txt('PRESS ENTER OR TAP TO SLED', W / 2, Hh * .8, k, HC.gold, 2, 1);
    const k1 = Math.max(1, k - 2); txt('STEER: ARROWS OR A D    TUCK: DOWN    DIG IN: UP    JUMP: SPACE    SPIN IN THE AIR: LEFT / RIGHT', W / 2, Hh * .8 + k * 12, k1, HC.cream, 2, 1); txt('BEST ' + G.best + ' M      M: MUTE', W / 2, Hh * .8 + k * 12 + k1 * 11, k1, HC.cream, 2, 1); }
  else if (P.phase === 'over') { const u = ease(G.over / .35), pw = k * 168, ph = k * 84, px = Math.round(W / 2 - pw / 2), py2 = Math.round(Hh * .7 - ph / 2 + (1 - u) * k * 20); hud.globalAlpha = u;
    hud.fillStyle = 'rgba(35,38,63,.88)'; hud.fillRect(px, py2, pw, ph); hud.fillStyle = HC.cream; hud.fillRect(px, py2, pw, k); hud.fillRect(px, py2 + ph - k, pw, k); hud.fillRect(px, py2, k, ph); hud.fillRect(px + pw - k, py2, k, ph);
    sprite(SPR_G, px + k * 8, py2 + k * 7, k, SPAL); sprite(SPR_G, px + pw - k * 17, py2 + k * 7, k, SPAL);
    txt('THE GRUMBLE GOT YOU', W / 2, py2 + k * 8, k, HC.gold, 1, 1);
    txt('DISTANCE', px + k * 14, py2 + k * 24, k, HC.cream, 0); txt(Math.floor(G.dist) + ' M', px + pw - k * 14, py2 + k * 24, k, HC.cream, 0, 2);
    txt('STYLE', px + k * 14, py2 + k * 36, k, HC.cream, 0); txt(String(G.style), px + pw - k * 14, py2 + k * 36, k, HC.cream, 0, 2);
    txt('BEST', px + k * 14, py2 + k * 48, k, G.newBest ? HC.gold : HC.cream, 0); txt(G.best + ' M' + (G.newBest ? ' NEW!' : ''), px + pw - k * 14, py2 + k * 48, k, G.newBest ? HC.gold : HC.cream, 0, 2);
    if ((t * 1.6 | 0) % 2 === 0) txt('PRESS ENTER TO SLED AGAIN', W / 2, py2 + k * 66, k, HC.teal, 0, 1); hud.globalAlpha = 1; }
}

// ---------------------------------------------------------------- sound: all synthesised
const AU = { ctx: null, muted: false };
function audioInit() { if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  try { const C = window.AudioContext || window.webkitAudioContext, c = new C(); AU.ctx = c; AU.out = c.createGain(); AU.out.gain.value = AU.muted ? 0 : .8; const cmp = c.createDynamicsCompressor(); AU.out.connect(cmp); cmp.connect(c.destination);
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; AU.noise = nb;
    const loop = (type, f, q) => { const s = c.createBufferSource(); s.buffer = nb; s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(AU.out); s.start(); return { fl, g }; };
    AU.hiss = loop('bandpass', 1200, .7); AU.carve = loop('highpass', 2600, .5); AU.wind = loop('lowpass', 380, .4); AU.air = loop('bandpass', 700, 1.4);
  } catch (e) { AU.ctx = null; } }
function tone(type, f0, f1, dur, vol, delay = 0) { const c = AU.ctx; if (!c) return; const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.0008, t + dur); o.connect(g); g.connect(AU.out); o.start(t); o.stop(t + dur + .02); }
function burst(type, f0, f1, dur, vol, delay = 0, q = .8) { const c = AU.ctx; if (!c) return; const t = c.currentTime + delay, s = c.createBufferSource(); s.buffer = AU.noise; s.loopStart = Math.random(); const fl = c.createBiquadFilter(); fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur); const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0008, t + dur); s.connect(fl); fl.connect(g); g.connect(AU.out); s.start(t, Math.random()); s.stop(t + dur + .02); }
function voice(f0, f1, dur, vol, trem, lp0, lp1) { const c = AU.ctx; if (!c) return; const t = c.currentTime, g = c.createGain(), fl = c.createBiquadFilter(), ws = c.createWaveShaper(); const cv = new Float32Array(257); for (let i = 0; i < 257; i++) cv[i] = Math.tanh((i / 128 - 1) * 3); ws.curve = cv;
  fl.type = 'lowpass'; fl.Q.value = 3; fl.frequency.setValueAtTime(lp0, t); fl.frequency.linearRampToValueAtTime(lp1, t + dur * .3); fl.frequency.linearRampToValueAtTime(lp0 * .6, t + dur);
  for (const [ty, m] of [['sawtooth', 1], ['square', .5], ['sawtooth', 1.51]]) { const o = c.createOscillator(); o.type = ty; o.frequency.setValueAtTime(f0 * m, t); o.frequency.linearRampToValueAtTime(f0 * m * 1.25, t + dur * .2); o.frequency.exponentialRampToValueAtTime(f1 * m, t + dur); o.connect(ws); o.start(t); o.stop(t + dur + .05); }
  const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = trem; lg.gain.value = vol * .45; lfo.connect(lg); lg.connect(g.gain); lfo.start(t); lfo.stop(t + dur + .05);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + .07); g.gain.setValueAtTime(vol, t + dur * .6); g.gain.exponentialRampToValueAtTime(.001, t + dur); ws.connect(fl); fl.connect(g); g.connect(AU.out); burst('bandpass', 500, 250, dur, vol * .5, 0, .6); }
const sfx = {
  thump: v => { tone('sine', 110, 38, .22, .7 * v); burst('lowpass', 900, 200, .18, .5 * v); },
  hop: () => burst('bandpass', 900, 2200, .14, .22),
  swish: () => burst('bandpass', 1800, 600, .22, .22, 0, 2),
  crash: () => { burst('lowpass', 2400, 300, .5, .8); for (let i = 0; i < 6; i++) tone('triangle', 240 + Math.random() * 420, 120, .07, .32, .03 + i * .055 + Math.random() * .03); tone('sine', 150, 40, .3, .7); },
  chime: n => { const f = 880 * Math.pow(1.122, Math.min(6, n - 1)); tone('sine', f, f, .5, .3); tone('sine', f * 1.5, f * 1.5, .6, .2, .07); tone('triangle', f * 2, f * 2, .35, .1, .07); },
  miss: () => tone('square', 190, 110, .22, .16),
  bark: () => { tone('square', 520, 300, .09, .16); tone('square', 600, 320, .1, .16, .13); },
  roar: () => voice(88, 42, 1.9, .55, 23, 500, 1500),
  growl: () => voice(70, 48, .8, .3, 30, 350, 800),
  laugh: () => { for (let i = 0; i < 5; i++) { tone('sawtooth', 150 - i * 8, 95, .15, .3, i * .2); tone('square', 75 - i * 4, 50, .15, .25, i * .2); } },
  grab: () => { burst('lowpass', 1500, 200, .4, .7); tone('sine', 220, 60, .3, .5); },
  step: v => { if (v > .03) { tone('sine', 78, 34, .2, .65 * v); burst('lowpass', 500, 120, .14, .3 * v); } },
  start: () => { [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, .16, .22, i * .09)); },
  over: () => { [392, 330, 262, 196].forEach((f, i) => tone('triangle', f, f * .97, .3, .22, i * .17)); }
};
function updateAudio(dt) { if (!AU.ctx) return; const c = AU.ctx, t = c.currentTime, p = P, run = p.phase === 'run' || p.phase === 'intro', g = run && !p.air ? 1 : 0, sp = p.speed;
  AU.hiss.g.gain.setTargetAtTime(g * clamp(sp / 26, 0, 1) * .16, t, .05); AU.hiss.fl.frequency.setTargetAtTime(700 + sp * 115 + (p.ice > .3 ? 1500 : 0), t, .05);
  AU.carve.g.gain.setTargetAtTime(g * clamp(p.scrub * .02 + (p.dig ? .16 : 0), 0, .3), t, .04);
  AU.wind.g.gain.setTargetAtTime(.07 + clamp(sp / 26, 0, 1) * .1, t, .2); AU.wind.fl.frequency.setTargetAtTime(300 + sp * 22 + Math.sin(G.t * .7) * 80, t, .2);
  AU.air.g.gain.setTargetAtTime(run && p.air && p.airT > .08 ? .2 : 0, t, .06); AU.air.fl.frequency.setTargetAtTime(500 + Math.abs(p.vy) * 90 + Math.abs(p.spinV) * 60, t, .08); }

// ---------------------------------------------------------------- input: keyboard, gamepad, touch
const KEY = { l: false, r: false, u: false, d: false, jump: false, pad: 0, padJ: false, padT: false, padB: false };
function readInput(I) { let s = (KEY.r ? 1 : 0) - (KEY.l ? 1 : 0); if (Math.abs(KEY.pad) > .18) s = clamp(s + KEY.pad, -1, 1); I.steer = s; I.tuck = KEY.d || KEY.padT; I.brake = KEY.u || KEY.padB; I.jump = KEY.jump; }
function startPlay() { audioInit(); newRun('play'); sfx.start(); }
function confirmKey() { if (G.mode === 'attract') startPlay(); else if (P.phase === 'over') startPlay(); }
const CODES = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd' };
window.addEventListener('keydown', e => { audioInit(); const k = CODES[e.code];
  if (k) { KEY[k] = true; e.preventDefault(); }
  else if (e.code === 'Space') { if (!e.repeat) KEY.jump = true; e.preventDefault(); }
  else if (e.code === 'Enter' || e.code === 'NumpadEnter') { if (!e.repeat) confirmKey(); }
  else if (e.code === 'KeyR') { if (!e.repeat && G.mode === 'play') startPlay(); }
  else if (e.code === 'KeyM') { if (!e.repeat) { AU.muted = !AU.muted; if (AU.out) AU.out.gain.value = AU.muted ? 0 : .8; pop(AU.muted ? 'SOUND OFF' : 'SOUND ON'); } } });
window.addEventListener('keyup', e => { const k = CODES[e.code]; if (k) KEY[k] = false; });
window.addEventListener('blur', () => { KEY.l = KEY.r = KEY.u = KEY.d = false; });
let touchUI = false;
const TB = { tL: 'l', tR: 'r', tD: 'u', tT: 'd', tJ: 'jump' };
for (const id in TB) { const el = document.getElementById(id), k = TB[id]; el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); audioInit(); KEY[k] = true; if (G.mode === 'attract' || P.phase === 'over') confirmKey(); }); const up = e => { e.preventDefault(); if (k !== 'jump') KEY[k] = false; }; el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up); }
window.addEventListener('pointerdown', e => { audioInit(); if (e.pointerType === 'touch' && !touchUI) { touchUI = true; for (const id in TB) document.getElementById(id).style.display = 'block'; } confirmKey(); });
window.addEventListener('contextmenu', e => e.preventDefault());
let padJ0 = false, padS0 = false;
function pollPad() { let gp = null; try { const l = navigator.getGamepads ? navigator.getGamepads() : []; for (const g of l) if (g && g.connected) { gp = g; break; } } catch (e) { }
  if (!gp) { KEY.pad = 0; KEY.padT = KEY.padB = false; return; }
  const b = i => !!(gp.buttons[i] && gp.buttons[i].pressed); KEY.pad = (gp.axes[0] || 0) + (b(15) ? 1 : 0) - (b(14) ? 1 : 0); const ay = gp.axes[1] || 0;
  KEY.padT = ay > .5 || b(7) || b(13) || b(1); KEY.padB = ay < -.5 || b(6) || b(12) || b(2);
  const j = b(0); if (j && !padJ0) { audioInit(); if (G.mode === 'attract' || P.phase === 'over') confirmKey(); else KEY.jump = true; } padJ0 = j;
  const s = b(9); if (s && !padS0) confirmKey(); padS0 = s; }

// ---------------------------------------------------------------- frame loop
let lost = false;
canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; document.getElementById('lost').style.display = 'flex'; });
canvas.addEventListener('webglcontextrestored', () => { location.reload(); });
function resize() { const w = Math.max(2, window.innerWidth), h = Math.max(2, window.innerHeight), dpr = window.devicePixelRatio || 1;
  renderer.setPixelRatio(Math.min(dpr, Math.sqrt(2.1e6 / (w * h)))); renderer.setSize(w, h, false); ASPECT = w / h; camera.aspect = ASPECT; camera.updateProjectionMatrix();
  const hd = Math.min(dpr, 2); HW = hudC.width = Math.round(w * hd); HH = hudC.height = Math.round(h * hd); HS = Math.max(2, Math.round(Math.min(HW, HH * 1.7) / 500)); }
window.addEventListener('resize', resize);
A = makeRider(RIDER_PALS[0], 'sled', 7); GRUM = makeGrumble();
resize(); newRun('attract');
let last = -1, acc = 0;
function frame(ms) { requestAnimationFrame(frame); if (lost) return; const t = ms / 1000; let dt = last < 0 ? 1 / 60 : Math.min(.1, Math.max(0, t - last)); last = t;
  pollPad(); acc += dt; let n = 0; while (acc >= DT && n < 14) { step(DT); acc -= DT; n++; } if (n === 14) acc = 0; const a = acc / DT;
  G.flash = Math.max(0, G.flash - dt * 4);
  viewPlayer(dt, a); viewNPCs(dt, a); viewGrumble(dt, a); updateCamera(dt); upkeepWorld(false); updateParts(dt); updateTracks(); updateFlakes(G.t); updateAudio(dt); drawHUD();
  renderer.render(scene, camera); }
requestAnimationFrame(frame);
