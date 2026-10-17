import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Fades [data-reveal] elements inside `scopeRef` up into place as they reach the viewport.
 * Each starts just before it scrolls into view (102% = a little below the bottom edge), so it is
 * already easing in by the time it is on screen. Skipped entirely with reduced motion.
 */
export function useReveal(scopeRef, { y = 18, stagger = 0.07, start = 'top 102%' } = {}) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const items = gsap.utils.toArray('[data-reveal]');
        if (!items.length) return;
        gsap.set(items, { autoAlpha: 0, y });
        ScrollTrigger.batch(items, {
          start,
          interval: 0.08,
          once: true,
          onEnter: batch =>
            gsap.to(batch, {
              autoAlpha: 1,
              y: 0,
              duration: 1.1,
              ease: 'power2.out',
              stagger,
              overwrite: true
            })
        });
      });
      return () => mm.revert();
    },
    { scope: scopeRef }
  );
}
