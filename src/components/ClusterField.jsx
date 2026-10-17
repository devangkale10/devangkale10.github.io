import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../lib/motion';
import './ClusterField.css';

/*
 * An interactive 3D point cloud that clusters itself.
 * Points come from three random blobs; k-means (k = 3) then runs one visible iteration at a time:
 * points take their centroid's color, centroids glide to their cluster means, until nothing changes.
 * Drag to rotate, hover to push points around, click (or the button) to generate new data and re-run.
 * The cluster matching the hero tagline's current phrase is emphasised.
 */

const K = 3;
const COLORS = ['#6cc6f0', '#e8a94c', '#e06a92']; // move, explain, act (ambient tones)
const NEUTRAL = '#8b97a3';
const NAMES = ['Move', 'Explain', 'Act'];
const CAMERA = 4.2;
const STEP_MS = 720;
const MORPH_MS = 1300;
const IDLE_RERUN_MS = 17000;
const MARGIN = 90; // the canvas extends this far past the box so points near the edge are not clipped

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rand) {
  let u = 0;
  let v = 0;
  while (!u) u = rand();
  while (!v) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* Three anisotropic Gaussian blobs around the origin, plus a little uniform noise. */
function makeBlobs(rand, n) {
  const base = rand() * Math.PI * 2;
  const centers = [];
  const spreads = [];
  for (let k = 0; k < K; k++) {
    const a = base + (k * 2 * Math.PI) / K + (rand() - 0.5) * 0.7;
    const r = 1.3 + rand() * 0.25;
    centers.push([Math.cos(a) * r, (rand() - 0.5) * 0.5, Math.sin(a) * r]);
    spreads.push([0.2 + rand() * 0.16, 0.15 + rand() * 0.1, 0.2 + rand() * 0.16]);
  }
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    if (rand() < 0.06) {
      let x;
      let y;
      let z;
      do {
        x = rand() * 2 - 1;
        y = rand() * 2 - 1;
        z = rand() * 2 - 1;
      } while (x * x + y * y + z * z > 1);
      out[i * 3] = x * 1.75;
      out[i * 3 + 1] = y * 1.1;
      out[i * 3 + 2] = z * 1.75;
    } else {
      const c = Math.floor(rand() * K);
      out[i * 3] = centers[c][0] + gauss(rand) * spreads[c][0];
      out[i * 3 + 1] = centers[c][1] + gauss(rand) * spreads[c][1];
      out[i * 3 + 2] = centers[c][2] + gauss(rand) * spreads[c][2];
    }
  }
  return out;
}

function makeSprite(hex) {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  const r = parseInt(hex.slice(1, 3), 16);
  const gr = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, `rgba(${r},${gr},${b},1)`);
  grad.addColorStop(0.16, `rgba(${r},${gr},${b},1)`);
  grad.addColorStop(0.3, `rgba(${r},${gr},${b},0.32)`);
  grad.addColorStop(0.6, `rgba(${r},${gr},${b},0.07)`);
  grad.addColorStop(1, `rgba(${r},${gr},${b},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

export default function ClusterField({ focus = null }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const focusRef = useRef(focus);
  const reduced = useReducedMotion();

  useEffect(() => {
    focusRef.current = focus;
  }, [focus]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const small = window.matchMedia('(max-width: 720px)').matches;
    const N = small ? 520 : 900;
    const rand = rng((Date.now() ^ 0x9e3779b9) >>> 0);
    const sprites = [...COLORS.map(makeSprite), makeSprite(NEUTRAL)];

    const pos = new Float32Array(N * 3); // what is drawn
    const from = new Float32Array(N * 3); // morph start
    const data = new Float32Array(N * 3); // the dataset k-means runs on
    const assign = new Int8Array(N).fill(-1);
    const pulse = new Float32Array(N);
    const phase = new Float32Array(N).map(() => rand() * Math.PI * 2);
    const disp = new Float32Array(N * 2);
    const scr = new Float32Array(N * 3); // screen x, y, scale
    const cent = new Float32Array(K * 3);
    const centTarget = new Float32Array(K * 3);
    const emph = new Float32Array(K).fill(1);

    let W = 0;
    let H = 0;
    let yaw = 0.6;
    let pitch = 0.24;
    let yawVel = 0;
    let stage = 'morph'; // morph -> iterate -> done
    let stageStart = performance.now();
    let lastStep = 0;
    let iteration = 0;
    let spokes = 0;
    let lastInteract = 0;
    let doneAt = 0;
    let pointer = null;
    let raf = 0;
    let running = false;
    let last = performance.now();

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width;
      H = r.height;
      const cw = W + MARGIN * 2;
      const ch = H + MARGIN * 2;
      canvas.width = Math.max(1, Math.round(cw * dpr));
      canvas.height = Math.max(1, Math.round(ch * dpr));
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // Forgy initialisation: three distinct random data points, so the first iterations are visible.
    const forgy = () => {
      const picks = [];
      while (picks.length < K) {
        const i = Math.floor(rand() * N);
        const ok = picks.every(j => {
          const dx = data[i * 3] - data[j * 3];
          const dy = data[i * 3 + 1] - data[j * 3 + 1];
          const dz = data[i * 3 + 2] - data[j * 3 + 2];
          return dx * dx + dy * dy + dz * dz > 0.25;
        });
        if (ok) picks.push(i);
      }
      const c = new Float32Array(K * 3);
      picks.forEach((i, k) => c.set(data.subarray(i * 3, i * 3 + 3), k * 3));
      return c;
    };

    // Like scikit-learn's n_init: try several starts quietly, then animate the one with the lowest inertia.
    const inertiaFrom = start => {
      const c = Float32Array.from(start);
      let inertia = 0;
      for (let it = 0; it < 40; it++) {
        const sums = new Float64Array(K * 3);
        const counts = new Int32Array(K);
        inertia = 0;
        for (let i = 0; i < N; i++) {
          let best = 0;
          let bestD = Infinity;
          for (let k = 0; k < K; k++) {
            const dx = data[i * 3] - c[k * 3];
            const dy = data[i * 3 + 1] - c[k * 3 + 1];
            const dz = data[i * 3 + 2] - c[k * 3 + 2];
            const d = dx * dx + dy * dy + dz * dz;
            if (d < bestD) {
              bestD = d;
              best = k;
            }
          }
          inertia += bestD;
          sums[best * 3] += data[i * 3];
          sums[best * 3 + 1] += data[i * 3 + 1];
          sums[best * 3 + 2] += data[i * 3 + 2];
          counts[best]++;
        }
        let moved = 0;
        for (let k = 0; k < K; k++) {
          if (!counts[k]) continue;
          for (let d = 0; d < 3; d++) {
            const next = sums[k * 3 + d] / counts[k];
            moved += Math.abs(next - c[k * 3 + d]);
            c[k * 3 + d] = next;
          }
        }
        if (moved < 1e-6) break;
      }
      return inertia;
    };

    const initCentroids = () => {
      let best = null;
      let bestInertia = Infinity;
      for (let trial = 0; trial < 8; trial++) {
        const start = forgy();
        const inertia = inertiaFrom(start);
        if (inertia < bestInertia) {
          bestInertia = inertia;
          best = start;
        }
      }
      cent.set(best);
      centTarget.set(best);
    };

    /* One k-means iteration: assign every point, then move each centroid to its cluster mean. */
    const kmeansStep = () => {
      let changed = 0;
      const sums = new Float64Array(K * 3);
      const counts = new Int32Array(K);
      for (let i = 0; i < N; i++) {
        let best = 0;
        let bestD = Infinity;
        for (let k = 0; k < K; k++) {
          const dx = data[i * 3] - centTarget[k * 3];
          const dy = data[i * 3 + 1] - centTarget[k * 3 + 1];
          const dz = data[i * 3 + 2] - centTarget[k * 3 + 2];
          const d = dx * dx + dy * dy + dz * dz;
          if (d < bestD) {
            bestD = d;
            best = k;
          }
        }
        if (assign[i] !== best) {
          assign[i] = best;
          pulse[i] = 1;
          changed++;
        }
        sums[best * 3] += data[i * 3];
        sums[best * 3 + 1] += data[i * 3 + 1];
        sums[best * 3 + 2] += data[i * 3 + 2];
        counts[best]++;
      }
      for (let k = 0; k < K; k++) {
        if (!counts[k]) continue;
        centTarget[k * 3] = sums[k * 3] / counts[k];
        centTarget[k * 3 + 1] = sums[k * 3 + 1] / counts[k];
        centTarget[k * 3 + 2] = sums[k * 3 + 2] / counts[k];
      }
      iteration++;
      return changed;
    };

    const newData = (now, instant) => {
      pos.forEach((v, i) => (from[i] = v));
      data.set(makeBlobs(rand, N));
      assign.fill(-1);
      iteration = 0;
      initCentroids();
      if (instant) {
        pos.set(data);
        while (kmeansStep() > 0 && iteration < 40);
        cent.set(centTarget);
        stage = 'done';
        pulse.fill(0);
      } else {
        stage = 'morph';
      }
      stageStart = now;
      doneAt = now;
    };

    const rerun = () => {
      lastInteract = performance.now();
      newData(performance.now(), reduced);
      if (!running) draw(performance.now());
    };

    const draw = now => {
      const dt = Math.min(50, now - last) / 16.67;
      last = now;
      const t = now / 1000;

      // ---- simulation ----
      if (stage === 'morph') {
        const m = Math.min(1, (now - stageStart) / MORPH_MS);
        const e = 1 - Math.pow(1 - m, 3);
        for (let i = 0; i < N * 3; i++) pos[i] = from[i] + (data[i] - from[i]) * e;
        if (m >= 1) {
          stage = 'iterate';
          lastStep = now - STEP_MS * 0.6;
        }
      } else if (stage === 'iterate' && now - lastStep > STEP_MS) {
        lastStep = now;
        const changed = kmeansStep();
        spokes = 1;
        if (changed === 0 || iteration >= 30) {
          stage = 'done';
          doneAt = now;
        }
      }
      if (!reduced && stage === 'done' && now - doneAt > IDLE_RERUN_MS && now - lastInteract > 6000) {
        newData(now, false);
      }

      for (let k = 0; k < K * 3; k++) cent[k] += (centTarget[k] - cent[k]) * Math.min(1, 0.14 * dt);
      spokes = Math.max(0, spokes - 0.018 * dt);
      const focusK = stage === 'done' && focusRef.current != null ? focusRef.current : -1;
      for (let k = 0; k < K; k++) {
        const target = focusK < 0 ? 1 : k === focusK ? 1.3 : 0.62;
        emph[k] += (target - emph[k]) * Math.min(1, 0.08 * dt);
      }

      if (!reduced) {
        yawVel *= Math.pow(0.94, dt);
        yaw += (0.0026 + yawVel) * dt;
      }

      // ---- projection ----
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      const top = small ? 8 : 14;
      const availH = Math.max(80, H - top);
      const S = Math.min(W * (small ? 0.2 : 0.27), availH * 0.44);
      const ox = MARGIN + W * 0.5;
      const oy = MARGIN + top + availH * 0.5;
      const project = (x, y, z, out, o) => {
        const x1 = x * cy + z * sy;
        const z1 = -x * sy + z * cy;
        const y2 = y * cp - z1 * sp;
        const z2 = y * sp + z1 * cp;
        const f = CAMERA / (CAMERA + z2);
        out[o] = ox + x1 * S * f;
        out[o + 1] = oy - y2 * S * f;
        out[o + 2] = f;
      };

      const R = small ? 56 : 84;
      for (let i = 0; i < N; i++) {
        const b = reduced ? 0 : Math.sin(t * 0.9 + phase[i]) * 0.012;
        project(pos[i * 3], pos[i * 3 + 1] + b, pos[i * 3 + 2], scr, i * 3);
        // hover: push points away from the pointer, in screen space
        let tx = 0;
        let ty = 0;
        if (pointer) {
          const dx = scr[i * 3] - pointer.x;
          const dy = scr[i * 3 + 1] - pointer.y;
          const d = Math.hypot(dx, dy);
          if (d < R && d > 0.01) {
            const push = (1 - d / R) ** 2 * (small ? 16 : 26);
            tx = (dx / d) * push;
            ty = (dy / d) * push;
          }
        }
        disp[i * 2] += (tx - disp[i * 2]) * Math.min(1, 0.2 * dt);
        disp[i * 2 + 1] += (ty - disp[i * 2 + 1]) * Math.min(1, 0.2 * dt);
        scr[i * 3] += disp[i * 2];
        scr[i * 3 + 1] += disp[i * 2 + 1];
      }
      const cs = new Float32Array(K * 3);
      for (let k = 0; k < K; k++) project(cent[k * 3], cent[k * 3 + 1], cent[k * 3 + 2], cs, k * 3);

      // ---- render ----
      ctx.clearRect(0, 0, W + MARGIN * 2, H + MARGIN * 2);
      ctx.globalCompositeOperation = 'lighter';

      if (spokes > 0.01) {
        ctx.lineWidth = 1;
        for (let k = 0; k < K; k++) {
          ctx.strokeStyle = COLORS[k];
          ctx.globalAlpha = spokes * 0.16;
          ctx.beginPath();
          for (let i = k; i < N; i += 3) {
            if (assign[i] !== k) continue;
            ctx.moveTo(cs[k * 3], cs[k * 3 + 1]);
            ctx.lineTo(scr[i * 3], scr[i * 3 + 1]);
          }
          ctx.stroke();
        }
      }

      const base = small ? 11 : 14;
      for (let i = 0; i < N; i++) {
        const k = assign[i];
        const f = scr[i * 3 + 2];
        const e = k >= 0 ? emph[k] : 1;
        const size = (base + pulse[i] * 14) * f * (0.75 + 0.25 * e);
        const depth = Math.min(1, Math.max(0.25, (f - 0.62) / 0.62));
        ctx.globalAlpha = Math.min(1, depth * (0.55 + 0.45 * Math.min(e, 1.2)) * (e < 1 ? e : 1));
        ctx.drawImage(sprites[k >= 0 ? k : K], scr[i * 3] - size / 2, scr[i * 3 + 1] - size / 2, size, size);
        if (!reduced) pulse[i] *= Math.pow(0.9, dt);
      }

      // centroids and their labels
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      const labelsOn = stage !== 'morph';
      for (let k = 0; k < K; k++) {
        const x = cs[k * 3];
        const y = cs[k * 3 + 1];
        const f = cs[k * 3 + 2];
        const r = 9 * f * (0.85 + 0.15 * emph[k]);
        ctx.strokeStyle = COLORS[k];
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - r - 5, y);
        ctx.lineTo(x - r + 2, y);
        ctx.moveTo(x + r - 2, y);
        ctx.lineTo(x + r + 5, y);
        ctx.stroke();
        ctx.fillStyle = COLORS[k];
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        if (labelsOn) {
          ctx.font = `600 ${small ? 11 : 12.5}px "Funnel Sans", ui-sans-serif, system-ui, sans-serif`;
          ctx.fillStyle = 'rgba(232, 236, 239, 0.92)';
          ctx.shadowColor = 'rgba(10, 14, 19, 0.9)';
          ctx.shadowBlur = 6;
          ctx.fillText(NAMES[k], x + r + 9, y - r - 3);
          ctx.shadowBlur = 0;
        }
      }

      if (running) raf = requestAnimationFrame(draw);
    };

    const start = () => {
      if (running || reduced) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(draw);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    // ---- pointer: drag to rotate, click to re-run, hover to repel ----
    let down = null;
    const local = e => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onDown = e => {
      down = { ...local(e), t: performance.now(), moved: 0, lx: e.clientX, ly: e.clientY };
      canvas.setPointerCapture?.(e.pointerId);
    };
    const onMove = e => {
      pointer = e.pointerType === 'mouse' ? local(e) : null;
      if (!down) return;
      const dx = e.clientX - down.lx;
      const dy = e.clientY - down.ly;
      down.lx = e.clientX;
      down.ly = e.clientY;
      down.moved += Math.abs(dx) + Math.abs(dy);
      if (down.moved > 5) {
        canvas.dataset.dragging = 'true';
        lastInteract = performance.now();
        yawVel = dx * 0.0016;
        yaw += dx * 0.006;
        pitch = Math.max(-0.9, Math.min(1.1, pitch + dy * 0.004));
        if (!running) draw(performance.now());
      }
    };
    const onUp = e => {
      if (down && down.moved <= 5 && performance.now() - down.t < 600) rerun();
      down = null;
      delete canvas.dataset.dragging;
      canvas.releasePointerCapture?.(e.pointerId);
    };
    const onLeave = () => {
      pointer = null;
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('pointerleave', onLeave);

    resize();
    // Intro: points start collapsed near the centre and burst out into the first dataset.
    for (let i = 0; i < N * 3; i++) pos[i] = (rand() - 0.5) * 0.12;
    newData(performance.now(), reduced);
    draw(performance.now());

    const ro = new ResizeObserver(() => {
      resize();
      if (!running) draw(performance.now());
    });
    ro.observe(wrap);
    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
    io.observe(wrap);

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
    };
  }, [reduced]);

  return (
    <div className="cluster" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="cluster__canvas"
        role="img"
        aria-label="A 3D cloud of data points that k-means sorts into three clusters, labelled Move, Explain and Act"
      />
    </div>
  );
}
