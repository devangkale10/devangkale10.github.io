import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

import { profile } from '../data/resume';
import { useReducedMotion } from '../lib/motion';
import './Demos.css';

gsap.registerPlugin(useGSAP);

/* An illustration of the redaction flow, run on the contact line from this resume. */
const SEGMENTS = [
  { text: 'Contact ' },
  { text: profile.name, type: 'PERSON' },
  { text: ' in ' },
  { text: 'Gainesville, FL', type: 'LOCATION' },
  { text: ' at ' },
  { text: profile.email, type: 'EMAIL' },
  ...(profile.phone ? [{ text: ' or ' }, { text: profile.phone, type: 'PHONE' }] : []),
  { text: '.' }
];

const FOUND = SEGMENTS.filter(s => s.type).length;

export default function PiiDemo() {
  const root = useRef(null);
  const status = useRef(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      if (reduced) return;
      const ents = gsap.utils.toArray('.ent');
      const labels = gsap.utils.toArray('.ent__label');
      const bars = gsap.utils.toArray('.ent__bar');
      const say = text => () => {
        if (status.current) status.current.textContent = text;
      };

      gsap.set(labels, { autoAlpha: 0, y: 4 });
      gsap.set(bars, { scaleX: 0, transformOrigin: 'left center' });

      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.5, paused: true });
      tl.call(say('scanning…'))
        .fromTo('.pii__scan', { left: '0%', autoAlpha: 0 }, { left: '100%', autoAlpha: 1, duration: 1.3, ease: 'power1.inOut' })
        .to('.pii__scan', { autoAlpha: 0, duration: 0.2 })
        .to(ents, { '--hl': 1, duration: 0.35, stagger: 0.22, ease: 'power2.out' }, '-=1.1')
        .to(labels, { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.22, ease: 'power2.out' }, '<')
        .call(say(`${FOUND} entities found`))
        .to(bars, { scaleX: 1, duration: 0.5, stagger: 0.14, ease: 'power3.inOut' }, '+=0.8')
        .call(say(`${FOUND} entities redacted`))
        .to({}, { duration: 1.8 })
        .set(bars, { transformOrigin: 'right center' })
        .to(bars, { scaleX: 0, duration: 0.45, stagger: 0.06, ease: 'power3.inOut' })
        .to(labels, { autoAlpha: 0, duration: 0.3 }, '<')
        .to(ents, { '--hl': 0, duration: 0.3 }, '<')
        .set(bars, { transformOrigin: 'left center' });

      // An IntersectionObserver also sees scrolling inside the reading panel, not just the page.
      const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? tl.play() : tl.pause()));
      io.observe(root.current);
      return () => io.disconnect();
    },
    { scope: root, dependencies: [reduced] }
  );

  return (
    <div className="pii" ref={root} data-static={reduced}>
      <div className="demo-bar">
        <span className="demo-bar__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="mono-label">redact · illustration</span>
      </div>
      <p className="pii__text">
        {SEGMENTS.map((s, i) =>
          s.type ? (
            <span key={i} className="ent" data-type={s.type}>
              <span className="ent__label" aria-hidden="true">
                {s.type}
              </span>
              {s.text}
              <span className="ent__bar" aria-hidden="true" />
            </span>
          ) : (
            <span key={i}>{s.text}</span>
          )
        )}
        <span className="pii__scan" aria-hidden="true" />
      </p>
      <div className="pii__foot mono-label">
        <span>spaCy NER · Transformers · regex</span>
        <span ref={status} className="pii__status">
          {reduced ? `${FOUND} entities found` : 'ready'}
        </span>
      </div>
    </div>
  );
}
