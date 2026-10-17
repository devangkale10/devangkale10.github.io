import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { profile, volumes } from '../data/resume';
import { prefersReducedMotion, scrollToTarget, startScroll, stopScroll, useReducedMotion } from '../lib/motion';
import { useReveal } from '../lib/useReveal';
import { holdIntro, introWillPlay, useIntroDone } from '../lib/intro';
import { RichText, SectionHead } from '../components/Bits';
import { ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight } from '../components/Icons';
import { themeFor } from '../shelf/theme';
import PiiDemo from './PiiDemo';
import KnnDemo from './KnnDemo';
import './Shelf.css';

const DEMOS = { pii: PiiDemo, recs: KnnDemo };
const N = volumes.length;
const pad = n => String(n).padStart(2, '0');
const PAGE_LABELS = ['Cover', 'Title page', 'The work · Result', 'Tools · Plate', 'Colophon'];
const PAGE_SPOKEN = [
  'The book is closed.',
  'Title page.',
  'Pages 2 and 3: the work and the result.',
  'Pages 4 and 5: the tools and the plate.',
  'Page 6, the last page: You read to the end. That’s rare. Let’s talk. Next goes back to the shelf.'
];
const READING = new Set(['toDetail', 'detail', 'toShelf']);

function period(src) {
  return src.start ? `${src.start} – ${src.end}` : src.period;
}

function Metric({ metric }) {
  return (
    <p className="vol-metric">
      <span className="vol-metric__value">
        {metric.prefix}
        {metric.value}
        {metric.suffix && <span className="vol-metric__suffix">{metric.suffix}</span>}
        {metric.unit && <span className="vol-metric__unit">{metric.unit}</span>}
      </span>
      <span className="vol-metric__label mono-label">
        {metric.label}
        {metric.note && <span className="vol-metric__note"> · {metric.note}</span>}
      </span>
    </p>
  );
}

/** What a volume says, as HTML: used by the reading panel and by the plain list fallback. */
export function VolumeDetails({ vol, index, titleId, header = true }) {
  const Demo = DEMOS[vol.demo];
  const src = vol.source;
  const isProject = src.org === 'GitHub';
  return (
    <>
      {header && (
        <>
          <p className="vol__kicker">
            <span className="mono-label">
              Vol. {pad(index + 1)} / {pad(N)}
            </span>
          </p>
          <h3 className="vol__title" id={titleId}>
            {vol.title}
          </h3>
          <p className="vol__subtitle">{vol.subtitle}</p>
        </>
      )}
      <Metric metric={vol.metric} />
      <div className="vol__text">
        {vol.paragraphs.map((p, i) => (
          <p key={i}>
            <RichText text={p} />
          </p>
        ))}
      </div>
      <div className="vol__block">
        <p className="mono-label vol__label">Tools</p>
        <ul className="chips vol__tools">
          {vol.tools.map(t => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
      <dl className="vol__meta">
        {isProject ? (
          <div>
            <dt className="mono-label">Where</dt>
            <dd>Project · code on GitHub</dd>
          </div>
        ) : (
          <>
            <div>
              <dt className="mono-label">Where</dt>
              <dd>
                {src.title}, {src.org}
                {src.unit ? ` · ${src.unit}` : ''}
              </dd>
            </div>
            <div>
              <dt className="mono-label">When</dt>
              <dd>{period(src)}</dd>
            </div>
          </>
        )}
        <div>
          <dt className="mono-label">Binding</dt>
          <dd>
            <span className="swatch" style={{ background: vol.binding.cloth }} aria-hidden="true" />
            {vol.binding.clothName} cloth,{' '}
            <span className="swatch" style={{ background: vol.binding.foil }} aria-hidden="true" />
            {vol.binding.foilName} foil
          </dd>
        </div>
      </dl>
      {Demo && (
        <div className="vol__demo">
          <Demo />
        </div>
      )}
      {isProject && (
        <a className="btn btn--ghost vol__link" href={src.url} target="_blank" rel="noopener noreferrer">
          View the code on GitHub
          <ArrowUpRight className="nudge-diag" />
        </a>
      )}
    </>
  );
}

/** Without WebGL: the same volumes as an expandable list. */
function ShelfList() {
  return (
    <ol className="shelf-list">
      {volumes.map((v, i) => (
        <li key={v.id} style={{ '--cloth': v.binding.cloth, '--foil': v.binding.foil }}>
          <details className="shelf-list__item">
            <summary>
              <span className="shelf-list__spine" aria-hidden="true" />
              <span className="mono-label">Vol. {pad(i + 1)}</span>
              <span className="shelf-list__title">{v.title}</span>
              <span className="shelf-list__sub">{v.subtitle}</span>
            </summary>
            <div className="vol shelf-list__body">
              <VolumeDetails vol={v} index={i} header={false} />
            </div>
          </details>
        </li>
      ))}
    </ol>
  );
}

export default function Shelf() {
  const reduced = useReducedMotion();
  const introDone = useIntroDone();
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const slotRef = useRef(null);
  const readerRef = useRef(null);
  const openRef = useRef(null);
  const sceneRef = useRef(null);
  const handlerRef = useRef(() => {});
  const pageRef = useRef(0);
  const wasReading = useRef(false);

  const [mode, setMode] = useState('idle'); // idle → loading → ready, or fallback
  const [state, setState] = useState('loading');
  const [index, setIndex] = useState(0);
  const [page, setPage] = useState(0);
  const [say, setSay] = useState('');

  useReveal(sectionRef);

  const vol = volumes[index];
  const theme = useMemo(() => themeFor(vol.binding), [vol]);
  const reading = READING.has(state);
  const panelOpen = state === 'toDetail' || state === 'detail';

  /* ---------- the reading slot, measured from the layout ---------- */

  const measure = useCallback(() => {
    const scene = sceneRef.current;
    const c = canvasRef.current;
    const s = slotRef.current;
    if (!scene || !c || !s) return;
    const a = c.getBoundingClientRect();
    const b = s.getBoundingClientRect();
    scene.setSlot({ x: b.left - a.left, y: b.top - a.top, w: b.width, h: b.height });
  }, []);

  useEffect(() => {
    if (mode === 'fallback') return undefined;
    const ro = new ResizeObserver(measure);
    if (stageRef.current) ro.observe(stageRef.current);
    if (slotRef.current) ro.observe(slotRef.current);
    return () => ro.disconnect();
  }, [measure, mode]);

  /* ---------- opening and closing ---------- */

  const lockPage = () => {
    stopScroll();
    document.documentElement.style.overflow = 'hidden';
  };

  const openVolume = useCallback(
    i => {
      const scene = sceneRef.current;
      if (!scene || scene.state !== 'shelf') return;
      measure();
      if (!scene.open(i)) return;
      const root = document.documentElement;
      root.style.setProperty('--reading-bg', themeFor(volumes[i].binding).tint);
      root.dataset.reading = 'true';
      // Bring the whole stage into view, then hold the page still while reading.
      scrollToTarget(stageRef.current, { offset: 0, duration: 0.9, lock: true, onComplete: lockPage });
    },
    [measure]
  );

  const closeVolume = useCallback(() => {
    sceneRef.current?.close();
  }, []);

  /* ---------- scene events ---------- */

  handlerRef.current = (type, d) => {
    switch (type) {
      case 'ready':
        setMode('ready');
        measure();
        break;
      case 'select':
        setIndex(d.index);
        setSay(`Volume ${d.index + 1} of ${N}: ${volumes[d.index].title}.`);
        break;
      case 'state':
        setState(d.state);
        break;
      case 'page':
        if (d.page !== pageRef.current) setSay(PAGE_SPOKEN[d.page]);
        pageRef.current = d.page;
        setPage(d.page);
        break;
      case 'request-open':
        openVolume(d.index);
        break;
      case 'link':
        window.location.href = `mailto:${profile.email}`;
        break;
      case 'error':
        setMode('fallback');
        break;
      default:
    }
  };

  // Build the scene early. While the intro plays, it is built behind it (and the intro waits for it), so
  // nothing heavy is left to do once the page opens. Without the intro: a moment after load, or as soon as
  // the section is within a couple of screens, whichever is first.
  const startRef = useRef(() => {});
  useEffect(() => {
    const section = sectionRef.current;
    let cancelled = false;
    let started = false;
    let scene = null;
    let built = () => {};
    const start = () => {
      if (started || cancelled) return;
      started = true;
      io.disconnect();
      setMode('loading');
      import('../shelf/ShelfScene.js').then(
        ({ ShelfScene }) => {
          if (cancelled || !canvasRef.current) return built();
          try {
            scene = new ShelfScene({
              canvas: canvasRef.current,
              volumes,
              reduced: prefersReducedMotion(),
              onEvent: (t, d) => handlerRef.current(t, d)
            });
          } catch {
            setMode('fallback');
            return built();
          }
          sceneRef.current = scene;
          scene.init().then(built, built);
        },
        () => {
          built();
          if (!cancelled) setMode('fallback');
        }
      );
    };
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && start(), { rootMargin: '1600px 0px' });
    io.observe(section);
    startRef.current = start;
    if (introWillPlay()) {
      holdIntro(new Promise(r => (built = r)));
      start();
    }
    return () => {
      cancelled = true;
      built();
      io.disconnect();
      scene?.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!introDone) return undefined;
    const t = setTimeout(() => startRef.current(), 700);
    return () => clearTimeout(t);
  }, [introDone]);

  useEffect(() => {
    if (sceneRef.current) sceneRef.current.reduced = reduced;
  }, [reduced]);

  // Entering and leaving the reading view: focus, announcements, page scroll.
  // (With reduced motion a flight finishes at once, so 'toDetail' may never render.)
  useEffect(() => {
    if ((state === 'toDetail' || state === 'detail') && !wasReading.current) {
      wasReading.current = true;
      pageRef.current = 0;
      setPage(0);
      setSay(`Reading ${volumes[sceneRef.current?.index ?? 0].title}. Use the page buttons or the arrow keys to turn pages, Escape to go back.`);
      readerRef.current?.focus({ preventScroll: true });
    }
    if (state === 'shelf' && wasReading.current) {
      wasReading.current = false;
      document.documentElement.style.overflow = '';
      delete document.documentElement.dataset.reading;
      startScroll();
      openRef.current?.focus({ preventScroll: true });
      setSay('Back on the shelf.');
    }
  }, [state]);

  // If the section unmounts mid-read, give the page back.
  useEffect(
    () => () => {
      if (!wasReading.current) return;
      document.documentElement.style.overflow = '';
      delete document.documentElement.dataset.reading;
      startScroll();
    },
    []
  );

  // While reading: Escape, arrow keys for pages, and Tab kept inside the reader.
  useEffect(() => {
    if (!panelOpen) return undefined;
    const onKey = e => {
      const scene = sceneRef.current;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeVolume();
      } else if (e.key === 'ArrowRight' && !e.altKey && !e.metaKey) {
        e.preventDefault();
        scene?.nextPage();
      } else if (e.key === 'ArrowLeft' && !e.altKey && !e.metaKey) {
        e.preventDefault();
        scene?.prevPage();
      } else if (e.key === 'Tab') {
        const root = readerRef.current;
        if (!root) return;
        const items = [...root.querySelectorAll('a[href], button, [tabindex="0"]')].filter(
          el => !el.closest('[inert]') && el.offsetParent !== null
        );
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        const at = document.activeElement;
        if (e.shiftKey && (at === first || at === root || !root.contains(at))) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (at === last || !root.contains(at))) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [panelOpen, closeVolume]);

  // Arrow keys move the shelf whenever it fills most of the screen, without having to focus it first.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || mode !== 'ready') return undefined;
    let inView = false;
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.intersectionRatio >= 0.5;
    }, { threshold: [0, 0.5, 1] });
    io.observe(stage);
    const onKey = e => {
      const scene = sceneRef.current;
      if (!inView || !scene || scene.state !== 'shelf') return;
      if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      // Keys pressed on the shelf's own controls are handled there.
      if (t instanceof HTMLElement && t.closest('.shelf__chrome')) return;
      e.preventDefault();
      if (e.key === 'ArrowRight') scene.next();
      else scene.prev();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      io.disconnect();
      window.removeEventListener('keydown', onKey);
    };
  }, [mode]);

  const onShelfKey = e => {
    const scene = sceneRef.current;
    if (!scene || reading) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      scene.next();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scene.prev();
    } else if (e.key === 'Home') {
      e.preventDefault();
      scene.select(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      scene.select(N - 1);
    }
  };

  const ready = mode === 'ready';
  const style = {
    '--vol-tint': theme.tint,
    '--vol-glow': theme.glow,
    '--vol-panel': theme.panel,
    '--vol-accent': theme.accent,
    '--vol-cloth': vol.binding.cloth
  };

  return (
    <section className="section work" id="work" aria-labelledby="work-title" ref={sectionRef}>
      <div className="container">
        <SectionHead
          id="work-title"
          eyebrow={`${N} volumes`}
          title="Selected work"
          aside="Each book is one piece of work from my resume. Take one off the shelf to read what was built, what it changed and the tools behind it."
        />
      </div>

      {mode === 'fallback' ? (
        <div className="container">
          <ShelfList />
        </div>
      ) : (
        <div className="shelf" ref={stageRef} data-mode={mode} data-state={state} style={style}>
          <canvas className="shelf__canvas" ref={canvasRef} aria-hidden="true" />
          <div className="shelf__shade" aria-hidden="true" />
          <p className="shelf__loading mono-label" aria-hidden={ready}>
            <i aria-hidden="true" />
            Shelving the volumes
          </p>

          <div className="shelf__chrome" inert={reading} onKeyDown={onShelfKey}>
            <div className="shelf__top">
              <p className="mono-label shelf__count">
                <span className="shelf__count-now">Vol. {pad(index + 1)}</span> / {pad(N)}
              </p>
              <p className="mono-label shelf__binding">
                <span className="swatch" style={{ background: vol.binding.cloth }} aria-hidden="true" />
                <span className="swatch" style={{ background: vol.binding.foil }} aria-hidden="true" />
                {vol.binding.clothName} cloth · {vol.binding.foilName} foil
              </p>
            </div>

            <div className="shelf__bar">
              <div className="shelf__now">
                <h3 className="shelf__title">{vol.title}</h3>
                <p className="shelf__sub">{vol.subtitle}</p>
              </div>

              <div className="shelf__controls">
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Previous volume"
                  aria-disabled={index === 0}
                  onClick={() => index > 0 && sceneRef.current?.prev()}
                >
                  <ChevronLeft />
                </button>
                <button
                  ref={openRef}
                  type="button"
                  className="btn btn--solid shelf__open"
                  disabled={!ready}
                  aria-label={`Open volume: ${vol.title}`}
                  onClick={() => openVolume(index)}
                >
                  Open volume
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Next volume"
                  aria-disabled={index === N - 1}
                  onClick={() => index < N - 1 && sceneRef.current?.next()}
                >
                  <ChevronRight />
                </button>
              </div>

              <div className="shelf__index">
                <ol className="shelf__markers">
                  {volumes.map((v, i) => (
                    <li key={v.id}>
                      <button
                        type="button"
                        aria-label={`Volume ${i + 1}: ${v.title}`}
                        aria-current={i === index ? 'true' : undefined}
                        onClick={() => sceneRef.current?.select(i)}
                      />
                    </li>
                  ))}
                </ol>
                <p className="mono-label shelf__hint">
                  <span className="hint--pointer">Swipe or drag sideways · arrow keys · click a book</span>
                  <span className="hint--touch">Swipe · tap a book</span>
                </p>
              </div>
            </div>
          </div>

          <div
            className="reader"
            ref={readerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reader-title"
            data-open={panelOpen}
            inert={!panelOpen}
            tabIndex={-1}
          >
            <button type="button" className="btn btn--ghost reader__back" onClick={closeVolume}>
              <ArrowLeft />
              Back to the shelf
              <kbd className="reader__kbd">Esc</kbd>
            </button>

            <div className="reader__slot" ref={slotRef} aria-hidden="true" />

            <div className="reader__pager">
              <button
                type="button"
                className="icon-btn"
                aria-label={page <= 1 ? 'Close the book' : 'Previous page'}
                aria-disabled={page === 0}
                onClick={() => sceneRef.current?.prevPage()}
              >
                <ChevronLeft />
              </button>
              <div className="reader__where">
                <p className="mono-label reader__page">{PAGE_LABELS[page]}</p>
                <span className="reader__dots" aria-hidden="true">
                  {PAGE_LABELS.map((_, i) => (
                    <i key={i} data-on={i === page} />
                  ))}
                </span>
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label={page === 0 ? 'Open the book' : page === 4 ? 'Close the book and go back to the shelf' : 'Next page'}
                onClick={() => sceneRef.current?.nextPage()}
              >
                <ChevronRight />
              </button>
            </div>
            <p className="mono-label reader__hint">
              <span className="hint--pointer">Drag or click a page to turn</span>
              <span className="hint--touch">Swipe or tap a page to turn</span>
            </p>

            <div className="reader__panel vol" key={vol.id} data-lenis-prevent>
              <VolumeDetails vol={vol} index={index} titleId="reader-title" />
            </div>
          </div>

          <p className="sr-only" aria-live="polite">
            {say}
          </p>
        </div>
      )}
    </section>
  );
}
