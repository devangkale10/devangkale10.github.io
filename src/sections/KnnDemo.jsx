import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../lib/motion';
import './Demos.css';

/*
 * An illustration of nearest-neighbor retrieval: items as points in an embedding space,
 * one query item, and its 10 closest neighbors. Points are generated, not real products.
 */
const K = 10;
const CYCLE = 2800;

function makePoints() {
  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const gauss = () => {
    let u = 0;
    let v = 0;
    while (!u) u = rand();
    while (!v) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const centers = [
    [0.18, 0.3],
    [0.4, 0.7],
    [0.66, 0.28],
    [0.84, 0.66],
    [0.46, 0.22],
    [0.16, 0.78],
    [0.64, 0.84]
  ];
  const pts = [];
  centers.forEach(([cx, cy]) => {
    for (let i = 0; i < 17; i++) {
      pts.push({
        x: Math.min(0.97, Math.max(0.03, cx + gauss() * 0.075)),
        y: Math.min(0.95, Math.max(0.05, cy + gauss() * 0.075)),
        ph: rand() * Math.PI * 2
      });
    }
  });
  return { pts, rand };
}

const easeOut = t => 1 - Math.pow(1 - t, 3);

export default function KnnDemo() {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const css = getComputedStyle(document.documentElement);
    const color = name => css.getPropertyValue(name).trim();
    const C = {
      point: color('--fg-3') || '#808c98',
      near: color('--fg') || '#e8ecef',
      query: color('--act-glow') || '#e06a92',
      line: 'rgba(232, 236, 239, 0.38)'
    };

    const { pts, rand } = makePoints();
    let W = 0;
    let H = 0;
    let raf = 0;
    let running = false;
    let query = 0;
    let neighbors = [];
    let picked = 0;

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width;
      H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const pick = now => {
      let next = query;
      while (next === query) next = Math.floor(rand() * pts.length);
      query = next;
      const q = pts[query];
      neighbors = pts
        .map((p, i) => [i, ((p.x - q.x) * W) ** 2 + ((p.y - q.y) * H) ** 2])
        .filter(([i]) => i !== query)
        .sort((a, b) => a[1] - b[1])
        .slice(0, K)
        .map(([i]) => i);
      picked = now;
    };

    const pos = (p, t) => [
      (p.x + Math.sin(t * 0.45 + p.ph) * 0.006) * W,
      (p.y + Math.cos(t * 0.38 + p.ph) * 0.006) * H
    ];

    const draw = now => {
      const t = reduced ? 0 : now / 1000;
      if (!reduced && now - picked > CYCLE) pick(now);
      const since = reduced ? 10000 : now - picked;

      ctx.clearRect(0, 0, W, H);
      const [qx, qy] = pos(pts[query], t);

      // links from the query to its neighbors, drawn in order of distance
      ctx.lineWidth = 1;
      ctx.strokeStyle = C.line;
      neighbors.forEach((ni, rank) => {
        const local = Math.min(1, Math.max(0, (since - rank * 45) / 520));
        if (local <= 0) return;
        const e = easeOut(local);
        const [nx, ny] = pos(pts[ni], t);
        ctx.beginPath();
        ctx.moveTo(qx, qy);
        ctx.lineTo(qx + (nx - qx) * e, qy + (ny - qy) * e);
        ctx.stroke();
      });

      const nearSet = new Set(neighbors);
      pts.forEach((p, i) => {
        if (i === query) return;
        const [x, y] = pos(p, t);
        const isNear = nearSet.has(i);
        ctx.beginPath();
        ctx.arc(x, y, isNear ? 3.4 : 2.2, 0, Math.PI * 2);
        ctx.fillStyle = isNear ? C.near : C.point;
        ctx.globalAlpha = isNear ? 1 : 0.55;
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // the query: a filled dot and a ring that settles in
      const ring = 8 + 10 * (1 - easeOut(Math.min(1, since / 700)));
      ctx.beginPath();
      ctx.arc(qx, qy, ring, 0, Math.PI * 2);
      ctx.strokeStyle = C.query;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(qx, qy, 5, 0, Math.PI * 2);
      ctx.fillStyle = C.query;
      ctx.fill();

      if (running) raf = requestAnimationFrame(draw);
    };

    const start = () => {
      if (running) return;
      running = !reduced;
      raf = requestAnimationFrame(draw);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    resize();
    pick(performance.now());
    const ro = new ResizeObserver(() => {
      resize();
      if (!running) raf = requestAnimationFrame(draw);
    });
    ro.observe(wrap);
    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
    io.observe(wrap);
    draw(performance.now());

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
    };
  }, [reduced]);

  return (
    <div className="knn">
      <div className="demo-bar">
        <span className="demo-bar__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="mono-label">nearest neighbors · illustration</span>
      </div>
      <div className="knn__plot" ref={wrapRef}>
        <canvas ref={canvasRef} aria-hidden="true" />
      </div>
      <div className="knn__legend mono-label">
        <span>
          <i className="knn__key knn__key--q" aria-hidden="true" />
          Query item
        </span>
        <span>
          <i className="knn__key knn__key--n" aria-hidden="true" />
          10 nearest
        </span>
        <span className="knn__method">title + image features</span>
      </div>
    </div>
  );
}
