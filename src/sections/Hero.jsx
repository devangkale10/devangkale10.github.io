import { useEffect, useRef, useState } from 'react';

import { layers, profile } from '../data/resume';
import { scrollToTarget, useReducedMotion } from '../lib/motion';
import { useIntroDone } from '../lib/intro';
import VantaField from '../components/VantaField';
import ClusterField from '../components/ClusterField';
import { ArrowRight, ArrowUpRight } from '../components/Icons';
import SplitText from '../components/reactbits/SplitText';
import RotatingText from '../components/reactbits/RotatingText';
import Magnet from '../components/reactbits/Magnet';
import './Hero.css';

const firstName = profile.name.split(' ')[0];

export default function Hero() {
  const reduced = useReducedMotion();
  const introDone = useIntroDone();
  const [index, setIndex] = useState(0);
  const layer = layers[index];
  const sectionRef = useRef(null);
  const nameRef = useRef(null);

  // Keep the cloud above the name: its box stops a little below the name's top edge.
  useEffect(() => {
    const section = sectionRef.current;
    const name = nameRef.current;
    if (!section || !name) return undefined;
    const measure = () => {
      const s = section.getBoundingClientRect();
      const n = name.getBoundingClientRect();
      section.style.setProperty('--viz-bottom', `${Math.max(0, s.bottom - n.top - 70)}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(section);
    ro.observe(name);
    return () => ro.disconnect();
  }, []);

  return (
    <section className="hero" id="top" aria-labelledby="hero-name" ref={sectionRef}>
      <VantaField />

      <div className="hero__viz" data-hero-in style={{ '--i': 1 }}>
        <ClusterField focus={reduced ? null : index} />
      </div>

      <div className="hero__inner container">
        <h1 className="hero__name" id="hero-name" ref={nameRef}>
          <span className="hero__hello" data-hero-in style={{ '--i': 0 }}>
            Hi, I&rsquo;m
          </span>{' '}
          {reduced ? (
            firstName
          ) : !introDone ? (
            // Same text, held invisible until the intro opens onto it
            <span className="hero__name-text" style={{ opacity: 0 }}>
              {firstName}
            </span>
          ) : (
            <SplitText
              tag="span"
              text={firstName}
              className="hero__name-text"
              textAlign="left"
              splitType="chars"
              delay={34}
              duration={1.15}
              ease="expo.out"
              from={{ opacity: 0, yPercent: 70 }}
              to={{ opacity: 1, yPercent: 0 }}
              threshold={0}
              rootMargin="0px"
            />
          )}
        </h1>
        <p className="hero__role" data-hero-in style={{ '--i': 0 }}>
          {profile.role}
        </p>

        <div className="hero__row">
          <div className="hero__lead">
            <p className="hero__tagline" data-hero-in style={{ '--i': 1 }}>
              {reduced ? (
                <>
                  I build {layers[0].phrase}, {layers[1].phrase}, and {layers[2].phrase}.
                </>
              ) : (
                <>
                  <span className="hero__tagline-lead">I build</span>{' '}
                  <span className="hero__rotator" data-layer={layer.id}>
                    <span className="layer-dot" aria-hidden="true" />
                    <RotatingText
                      texts={layers.map(l => l.phrase)}
                      onNext={setIndex}
                      rotationInterval={2800}
                      splitBy="characters"
                      staggerDuration={0.014}
                      staggerFrom="first"
                      initial={{ y: '105%', opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: '-110%', opacity: 0, transition: { duration: 0.24, ease: [0.4, 0, 1, 1] } }}
                      transition={{ type: 'spring', damping: 30, stiffness: 380 }}
                      animatePresenceMode="wait"
                      mainClassName="hero__rotating"
                      splitLevelClassName="hero__rotating-word"
                    />
                  </span>
                </>
              )}
            </p>

            <div className="hero__actions" data-hero-in style={{ '--i': 2 }}>
              <Magnet padding={50} magnetStrength={5} disabled={reduced}>
                <a
                  className="btn btn--solid"
                  href="#contact"
                  onClick={e => {
                    e.preventDefault();
                    scrollToTarget('contact');
                  }}
                >
                  Get in touch
                  <ArrowRight className="nudge-right" />
                </a>
              </Magnet>
              {profile.resumeUrl && (
                <a className="text-link" href={profile.resumeUrl} target="_blank" rel="noopener noreferrer">
                  Résumé (PDF)
                  <ArrowUpRight />
                </a>
              )}
            </div>
          </div>

          <aside className="hero__now" data-hero-in style={{ '--i': 3 }} aria-label="Current role">
            <span className="mono-label hero__now-label">
              <span className="pulse" aria-hidden="true" />
              Now
            </span>
            <p>
              <strong>{profile.current.title}</strong>, {profile.current.org}
              <span className="hero__now-sub">{profile.current.unit}</span>
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}
