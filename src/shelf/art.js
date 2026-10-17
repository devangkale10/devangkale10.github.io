/*
 * Procedural artwork for the shelf, drawn with Canvas 2D:
 * cloth, foil, paper, page edges, wood, the nine cover motifs, spines, backs and page spreads.
 * Every cover motif is a picture of a fact from the resume (see `plate` in src/data/resume.js).
 */

export const FONTS = {
  display: '"Funnel Display", "Funnel Sans", ui-sans-serif, system-ui, sans-serif',
  body: '"Funnel Sans", ui-sans-serif, system-ui, sans-serif',
  mono: '"Martian Mono", ui-monospace, Menlo, monospace'
};

export const PAPER = '#f2ece1';
export const INK = '#1d2127';

/* ---------- small utilities ---------- */

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function luminance(hex) {
  const [r, g, b] = rgb(hex).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function mix(a, b, t) {
  const A = rgb(a);
  const B = rgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/** A readable accent on paper: dark cloths keep their colour, light cloths use their foil. */
export function accentFor(binding) {
  return luminance(binding.cloth) > 0.35 ? binding.foil : binding.cloth;
}

function gauss(r) {
  let u = 0;
  let v = 0;
  while (!u) u = r();
  while (!v) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function setFont(g, weight, size, family) {
  g.font = `${weight} ${Math.round(size)}px ${family}`;
}

function spaced(g, px) {
  if ('letterSpacing' in g) g.letterSpacing = `${px}px`;
}

/** Greedy word wrap; returns the lines. */
function wrap(g, text, maxW) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (g.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/* ---------- shared surface textures ---------- */

/** Plain-weave cloth as a tangent-space normal map (tileable). */
export function clothNormalCanvas() {
  const size = 128;
  const cell = 8;
  const hgt = new Float32Array(size * size);
  const r = rng(7);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const ix = Math.floor(x / cell);
      const iy = Math.floor(y / cell);
      const fx = ((x % cell) + 0.5) / cell;
      const fy = ((y % cell) + 0.5) / cell;
      const warp = Math.sin(Math.PI * fx);
      const weft = Math.sin(Math.PI * fy);
      const warpOver = (ix + iy) % 2 === 0;
      const v = warpOver ? 0.62 * warp + 0.25 * weft : 0.62 * weft + 0.25 * warp;
      hgt[y * size + x] = v + (r() - 0.5) * 0.08;
    }
  }
  const c = makeCanvas(size, size);
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const at = (x, y) => hgt[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x - 1, y) - at(x + 1, y)) * 2.2;
      const dy = (at(x, y - 1) - at(x, y + 1)) * 2.2;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      img.data[i] = ((dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Stacked page edges. `vertical` lines run along the face's height. */
export function pageEdgeCanvas(vertical) {
  const w = vertical ? 256 : 32;
  const h = vertical ? 32 : 256;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  g.fillStyle = '#e9e2d4';
  g.fillRect(0, 0, w, h);
  const r = rng(vertical ? 3 : 4);
  const n = vertical ? w : h;
  for (let i = 0; i < n; i += 1) {
    const a = 0.05 + r() * 0.16;
    g.fillStyle = r() > 0.5 ? `rgba(120, 104, 82, ${a})` : `rgba(255, 255, 255, ${a * 0.8})`;
    if (vertical) g.fillRect(i, 0, 1, h);
    else g.fillRect(0, i, w, 1);
  }
  return c;
}

export function paperCanvas(w = 256, h = 360, seed = 11) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  paintPaper(g, w, h, seed);
  return c;
}

function paintPaper(g, w, h, seed) {
  g.fillStyle = PAPER;
  g.fillRect(0, 0, w, h);
  const r = rng(seed);
  for (let i = 0; i < (w * h) / 260; i++) {
    g.fillStyle = r() > 0.5 ? 'rgba(110, 90, 60, 0.05)' : 'rgba(255, 255, 255, 0.35)';
    g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5);
  }
  const grd = g.createLinearGradient(0, 0, w, 0);
  grd.addColorStop(0, 'rgba(80, 60, 30, 0.07)');
  grd.addColorStop(0.08, 'rgba(80, 60, 30, 0)');
  grd.addColorStop(0.92, 'rgba(80, 60, 30, 0)');
  grd.addColorStop(1, 'rgba(80, 60, 30, 0.05)');
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
}

/** Dark walnut for the shelf. */
export function woodCanvas() {
  const w = 2048;
  const h = 256;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  g.fillStyle = '#3a2a20';
  g.fillRect(0, 0, w, h);
  const r = rng(21);
  for (let y = 0; y < h; y++) {
    const band = Math.sin(y * 0.07 + Math.sin(y * 0.013) * 3) * 0.5 + 0.5;
    g.fillStyle = `rgba(${band > 0.5 ? '90, 64, 44' : '28, 19, 14'}, ${0.12 + band * 0.12})`;
    g.fillRect(0, y, w, 1);
  }
  for (let i = 0; i < 900; i++) {
    const y = r() * h;
    const x = r() * w;
    const len = 80 + r() * 600;
    g.strokeStyle = r() > 0.5 ? 'rgba(120, 88, 60, 0.12)' : 'rgba(10, 6, 4, 0.18)';
    g.lineWidth = 0.6 + r() * 1.4;
    g.beginPath();
    g.moveTo(x, y);
    g.bezierCurveTo(x + len * 0.3, y + (r() - 0.5) * 6, x + len * 0.6, y + (r() - 0.5) * 6, x + len, y + (r() - 0.5) * 4);
    g.stroke();
  }
  return c;
}

/** Soft elliptical contact shadow. */
export function shadowCanvas() {
  const c = makeCanvas(256, 128);
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 64, 4, 128, 64, 124);
  grd.addColorStop(0, 'rgba(0,0,0,0.55)');
  grd.addColorStop(0.45, 'rgba(0,0,0,0.25)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.save();
  g.scale(1, 0.5);
  g.translate(0, 64);
  g.fillStyle = grd;
  g.fillRect(0, -64, 256, 256);
  g.restore();
  return c;
}

/* ---------- cloth + foil painting ---------- */

export const ORM_CLOTH = 'rgb(0, 222, 0)'; // roughness ≈ 0.87, metalness 0
const ORM_FOIL = 'rgb(0, 97, 150)'; // roughness ≈ 0.38, metalness ≈ 0.6: bright in any light, still catches highlights

function paintCloth(g, w, h, color, seed) {
  g.fillStyle = color;
  g.fillRect(0, 0, w, h);
  const r = rng(seed);
  const light = luminance(color) > 0.4;
  for (let i = 0; i < (w * h) / 70; i++) {
    const x = r() * w;
    const y = r() * h;
    const len = 2 + r() * 8;
    g.strokeStyle = r() > 0.5 ? `rgba(255,255,255,${light ? 0.12 : 0.045})` : `rgba(0,0,0,${light ? 0.05 : 0.08})`;
    g.lineWidth = 0.8;
    g.beginPath();
    if (r() > 0.5) {
      g.moveTo(x, y);
      g.lineTo(x + len, y);
    } else {
      g.moveTo(x, y);
      g.lineTo(x, y + len);
    }
    g.stroke();
  }
  const grd = g.createRadialGradient(w * 0.35, h * 0.3, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.85);
  grd.addColorStop(0, 'rgba(255,255,255,0.05)');
  grd.addColorStop(1, 'rgba(0,0,0,0.14)');
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
}

/**
 * Draw the same foil artwork on the colour canvas (in the foil colour) and on the
 * roughness/metalness canvas (as shiny metal), so the foil catches the light.
 */
function foilPainter(gc, go, scale, foil) {
  return fn => {
    gc.save();
    gc.fillStyle = foil;
    gc.strokeStyle = foil;
    fn(gc);
    gc.restore();
    go.save();
    go.scale(scale, scale);
    go.fillStyle = ORM_FOIL;
    go.strokeStyle = ORM_FOIL;
    fn(go);
    go.restore();
  };
}

/* ---------- the nine motifs (each takes a square box) ---------- */

const MOTIFS = {
  /* RAG: a query, a field of passages, and lines to the five nearest (Recall@5). */
  retrieval(g, b, r) {
    const cx = b.x + b.s / 2;
    const cy = b.y + b.s / 2;
    const R = b.s * 0.46;
    g.lineWidth = b.s * 0.0035;
    g.globalAlpha = 0.55;
    [0.28, 0.52, 0.76, 1].forEach(k => {
      g.beginPath();
      g.arc(cx, cy, R * k, 0, Math.PI * 2);
      g.stroke();
    });
    g.globalAlpha = 1;
    const pts = [];
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2;
      const d = R * (0.14 + Math.sqrt(r()) * 0.84);
      pts.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d, d]);
    }
    pts.sort((p, q) => p[2] - q[2]);
    g.lineWidth = b.s * 0.006;
    pts.slice(0, 5).forEach(([x, y]) => {
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(x, y);
      g.stroke();
    });
    pts.forEach(([x, y], i) => {
      g.beginPath();
      g.arc(x, y, i < 5 ? b.s * 0.017 : b.s * 0.0085, 0, Math.PI * 2);
      g.fill();
    });
    g.beginPath();
    g.arc(cx, cy, b.s * 0.028, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = b.s * 0.005;
    g.beginPath();
    g.arc(cx, cy, b.s * 0.055, 0, Math.PI * 2);
    g.stroke();
  },

  /* Data dictionary: a long schema listing, a few rows defined. */
  schema(g, b, r) {
    const x = b.x + b.s * 0.08;
    const y = b.y + b.s * 0.02;
    const w = b.s * 0.84;
    const h = b.s * 0.96;
    g.lineWidth = b.s * 0.004;
    g.strokeRect(x, y, w, h);
    g.fillRect(x, y, w, b.s * 0.06);
    const rows = 26;
    const rh = (h - b.s * 0.09) / rows;
    for (let i = 0; i < rows; i++) {
      const yy = y + b.s * 0.085 + i * rh + rh * 0.5;
      const strong = i % 7 === 3;
      g.globalAlpha = strong ? 1 : 0.55;
      const t = rh * (strong ? 0.36 : 0.22);
      g.fillRect(x + w * 0.05, yy - t / 2, w * (0.12 + r() * 0.14), t);
      g.fillRect(x + w * 0.38, yy - t / 2, w * (0.06 + r() * 0.06), t);
      g.fillRect(x + w * 0.56, yy - t / 2, w * (0.12 + r() * 0.3), t);
      g.globalAlpha = 0.25;
      g.fillRect(x, yy + rh * 0.5, w, b.s * 0.0015);
    }
    g.globalAlpha = 1;
    g.fillRect(x + w * 0.335, y + b.s * 0.06, b.s * 0.002, h - b.s * 0.06);
    g.fillRect(x + w * 0.515, y + b.s * 0.06, b.s * 0.002, h - b.s * 0.06);
  },

  /* Classifier: posts converge on one model, then route to 15 units. */
  routing(g, b, r) {
    const nx = b.x + b.s * 0.42;
    const ny = b.y + b.s * 0.5;
    for (let i = 0; i < 90; i++) {
      const x = b.x + b.s * (0.02 + r() * 0.2);
      const y = b.y + b.s * (0.1 + r() * 0.8);
      g.globalAlpha = 0.4 + r() * 0.6;
      g.beginPath();
      g.arc(x, y, b.s * 0.007, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 0.35;
    g.lineWidth = b.s * 0.0025;
    for (let i = 0; i < 12; i++) {
      const y0 = b.y + b.s * (0.14 + (i / 11) * 0.72);
      g.beginPath();
      g.moveTo(b.x + b.s * 0.24, y0);
      g.bezierCurveTo(b.x + b.s * 0.33, y0, b.x + b.s * 0.34, ny, nx, ny);
      g.stroke();
    }
    g.globalAlpha = 1;
    g.lineWidth = b.s * 0.004;
    for (let i = 0; i < 15; i++) {
      const ty = b.y + b.s * (0.06 + (i / 14) * 0.88);
      const tx = b.x + b.s * 0.92;
      g.beginPath();
      g.moveTo(nx, ny);
      g.bezierCurveTo(nx + b.s * 0.22, ny, tx - b.s * 0.24, ty, tx, ty);
      g.stroke();
      g.fillRect(tx, ty - b.s * 0.012, b.s * 0.024, b.s * 0.024);
    }
    g.beginPath();
    g.arc(nx, ny, b.s * 0.045, 0, Math.PI * 2);
    g.fill();
  },

  /* Pipeline: 10 sources merge into one feed that ends in a dashboard. */
  confluence(g, b) {
    const cx = b.x + b.s / 2;
    const mergeY = b.y + b.s * 0.56;
    g.lineWidth = b.s * 0.0045;
    for (let i = 0; i < 10; i++) {
      const x0 = b.x + b.s * (0.06 + (i / 9) * 0.88);
      g.beginPath();
      g.arc(x0, b.y + b.s * 0.04, b.s * 0.016, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.moveTo(x0, b.y + b.s * 0.06);
      g.bezierCurveTo(x0, b.y + b.s * 0.32, cx, b.y + b.s * 0.3, cx, mergeY);
      g.stroke();
    }
    g.lineWidth = b.s * 0.02;
    g.beginPath();
    g.moveTo(cx, mergeY - b.s * 0.02);
    g.lineTo(cx, b.y + b.s * 0.72);
    g.stroke();
    const base = b.y + b.s * 0.97;
    const bars = [0.1, 0.16, 0.13, 0.2, 0.17];
    bars.forEach((v, i) => {
      const bw = b.s * 0.07;
      const x = cx - b.s * 0.22 + i * b.s * 0.095;
      g.fillRect(x, base - b.s * v, bw, b.s * v);
    });
    g.fillRect(cx - b.s * 0.25, base, b.s * 0.5, b.s * 0.006);
  },

  /* A/B test: two outcome distributions, B shifted right. */
  curves(g, b) {
    const base = b.y + b.s * 0.82;
    const x0 = b.x + b.s * 0.02;
    const w = b.s * 0.96;
    const curve = (mu, sig, amp) => {
      g.beginPath();
      for (let i = 0; i <= 120; i++) {
        const t = i / 120;
        const v = Math.exp(-((t - mu) ** 2) / (2 * sig * sig));
        const x = x0 + t * w;
        const y = base - v * amp * b.s;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
    };
    g.lineWidth = b.s * 0.006;
    g.globalAlpha = 0.25;
    curve(0.4, 0.12, 0.5);
    g.lineTo(x0 + w, base);
    g.lineTo(x0, base);
    g.fill();
    g.globalAlpha = 1;
    curve(0.4, 0.12, 0.5);
    g.stroke();
    curve(0.6, 0.12, 0.58);
    g.stroke();
    g.fillRect(x0, base, w, b.s * 0.006);
    g.setLineDash([b.s * 0.015, b.s * 0.015]);
    g.lineWidth = b.s * 0.003;
    [
      [0.4, 0.5],
      [0.6, 0.58]
    ].forEach(([mu, amp]) => {
      g.beginPath();
      g.moveTo(x0 + mu * w, base);
      g.lineTo(x0 + mu * w, base - amp * b.s - b.s * 0.04);
      g.stroke();
    });
    g.setLineDash([]);
    setFont(g, 600, b.s * 0.07, FONTS.display);
    g.textAlign = 'center';
    g.fillText('A', x0 + 0.4 * w, base - 0.5 * b.s - b.s * 0.07);
    g.fillText('B', x0 + 0.6 * w, base - 0.58 * b.s - b.s * 0.07);
  },

  /* Explainable AI: a SHAP-style beeswarm of attributions per feature. */
  beeswarm(g, b, r) {
    const rows = 8;
    const cx = b.x + b.s * 0.5;
    g.fillRect(cx - b.s * 0.002, b.y, b.s * 0.004, b.s);
    for (let k = 0; k < rows; k++) {
      const y = b.y + b.s * (0.08 + (k / (rows - 1)) * 0.84);
      const spread = 0.34 - k * 0.032;
      g.globalAlpha = 0.25;
      g.fillRect(b.x, y, b.s, b.s * 0.0015);
      g.globalAlpha = 1;
      const xs = [];
      for (let i = 0; i < 26; i++) xs.push(cx + gauss(r) * spread * b.s * 0.95);
      xs.sort((p, q) => p - q);
      const placed = [];
      xs.forEach(x => {
        let off = 0;
        let side = 1;
        const rad = b.s * 0.012;
        while (placed.some(([px, po]) => Math.abs(px - x) < rad * 2 && Math.abs(po - off) < rad * 2)) {
          off = side * (Math.abs(off) + rad * 1.4);
          side *= -1;
          if (Math.abs(off) > rad * 3) break;
        }
        placed.push([x, off]);
        g.beginPath();
        g.arc(Math.min(b.x + b.s, Math.max(b.x, x)), y + off, rad, 0, Math.PI * 2);
        g.fill();
      });
    }
  },

  /* Scheduled ETL: an Airflow-style DAG, left to right. */
  dag(g, b) {
    const node = (x, y, w, h) => {
      const rr = b.s * 0.018;
      g.beginPath();
      g.roundRect(x - w / 2, y - h / 2, w, h, rr);
      g.stroke();
    };
    const arrow = (x1, y1, x2, y2) => {
      g.beginPath();
      g.moveTo(x1, y1);
      g.bezierCurveTo((x1 + x2) / 2, y1, (x1 + x2) / 2, y2, x2, y2);
      g.stroke();
      const a = 0.5;
      const L = b.s * 0.022;
      g.beginPath();
      g.moveTo(x2, y2);
      g.lineTo(x2 - L * Math.cos(-a), y2 - L * Math.sin(-a));
      g.lineTo(x2 - L * Math.cos(a), y2 - L * Math.sin(a));
      g.closePath();
      g.fill();
    };
    g.lineWidth = b.s * 0.006;
    const W = b.s * 0.15;
    const H = b.s * 0.1;
    const cols = [0.1, 0.36, 0.62, 0.88].map(t => b.x + b.s * t);
    const midY = b.y + b.s * 0.5;
    const srcY = [0.24, 0.5, 0.76].map(t => b.y + b.s * t);
    srcY.forEach(y => {
      node(cols[0], y, W, H);
      arrow(cols[0] + W / 2, y, cols[1] - W / 2 - b.s * 0.01, midY);
    });
    node(cols[1], midY, W, H);
    g.fillRect(cols[1] - W * 0.3, midY - b.s * 0.004, W * 0.6, b.s * 0.008);
    arrow(cols[1] + W / 2, midY, cols[2] - W / 2 - b.s * 0.01, midY);
    node(cols[2], midY, W, H);
    g.beginPath();
    g.moveTo(cols[2] - W * 0.22, midY);
    g.lineTo(cols[2] - W * 0.05, midY + H * 0.22);
    g.lineTo(cols[2] + W * 0.25, midY - H * 0.25);
    g.stroke();
    arrow(cols[2] + W / 2, midY, cols[3] - W / 2 - b.s * 0.01, b.y + b.s * 0.36);
    arrow(cols[2] + W / 2, midY, cols[3] - W / 2 - b.s * 0.01, b.y + b.s * 0.64);
    node(cols[3], b.y + b.s * 0.36, W, H);
    node(cols[3], b.y + b.s * 0.64, W, H);
    [0.36, 0.64].forEach(t => {
      for (let i = 0; i < 3; i++) {
        const bh = H * (0.25 + i * 0.12);
        g.fillRect(cols[3] - W * 0.25 + i * W * 0.2, b.y + b.s * t + H * 0.3 - bh, W * 0.12, bh);
      }
    });
  },

  /* PII redaction: lines of text with sensitive spans blacked out. */
  redaction(g, b, r) {
    const lines = 13;
    for (let i = 0; i < lines; i++) {
      const y = b.y + b.s * (0.04 + (i / (lines - 1)) * 0.92);
      let x = b.x + b.s * 0.02;
      const end = b.x + b.s * (i === lines - 1 ? 0.55 : 0.98);
      while (x < end - b.s * 0.04) {
        const wlen = b.s * (0.04 + r() * 0.12);
        const redact = r() < 0.16;
        const h = redact ? b.s * 0.038 : b.s * 0.012;
        g.globalAlpha = redact ? 1 : 0.6;
        g.fillRect(x, y - h / 2, Math.min(wlen, end - x), h);
        x += wlen + b.s * 0.022;
      }
    }
    g.globalAlpha = 1;
  },

  /* Recommendations: a product and its ten nearest neighbours. */
  neighbors(g, b, r) {
    const centers = [
      [0.25, 0.3],
      [0.7, 0.25],
      [0.5, 0.62],
      [0.2, 0.75],
      [0.8, 0.72]
    ];
    const pts = [];
    centers.forEach(([cx, cy]) => {
      for (let i = 0; i < 18; i++) {
        pts.push([
          b.x + b.s * Math.min(0.97, Math.max(0.03, cx + gauss(r) * 0.07)),
          b.y + b.s * Math.min(0.97, Math.max(0.03, cy + gauss(r) * 0.07))
        ]);
      }
    });
    const q = pts[40];
    const near = pts
      .map(p => [p, Math.hypot(p[0] - q[0], p[1] - q[1])])
      .filter(([p]) => p !== q)
      .sort((a, c) => a[1] - c[1])
      .slice(0, 10)
      .map(([p]) => p);
    g.lineWidth = b.s * 0.004;
    near.forEach(p => {
      g.beginPath();
      g.moveTo(q[0], q[1]);
      g.lineTo(p[0], p[1]);
      g.stroke();
    });
    pts.forEach(p => {
      const isNear = near.includes(p);
      g.globalAlpha = isNear ? 1 : 0.5;
      g.beginPath();
      g.arc(p[0], p[1], b.s * (isNear ? 0.014 : 0.008), 0, Math.PI * 2);
      g.fill();
    });
    g.globalAlpha = 1;
    g.lineWidth = b.s * 0.006;
    g.beginPath();
    g.arc(q[0], q[1], b.s * 0.04, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.arc(q[0], q[1], b.s * 0.018, 0, Math.PI * 2);
    g.fill();
  }
};

export function drawMotif(g, key, box, seed) {
  const fn = MOTIFS[key];
  if (fn) fn(g, box, rng(seed));
}

/* ---------- covers, spines, backs, endpapers ---------- */

function sourceLine(vol) {
  const s = vol.source;
  if (s.org === 'GitHub') return 'PROJECT';
  const year = (s.start || '').slice(-4);
  return `${s.org.toUpperCase()} · ${year}`;
}

/** Front cover: colour map + roughness/metalness map. */
export function drawCover(vol, index, total, width = 768) {
  const { w, h } = vol.size;
  const W = width;
  const H = Math.round(width * (h / w));
  const color = makeCanvas(W, H);
  const orm = makeCanvas(W / 2, H / 2);
  const gc = color.getContext('2d');
  const go = orm.getContext('2d');
  const seed = hashSeed(vol.id);
  paintCloth(gc, W, H, vol.binding.cloth, seed);
  go.fillStyle = ORM_CLOTH;
  go.fillRect(0, 0, orm.width, orm.height);
  const foil = foilPainter(gc, go, 0.5, vol.binding.foil);
  const m = W * 0.08;

  foil(g => {
    setFont(g, 500, W * 0.022, FONTS.mono);
    spaced(g, W * 0.006);
    g.textBaseline = 'alphabetic';
    g.textAlign = 'left';
    g.fillText(`VOL. ${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, m, m + W * 0.02);
    g.textAlign = 'right';
    g.fillText('DEVANG KALE', W - m, m + W * 0.02);
    g.fillRect(m, m + W * 0.045, W - 2 * m, Math.max(1.5, W * 0.0022));
  });

  const s = Math.min(W - 2 * m, H * 0.5);
  const box = { x: (W - s) / 2, y: H * 0.15, s };
  foil(g => drawMotif(g, vol.motif, box, seed));

  foil(g => {
    setFont(g, 600, W * 0.084, FONTS.display);
    spaced(g, -W * 0.0018);
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    const lines = wrap(g, vol.title, W - 2 * m);
    const lh = W * 0.088;
    const bottom = H - m - W * 0.07;
    lines.forEach((line, i) => g.fillText(line, m, bottom - (lines.length - 1 - i) * lh));
    setFont(g, 500, W * 0.02, FONTS.mono);
    spaced(g, W * 0.005);
    g.fillText(sourceLine(vol), m, H - m);
  });

  return { color, orm };
}

export function drawSpine(vol, index, height = 1024) {
  const { h, t } = vol.size;
  const H = height;
  const W = Math.max(48, Math.round(H * (t / h)));
  const color = makeCanvas(W, H);
  const orm = makeCanvas(W, H);
  const gc = color.getContext('2d');
  const go = orm.getContext('2d');
  paintCloth(gc, W, H, vol.binding.cloth, hashSeed(vol.id) + 1);
  go.fillStyle = ORM_CLOTH;
  go.fillRect(0, 0, W, H);
  const foil = foilPainter(gc, go, 1, vol.binding.foil);
  foil(g => {
    setFont(g, 500, W * 0.2, FONTS.mono);
    g.textAlign = 'center';
    g.fillText(String(index + 1).padStart(2, '0'), W / 2, H * 0.07);
    g.fillRect(W * 0.3, H * 0.09, W * 0.4, Math.max(1, H * 0.0015));
    g.save();
    g.translate(W / 2, H * 0.13);
    g.rotate(Math.PI / 2);
    setFont(g, 600, Math.min(W * 0.36, 40), FONTS.display);
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillText(vol.title, 0, 0);
    g.restore();
    g.beginPath();
    g.arc(W / 2, H * 0.93, W * 0.08, 0, Math.PI * 2);
    g.fill();
  });
  return { color, orm };
}

export function drawBack(vol, width = 512) {
  const { w, h } = vol.size;
  const W = width;
  const H = Math.round(width * (h / w));
  const color = makeCanvas(W, H);
  const orm = makeCanvas(W, H);
  const gc = color.getContext('2d');
  const go = orm.getContext('2d');
  paintCloth(gc, W, H, vol.binding.cloth, hashSeed(vol.id) + 2);
  go.fillStyle = ORM_CLOTH;
  go.fillRect(0, 0, W, H);
  const foil = foilPainter(gc, go, 1, vol.binding.foil);
  const m = W * 0.12;
  foil(g => {
    setFont(g, 500, W * 0.042, FONTS.body);
    g.textAlign = 'center';
    const lines = wrap(g, vol.subtitle, W - 2 * m);
    lines.forEach((line, i) => g.fillText(line, W / 2, H * 0.36 + i * W * 0.058));
    const metric = `${vol.metric.prefix ?? ''}${vol.metric.value}${vol.metric.suffix ?? ''}${vol.metric.unit ? ` ${vol.metric.unit}` : ''}`;
    setFont(g, 600, W * 0.11, FONTS.display);
    g.fillText(metric, W / 2, H * 0.58);
    setFont(g, 500, W * 0.03, FONTS.mono);
    spaced(g, W * 0.006);
    g.fillText(vol.metric.label.toUpperCase(), W / 2, H * 0.64);
    g.fillText('SELECTED WORK OF DEVANG KALE', W / 2, H - m);
  });
  return { color, orm };
}

/** Endpapers: the site's dot grid, in the book's colour. */
export function drawEndpaper(vol, width = 512) {
  const { w, h } = vol.size;
  const W = width;
  const H = Math.round(width * (h / w));
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  g.fillStyle = mix(PAPER, vol.binding.cloth, 0.08);
  g.fillRect(0, 0, W, H);
  g.fillStyle = accentFor(vol.binding);
  g.globalAlpha = 0.32;
  const step = W / 26;
  const edge = W * 0.07; // a plain margin, so the board's edge shows as paper around the pages
  for (let y = edge + step / 2, row = 0; y < H - edge; y += step, row++) {
    for (let x = edge + step / 2 + (row % 2) * (step / 2); x < W - edge; x += step) {
      g.beginPath();
      g.arc(x, y, step * 0.11, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.globalAlpha = 1;
  return c;
}

/* ---------- pages (drawn only for the book being read) ---------- */

function pageFrame(vol, n, width) {
  const { w, h } = vol.size;
  const W = width;
  const H = Math.round(width * (h / w));
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  paintPaper(g, W, H, hashSeed(vol.id) + n * 31);
  const m = W * 0.1;
  setFont(g, 500, W * 0.021, FONTS.mono);
  g.fillStyle = 'rgba(29, 33, 39, 0.7)';
  g.textAlign = n % 2 ? 'right' : 'left';
  g.fillText(String(n), n % 2 ? W - m : m, H - m * 0.6);
  return { c, g, W, H, m };
}

function heading(g, text, x, y, W, accent) {
  setFont(g, 600, W * 0.024, FONTS.mono);
  spaced(g, W * 0.005);
  g.fillStyle = accent;
  g.textAlign = 'left';
  g.fillText(text.toUpperCase(), x, y);
  spaced(g, 0);
}

/** Rich text with **bold** figures; shrinks the type until it fits. */
function richBlock(g, paragraphs, x, y, maxW, maxH, startSize) {
  for (let size = startSize; size > 12; size -= 1) {
    const lh = size * 1.42;
    const lines = [];
    paragraphs.forEach((p, pi) => {
      const tokens = [];
      p.split(/(\*\*[^*]+\*\*)/g)
        .filter(Boolean)
        .forEach(part => {
          const bold = part.startsWith('**');
          const text = bold ? part.slice(2, -2) : part;
          text.split(/(\s+)/)
            .filter(t => t.length)
            .forEach(t => tokens.push({ t, bold }));
        });
      let line = [];
      let lw = 0;
      tokens.forEach(tok => {
        setFont(g, tok.bold ? 700 : 500, size, FONTS.body);
        const tw = g.measureText(tok.t).width;
        if (/^\s+$/.test(tok.t)) {
          if (line.length) {
            line.push({ ...tok, t: ' ', w: tw });
            lw += tw;
          }
          return;
        }
        if (lw + tw > maxW && line.length) {
          while (line.length && line[line.length - 1].t === ' ') lw -= line.pop().w;
          lines.push(line);
          line = [];
          lw = 0;
        }
        line.push({ ...tok, w: tw });
        lw += tw;
      });
      if (line.length) lines.push(line);
      if (pi < paragraphs.length - 1) lines.push(null);
    });
    const height = lines.reduce((sum, l) => sum + (l ? lh : lh * 0.5), 0);
    if (height <= maxH || size <= 13) {
      let yy = y + size;
      lines.forEach(l => {
        if (!l) {
          yy += lh * 0.5;
          return;
        }
        let xx = x;
        l.forEach(tok => {
          setFont(g, tok.bold ? 700 : 500, size, FONTS.body);
          g.fillStyle = tok.bold ? INK : 'rgba(29, 33, 39, 0.93)';
          g.fillText(tok.t, xx, yy);
          xx += tok.w;
        });
        yy += lh;
      });
      return yy;
    }
  }
  return y;
}

function metricText(m) {
  return `${m.prefix ?? ''}${m.value}${m.suffix ?? ''}`;
}

/** Six page faces: title, the work, result, tools, plate, colophon. */
export function drawPages(vol, index, total, width = 1024) {
  // Type on paper uses a deeper shade of the accent so it stays easy to read
  const accent = mix(accentFor(vol.binding), INK, 0.35);
  const art = accentFor(vol.binding);
  const pages = [];
  const src = vol.source;
  const period = src.start ? `${src.start} – ${src.end}` : src.period;

  // 1 · title page
  {
    const { c, g, W, H, m } = pageFrame(vol, 1, width);
    heading(g, `Volume ${String(index + 1).padStart(2, '0')}`, m, m + W * 0.02, W, accent);
    const s = W * 0.3;
    g.save();
    g.globalAlpha = 0.85;
    g.fillStyle = art;
    g.strokeStyle = art;
    drawMotif(g, vol.motif, { x: W - m - s, y: m * 1.6, s }, hashSeed(vol.id));
    g.restore();
    setFont(g, 600, W * 0.075, FONTS.display);
    spaced(g, -W * 0.0015);
    g.fillStyle = INK;
    const lines = wrap(g, vol.title, W - 2 * m);
    let y = H * 0.5;
    lines.forEach(line => {
      g.fillText(line, m, y);
      y += W * 0.082;
    });
    spaced(g, 0);
    setFont(g, 500, W * 0.037, FONTS.body);
    g.fillStyle = 'rgba(29, 33, 39, 0.86)';
    wrap(g, vol.subtitle, W - 2 * m).forEach(line => {
      g.fillText(line, m, y + W * 0.012);
      y += W * 0.052;
    });
    setFont(g, 600, W * 0.038, FONTS.display);
    g.fillStyle = INK;
    g.fillText('Devang Kale', m, H - m * 1.6);
    setFont(g, 500, W * 0.021, FONTS.mono);
    g.fillStyle = 'rgba(29, 33, 39, 0.75)';
    g.fillText(`${src.org}${src.org === 'GitHub' ? '' : ` · ${period}`}`.toUpperCase(), m, H - m * 1.2);
    pages.push(c);
  }

  // 2 · the work (resume text, verbatim)
  {
    const { c, g, W, H, m } = pageFrame(vol, 2, width);
    heading(g, 'The work', m, m + W * 0.02, W, accent);
    richBlock(g, vol.paragraphs, m, m + W * 0.06, W - 2 * m, H - m * 2.6, Math.round(W * 0.05));
    pages.push(c);
  }

  // 3 · result
  {
    const { c, g, W, H, m } = pageFrame(vol, 3, width);
    heading(g, 'Result', m, m + W * 0.02, W, accent);
    setFont(g, 600, W * 0.2, FONTS.display);
    spaced(g, -W * 0.004);
    g.fillStyle = INK;
    const big = metricText(vol.metric);
    g.fillText(big, m - W * 0.008, H * 0.36);
    const bw = g.measureText(big).width;
    spaced(g, 0);
    if (vol.metric.unit) {
      setFont(g, 500, W * 0.05, FONTS.display);
      g.fillText(vol.metric.unit, m + bw + W * 0.02, H * 0.36);
    }
    setFont(g, 500, W * 0.042, FONTS.display);
    g.fillText(vol.metric.label, m, H * 0.36 + W * 0.075);
    if (vol.metric.from != null) {
      const top = H * 0.36 + W * 0.17;
      const maxW = W - 2 * m;
      const scale = Math.max(vol.metric.from, vol.metric.value);
      [
        ['Before', vol.metric.from, 'rgba(29, 33, 39, 0.28)'],
        ['After', vol.metric.value, art]
      ].forEach(([label, v, fill], i) => {
        const y = top + i * W * 0.11;
        setFont(g, 500, W * 0.023, FONTS.mono);
        g.fillStyle = 'rgba(29, 33, 39, 0.8)';
        g.fillText(`${label.toUpperCase()} · ${v}${vol.metric.suffix ?? ''}`, m, y);
        g.fillStyle = fill;
        g.fillRect(m, y + W * 0.018, (maxW * v) / scale, W * 0.045);
      });
    }
    setFont(g, 500, W * 0.037, FONTS.body);
    g.fillStyle = 'rgba(29, 33, 39, 0.86)';
    let y = H * 0.8;
    wrap(g, vol.subtitle, W - 2 * m).forEach(line => {
      g.fillText(line, m, y);
      y += W * 0.052;
    });
    pages.push(c);
  }

  // 4 · tools and where
  {
    const { c, g, W, m } = pageFrame(vol, 4, width);
    heading(g, 'Tools', m, m + W * 0.02, W, accent);
    setFont(g, 500, W * 0.035, FONTS.mono);
    let y = m + W * 0.1;
    vol.tools.forEach(tool => {
      g.fillStyle = art;
      g.fillRect(m, y - W * 0.02, W * 0.016, W * 0.016);
      g.fillStyle = INK;
      g.fillText(tool, m + W * 0.04, y);
      y += W * 0.062;
    });
    y += W * 0.05;
    heading(g, 'Where', m, y, W, accent);
    y += W * 0.07;
    const rows = src.org === 'GitHub'
      ? ['Project', 'Code on GitHub']
      : [src.title, src.org, src.unit, period, src.location].filter(Boolean);
    rows.forEach((row, i) => {
      setFont(g, i === 0 ? 600 : 500, W * 0.038, i === 0 ? FONTS.display : FONTS.body);
      g.fillStyle = i === 0 ? INK : 'rgba(29, 33, 39, 0.86)';
      g.fillText(row, m, y);
      y += W * 0.057;
    });
    pages.push(c);
  }

  // 5 · plate
  {
    const { c, g, W, H, m } = pageFrame(vol, 5, width);
    heading(g, 'Plate', m, m + W * 0.02, W, accent);
    const s = W - 2 * m;
    g.save();
    g.fillStyle = art;
    g.strokeStyle = art;
    drawMotif(g, vol.motif, { x: m, y: m + W * 0.07, s }, hashSeed(vol.id));
    g.restore();
    setFont(g, 500, W * 0.037, FONTS.body);
    g.fillStyle = 'rgba(29, 33, 39, 0.9)';
    let y = m + W * 0.07 + s + W * 0.08;
    wrap(g, vol.plate, W - 2 * m).forEach(line => {
      if (y < H - m) g.fillText(line, m, y);
      y += W * 0.052;
    });
    pages.push(c);
  }

  // 6 · colophon: a note for whoever reads this far, and a way to say hello
  let link = null;
  {
    const { c, g, W, H } = pageFrame(vol, 6, width);
    g.textAlign = 'center';
    g.fillStyle = art;
    g.beginPath();
    g.arc(W / 2, H * 0.3, W * 0.012, 0, Math.PI * 2);
    g.fill();
    setFont(g, 600, W * 0.066, FONTS.display);
    spaced(g, -W * 0.0012);
    g.fillStyle = INK;
    g.fillText('You read to the end.', W / 2, H * 0.4);
    g.fillText('That’s rare.', W / 2, H * 0.4 + W * 0.085);
    const ly = H * 0.4 + W * 0.215;
    g.fillStyle = accent;
    const label = 'Let’s talk.';
    g.fillText(label, W / 2, ly);
    const lw = g.measureText(label).width;
    g.fillRect(W / 2 - lw / 2, ly + W * 0.016, lw, Math.max(2, W * 0.004));
    spaced(g, 0);
    // The link's box on the page (0..1, from the top left), padded so it is easy to hit
    const pad = W * 0.03;
    link = {
      x0: (W / 2 - lw / 2 - pad) / W,
      x1: (W / 2 + lw / 2 + pad) / W,
      y0: (ly - W * 0.066 - pad) / H,
      y1: (ly + W * 0.02 + pad) / H
    };
    setFont(g, 500, W * 0.021, FONTS.mono);
    spaced(g, W * 0.005);
    g.fillStyle = 'rgba(29, 33, 39, 0.7)';
    g.fillText(`VOLUME ${index + 1} OF ${total}`, W / 2, H * 0.84);
    g.fillText('SELECTED WORK OF DEVANG KALE', W / 2, H * 0.84 + W * 0.045);
    spaced(g, 0);
    pages.push(c);
  }

  pages.link = link;
  return pages;
}
