import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { profile } from '../data/resume';
import { startScroll, stopScroll } from '../lib/motion';
import { finishIntro, holdsSettled, introWillPlay } from '../lib/intro';
import './Intro.css';

/**
 * Resolves once the fonts are in, the page has loaded and the heavy sections (hero field, shelf)
 * are built, or after a few seconds at most.
 */
function pageReady() {
  const fonts = document.fonts?.ready ?? Promise.resolve();
  const load =
    document.readyState === 'complete' ? Promise.resolve() : new Promise(r => window.addEventListener('load', r, { once: true }));
  const basics = Promise.race([Promise.all([fonts, load]), new Promise(r => setTimeout(r, 1500))]);
  return Promise.all([basics, holdsSettled(4000)]);
}

/*
 * The way in: a single data point appears, splits into the three layers (move, explain, act),
 * a dot field spreads out from them while the page loads, then the points fall together and
 * an aperture opens through the middle of the screen onto the site, which comes into focus.
 * Any click, key or scroll skips straight to the opening.
 */
export default function Intro() {
  const rootRef = useRef(null);
  const playing = useRef(introWillPlay());

  useEffect(() => {
    document.getElementById('intro-veil')?.remove();
    const root = rootRef.current;
    if (!playing.current || !root) {
      finishIntro();
      return undefined;
    }

    const page = document.getElementById('root');
    const q = s => root.querySelector(s);
    const dots = gsap.utils.toArray(root.querySelectorAll('.intro__dot'));
    const letters = gsap.utils.toArray(root.querySelectorAll('.intro__name span'));
    const count = { v: 0 };
    const countEl = q('.intro__count b');
    const noteEl = q('.intro__note');
    let note = '';
    const setCount = () => {
      const v = Math.round(count.v);
      if (countEl) countEl.textContent = String(v);
      const next = v >= 100 ? 'ok, it’s clean.' : v >= 55 ? 'almost there…' : 'cleaning the data…';
      if (noteEl && next !== note) {
        // Each line eases in, so the change reads as a new message rather than a flicker
        note = next;
        noteEl.textContent = next;
        gsap.fromTo(noteEl, { opacity: 0.15, y: 4 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
      }
    };
    const R = () => Math.hypot(window.innerWidth, window.innerHeight) / 2 + 60;
    const spread = Math.min(window.innerWidth, window.innerHeight) < 600 ? 16 : 22;
    const corners = [-90, 30, 150].map(a => ({
      x: Math.cos((a * Math.PI) / 180) * spread,
      y: Math.sin((a * Math.PI) / 180) * spread
    }));

    // Hold the page still (and at the top) until we are through.
    window.scrollTo(0, 0);
    const raf = requestAnimationFrame(() => stopScroll());

    let exited = false;
    const intro = gsap.timeline();
    const exit = gsap.timeline({ paused: true });

    // Every tween states both ends, so a second run (React's dev double-mount) starts clean.
    root.style.display = '';
    gsap.set(root, { '--r': '0px', '--g': '0px' });
    gsap.set(q('.intro__core'), { scale: 1, opacity: 1, filter: 'blur(0px)' });
    gsap.set(q('.intro__grid'), { scale: 1, opacity: 1 });
    gsap.set(q('.intro__flash'), { scale: 0.2, opacity: 0 });
    gsap.set(q('.intro__mark'), { rotation: 0 });
    gsap.set(page, { scale: 1.07, filter: 'blur(10px)', transformOrigin: '50% 40vh' });

    // Under two seconds, paced so each status line can be read:
    // "cleaning the data…" up to 54%, "almost there…" to 92%, then "ok, it's clean." before the opening.
    intro
      .fromTo(q('.intro__seed'), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2.6)' })
      .addLabel('split', 0.22)
      .fromTo(dots, { x: 0, y: 0, scale: 0.3, opacity: 0 }, {
        x: i => corners[i].x,
        y: i => corners[i].y,
        scale: 1,
        opacity: 1,
        duration: 0.6,
        ease: 'expo.out',
        stagger: 0.04
      }, 'split')
      .to(q('.intro__seed'), { scale: 0, opacity: 0, duration: 0.2 }, 'split')
      .fromTo(letters, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: 'expo.out', stagger: 0.02 }, 'split+=0.05')
      .fromTo([q('.intro__count'), q('.intro__note')], { opacity: 0 }, { opacity: 1, duration: 0.3 }, 'split')
      .fromTo(root, { '--g': '0px' }, { '--g': () => `${R()}px`, duration: 1.4, ease: 'power2.out' }, 'split')
      .to(count, { v: 54, duration: 0.7, ease: 'power1.inOut', onUpdate: setCount }, 'split')
      .to(count, { v: 92, duration: 0.65, ease: 'power1.out', onUpdate: setCount });

    // The three points keep turning slowly through the loading and the pause at 100%
    const spin = gsap.fromTo(q('.intro__mark'), { rotation: 0 }, { rotation: 150, duration: 2.6, delay: 0.22, ease: 'sine.inOut' });

    // The grand entrance: 100% and "ok, it's clean." hold for a beat, then the points fall together
    // and the aperture opens, in one continuous move.
    exit
      .to(count, { v: 100, duration: 0.25, ease: 'power1.out', onUpdate: setCount })
      .to(dots, { x: 0, y: 0, duration: 0.32, ease: 'power3.in' }, 0.55)
      .to(q('.intro__flash'), { opacity: 1, scale: 1, duration: 0.2, ease: 'power2.out' }, 0.81)
      .addLabel('open', 0.85)
      .to(root, { '--r': () => `${R()}px`, duration: 0.95, ease: 'expo.inOut' }, 'open')
      .fromTo(q('.intro__ring'), { opacity: 0.9 }, { opacity: 0, duration: 0.95, ease: 'power2.in' }, 'open')
      .to(q('.intro__core'), { scale: 2.2, opacity: 0, filter: 'blur(6px)', duration: 0.6, ease: 'power2.in' }, 'open')
      .to(q('.intro__grid'), { scale: 1.5, opacity: 0, duration: 0.8, ease: 'power2.in' }, 'open')
      .to(page, { scale: 1, filter: 'blur(0px)', duration: 1.1, ease: 'expo.out' }, 'open+=0.25')
      .add(() => {
        finishIntro();
        startScroll();
      }, 'open+=0.1')
      .add(() => {
        gsap.set(page, { clearProps: 'transform,filter,transformOrigin' });
        root.style.display = 'none';
        // Scroll positions were measured while the page was scaled up behind the intro; measure again.
        ScrollTrigger.refresh();
      });

    const go = () => {
      if (exited) return;
      exited = true;
      intro.kill();
      exit.play();
    };

    let readyNow = false;
    let minDone = false;
    pageReady().then(() => {
      readyNow = true;
      if (minDone) go();
    });
    intro.eventCallback('onComplete', () => {
      minDone = true;
      if (readyNow) go();
    });

    const skip = () => go();
    const opts = { passive: true };
    window.addEventListener('pointerdown', skip, opts);
    window.addEventListener('keydown', skip);
    window.addEventListener('wheel', skip, opts);
    window.addEventListener('touchstart', skip, opts);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('wheel', skip);
      window.removeEventListener('touchstart', skip);
      intro.kill();
      exit.kill();
      spin.kill();
      gsap.set(page, { clearProps: 'transform,filter,transformOrigin' });
      ScrollTrigger.refresh();
      startScroll();
    };
  }, []);

  if (!playing.current) return null;

  return createPortal(
    <div className="intro" ref={rootRef} aria-hidden="true">
      <div className="intro__veil">
        <div className="intro__grid" />
        <div className="intro__core">
          <div className="intro__mark">
            <i className="intro__seed" />
            <i className="intro__dot" data-layer="move" />
            <i className="intro__dot" data-layer="explain" />
            <i className="intro__dot" data-layer="act" />
            <i className="intro__flash" />
          </div>
          <p className="intro__name">
            {[...profile.name].map((ch, i) => (
              <span key={i}>{ch === ' ' ? ' ' : ch}</span>
            ))}
          </p>
          <p className="intro__count">
            <b>0</b>
            <span>%</span>
          </p>
          <p className="intro__note">cleaning the data…</p>
        </div>
      </div>
      <div className="intro__ring" />
    </div>,
    document.body
  );
}
