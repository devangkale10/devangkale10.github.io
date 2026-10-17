import { useRef } from 'react';

import { outcomes } from '../data/resume';
import { useReducedMotion } from '../lib/motion';
import { useReveal } from '../lib/useReveal';
import { SectionHead } from '../components/Bits';
import CountUp from '../components/reactbits/CountUp';
import SpotlightCard from '../components/reactbits/SpotlightCard';
import './Outcomes.css';

const SPOTLIGHT = {
  move: 'rgba(58, 159, 212, 0.22)',
  explain: 'rgba(191, 132, 32, 0.22)',
  act: 'rgba(217, 84, 123, 0.22)'
};

export default function Outcomes() {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  useReveal(ref);

  return (
    <section className="section outcomes" id="outcomes" aria-labelledby="outcomes-title" ref={ref}>
      <div className="container">
        <SectionHead id="outcomes-title" title="Selected results" />

        <ul className="outcomes__grid">
          {outcomes.map(o => {
            const spoken = `${o.prefix ?? ''}${o.value}${o.suffix ?? ''}${o.unit ? ` ${o.unit}` : ''}`;
            return (
              <li key={o.label} data-reveal>
                <SpotlightCard className="tile" spotlightColor={SPOTLIGHT[o.layer]}>
                  <p className="tile__value">
                    <span className="sr-only">{spoken}</span>
                    <span className="tile__num" aria-hidden="true">
                      {o.prefix}
                      {reduced ? o.value : <CountUp from={o.from ?? 0} to={o.value} duration={2.4} />}
                      {o.suffix && <span className="pct">{o.suffix}</span>}
                    </span>
                    {o.unit && (
                      <span className="tile__unit" aria-hidden="true">
                        {o.unit}
                      </span>
                    )}
                  </p>
                  <p className="tile__label">
                    {o.label}
                    {o.delta && <span className="tile__delta">{o.delta}</span>}
                  </p>
                  <p className="tile__context">{o.context}</p>
                </SpotlightCard>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
