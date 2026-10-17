import { useSyncExternalStore } from 'react';
import { prefersReducedMotion } from './motion';

/*
 * Whether the opening intro has finished. The hero waits for it before playing its own
 * entrance, so the two never overlap. With reduced motion there is no intro at all.
 */
let done = typeof window === 'undefined' || prefersReducedMotion();
const listeners = new Set();

export function introWillPlay() {
  return !done;
}

export function finishIntro() {
  if (done) return;
  done = true;
  document.documentElement.classList.remove('is-intro');
  listeners.forEach(fn => fn());
}

export function useIntroDone() {
  return useSyncExternalStore(
    fn => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => done,
    () => true
  );
}
