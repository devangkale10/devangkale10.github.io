import { useRef } from 'react';

import { education } from '../data/resume';
import { useReveal } from '../lib/useReveal';
import { SectionHead } from '../components/Bits';
import './Education.css';

export default function Education() {
  const ref = useRef(null);
  useReveal(ref);
  const span = `${education[education.length - 1].start.slice(-4)} – ${education[0].end.slice(-4)}`;

  return (
    <section className="section education" id="education" aria-labelledby="education-title" ref={ref}>
      <div className="container">
        <SectionHead id="education-title" eyebrow={span} title="Education" />
        <ul className="edu">
          {education.map(e => (
            <li key={e.degree} className="edu__item" data-reveal>
              <p className="edu__when mono-label">
                {e.start} – {e.end}
              </p>
              <div className="edu__main">
                <h3 className="edu__degree">{e.degree}</h3>
                <p className="edu__school">
                  {e.school}, {e.place}
                </p>
              </div>
              <p className="edu__gpa">
                <span className="mono-label">GPA</span>
                <span className="edu__gpa-value">{e.gpa}</span>
                <span className="edu__gpa-scale">/ {e.scale}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
