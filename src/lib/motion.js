import { useEffect, useState, useSyncExternalStore } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

/* ---------- reduced motion ---------- */

const REDUCED = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia(REDUCED).matches;
}

function subscribeReduced(callback) {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

export function useReducedMotion() {
  return useSyncExternalStore(subscribeReduced, prefersReducedMotion, () => false);
}

/* ---------- Lenis smooth scrolling, driven by GSAP's ticker ---------- */

let lenis = null;
export const NAV_OFFSET = -76;

export function useSmoothScroll(enabled) {
  useEffect(() => {
    if (!enabled) return undefined;

    // A touch quicker than Lenis's default feel: each wheel step travels further and settles sooner.
    lenis = new Lenis({ autoRaf: false, lerp: 0.15, smoothWheel: true, wheelMultiplier: 1.35 });
    lenis.on('scroll', ScrollTrigger.update);

    const tick = time => lenis?.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis?.destroy();
      lenis = null;
    };
  }, [enabled]);
}

export function getLenis() {
  return lenis;
}

/** Scroll to a section id, an element, or a pixel offset. */
export function scrollToTarget(target, options = {}) {
  const el = typeof target === 'string' ? document.getElementById(target.replace(/^#/, '')) : target;
  if (lenis) {
    lenis.scrollTo(el ?? target, { offset: el ? NAV_OFFSET : 0, duration: 1.3, force: true, ...options });
    return;
  }
  const behavior = prefersReducedMotion() || options.immediate ? 'auto' : 'smooth';
  if (el && el.getBoundingClientRect) {
    const top = el.getBoundingClientRect().top + window.scrollY + (options.offset ?? NAV_OFFSET);
    window.scrollTo({ top, behavior });
  } else {
    window.scrollTo({ top: typeof target === 'number' ? target : 0, behavior });
  }
  options.onComplete?.();
}

export function stopScroll() {
  lenis?.stop();
}

export function startScroll() {
  lenis?.start();
}

/* ---------- which section is in view ---------- */

export function useActiveSection(ids, line = '40%') {
  const [active, setActive] = useState(null);
  const key = ids.join('|');

  useEffect(() => {
    const triggers = key
      .split('|')
      .map((id, i) => {
        const el = document.getElementById(id);
        if (!el) return null;
        return ScrollTrigger.create({
          trigger: el,
          start: `top ${line}`,
          end: `bottom ${line}`,
          onToggle: self => {
            if (self.isActive) setActive(id);
            else if (i === 0 && self.direction < 0) setActive(null);
          }
        });
      })
      .filter(Boolean);
    return () => triggers.forEach(t => t.kill());
  }, [key, line]);

  return active;
}
