/*
 * One heavy job per frame, across the whole page. The WebGL setup of the hero field and the shelf
 * runs while the intro is playing; queued here, each piece runs on its own just after a frame has been
 * drawn, so no two of them land in the same frame and the intro keeps moving between them.
 */
let tail = Promise.resolve();

const afterNextPaint = () =>
  new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));

/** Runs `fn` in a frame of its own, after the jobs queued before it. Resolves with its result. */
export function inOwnFrame(fn) {
  const run = tail.then(afterNextPaint).then(fn);
  tail = run.catch(() => {});
  return run;
}
