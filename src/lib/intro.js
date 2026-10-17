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

/*
 * Heavy work (the hero's WebGL field, the 3D shelf) starts while the intro plays and tells the
 * intro to wait for it, so the site is warm by the time it opens instead of stuttering just after.
 */
const holds = [];

/** Ask the intro to stay up until `promise` settles (it never waits longer than `holdsSettled`'s cap). */
export function holdIntro(promise) {
  if (!done) holds.push(Promise.resolve(promise).catch(() => {}));
}

/** Resolves once every hold has settled, or after `maxMs`, whichever is first. */
export function holdsSettled(maxMs) {
  // Wait a tick first: the sections register their holds in effects that run just after the intro's.
  const all = new Promise(r => setTimeout(r, 0)).then(() => Promise.all(holds));
  return Promise.race([all, new Promise(r => setTimeout(r, maxMs))]);
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
