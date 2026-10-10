// Procedural stand-in for the club grounds: a foothill landscape with fairways,
// greens, bunkers, a lake, the clubhouse, 15 tennis courts and three pools.
// Hole numbers/templates follow public descriptions of the course (No. 7 over
// the lake, Principal's Nose on 11, Redan 13th, Biarritz green on 15); the
// routing itself is illustrative, not a survey of the real property.
import { makeNoise, smoothstep, lerp } from './noise.js';

const { noise, fbm } = makeNoise(1950);

// ---------------------------------------------------------------- layout
export const CLUBHOUSE = { x: 0, z: 0, rot: 0.18, w: 70, d: 34 };
export const TENNIS = { x: -130, z: 80, cols: 5, rows: 3, cw: 18.3, cl: 36.6, rot: 0.0 };
export const POOLS = {
  x: 72, z: 56, rot: 0.18,
  deck: [88, 54],
  pools: [
    { dx: -10, dz: -8, w: 50, d: 21 },   // main (junior Olympic)
    { dx: 32, dz: -8, w: 15, d: 15 },    // diving well
    { dx: -14, dz: 18, w: 18, d: 10 },   // children's pool
  ],
};


export const LAKE = { x: -160, z: -318, rx: 70, rz: 50, rot: 0.15 };

// Each hole: a polyline of fairway centre points (first point = tee) with a
// half-width, a green ellipse and bunkers. Par-3s use a short apron only.
export const HOLES = [
  {
    n: 1, label: 'Hole 01', fairway: [[40, -70], [170, -260], [230, -405]], hw: 19,
    green: { x: 238, z: -428, rx: 16, rz: 13, rot: 0.5 },
    bunkers: [[212, -408, 7, 4, 0.4], [263, -418, 6, 3.6, 1.1], [196, -250, 10, 4.5, 0.9]],
  },
  {
    n: 2, label: 'Hole 02', fairway: [[300, -470], [380, -300], [428, -80], [440, 38]], hw: 20,
    green: { x: 442, z: 58, rx: 17, rz: 14, rot: 0.1 },
    bunkers: [[421, 72, 6, 4, 0.3], [463, 52, 5, 3.5, 1.4], [398, -292, 10, 5, 0.3], [356, -305, 8, 4, 0.2]],
  },
  {
    n: 7, label: 'Hole 07', par: 3, tee: [-150, -232], apron: [[-169, -384], [-171, -396]], hw: 9,
    green: { x: -173, z: -412, rx: 17, rz: 13, rot: 0.25 },
    bunkers: [[-192, -428, 7.5, 3.6, 0.7], [-151, -428, 6, 3.4, -0.4]],
  },
  {
    n: 10, label: 'Hole 10', fairway: [[-290, -160], [-380, -290], [-468, -408]], hw: 18,
    green: { x: -482, z: -428, rx: 15, rz: 13, rot: 0.6 },
    bunkers: [[-456, -432, 6, 3.5, 0.6], [-502, -414, 5, 3.4, 0.2], [-395, -275, 9, 4.5, 0.95]],
  },
  {
    n: 11, label: 'Hole 11', fairway: [[-235, -470], [-330, -556], [-445, -610], [-540, -640]], hw: 20,
    green: { x: -561, z: -646, rx: 17, rz: 14, rot: 0.2 },
    // The Principal's Nose: a trio of pot bunkers squarely in the drive zone.
    bunkers: [[-341, -561, 5, 3.4, 0.7], [-353, -552, 4, 2.8, 0.7], [-333, -573, 4.4, 3, 0.7], [-549, -666, 7, 4, 0.1], [-582, -633, 5, 3.4, 1.3]],
  },
  {
    n: 13, label: 'Hole 13', par: 3, tee: [-656, -572], apron: [[-653, -452], [-652, -425]], hw: 15,
    // Redan: long green angled away from the tee behind a deep front bunker.
    green: { x: -650, z: -398, rx: 25, rz: 10.5, rot: 0.75 },
    bunkers: [[-640, -415, 10, 3.6, 0.75], [-676, -384, 5, 3, 0.4]],
  },
  {
    n: 15, label: 'Hole 15', par: 3, tee: [-588, -242], apron: [[-482, -160], [-462, -145]], hw: 14,
    // Biarritz: a long green split by a deep swale.
    green: { x: -428, z: -118, rx: 12, rz: 29, rot: -0.91, biarritz: 1 },
    bunkers: [[-414, -146, 11, 3.2, -0.91], [-445, -96, 11, 3.2, -0.91]],
  },
  {
    n: 16, label: 'Hole 16', fairway: [[-380, -40], [-500, 40], [-620, 90]], hw: 18,
    green: { x: -640, z: 98, rx: 15, rz: 13, rot: 0.2 },
    bunkers: [[-622, 115, 6, 3.5, 0.2], [-512, 30, 9, 4.5, 0.6]],
  },
  {
    n: 18, label: 'Hole 18', fairway: [[150, 470], [92, 300], [60, 160]], hw: 20,
    green: { x: 55, z: 134, rx: 17, rz: 13, rot: 0.1 },
    bunkers: [[34, 140, 6, 3.6, 0.2], [78, 128, 5, 3.4, 1.2], [110, 300, 9, 4.5, 0.3]],
  },
];

export const RANGE = { a: [215, 150], b: [330, 430], hw: 38, targets: [[255, 250, 8], [292, 330, 9], [310, 395, 10]] };

// Manicured lawns around the clubhouse precinct.
export const LAWNS = [
  { x: 10, z: 20, rx: 150, rz: 110 },
  { x: -130, z: 80, rx: 80, rz: 85 },
  { x: LAKE.x, z: LAKE.z, rx: LAKE.rx * 1.55, rz: LAKE.rz * 1.6 },
];

// ---------------------------------------------------------------- derived geometry
export const SEGMENTS = []; // { a:[x,z], b:[x,z], hw, kind } kind 0 fairway, 1 tee, 2 range
export const GREENS = [];
export const BUNKERS = [];
export const TEES = [];
export const FLAGS = [];

for (const h of HOLES) {
  const pts = h.fairway || h.apron;
  if (h.fairway) {
    for (let i = 0; i < pts.length - 1; i++) {
      // skip the first 45m so the tee box sits proud of the fairway
      let a = pts[i];
      if (i === 0) {
        const dx = pts[1][0] - a[0], dz = pts[1][1] - a[1], L = Math.hypot(dx, dz);
        a = [a[0] + (dx / L) * 45, a[1] + (dz / L) * 45];
      }
      SEGMENTS.push({ a, b: pts[i + 1], hw: h.hw, kind: 0 });
    }
  } else {
    SEGMENTS.push({ a: pts[0], b: pts[1], hw: h.hw, kind: 0 });
  }
  const tee = h.tee || h.fairway[0];
  const next = h.fairway ? h.fairway[1] : [h.green.x, h.green.z];
  const dx = next[0] - tee[0], dz = next[1] - tee[1], L = Math.hypot(dx, dz);
  const ux = dx / L, uz = dz / L;
  // three stacked tee boxes
  for (let k = 0; k < 3; k++) {
    const cx = tee[0] + ux * k * 16, cz = tee[1] + uz * k * 16;
    TEES.push({ x: cx, z: cz, ux, uz, hl: 6.5, hw: 5 });
    SEGMENTS.push({ a: [cx - ux * 6.5, cz - uz * 6.5], b: [cx + ux * 6.5, cz + uz * 6.5], hw: 5, kind: 1 });
  }
  GREENS.push({ ...h.green, n: h.n, biarritz: h.green.biarritz || 0 });
  for (const b of h.bunkers) BUNKERS.push({ x: b[0], z: b[1], rx: b[2], rz: b[3], rot: b[4] });
  FLAGS.push({ x: h.green.x + Math.cos(h.green.rot) * 3, z: h.green.z - Math.sin(h.green.rot) * 2, n: h.n });
}
SEGMENTS.push({ a: RANGE.a, b: RANGE.b, hw: RANGE.hw, kind: 2 });
for (const t of RANGE.targets) {
  GREENS.push({ x: t[0], z: t[1], rx: t[2], rz: t[2] * 0.8, rot: 0, n: 0, biarritz: 0 });
  FLAGS.push({ x: t[0], z: t[1], n: 0 });
}

// ---------------------------------------------------------------- masks
// Each feature carries a bounding box so far-away features are skipped cheaply.
const PAD = 70;
for (const s of SEGMENTS) {
  s.minx = Math.min(s.a[0], s.b[0]) - s.hw - PAD; s.maxx = Math.max(s.a[0], s.b[0]) + s.hw + PAD;
  s.minz = Math.min(s.a[1], s.b[1]) - s.hw - PAD; s.maxz = Math.max(s.a[1], s.b[1]) + s.hw + PAD;
}
for (const e of [...GREENS, ...BUNKERS]) {
  e.c = Math.cos(e.rot); e.s = Math.sin(e.rot); e.bound = Math.max(e.rx, e.rz) + PAD; e.m = Math.min(e.rx, e.rz);
}

function segDist(x, z, s) {
  const ax = s.a[0], az = s.a[1], bx = s.b[0] - ax, bz = s.b[1] - az;
  const px = x - ax, pz = z - az;
  const L2 = bx * bx + bz * bz;
  const t = Math.max(0, Math.min(1, (px * bx + pz * bz) / L2));
  return Math.hypot(px - bx * t, pz - bz * t) - s.hw;
}

export function ellipseDist(x, z, e) {
  const c = e.c ?? Math.cos(e.rot), s = e.s ?? Math.sin(e.rot);
  const dx = x - e.x, dz = z - e.z;
  const qx = dx * c - dz * s, qz = dx * s + dz * c;
  const k = Math.hypot(qx / e.rx, qz / e.rz);
  return (k - 1) * (e.m ?? Math.min(e.rx, e.rz));
}

// Signed distance (m) to the nearest playing surface: fairway, tee or green.
// Capped at PAD — beyond that nothing downstream cares.
export function playDist(x, z) {
  let d = PAD;
  for (const s of SEGMENTS) {
    if (x < s.minx || x > s.maxx || z < s.minz || z > s.maxz) continue;
    d = Math.min(d, segDist(x, z, s));
  }
  for (const g of GREENS) {
    if (Math.abs(x - g.x) > g.bound || Math.abs(z - g.z) > g.bound) continue;
    d = Math.min(d, ellipseDist(x, z, g));
  }
  return d;
}

function inRect(x, z, cx, cz, rot, hw, hd) {
  const c = Math.cos(rot), s = Math.sin(rot);
  const dx = x - cx, dz = z - cz;
  const qx = dx * c - dz * s, qz = dx * s + dz * c;
  return Math.max(Math.abs(qx) - hw, Math.abs(qz) - hd);
}

export function tennisDist(x, z) {
  const T = TENNIS;
  return inRect(x, z, T.x, T.z, T.rot, (T.cols * T.cw) / 2, (T.rows * T.cl) / 2);
}
export function poolDist(x, z) {
  return inRect(x, z, POOLS.x, POOLS.z, POOLS.rot, POOLS.deck[0] / 2, POOLS.deck[1] / 2);
}
export function clubhouseDist(x, z) {
  const C = CLUBHOUSE;
  return inRect(x, z, C.x, C.z, C.rot, C.w / 2, C.d / 2);
}
// Organic shoreline: the ellipse wobbled by low-frequency noise.
export function lakeDist(x, z) {
  return ellipseDist(x, z, LAKE) + noise(x * 0.018 + 4.2, z * 0.018 - 3.3) * 11 + noise(x * 0.06, z * 0.06) * 2.5;
}

// Distance to anything built or maintained (used to keep trees off it).
export function clearDist(x, z) {
  return Math.min(
    playDist(x, z),
    tennisDist(x, z) - 6,
    poolDist(x, z) - 8,
    clubhouseDist(x, z) - 16,
    lakeDist(x, z) - 4,
  );
}

// ---------------------------------------------------------------- height
const PRECINCT = { x: -20, z: 50 };

function rawHeight(x, z) {
  // gentle rolls inside the club precinct, bigger folds further out
  const dp = Math.hypot(x - PRECINCT.x, z - PRECINCT.z);
  const calm = Math.exp(-(dp * dp) / (260 * 260));
  let h = fbm(x * 0.0014, z * 0.0014, 4) * (30 - 22 * calm);
  // Appalachian foothill ridges: long SW–NE folds that rise away from the club.
  const r = Math.hypot(x * 0.9, z);
  const far = smoothstep(700, 2600, r);
  if (far > 0) {
    const u = x * 0.82 + z * 0.57, v = -x * 0.57 + z * 0.82;
    const fr = fbm(u * 0.0004 + 3.1, v * 0.0011 - 1.7, 2);
    const rr = 1 - Math.sqrt(fr * fr + 0.006); // rounded crests, no knife edges
    h += far * (rr * rr * 170 + fbm(x * 0.0011 + 9, z * 0.0011, 3) * 16);
  }
  // the clubhouse sits on a rise; the lake sits in a hollow
  h += 7 * calm;
  const dl = Math.hypot(x - LAKE.x, z - LAKE.z);
  h -= 7 * Math.exp(-(dl * dl) / (150 * 150));
  return h;
}

function detail(x, z) {
  return fbm(x * 0.0065 + 11, z * 0.0065 - 7, 3) * 4.5 + noise(x * 0.03, z * 0.03) * 0.6;
}

// Water sits just below the lowest point of the lake's rim.
let rimMin = Infinity;
for (let a = 0; a < Math.PI * 2; a += Math.PI / 24) {
  for (const k of [1.2, 1.5, 1.9]) {
    const lx = LAKE.x + Math.cos(a) * LAKE.rx * k, lz = LAKE.z + Math.sin(a) * LAKE.rz * k;
    rimMin = Math.min(rimMin, rawHeight(lx, lz) - 2.3); // detail() can dip ~2m
  }
}
export const WATER_Y = rimMin - 0.4;
const PAD_CLUB = rawHeight(CLUBHOUSE.x, CLUBHOUSE.z) + 0.6;
const PAD_TENNIS = rawHeight(TENNIS.x, TENNIS.z);
const PAD_POOL = rawHeight(POOLS.x, POOLS.z);
export const PADS = { club: PAD_CLUB, tennis: PAD_TENNIS, pool: PAD_POOL };

const greenBase = GREENS.map((g) => rawHeight(g.x, g.z) + 0.5);
const teeBase = TEES.map((t) => rawHeight(t.x, t.z) + 0.6);
for (const t of TEES) { t.rot = Math.atan2(t.ux, t.uz); }

export function height(x, z) {
  let h = rawHeight(x, z);
  const pd = playDist(x, z);
  // playing corridors keep the big rolls but lose the small lumps
  const corridor = 1 - smoothstep(-5, 40, pd);
  h += detail(x, z) * (1 - 0.75 * corridor);

  if (pd < 20) {
    // greens: built-up, gently tilted surfaces
    for (let i = 0; i < GREENS.length; i++) {
      const g = GREENS[i];
      if (Math.abs(x - g.x) > g.bound || Math.abs(z - g.z) > g.bound) continue;
      const d = ellipseDist(x, z, g);
      if (d < 14) {
        const w = 1 - smoothstep(-2, 12, d);
        let gh = greenBase[i] + (x - g.x) * 0.012 - (z - g.z) * 0.008;
        if (g.biarritz) {
          const qz = (x - g.x) * g.s + (z - g.z) * g.c;
          gh -= 1.3 * Math.exp(-(qz * qz) / 30); // swale across the middle
        }
        h = lerp(h, gh, w);
      }
    }
    // tee boxes: flat raised pads
    for (let i = 0; i < TEES.length; i++) {
      const t = TEES[i];
      if (Math.abs(x - t.x) > 20 || Math.abs(z - t.z) > 20) continue;
      const d = inRect(x, z, t.x, t.z, t.rot, t.hw, t.hl);
      if (d < 6) h = lerp(h, teeBase[i], 1 - smoothstep(0, 6, d));
    }
  }
  // bunkers
  for (const b of BUNKERS) {
    if (Math.abs(x - b.x) > b.bound - PAD + 4 || Math.abs(z - b.z) > b.bound - PAD + 4) continue;
    const d = ellipseDist(x, z, b);
    if (d < 3) {
      h -= 1.1 * (1 - smoothstep(-2.5, 0.6, d));
      h += 0.35 * Math.exp(-((d - 1.2) * (d - 1.2)) / 0.8); // flashed lip
    }
  }
  // lake bowl + a shoreline that always stays above the water
  if (Math.abs(x - LAKE.x) < 220 && Math.abs(z - LAKE.z) < 220) {
    const ld = lakeDist(x, z);
    if (ld < 90) {
      // a gentle basin: banks ease down to the waterline instead of a crater
      const bank = WATER_Y + 0.35 + Math.max(ld, 0) * 0.085;
      h = lerp(h, bank, Math.pow(1 - smoothstep(4, 90, ld), 1.4));
      if (ld < 2) h = lerp(h, WATER_Y - 3.5, 1 - smoothstep(-12, 2, ld));
    }
  }
  // building pads
  if (Math.abs(x) < 400 && Math.abs(z) < 400) {
    const cd = clubhouseDist(x, z);
    if (cd < 50) h = lerp(h, PAD_CLUB, 1 - smoothstep(4, 50, cd));
    const td = tennisDist(x, z);
    if (td < 40) h = lerp(h, PAD_TENNIS, 1 - smoothstep(2, 40, td));
    const pdd = poolDist(x, z);
    if (pdd < 40) h = lerp(h, PAD_POOL, 1 - smoothstep(2, 40, pdd));
  }
  return h;
}

// ---------------------------------------------------------------- flight path
// Closed drone route: over the lake on 7, along 11, across the Redan 13th and
// Biarritz 15th, over the tennis courts and clubhouse, and back.
export const ROUTE = [
  { p: [-138, -140], alt: 34, chapter: 0 },
  { p: [-152, -270], alt: 24, chapter: 0 },
  { p: [-168, -360], alt: 22, chapter: 0 },
  { p: [-195, -452], alt: 30, chapter: 1 },
  { p: [-290, -540], alt: 34, chapter: 1 },
  { p: [-430, -612], alt: 34, chapter: 1 },
  { p: [-588, -628], alt: 38, chapter: 2 },
  { p: [-680, -528], alt: 36, chapter: 2 },
  { p: [-660, -405], alt: 28, chapter: 2 },
  { p: [-578, -255], alt: 32, chapter: 3 },
  { p: [-452, -128], alt: 28, chapter: 3 },
  { p: [-300, -10], alt: 40, chapter: 4 },
  { p: [-140, 78], alt: 34, chapter: 4 },
  { p: [26, 34], alt: 46, chapter: 5 },
  { p: [150, -60], alt: 42, chapter: 6 },
  { p: [112, -205], alt: 36, chapter: 6 },
  { p: [-40, -175], alt: 36, chapter: 6 },
];

export const CHAPTERS = [
  { hole: 'Hole 07', note: 'Par 3 over the lake' },
  { hole: 'Hole 11', note: 'The Principal’s Nose' },
  { hole: 'Hole 13', note: 'Redan' },
  { hole: 'Hole 15', note: 'Biarritz green' },
  { hole: 'Tennis', note: '15 courts' },
  { hole: 'Clubhouse', note: 'Est. 1950' },
  { hole: 'Front nine', note: '6,811 yards · Par 72' },
];
