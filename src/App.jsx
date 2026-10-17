import { useEffect } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { useReducedMotion, useSmoothScroll } from './lib/motion';
import Nav from './components/Nav';
import Intro from './components/Intro';
import Hero from './sections/Hero';
import Stack from './sections/Stack';
import Outcomes from './sections/Outcomes';
import Ribbon from './sections/Ribbon';
import Experience from './sections/Experience';
import Shelf from './sections/Shelf';
import Education from './sections/Education';
import Contact from './sections/Contact';

export default function App() {
  const reduced = useReducedMotion();
  useSmoothScroll(!reduced);

  // Positions shift once the web fonts are in; re-measure every trigger then.
  useEffect(() => {
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Intro />
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Nav />
      <main id="main" tabIndex={-1}>
        <Hero />
        <Stack />
        <Shelf />
        <Outcomes />
        <Ribbon />
        <Experience />
        <Education />
        <Contact />
      </main>
    </>
  );
}
