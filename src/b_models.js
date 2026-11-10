// ---------------------------------------------------------------- renderer, scene, light
const canvas = document.getElementById('gl');
const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
const scene = new T.Scene(), FOGC = 0xcdd5ef;
scene.background = new T.Color(FOGC); scene.fog = new T.Fog(FOGC, 90, 190);
const camera = new T.PerspectiveCamera(24, 1, 20, 460);
const hemi = new T.HemisphereLight(0xaab6e6, 0x7f89bd, Math.PI); scene.add(hemi);
const sun = new T.DirectionalLight(0xffffff, Math.PI); sun.color.setRGB(.82, .66, .08);
const SUNL = new T.Vector3(-.72, .58, .38).normalize(), SUNR = new T.Vector3().crossVectors(new T.Vector3(0, 1, 0), SUNL).normalize(), SUNU = new T.Vector3().crossVectors(SUNL, SUNR);
const SH = 88;
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0006; sun.shadow.normalBias = .06;
{ const c = sun.shadow.camera; c.left = -SH; c.right = SH; c.top = SH; c.bottom = -SH; c.near = 20; c.far = 340; c.updateProjectionMatrix(); }
scene.add(sun, sun.target);
function placeSun(cx, cy, cz) { const tex = SH * 2 / 2048, a = Math.round((cx * SUNR.x + cy * SUNR.y + cz * SUNR.z) / tex) * tex, b = Math.round((cx * SUNU.x + cy * SUNU.y + cz * SUNU.z) / tex) * tex, c = cx * SUNL.x + cy * SUNL.y + cz * SUNL.z;
  const x = SUNR.x * a + SUNU.x * b + SUNL.x * c, y = SUNR.y * a + SUNU.y * b + SUNL.y * c, z = SUNR.z * a + SUNU.z * b + SUNL.z * c;
  sun.target.position.set(x, y, z); sun.position.set(x + SUNL.x * 170, y + SUNL.y * 170, z + SUNL.z * 170); }
const MAT = new T.MeshLambertMaterial({ vertexColors: true });
const GLOW = new T.MeshBasicMaterial({ vertexColors: true });

// ---------------------------------------------------------------- low-poly geometry builder (float attributes only)
const ICO = (() => { const t = (1 + Math.sqrt(5)) / 2;
  const v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(a => { const l = Math.hypot(a[0], a[1], a[2]); return a.map(x => x / l); });
  const f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const out = []; let tris = f.map(a => a.map(i => v[i]));
  const mid = (a, b) => { const m = [a[0] + b[0], a[1] + b[1], a[2] + b[2]], l = Math.hypot(m[0], m[1], m[2]); return m.map(x => x / l); };
  for (let d = 0; d < 3; d++) { out.push(tris); const nt = []; for (const [a, b, c] of tris) { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); nt.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); } tris = nt; }
  return out; })();
const _p = new T.Vector3(), _s = new T.Vector3(), _q = new T.Quaternion(), _e = new T.Euler(), _m = new T.Matrix4(), _up = new T.Vector3(0, 1, 0), _d = new T.Vector3();
class GB {
  constructor() { this.P = []; this.N = []; this.C = []; this.B = new T.Matrix4(); this.M = new T.Matrix4(); this.NM = new T.Matrix3(); }
  base(x = 0, y = 0, z = 0, ry = 0, s = 1, rx = 0, rz = 0) { this.B.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(s, s, s)); return this.at(); }
  at(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) { _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz)); return this._set(); }
  dir(x, y, z, dx, dy, dz, sx = 1, sy = sx, sz = sx) { _m.compose(_p.set(x, y, z), _q.setFromUnitVectors(_up, _d.set(dx, dy, dz).normalize()), _s.set(sx, sy, sz)); return this._set(); }
  _set() { this.M.multiplyMatrices(this.B, _m); this.NM.getNormalMatrix(this.M); return this; }
  pt(x, y, z) { return new T.Vector3(x, y, z).applyMatrix4(this.B); }
  _v(a) { _p.set(a[0], a[1], a[2]).applyMatrix4(this.M); this.P.push(_p.x, _p.y, _p.z); }
  face(a, b, c, ca, cb, cc, hint, na, nb, nc) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (hint && nx * hint[0] + ny * hint[1] + nz * hint[2] < 0) { let t = b; b = c; c = t; t = cb; cb = cc; cc = t; t = nb; nb = nc; nc = t; nx = -nx; ny = -ny; nz = -nz; }
    this._v(a); this._v(b); this._v(c);
    if (na) { for (const n of [na, nb, nc]) { _p.set(n[0], n[1], n[2]).applyMatrix3(this.NM).normalize(); this.N.push(_p.x, _p.y, _p.z); } }
    else { _p.set(nx, ny, nz).applyMatrix3(this.NM).normalize(); for (let i = 0; i < 3; i++) this.N.push(_p.x, _p.y, _p.z); }
    for (const h of [ca, cb, cc]) { const k = col(h); this.C.push(k.r, k.g, k.b); }
  }
  frustum(r0, r1, h, n, c0, c1 = c0, o = {}) { const ph = o.rot || 0;
    for (let i = 0; i < n; i++) { const a0 = ph + i / n * TAU, a1 = ph + (i + 1) / n * TAU, am = (a0 + a1) / 2;
      const p0 = [r0 * Math.cos(a0), 0, r0 * Math.sin(a0)], p1 = [r0 * Math.cos(a1), 0, r0 * Math.sin(a1)], q0 = [r1 * Math.cos(a0), h, r1 * Math.sin(a0)], q1 = [r1 * Math.cos(a1), h, r1 * Math.sin(a1)];
      const hint = [Math.cos(am) * h, r0 - r1, Math.sin(am) * h]; let n0, n1;
      if (o.smooth) { n0 = [Math.cos(a0) * h, r0 - r1, Math.sin(a0) * h]; n1 = [Math.cos(a1) * h, r0 - r1, Math.sin(a1) * h]; }
      if (r0 > 1e-4) this.face(p0, q0, p1, c0, c1, c0, hint, n0, n0, n1);
      if (r1 > 1e-4) this.face(p1, q0, q1, c0, c1, c1, hint, n1, n0, n1);
      if (r1 > 1e-4 && o.cap !== false) this.face([0, h, 0], q0, q1, c1, c1, c1, [0, 1, 0]);
      if (o.bot) this.face([0, 0, 0], p0, p1, c0, c0, c0, [0, -1, 0]);
    } return this; }
  ball(r, det, c, o = {}) { const L = o.lump || 0, sd = o.seed || 0;
    const Pf = v => { const k = L ? r * (1 + L * (hsh(Math.round(v[0] * 97), Math.round(v[1] * 89) + sd, Math.round(v[2] * 83)) - .5) * 2) : r; return [v[0] * k, v[1] * k, v[2] * k]; };
    for (const [a, b, d] of ICO[det]) { const m = [(a[0] + b[0] + d[0]) / 3, (a[1] + b[1] + d[1]) / 3, (a[2] + b[2] + d[2]) / 3], cc = o.cf ? o.cf(m[0], m[1], m[2]) : c;
      if (o.smooth) this.face(Pf(a), Pf(b), Pf(d), cc, cc, cc, m, a, b, d); else this.face(Pf(a), Pf(b), Pf(d), cc, cc, cc, m); }
    return this; }
  box(w, h, d, c, ct = c) { const x = w / 2, y = h / 2, z = d / 2, V = [[-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z], [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]];
    const F = [[0, 1, 2, 3, [0, 0, -1]], [4, 5, 6, 7, [0, 0, 1]], [0, 3, 7, 4, [-1, 0, 0]], [1, 2, 6, 5, [1, 0, 0]], [3, 2, 6, 7, [0, 1, 0]], [0, 1, 5, 4, [0, -1, 0]]];
    for (const f of F) { const k = f[4][1] > 0 ? ct : c; this.face(V[f[0]], V[f[1]], V[f[2]], k, k, k, f[4]); this.face(V[f[0]], V[f[2]], V[f[3]], k, k, k, f[4]); } return this; }
  tri2(a, b, c, k) { this.at(); this.face(a, b, c, k, k, k); this.face(a, c, b, k, k, k); return this; }
  quad(a, b, c, d, k, hint) { this.at(); this.face(a, b, c, k, k, k, hint); this.face(a, c, d, k, k, k, hint); return this; }
  build() { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(this.P, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(this.N, 3)); g.setAttribute('color', new T.Float32BufferAttribute(this.C, 3)); g.computeBoundingSphere(); return g; }
  mesh(mat = MAT) { const m = new T.Mesh(this.build(), mat); m.castShadow = true; m.receiveShadow = true; return m; }
}

// ---------------------------------------------------------------- scenery
function addPine(g, x, y, z, h, sd) {
  g.base(x, y - .2, z, hsh(sd, 2, 5) * TAU, 1, (hsh(sd, 1, 5) - .5) * .12, (hsh(sd, 3, 5) - .5) * .12);
  const r = h * (.21 + .06 * hsh(sd, 4, 5)), n = h > 7.2 ? 4 : 3, greens = [PAL.pine3, PAL.pine1, PAL.pine2, PAL.pine2, PAL.pine2];
  g.at().frustum(h * .04 + .08, h * .03 + .05, h * .3, 5, PAL.barkD, PAL.bark, { cap: false });
  for (let i = 0; i < n; i++) { const y0 = h * (.15 + .6 * i / n), last = i === n - 1, th = last ? h - y0 : h * .6 / n * 1.75, rb = r * (1 - .58 * i / n);
    g.at(0, y0, 0, 0, i * .7, 0).frustum(rb, last ? 0 : rb * .08, th, 7, greens[i], greens[i + 1], { bot: true });
    g.at(0, y0 + th * .34, 0, 0, i * .7 + .449, 0).frustum(rb * .8, 0, th * .8, 7, PAL.snowB, PAL.snow); }
}
function addBare(g, x, y, z, h, sd) {
  g.base(x, y - .15, z, hsh(sd, 2, 6) * TAU, 1, (hsh(sd, 1, 6) - .5) * .2, (hsh(sd, 3, 6) - .5) * .2);
  g.at().frustum(h * .045 + .07, h * .018, h, 5, PAL.barkD, PAL.bark, { cap: false });
  const nb = 5 + (hsh(sd, 4, 6) * 3 | 0);
  for (let i = 0; i < nb; i++) { const f = .36 + .55 * i / nb, a = i * 2.4 + hsh(sd, i, 7) * 1.2, tl = .7 + .45 * hsh(sd, i, 8), L = h * (.44 - .3 * (f - .36));
    const dx = -Math.sin(tl) * Math.cos(a), dy = Math.cos(tl), dz = Math.sin(tl) * Math.sin(a), by = h * f;
    g.dir(0, by, 0, dx, dy, dz).frustum(h * .022, h * .007, L, 4, PAL.barkD, PAL.bark, { cap: false });
    g.dir(dx * L * .5, by + dy * L * .5, dz * L * .5, dx * .3 + dz * .7, dy + .25, dz * .3 - dx * .7).frustum(h * .012, h * .004, L * .5, 3, PAL.bark, PAL.bark, { cap: false });
    g.at(dx * L * .45, by + dy * L * .45 + h * .02, dz * L * .45, 0, a, 0, 1.5, .5, 1).ball(h * .035, 0, PAL.snow); }
  g.at(0, h * .36, 0, 0, 0, 0, 1, .6, 1).ball(h * .05, 0, PAL.snow);
}
function addStump(g, x, y, z, s, sd) {
  g.base(x, y - .08, z, hsh(sd, 2, 9) * TAU, s);
  g.at().frustum(.52, .42, .6, 7, PAL.barkD, PAL.bark, { cap: false });
  g.at(0, .6, 0).frustum(.42, .42, .02, 7, PAL.woodL, PAL.woodL);
  g.at(-.1, .6, .06, 0, 0, 0, 1, .42, 1).ball(.34, 1, PAL.snow, { lump: .12, seed: sd });
  g.at(.35, .05, .3, 0, 0, 0, 1, .5, 1).ball(.3, 0, PAL.snow);
}
function addRock(g, x, y, z, s, sd) {
  g.base(x, y + .08 * s, z, hsh(sd, 2, 10) * TAU, s, (hsh(sd, 3, 10) - .5) * .3);
  const rc = [PAL.rock1, PAL.rock2, PAL.rock3, PAL.rock2];
  g.at(0, 0, 0, 0, 0, 0, 1.2, .82, 1).ball(1, 1, 0, { lump: .2, seed: sd, cf: (nx, ny, nz) => ny > .5 ? PAL.snow : ny > .36 ? PAL.snowB : rc[(hsh(nx * 40, ny * 40, nz * 40 + sd) * 4) | 0] });
  if (hsh(sd, 4, 10) > .45) g.at(.85, -.1, .5, 0, 1, 0, .55, .42, .5).ball(1, 0, 0, { lump: .2, seed: sd + 3, cf: (nx, ny) => ny > .45 ? PAL.snow : PAL.rock2 });
}
function snowmanMesh() { const g = new GB();
  g.at(0, .55, 0).ball(.64, 1, PAL.snow, { smooth: true }); g.at(0, 1.38, 0).ball(.46, 1, PAL.snow, { smooth: true }); g.at(0, 2.02, 0).ball(.33, 1, PAL.snow, { smooth: true });
  g.at(0, 2.02, .3, 1.5708, 0, 0).frustum(.07, 0, .36, 5, PAL.orange);
  for (const s of [-1, 1]) { g.at(s * .12, 2.12, .29).ball(.045, 0, PAL.dark); g.dir(s * .4, 1.5, 0, s * .8, .45, .15).frustum(.035, .015, .75, 4, PAL.barkD, PAL.bark); }
  for (let i = 0; i < 3; i++) g.at(0, 1.2 + i * .17, .44 - Math.abs(i - 1) * .03).ball(.045, 0, PAL.dark);
  g.at(0, 1.74, 0).frustum(.37, .33, .13, 8, PAL.red, PAL.red); g.at(.26, 1.5, .26, 0, 0, .2).box(.14, .42, .06, PAL.red);
  g.at(0, 2.27, 0, 0, 0, .12).frustum(.25, .19, .28, 7, PAL.mustard, PAL.mustard); g.at(0, 2.26, 0, 0, 0, .12).frustum(.33, .33, .04, 7, PAL.orange, PAL.orange);
  return g.mesh(); }
function signMesh(sd) { const g = new GB(); g.base(0, -.1, 0, (hsh(sd, 1, 12) - .5) * .5);
  g.at().frustum(.1, .08, 2.6, 5, PAL.woodD, PAL.wood);
  const a = hsh(sd, 2, 12) < .5 ? 1 : -1;
  g.at(a * .3, 2.15, .06).box(.95, .28, .07, PAL.wood); g.tri2([a * .775, 2.34, .06], [a * .775, 1.96, .06], [a * 1.05, 2.15, .06], PAL.wood);
  g.at(-a * .25, 1.72, .06).box(.8, .26, .07, PAL.woodL); g.tri2([-a * .65, 1.88, .06], [-a * .65, 1.56, .06], [-a * .9, 1.72, .06], PAL.woodL);
  g.at(a * .3, 2.32, .06).box(.9, .08, .14, PAL.snow); g.at(-a * .25, 1.88, .06).box(.76, .07, .14, PAL.snow); g.at(0, 2.62, 0, 0, 0, 0, 1, .6, 1).ball(.15, 0, PAL.snow);
  return g.mesh(); }
function gateGeo(c) { const g = new GB();
  g.at().frustum(.06, .045, 2.6, 5, PAL.cream, PAL.cream); g.at(0, .9, 0).frustum(.065, .06, .3, 5, c, c, { cap: false }); g.at(0, 1.7, 0).frustum(.058, .053, .3, 5, c, c, { cap: false });
  g.tri2([0, 2.58, 0], [0, 1.98, 0], [.95, 2.28, 0], c); g.at(0, 2.62, 0).ball(.08, 0, PAL.mustard);
  return g.build(); }
const GATEGEO = [gateGeo(PAL.red), gateGeo(PAL.teal)];
function rampMesh(r) { const g = new GB(), n = 5, W = r.W;
  const top = (x, u) => Hg(x, r.z + u) + r.h * Math.pow(u / r.L, 1.3), bot = (x, u) => Hg(x, r.z + u) - .3;
  for (let i = 0; i < n; i++) { const u0 = i / n * r.L, u1 = (i + 1) / n * r.L, xl = r.x - W, xr = r.x + W;
    g.quad([xl, top(xl, u0), r.z + u0], [xr, top(xr, u0), r.z + u0], [xr, top(xr, u1), r.z + u1], [xl, top(xl, u1), r.z + u1], PAL.snow, [0, 1, 0]);
    for (const [x, hx] of [[xl, -1], [xr, 1]]) g.quad([x, bot(x, u0), r.z + u0], [x, top(x, u0) - .02, r.z + u0], [x, top(x, u1) - .02, r.z + u1], [x, bot(x, u1), r.z + u1], i % 2 ? PAL.wood : PAL.woodD, [hx, 0, 0]); }
  const zl = r.z + r.L;                                     // the lip: striped board the rider flies over
  for (let k = 0; k < 6; k++) { const x0 = r.x - W + k * W / 3, x1 = x0 + W / 3; g.quad([x0, bot(x0, r.L), zl], [x1, bot(x1, r.L), zl], [x1, top(x1, r.L), zl], [x0, top(x0, r.L), zl], k % 2 ? PAL.mustard : PAL.red, [0, 0, 1]); }
  for (const s of [-1, 1]) { const x = r.x + s * (W + .25), y = Hg(x, zl - .3); g.base(x, y - .2, zl - .3); g.at().frustum(.09, .07, r.h + 1.5, 5, PAL.woodD, PAL.wood); g.tri2([0, r.h + 1.45, 0], [0, r.h + .95, 0], [-s * .8, r.h + 1.2, 0], PAL.red); g.at(0, r.h + 1.5, 0, 0, 0, 0, 1, .6, 1).ball(.13, 0, PAL.snow); }
  return g.mesh(); }
function hutMeshes() { const g = new GB(), y = Hg(0, -8) - .3; g.base(0, y, -8);
  for (let i = 0; i < 7; i++) g.at(0, .2 + i * .4, 0).box(5.6 + (i % 2) * .25, .4, 4.2 - (i % 2) * .25, i % 2 ? PAL.wood : PAL.woodD);
  g.tri2([-2.8, 2.9, 2.1], [2.8, 2.9, 2.1], [0, 4.7, 2.1], PAL.wood); g.tri2([-2.8, 2.9, -2.1], [2.8, 2.9, -2.1], [0, 4.7, -2.1], PAL.wood);
  for (const s of [-1, 1]) { g.at(s * 1.55, 3.72, 0, 0, 0, -s * .57).box(3.9, .2, 5.2, PAL.barkD); g.at(s * 1.6, 3.98, 0, 0, 0, -s * .57).box(4.0, .36, 5.4, PAL.snowB, PAL.snow); }
  g.at(0, 4.92, 0).box(.7, .3, 5.4, PAL.snow);
  g.at(.4, 1.05, 2.13).box(1.15, 2.0, .1, PAL.barkD); g.at(.4, 1.05, 2.17).box(.95, 1.8, .06, PAL.woodD); g.at(.72, 1.05, 2.22).ball(.07, 0, PAL.mustard);
  g.at(-1.7, 1.75, 2.13).box(1.25, 1.05, .1, PAL.barkD); g.at(-1.7, 1.2, 2.2).box(1.35, .12, .26, PAL.snow);
  g.at(1.5, 4.5, -.9).box(.7, 1.8, .7, PAL.rock2); g.at(1.5, 5.45, -.9).box(.86, .16, .86, PAL.snow);
  g.at(0, .06, 3.3).box(3.2, .12, 2.2, PAL.woodL);                        // little deck
  for (const s of [-1, 1]) { g.at(s * 6, 0, 9.5).frustum(.11, .09, 4.2, 5, PAL.woodD, PAL.wood); g.at(s * 6, 4.25, 9.5, 0, 0, 0, 1, .6, 1).ball(.17, 0, PAL.snow); }
  const cols = [PAL.red, PAL.mustard, PAL.teal, PAL.orange];                // bunting over the start line
  for (let i = 0; i < 14; i++) { const u = (i + .5) / 14, x = -6 + 12 * u, yy = 4.1 - 1.1 * 4 * u * (1 - u); g.tri2([x - .36, yy, 9.5], [x + .36, yy, 9.5], [x, yy - .62, 9.5], cols[i % 4]); }
  g.at(-3.6, .5, 2.6, 0, .5, 0).box(.5, 1.0, 1.4, PAL.woodD); g.at(-3.6, 1.05, 2.6, 0, .5, 0).box(.56, .14, 1.5, PAL.snow);     // wood pile
  const w = new GB(); w.base(0, y, -8); w.at(-1.7, 1.78, 2.19).box(1.0, .8, .04, PAL.mustard); w.at(-1.7, 1.78, 2.2).box(.06, .8, .05, PAL.barkD); w.at(-1.7, 1.78, 2.2).box(1.0, .06, .05, PAL.barkD);
  const grp = new T.Group(); grp.add(g.mesh(), w.mesh(GLOW)); return grp; }

// ---------------------------------------------------------------- the sledders
const RIDER_PALS = [
  { coat: PAL.red, hat: PAL.mustard, band: PAL.orange, scarf: PAL.teal, pants: PAL.navy, sled: PAL.red, mitt: PAL.teal },
  { coat: PAL.teal, hat: PAL.red, band: PAL.cream, scarf: PAL.mustard, pants: PAL.navy, sled: PAL.mustard, mitt: PAL.red },
  { coat: PAL.mustard, hat: PAL.teal, band: PAL.cream, scarf: PAL.red, pants: PAL.navy, sled: PAL.teal, mitt: PAL.navy },
  { coat: PAL.orange, hat: PAL.navy, band: PAL.mustard, scarf: PAL.cream, pants: PAL.navy, sled: PAL.orange, mitt: PAL.teal }
];
function makeRider(p, kind = 'sled', scarfN = 6) {
  const A = { kind, arms: [], thighs: [], knees: [], scarf: [], sp: [], hipY0: .42, hipZ: -.3 };
  A.sled = new T.Group(); A.body = new T.Group(); scene.add(A.sled, A.body);
  let g = new GB();
  if (kind === 'saucer') { g.at(0, .04, 0).frustum(.5, .92, .2, 10, p.sled, p.sled, { cap: false, bot: true }); g.at(0, .1, 0).frustum(.5, .86, .13, 10, PAL.cream, PAL.cream, { cap: false, bot: true }); g.at(0, .23, 0).frustum(.93, .93, .03, 10, PAL.cream, PAL.cream); A.hipY0 = .34; A.hipZ = -.1; }
  else if (kind === 'board') { g.at(0, .07, 0).box(.5, .07, 1.7, p.sled, PAL.cream); g.at(0, .13, .95, -.45, 0, 0).box(.5, .07, .4, p.sled, PAL.cream); g.at(0, .13, -.95, .45, 0, 0).box(.5, .07, .4, p.sled, PAL.cream); A.hipZ = 0; }
  else {
    for (const [i, x] of [-.23, 0, .23].entries()) g.at(x, .36, -.08).box(.2, .055, 1.55, i % 2 ? PAL.woodL : PAL.wood);
    g.at(0, .315, -.62).box(.74, .05, .11, PAL.woodD); g.at(0, .315, .34).box(.74, .05, .11, PAL.woodD); g.at(0, .37, .8).box(1.0, .07, .11, PAL.woodD);
    for (const s of [-1, 1]) { const x = s * .35; g.at(x, .035, -.15).box(.06, .07, 1.55, p.sled); g.at(x, .1, .74, -.5, 0, 0).box(.06, .07, .34, p.sled); g.at(x, .26, .95, -1.15, 0, 0).box(.06, .07, .3, p.sled); g.at(x, .38, 1.02).ball(.06, 0, p.sled);
      g.at(x, .19, -.62).box(.045, .3, .06, p.sled); g.at(x, .19, .34).box(.045, .3, .06, p.sled); }
  }
  A.sled.add(g.mesh());
  A.hip = new T.Group(); A.body.add(A.hip); A.torso = new T.Group(); A.hip.add(A.torso);
  g = new GB();
  g.at(0, -.02, 0).frustum(.34, .31, .12, 8, p.band, p.band, { cap: false, bot: true }); g.at(0, .08, 0).frustum(.31, .235, .56, 8, p.coat, p.coat);
  g.at(0, .34, .262, .13, 0, 0).box(.06, .5, .03, p.band); g.at(0, .6, 0).frustum(.25, .22, .15, 8, p.scarf, p.scarf); g.at(.13, .52, .22, 0, 0, -.25).box(.13, .22, .07, p.scarf);
  g.at(0, .3, -.3).box(.36, .4, .16, p.pants, p.band);                    // little backpack
  A.torso.add(g.mesh());
  A.anchor = new T.Object3D(); A.anchor.position.set(0, .66, -.24); A.torso.add(A.anchor);
  A.head = new T.Group(); A.head.position.set(0, .92, .02); A.torso.add(A.head);
  g = new GB();
  g.at().ball(.27, 1, PAL.skin, { smooth: true });
  g.base(0, .07, -.05, 0, 1, -.42); g.at(0, 0, 0).frustum(.3, .3, .1, 9, p.band, p.band, { cap: false }); g.at(0, .09, 0).frustum(.295, .22, .17, 9, p.hat, p.hat, { cap: false }); g.at(0, .26, 0).frustum(.22, .1, .12, 9, p.hat, p.hat); const bobP = g.pt(0, .43, 0); g.base();
  g.at(0, .0, .19, -.25, 0, 0).box(.47, .19, .2, PAL.dark); g.at(-.115, .005, .292, -.25, 0, 0).box(.18, .13, .02, PAL.ice, PAL.snow); g.at(.115, .005, .292, -.25, 0, 0).box(.18, .13, .02, PAL.ice, PAL.snow); g.at(0, -.03, 0, -.2, 0, 0).frustum(.276, .276, .07, 9, PAL.dark, PAL.dark, { cap: false });
  g.at(0, -.17, .2).box(.1, .04, .04, PAL.mouth); g.at(-.16, -.13, .19).ball(.05, 0, PAL.pink); g.at(.16, -.13, .19).ball(.05, 0, PAL.pink);
  for (const s of [-1, 1]) g.at(s * .27, -.03, -.02, 0, 0, 0, .5, 1, 1).ball(.1, 0, p.band);    // ear muffs
  A.head.add(g.mesh());
  g = new GB(); g.at().ball(.125, 1, PAL.cream, { lump: .12 }); A.bobble = g.mesh(); A.bobble.position.copy(bobP); A.bobP = bobP; A.head.add(A.bobble); A.bob = { x: 0, z: 0, vx: 0, vz: 0 };
  for (const s of [-1, 1]) {
    const arm = new T.Group(); arm.position.set(s * .3, .55, 0); A.torso.add(arm); A.arms.push(arm);
    g = new GB(); g.at(0, -.43, 0).frustum(.085, .11, .43, 6, p.coat, p.coat, { cap: false }); g.at(0, 0, 0).ball(.115, 0, p.coat); g.at(0, -.45, 0).frustum(.1, .1, .05, 6, p.band, p.band, { cap: false }); g.at(0, -.52, 0, 0, 0, 0, 1, 1.1, 1.15).ball(.115, 1, p.mitt, { smooth: true }); arm.add(g.mesh());
    const th = new T.Group(); th.position.set(s * .15, .03, .05); A.hip.add(th); A.thighs.push(th);
    g = new GB(); g.at(0, -.42, 0).frustum(.105, .135, .42, 6, p.pants, p.pants, { cap: false }); g.at(0, -.42, 0).ball(.108, 0, p.pants); th.add(g.mesh());
    const kn = new T.Group(); kn.position.set(0, -.42, 0); th.add(kn); A.knees.push(kn);
    g = new GB(); g.at(0, -.4, 0).frustum(.095, .105, .4, 6, p.pants, p.pants, { cap: false }); g.at(0, -.47, .07, 0, 0, 0, 1, .85, 1.65).ball(.125, 1, PAL.barkD, { smooth: true }); g.at(0, -.57, .07).box(.2, .04, .4, p.band); kn.add(g.mesh());
  }
  for (let i = 0; i < scarfN; i++) { g = new GB(); g.at().box(.17 - i * .008, .045, .26, i === scarfN - 1 ? p.band : (i % 2 ? p.scarf : p.scarf)); if (i === scarfN - 1) g.at(0, 0, .16).box(.2, .05, .08, PAL.cream); const m = g.mesh(); m.scale.setScalar(1.2); scene.add(m); A.scarf.push(m); A.sp.push(new T.Vector3()); }
  A.sp.push(new T.Vector3()); A.scarfInit = false;
  A.sc = kind === 'saucer' ? 1.02 : 1.2; A.sled.scale.setScalar(A.sc); A.body.scale.setScalar(A.sc);
  return A;
}
// o: lean tuck dig air sup flail stand brush push t squash
function poseRider(A, o) {
  const t = o.t || 0, fl = o.flail || 0, st = o.stand || 0, tk = o.tuck || 0, dg = o.dig || 0, ar = o.air || 0, su = o.sup || 0, br = o.brush || 0, pu = o.push || 0, ln = o.lean || 0;
  A.hip.position.set(0, lerp(A.hipY0, .87, st) - (o.squash || 0) * .12, A.hipZ * (1 - st));
  A.hip.rotation.y = o.hipYaw || 0;
  A.torso.rotation.set(.12 + tk * .6 - dg * .42 - ar * .22 + fl * Math.sin(t * 13) * .5 + br * .3 + pu * (.35 + .2 * Math.sin(t * 14)), 0, -ln * .5);
  A.torso.scale.y = 1 - (o.squash || 0) * .18;
  A.head.rotation.set(-tk * .75 - .12 + dg * .2 - br * .2 + fl * Math.sin(t * 9) * .4, -ln * .35, ln * .15);
  for (let s = 0; s < 2; s++) { const sg = s ? 1 : -1;
    let ax = -.9 - tk * .45 + dg * .55, az = sg * .2;
    ax = lerp(ax, -2.7 + Math.sin(t * 10 + s * 2) * .25, ar); az = lerp(az, sg * .6, ar);
    ax = lerp(ax, -3.0, su); az = lerp(az, sg * .25, su);
    ax = lerp(ax, .1, st); if (o.armsOut) { ax = lerp(ax, -.3, o.armsOut); az = lerp(az, sg * 1.15, o.armsOut); }
    if (br) { ax = lerp(ax, -1.0 + Math.sin(t * 24 + s * 3.14) * .55, br); az = lerp(az, -sg * .45, br); }
    if (pu) { ax = lerp(ax, .2 + Math.sin(t * 14) * 1.0, pu); az = lerp(az, sg * .55, pu); }
    if (fl) { ax = lerp(ax, -1.6 + Math.sin(t * 17 + s * 3.1) * 1.4, fl); az = lerp(az, sg * (.9 + .4 * Math.sin(t * 11 + s)), fl); }
    A.arms[s].rotation.set(ax, 0, az);
    let la = -1.75 - tk * .1 + dg * .28, lb = .55 + tk * .3 - dg * .5, lz = sg * (.06 + dg * .5);
    if (A.kind === 'saucer') { la = -1.5; lb = 1.5; lz = sg * .7; }
    la = lerp(la, -.18 - (o.crouch || 0) * .7, st); lb = lerp(lb, .12 + (o.crouch || 0) * 1.3, st);
    la = lerp(la, .3 + Math.sin(t * 12 + s * 3) * .12, su); lb = lerp(lb, .05, su);
    if (fl) { la = lerp(la, -.9 + Math.sin(t * 15 + s * 2.6) * 1.0, fl); lb = lerp(lb, .8 + Math.sin(t * 12 + s) * .6, fl); lz = lerp(lz, sg * .4, fl); }
    A.thighs[s].rotation.set(la, 0, lz); A.knees[s].rotation.x = lb; }
}
const _w = new T.Vector3(), _w2 = new T.Vector3();
function updateScarf(A, dt, vx, vy, vz, t) {
  A.anchor.getWorldPosition(_w); const n = A.scarf.length, L = .25 * A.sc;
  if (!A.scarfInit) { for (let i = 0; i <= n; i++) A.sp[i].set(_w.x, _w.y, _w.z - i * L); A.scarfInit = true; }
  A.sp[0].copy(_w);
  const sp = Math.hypot(vx, vz), k = Math.min(1, dt * 60);
  for (let i = 1; i <= n; i++) { const p = A.sp[i], q = A.sp[i - 1];
    const fl = Math.min(1, sp * .08) + .15;
    p.x += (-vx * .05 + Math.sin(t * 15 - i * 1.25) * .16 * fl * (.4 + i * .22)) * k; p.z += (-vz * .05 - .012) * k; p.y += (-vy * .03 - .035 + Math.cos(t * 12 - i * 1.1) * .09 * fl + Math.min(.035, sp * .002)) * k;
    _w2.subVectors(p, q); const l = _w2.length() || 1; p.copy(q).addScaledVector(_w2, L / l);
    const h = Hg(p.x, p.z) + .06; if (p.y < h) p.y = h; }
  for (let i = 0; i < n; i++) { const m = A.scarf[i]; m.position.addVectors(A.sp[i], A.sp[i + 1]).multiplyScalar(.5); m.lookAt(A.sp[i + 1]); m.visible = A.body.visible; }
}
function disposeRider(A) { for (const o of [A.sled, A.body, ...A.scarf]) { o.traverse(m => { if (m.geometry) m.geometry.dispose(); }); if (o.parent) o.parent.remove(o); } }

// ---------------------------------------------------------------- the dog
function makeDog() { const D = { legs: [] }; D.root = new T.Group(); scene.add(D.root); D.body = new T.Group(); D.root.add(D.body);
  let g = new GB(); g.at(0, .58, 0, 0, 0, 0, .3, .3, .56).ball(1, 1, PAL.dog, { smooth: true }); g.at(0, .5, .2, 0, 0, 0, .24, .22, .3).ball(1, 1, PAL.dogL, { smooth: true }); g.at(0, .66, .42, 1.2, 0, 0).frustum(.2, .19, .1, 7, PAL.red, PAL.red, { cap: false }); D.body.add(g.mesh());
  D.head = new T.Group(); D.head.position.set(0, .84, .56); D.body.add(D.head);
  g = new GB(); g.at().ball(.24, 1, PAL.dog, { smooth: true }); g.at(0, -.06, .22).box(.19, .16, .26, PAL.dogL); g.at(0, 0, .37).ball(.06, 0, PAL.dark); g.at(0, -.13, .27).box(.08, .03, .14, PAL.pink);
  for (const s of [-1, 1]) { g.at(s * .21, .0, -.03, 0, 0, s * .35, .5, 1.3, .9).ball(.14, 0, PAL.barkD); g.at(s * .1, .09, .2).ball(.04, 0, PAL.dark); } D.head.add(g.mesh());
  D.tail = new T.Group(); D.tail.position.set(0, .72, -.5); D.body.add(D.tail); g = new GB(); g.dir(0, 0, 0, 0, .8, -.6).frustum(.07, .03, .45, 5, PAL.dog, PAL.dogL); D.tail.add(g.mesh());
  for (const [x, z] of [[-.17, .34], [.17, .34], [-.17, -.34], [.17, -.34]]) { const l = new T.Group(); l.position.set(x, .46, z); D.body.add(l); g = new GB(); g.at(0, -.44, 0).frustum(.06, .08, .44, 5, PAL.dog, PAL.dog, { cap: false }); g.at(0, -.44, .03, 0, 0, 0, 1, .6, 1.3).ball(.08, 0, PAL.dogL); l.add(g.mesh()); D.legs.push(l); }
  return D; }

// ---------------------------------------------------------------- THE GRUMBLE: horned, shaggy, dusk-blue, very pleased with itself
function makeGrumble() { const M = {}; M.root = new T.Group(); scene.add(M.root); M.tilt = new T.Group(); M.tilt.position.y = 1.3; M.root.add(M.tilt);
  let g = new GB();
  g.at(0, 1.5, 0, 0, 0, 0, 1.8, 1.9, 1.5).ball(1, 2, 0, { lump: .06, seed: 3, cf: (x, y, z) => y > .62 ? PAL.furL : hsh(x * 31, y * 31, z * 31) > .62 ? PAL.furD : PAL.fur });
  g.at(0, 1.05, .98, 0, 0, 0, 1.15, 1.2, .6).ball(1, 1, PAL.belly, { smooth: true });
  let k = 0;                                                             // shaggy coat: drooping tufts all over
  for (let i = 0; i < 150; i++) { const u = hsh(i, 1, 40) * 2 - 1, a = hsh(i, 2, 40) * TAU, rr = Math.sqrt(1 - u * u), dx = rr * Math.cos(a), dy = u, dz = rr * Math.sin(a);
    if (dz > .25 && dy > -.75 && Math.abs(dx) < .72) continue;           // keep the face and belly clear
    if (dy < -.8) continue;
    const big = .8 + hsh(i, 3, 40) * .7; g.dir(dx * 1.72, 1.5 + dy * 1.82, dz * 1.42, dx * .55, dy * .3 - .8, dz * .55).frustum(.26 * big, 0, .62 * big, 4, k++ % 3 ? PAL.fur : PAL.furD, PAL.furL); }
  for (let i = 0; i < 11; i++) { const a = -.5 + i * .27, y = 1.5 + Math.cos(a) * 1.85, z = -Math.sin(a) * 1.45; g.dir(0, y, z, 0, Math.cos(a) + .3, -Math.sin(a) - .35).frustum(.3, 0, 1.0 - i * .03, 4, PAL.furL, PAL.frost);     // frost mane down the back
    for (const s of [-1, 1]) g.dir(s * .5, y - .1, z, s * .5, Math.cos(a) + .1, -Math.sin(a) - .3).frustum(.24, 0, .7, 4, PAL.furL, PAL.frost); }
  for (const s of [-1, 1]) for (let i = 0; i < 5; i++) g.dir(s * (1.25 + i * .12), 2.75 - i * .12, .5 - i * .25, s * .7, .5, -.2).frustum(.24, 0, .6, 4, PAL.furL, PAL.frost);     // shoulder ruff
  for (const s of [-1, 1]) { let px = s * .95, py = 3.02, pz = .35;       // ice horns, curling up and forward
    for (let i = 0; i < 5; i++) { const f = i / 4, dx = lerp(s * .9, -s * .1, f), dy = lerp(.35, .85, f), dz = lerp(-.05, .65, f), l = Math.hypot(dx, dy, dz), L = .52, r0 = .3 - i * .055, r1 = .3 - (i + 1) * .055;
      g.dir(px, py, pz, dx, dy, dz).frustum(r0, Math.max(0, r1), L, 6, i % 2 ? PAL.horn : PAL.hornL, i % 2 ? PAL.hornL : PAL.horn, { cap: false }); px += dx / l * L * .93; py += dy / l * L * .93; pz += dz / l * L * .93; }
    g.at(s * .95, 3.0, .35).ball(.36, 0, PAL.furD); }
  g.base(0, 2.38, 1.14, 0, 1, -.5);                                       // the face, tilted up toward the sky
  g.at(0, 0, 0, 0, 0, 0, 1.0, .74, .4).ball(1, 1, PAL.mask, { smooth: true });
  for (const s of [-1, 1]) g.at(s * .43, .5, .3, 0, 0, s * .5).box(.62, .18, .26, PAL.frost);
  g.at(0, .0, .42, 0, 0, 0, 1.2, .8, 1).ball(.14, 0, PAL.belly);
  g.at(0, -.34, .26).box(1.02, .26, .2, PAL.mouth);
  for (let i = 0; i < 6; i++) g.at(-.42 + i * .168, -.2, .36, Math.PI, 0, 0).frustum(.075, 0, .16, 4, PAL.tusk);
  const jawP = g.pt(0, -.5, .08), eyeB = g.B.clone();
  M.body = g.mesh(); M.tilt.add(M.body);
  g = new GB(); g.B.copy(eyeB); for (const s of [-1, 1]) { g.at(s * .42, .2, .33).ball(.18, 1, PAL.eye); g.at(s * .4, .19, .47, 0, 0, 0, .6, 1, .6).ball(.085, 0, PAL.dark); }
  M.eyes = g.mesh(GLOW); M.eyes.castShadow = false; M.tilt.add(M.eyes);
  M.jaw = new T.Group(); M.jaw.position.copy(jawP); M.jaw.rotation.x = -.5; M.tilt.add(M.jaw);
  g = new GB(); g.at(0, -.1, .22).box(1.12, .22, .5, PAL.furD, PAL.mouth); for (const s of [-1, 1]) g.at(s * .43, 0, .4).frustum(.12, 0, .5, 5, PAL.tusk);
  for (let i = 0; i < 5; i++) g.dir(-.44 + i * .22, -.2, .34, 0, -1, .25).frustum(.14, 0, .5 + (i % 2) * .15, 4, PAL.furL, PAL.frost);
  M.jaw.add(g.mesh());
  M.arms = []; M.fore = []; M.legs = [];
  for (const s of [-1, 1]) {
    const arm = new T.Group(); arm.position.set(s * 1.72, 2.45, .1); M.tilt.add(arm); M.arms.push(arm);
    g = new GB(); g.at(0, -1.6, 0).frustum(.5, .64, 1.6, 7, PAL.fur, PAL.fur, { cap: false }); g.at(0, -.05, 0).ball(.74, 1, PAL.fur, { lump: .08 });
    for (let i = 0; i < 9; i++) { const a = i * 2.1; g.dir(Math.cos(a) * .5, -.3 - (i % 3) * .45, Math.sin(a) * .5, Math.cos(a) * .5, -.85, Math.sin(a) * .5).frustum(.2, 0, .5, 4, PAL.furD, PAL.furL); } arm.add(g.mesh());
    const fo = new T.Group(); fo.position.y = -1.6; arm.add(fo); M.fore.push(fo);
    g = new GB(); g.at(0, -1.45, 0).frustum(.66, .5, 1.45, 7, PAL.fur, PAL.fur, { cap: false }); g.at(0, 0, 0).ball(.52, 0, PAL.fur);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.dir(Math.cos(a) * .58, -1.05, Math.sin(a) * .58, Math.cos(a) * .45, -.9, Math.sin(a) * .45).frustum(.2, 0, .55, 4, PAL.furL, PAL.frost); }
    g.at(0, -1.72, .08).ball(.64, 1, PAL.mask, { lump: .08 });
    for (let i = -1; i <= 1; i++) g.dir(i * .34, -1.95, .45, i * .15, -.55, .8).frustum(.13, 0, .5, 4, PAL.tusk);
    fo.add(g.mesh());
    const leg = new T.Group(); leg.position.set(s * .85, 1.3, 0); M.root.add(leg); M.legs.push(leg);
    g = new GB(); g.at(0, -1.0, 0).frustum(.5, .66, 1.1, 7, PAL.furD, PAL.fur, { cap: false });
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; g.dir(Math.cos(a) * .52, -.7, Math.sin(a) * .52, Math.cos(a) * .5, -.85, Math.sin(a) * .5).frustum(.2, 0, .45, 4, PAL.fur, PAL.furL); }
    g.at(0, -1.12, .32, 0, 0, 0, .62, .3, .95).ball(1, 1, PAL.mask, { smooth: true });
    for (let i = -1; i <= 1; i++) g.dir(i * .3, -1.2, 1.1, 0, -.1, 1).frustum(.11, 0, .34, 4, PAL.tusk);
    leg.add(g.mesh());
  }
  M.root.visible = false; return M; }
