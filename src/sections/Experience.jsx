import { useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

import { experience } from '../data/resume';
import { scrollToTarget } from '../lib/motion';
import { useReveal } from '../lib/useReveal';
import { RichText, SectionHead } from '../components/Bits';
import { ArrowUpRight } from '../components/Icons';
import './Experience.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);

function Role({ role }) {
  return (
    <li className="role" id={`role-${role.id}`} data-id={role.id}>
      <header className="role__head" data-reveal>
        <p className="role__when mono-label">
          <span>
            {role.start} – {role.end}
          </span>
          <span className="dot-sep" aria-hidden="true" />
          <span>{role.location}</span>
        </p>
        <h3 className="role__title">{role.title}</h3>
        <p className="role__org">
          {role.linkUnit ? (
            <a className="text-link role__org-link" href={role.url} target="_blank" rel="noopener noreferrer">
              {role.org}
              <span className="role__unit">{role.unit}</span>
              <ArrowUpRight />
            </a>
          ) : (
            <>
              <a className="text-link" href={role.url} target="_blank" rel="noopener noreferrer">
                {role.org}
                <ArrowUpRight />
              </a>
              {role.unit && <span className="role__unit">{role.unit}</span>}
            </>
          )}
        </p>
      </header>

      <ul className="role__bullets">
        {role.bullets.map(b => (
          <li key={b.text} className="role__bullet" data-reveal>
            <p className="role__text">
              <RichText text={b.text} />
            </p>
            <p className="role__skills">
              <span className="sr-only">Skills: </span>
              {b.skills.map((skill, i) => (
                <span key={skill} className="role__skill">
                  {skill}
                  {i < b.skills.length - 1 && <span className="sr-only">, </span>}
                </span>
              ))}
            </p>
          </li>
        ))}
      </ul>
    </li>
  );
}

export default function Experience() {
  const sectionRef = useRef(null);
  const [active, setActive] = useState(experience[0].id);
  useReveal(sectionRef);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(min-width: 1000px)', () => {
        gsap.utils.toArray('.role').forEach(role => {
          ScrollTrigger.create({
            trigger: role,
            start: 'top 50%',
            end: 'bottom 50%',
            onToggle: self => self.isActive && setActive(role.dataset.id)
          });
        });
        gsap.fromTo(
          '.timeline__fill',
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: 'none',
            scrollTrigger: { trigger: '.roles', start: 'top 50%', end: 'bottom 50%', scrub: true }
          }
        );
      });
      return () => mm.revert();
    },
    { scope: sectionRef }
  );

  return (
    <section className="section experience" id="experience" aria-labelledby="experience-title" ref={sectionRef}>
      <div className="container">
        <SectionHead
          id="experience-title"
          eyebrow={`${experience[experience.length - 1].start} – ${experience[0].end}`}
          title="Experience"
        />

        <div className="experience__grid">
          <nav className="timeline" aria-label="Roles">
            <div className="timeline__track" aria-hidden="true">
              <div className="timeline__fill" />
            </div>
            <ol>
              {experience.map(role => (
                <li key={role.id} data-active={active === role.id}>
                  <a
                    href={`#role-${role.id}`}
                    aria-current={active === role.id ? 'true' : undefined}
                    onClick={e => {
                      e.preventDefault();
                      scrollToTarget(`role-${role.id}`);
                    }}
                  >
                    <span className="timeline__dot" aria-hidden="true" />
                    <span className="timeline__when mono-label">
                      {role.start} – {role.end}
                    </span>
                    <span className="timeline__org">{role.org}</span>
                    <span className="timeline__title">{role.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <ol className="roles">
            {experience.map(role => (
              <Role key={role.id} role={role} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
