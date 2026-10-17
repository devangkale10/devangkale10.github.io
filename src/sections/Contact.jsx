import { profile } from '../data/resume';
import { scrollToTarget, useReducedMotion } from '../lib/motion';
import { CopyButton } from '../components/Bits';
import { ArrowUp, ArrowUpRight, ChartIcon, CodeIcon, HeartIcon, PhoneIcon, ProfileIcon } from '../components/Icons';

const LINK_ICONS = { LinkedIn: ProfileIcon, GitHub: CodeIcon, 'Tableau Public': ChartIcon };
import DotGrid from '../components/reactbits/DotGrid';
import Magnet from '../components/reactbits/Magnet';
import './Contact.css';

export default function Contact() {
  const reduced = useReducedMotion();
  const year = new Date().getFullYear();

  return (
    <section className="contact" id="contact" aria-labelledby="contact-title">
      <div className="contact__bg" aria-hidden="true">
        {reduced ? (
          <div className="contact__dots-static" />
        ) : (
          <DotGrid
            dotSize={3}
            gap={21}
            baseColor="#1f2935"
            activeColor="#e06a92"
            proximity={140}
            speedTrigger={90}
            shockRadius={240}
            shockStrength={4}
            resistance={700}
            returnDuration={1.4}
          />
        )}
      </div>

      <div className="contact__inner container">
        <h2 className="contact__title" id="contact-title">
          Let&rsquo;s build something.
        </h2>

        <div className="contact__email-row">
          <a className="contact__email" href={`mailto:${profile.email}`} aria-label={`Email ${profile.email}`}>
            {profile.email}
            <ArrowUpRight className="contact__email-arrow" />
          </a>
          <div className="contact__actions">
            <Magnet padding={40} magnetStrength={6} disabled={reduced}>
              <CopyButton value={profile.email} label="Copy email" className="btn btn--ghost" />
            </Magnet>
            {profile.resumeUrl && (
              <a className="btn btn--ghost" href={profile.resumeUrl} target="_blank" rel="noopener noreferrer">
                Résumé (PDF)
                <ArrowUpRight className="nudge-diag" />
              </a>
            )}
          </div>
        </div>

        <dl className="contact__list">
          {profile.phone && (
            <div className="contact__item">
              <dt className="contact__dt">
                <span className="contact__icon" aria-hidden="true">
                  <PhoneIcon />
                </span>
                <span className="mono-label">Phone</span>
              </dt>
              <dd>
                <span className="contact__value">{profile.phone}</span>
                <CopyButton iconOnly value={profile.phone} label="Copy phone number" className="contact__copy" />
              </dd>
            </div>
          )}
          {profile.links.map(l => {
            const Icon = LINK_ICONS[l.label] || ArrowUpRight;
            return (
            <div className="contact__item" key={l.label}>
              <dt className="contact__dt">
                <span className="contact__icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="mono-label">{l.label}</span>
              </dt>
              <dd>
                <a className="contact__link" href={l.href} target="_blank" rel="noopener noreferrer">
                  <span>{l.handle}</span>
                  <ArrowUpRight />
                </a>
              </dd>
            </div>
            );
          })}
        </dl>
      </div>

      <footer className="footer container">
        <p className="footer__made">
          Made with <HeartIcon className="footer__heart" />
          <span className="sr-only">love</span> by {profile.name}
          <span className="footer__year">© {year}</span>
        </p>
        <button type="button" className="footer__top" onClick={() => scrollToTarget('top')}>
          Back to top
          <ArrowUp />
        </button>
      </footer>
    </section>
  );
}
