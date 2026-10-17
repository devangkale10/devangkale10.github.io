import { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

import { layers, profile } from '../data/resume';
import { useReducedMotion } from '../lib/motion';
import { LayerTag } from '../components/Bits';
import ScrollReveal from '../components/reactbits/ScrollReveal';
import { GlobalSpotlight, ParticleCard } from '../components/reactbits/MagicBentoParts';
import './Stack.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/* Three slabs in isometric projection: Move at the base, Explain, then Act on top.
   Data (the rising dots) changes color as it passes through each layer. */
function StackDiagram({ active }) {
  return (
    <figure className="diagram" data-active={active ?? 'none'}>
      <div className="diagram__stage">
        <div className="diagram__iso">
          {layers.map((l, i) => (
            <div key={l.id} className="slab" data-layer={l.id} data-active={active === l.id} style={{ '--z': i }} />
          ))}
        </div>
        <div className="diagram__flow" aria-hidden="true">
          {[0, 1, 2, 3].map(d => (
            <i key={d} style={{ '--d': d }} />
          ))}
        </div>
        {layers.map((l, i) => (
          <div
            key={l.id}
            className="diagram__label"
            data-layer={l.id}
            data-active={active === l.id}
            style={{ '--z': i }}
            aria-hidden="true"
          >
            <span className="diagram__index">{l.index}</span>
            <span className="diagram__name">{l.name}</span>
            <span className="diagram__phrase">{l.phrase}</span>
          </div>
        ))}
      </div>
      <figcaption className="sr-only">
        The data stack in three layers: Move at the base, Explain in the middle, Act on top.
      </figcaption>
    </figure>
  );
}

/* Particle / ripple colors per layer, as "r, g, b" for the React Bits card effects */
const GLOW = {
  move: '108, 198, 240',
  explain: '232, 169, 76',
  act: '224, 106, 146'
};

function FlipIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12a8 8 0 0 1 13.7-5.6L20 9" />
      <path d="M20 4v5h-5" />
      <path d="M20 12a8 8 0 0 1-13.7 5.6L4 15" />
      <path d="M4 20v-5h5" />
    </svg>
  );
}

/* A skill group card: the resume's skills on the front; click it to flip and see where they were used. */
function SkillCard({ group, layerId, reduced }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <ParticleCard
      className="skill-card"
      glowColor={GLOW[layerId]}
      particleCount={10}
      enableTilt={false}
      enableMagnetism={false}
      clickEffect={!reduced}
      disableAnimations={reduced}
    >
      <div className="skill-card__flipper" data-flipped={flipped} onClick={() => setFlipped(f => !f)}>
        <div className="skill-card__face skill-card__front" aria-hidden={flipped} inert={flipped}>
          <div className="skill-card__head">
            <h4 className="skill-card__title">{group.group}</h4>
            <span className="mono-label">{group.items.length} skills</span>
          </div>
          <ul className="skill-card__chips">
            {group.items.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <button type="button" className="skill-card__toggle" aria-expanded={flipped}>
            <FlipIcon />
            Where I used these
          </button>
        </div>

        <div className="skill-card__face skill-card__back" aria-hidden={!flipped} inert={!flipped}>
          <div className="skill-card__head">
            <h4 className="skill-card__title">{group.group}</h4>
            <span className="mono-label">In practice</span>
          </div>
          <ul className="skill-card__practice">
            {group.practice.map(p => (
              <li key={p.text}>
                <span>{p.text}</span>
                <span className="skill-card__where">{p.where}</span>
              </li>
            ))}
          </ul>
          <button type="button" className="skill-card__toggle">
            <FlipIcon />
            Back to skills
          </button>
        </div>
      </div>
    </ParticleCard>
  );
}

export default function Stack() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(null);
  const panelsRef = useRef(null);

  // Every skill card is the same size: as tall as the tallest face (front or back) of any card.
  useLayoutEffect(() => {
    const root = panelsRef.current;
    if (!root) return undefined;
    let raf = 0;
    const fit = () => {
      root.style.setProperty('--card-h', '0px');
      let tallest = 0;
      root.querySelectorAll('.skill-card__face').forEach(face => {
        tallest = Math.max(tallest, face.offsetHeight);
      });
      root.style.setProperty('--card-h', `${Math.ceil(tallest)}px`);
    };
    fit();
    let width = root.offsetWidth;
    const ro = new ResizeObserver(() => {
      if (root.offsetWidth === width) return;
      width = root.offsetWidth;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fit);
    });
    ro.observe(root);
    let live = true;
    document.fonts?.ready.then(() => {
      if (!live) return;
      fit();
      ScrollTrigger.refresh();
    });
    return () => {
      live = false;
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  // The diagram only follows the panels where it is pinned beside them (wide screens).
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(min-width: 1000px)', () => {
        const panels = gsap.utils.toArray('.layer-panel');
        panels.forEach((panel, i) => {
          ScrollTrigger.create({
            trigger: panel,
            start: 'top 62%',
            end: 'bottom 62%',
            onToggle: self => {
              if (self.isActive) setActive(panel.dataset.layer);
              else if (i === 0 && self.direction < 0) setActive(null);
            }
          });
        });
        return () => setActive(null);
      });
      return () => mm.revert();
    },
    { scope: panelsRef }
  );

  return (
    <section className="section stack" id="stack" aria-label="Who am I?">
      <div className="container">
        <p className="eyebrow stack__eyebrow">Who am I?</p>

        {reduced ? (
          <h2 className="stack__statement">{profile.summary}</h2>
        ) : (
          <ScrollReveal
            as="h2"
            containerClassName="stack__statement"
            baseOpacity={0.16}
            baseRotation={0}
            blurStrength={3}
            wordAnimationStart="top 88%"
            wordAnimationEnd="bottom 58%"
          >
            {profile.summary}
          </ScrollReveal>
        )}

        {/* Same word-by-word reveal as the statement, set a little later so it picks up as the statement finishes */}
        {reduced ? (
          <p className="stack__detail">{profile.summaryDetail}</p>
        ) : (
          <ScrollReveal
            as="p"
            containerClassName="stack__detail"
            baseOpacity={0.16}
            baseRotation={0}
            blurStrength={2}
            wordAnimationStart="top 70%"
            wordAnimationEnd="bottom 50%"
          >
            {profile.summaryDetail}
          </ScrollReveal>
        )}

        <div className="stack__grid">
          <div className="stack__visual">
            <div className="stack__sticky">
              <StackDiagram active={active} />
            </div>
          </div>

          <div className="stack__panels" ref={panelsRef}>
            <GlobalSpotlight
              sectionRef={panelsRef}
              cardSelector=".skill-card"
              glowColor="232, 236, 239"
              spotlightRadius={320}
              disableAnimations={reduced}
            />
            {layers.map(layer => (
              <article
                key={layer.id}
                className="layer-panel"
                data-layer={layer.id}
                data-active={active === layer.id}
                aria-labelledby={`layer-${layer.id}`}
              >
                <LayerTag id={layer.id} withIndex className="layer-panel__tag" />
                <h3 className="layer-panel__title" id={`layer-${layer.id}`}>
                  {layer.headline}
                </h3>
                <p className="layer-panel__body">{layer.body}</p>
                <div className="layer-panel__skills">
                  {layer.skills.map(group => (
                    <SkillCard key={group.group} group={group} layerId={layer.id} reduced={reduced} />
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
