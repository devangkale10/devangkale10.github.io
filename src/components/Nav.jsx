import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

import { profile } from '../data/resume';
import { prefersReducedMotion, scrollToTarget, startScroll, stopScroll, useActiveSection } from '../lib/motion';
import { ArrowUpRight } from './Icons';
import './Nav.css';

const LINKS = [
  { id: 'stack', label: 'Who am I?' },
  { id: 'work', label: 'Work' },
  { id: 'outcomes', label: 'Results' },
  { id: 'experience', label: 'Experience' },
  { id: 'education', label: 'Education' }
];

const SECTION_IDS = [...LINKS.map(l => l.id), 'contact'];

export default function Nav() {
  const active = useActiveSection(SECTION_IDS);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Mobile menu: lock scrolling, animate the links in, close on Escape.
  useEffect(() => {
    if (!open) return undefined;
    stopScroll();
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = 'hidden';

    const items = menuRef.current?.querySelectorAll('[data-menu-item]');
    if (items && !prefersReducedMotion()) {
      gsap.fromTo(
        items,
        { yPercent: 60, autoAlpha: 0 },
        { yPercent: 0, autoAlpha: 1, duration: 0.7, ease: 'expo.out', stagger: 0.05 }
      );
    }
    menuRef.current?.querySelector('a')?.focus();

    const onKey = e => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      root.style.overflow = prev;
      startScroll();
      buttonRef.current?.focus({ preventScroll: true });
    };
  }, [open]);

  const go = (event, id) => {
    event.preventDefault();
    setOpen(false);
    // Let the menu close (and scrolling unlock) before moving.
    requestAnimationFrame(() => scrollToTarget(id));
  };

  return (
    <header className="nav" data-scrolled={scrolled || open} data-open={open}>
      <div className="nav__bar container">
        <a href="#top" className="nav__brand" onClick={e => go(e, 'top')} aria-label="Devang Kale, back to top">
          <span className="nav__mono" aria-hidden="true">
            D<i>/</i>K
          </span>
        </a>

        <nav className="nav__links" aria-label="Sections">
          {LINKS.map(link => (
            <a
              key={link.id}
              href={`#${link.id}`}
              aria-current={active === link.id ? 'location' : undefined}
              onClick={e => go(e, link.id)}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <a href="#contact" className="btn btn--solid nav__cta" onClick={e => go(e, 'contact')}>
          Contact
        </a>

        <button
          ref={buttonRef}
          type="button"
          className="nav__menu-btn"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen(o => !o)}
        >
          <span className="nav__menu-icon" aria-hidden="true">
            <i />
            <i />
          </span>
          {open ? 'Close' : 'Menu'}
        </button>
      </div>

      <div id="mobile-menu" className="menu" ref={menuRef} hidden={!open}>
        <nav className="menu__links container" aria-label="Sections">
          {[...LINKS, { id: 'contact', label: 'Contact' }].map(link => (
            <a key={link.id} href={`#${link.id}`} data-menu-item onClick={e => go(e, link.id)}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="menu__foot container" data-menu-item>
          <span className="menu__email">{profile.email}</span>
          <div className="menu__social">
            {profile.links.map(l => (
              <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="text-link">
                {l.label}
                <ArrowUpRight />
              </a>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
