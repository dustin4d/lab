// Topographic contour art drawn from the same height field as the 3D grounds.
import { height } from './course.js';

const EDGES = [
  [], [[3, 0]], [[0, 1]], [[3, 1]], [[1, 2]], [[3, 0], [1, 2]], [[0, 2]], [[3, 2]],
  [[2, 3]], [[0, 2]], [[0, 1], [2, 3]], [[1, 2]], [[1, 3]], [[0, 1]], [[3, 0]], [],
];

/**
 * Draws contour lines into `canvas`.
 * @param {HTMLCanvasElement} canvas
 * @param {{ x0:number, z0:number, span:number, step?:number, cell?:number, color?:string, major?:string, rot?:number }} o
 */
export function drawTopo(canvas, o) {
  const W = canvas.width, H = canvas.height;
  const g = canvas.getContext('2d');
  const cell = o.cell ?? 6;
  const nx = Math.ceil(W / cell) + 1, ny = Math.ceil(H / cell) + 1;
  const scale = o.span / W; // metres per pixel
  const c = Math.cos(o.rot ?? 0), s = Math.sin(o.rot ?? 0);
  const field = new Float32Array(nx * ny);
  let lo = Infinity, hi = -Infinity;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const px = (i * cell - W / 2) * scale, pz = (j * cell - H / 2) * scale;
      const v = height(o.x0 + px * c - pz * s, o.z0 + px * s + pz * c);
      field[j * nx + i] = v;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }
  const step = o.step ?? 4;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (let level = Math.ceil(lo / step) * step, k = 0; level <= hi; level += step, k++) {
    const isMajor = Math.round(level / step) % 5 === 0;
    g.strokeStyle = isMajor ? (o.major ?? o.color ?? '#b8955a') : (o.color ?? 'rgba(184,149,90,.5)');
    g.lineWidth = isMajor ? 1.3 : 0.8;
    g.beginPath();
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = field[j * nx + i], b = field[j * nx + i + 1];
        const d = field[(j + 1) * nx + i], cc = field[(j + 1) * nx + i + 1];
        const idx = (a > level ? 1 : 0) | (b > level ? 2 : 0) | (cc > level ? 4 : 0) | (d > level ? 8 : 0);
        if (idx === 0 || idx === 15) continue;
        const x = i * cell, y = j * cell;
        const pt = (e) => {
          switch (e) {
            case 0: return [x + cell * ((level - a) / (b - a)), y];
            case 1: return [x + cell, y + cell * ((level - b) / (cc - b))];
            case 2: return [x + cell * ((level - d) / (cc - d)), y + cell];
            default: return [x, y + cell * ((level - a) / (d - a))];
          }
        };
        for (const [e1, e2] of EDGES[idx]) {
          const p1 = pt(e1), p2 = pt(e2);
          g.moveTo(p1[0], p1[1]);
          g.lineTo(p2[0], p2[1]);
        }
      }
    }
    g.stroke();
  }
}
