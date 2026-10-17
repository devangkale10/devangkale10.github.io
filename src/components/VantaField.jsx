import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../lib/motion';
import './VantaField.css';

/*
 * The hero background: Vanta's FOG shader, seen through a dot-matrix mask so the moving
 * color field reads as a grid of lit data points. Dots near the pointer grow (a "lens").
 * three.js and Vanta load after first paint; until then (and with reduced motion or no
 * WebGL) a static gradient shows through the same dot mask.
 */
const FOG_OPTIONS = {
  highlightColor: 0x8fd8ff, // move
  midtoneColor: 0xf0b45a, // explain
  lowlightColor: 0xf07aa0, // act
  baseColor: 0x0a0e13,
  blurFactor: 0.5,
  speed: 1.15,
  zoom: 0.7,
  scale: 2,
  scaleMobile: 4
};

export default function VantaField() {
  const wrapRef = useRef(null);
  const fogRef = useRef(null);
  const [ready, setReady] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return undefined;
    let effect = null;
    let io = null;
    let cancelled = false;

    (async () => {
      try {
        const THREE = await import('three');
        // Vanta's effect modules read window.THREE when they are evaluated.
        window.THREE = THREE;
        const mod = await import('vanta/dist/vanta.fog.min.js');
        // The UMD build is exposed differently by different bundlers; the global registry is the fallback.
        const FOG = [mod?.default, mod?.default?.default, mod, window.VANTA?.FOG].find(f => typeof f === 'function');
        if (cancelled || !fogRef.current || !FOG) return;
        effect = FOG({
          el: fogRef.current,
          THREE,
          mouseControls: false,
          touchControls: false,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
          ...FOG_OPTIONS
        });
        if (fogRef.current.querySelector('canvas')) setReady(true);
        // Vanta keeps its loop running even when it skips drawing; stop it outright while the hero is off screen.
        io = new IntersectionObserver(([entry]) => {
          if (!effect) return;
          if (entry.isIntersecting) {
            if (!effect.req) {
              effect.prevNow = null;
              effect.animationLoop();
            }
          } else if (effect.req) {
            cancelAnimationFrame(effect.req);
            effect.req = null;
          }
        });
        io.observe(fogRef.current);
      } catch (err) {
        // No WebGL (or Vanta failed): the static dot field stays.
        console.warn('[hero] animated field unavailable:', err);
      }
    })();

    return () => {
      cancelled = true;
      io?.disconnect();
      effect?.destroy?.();
      setReady(false);
    };
  }, [reduced]);

  // The lens follows the pointer (rAF-throttled CSS variables, no React renders).
  useEffect(() => {
    const wrap = wrapRef.current;
    if (reduced || !wrap || !window.matchMedia('(hover: hover)').matches) return undefined;
    let raf = 0;
    let x = 0;
    let y = 0;
    const onMove = e => {
      const r = wrap.getBoundingClientRect();
      x = e.clientX - r.left;
      y = e.clientY - r.top;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        wrap.style.setProperty('--mx', `${x}px`);
        wrap.style.setProperty('--my', `${y}px`);
        wrap.dataset.lens = 'on';
      });
    };
    const onLeave = () => {
      wrap.dataset.lens = 'off';
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <div ref={wrapRef} className="field" data-ready={ready} data-lens="off" aria-hidden="true">
      <div className="field__unlit" />
      <div ref={fogRef} className="field__lit" />
      <div className="field__shade" />
    </div>
  );
}
