# React Bits components

Source: https://github.com/DavidHDev/react-bits (JS + CSS variants), MIT + Commons Clause — see LICENSE.md.

Used as-is: SplitText, RotatingText, CountUp, ScrollVelocity, Magnet, SpotlightCard (JSX).

Adapted for this site:
- MagicBentoParts — `ParticleCard` and `GlobalSpotlight` from MagicBento, exported on their own, colored per card,
  and the spotlight fades when the page scrolls away under a still mouse. Used for the skill cards.
- ScrollReveal — scoped GSAP cleanup, configurable tag and start position.
- DotGrid — pauses its draw loop while off screen, `interactive` prop, starts with no hover highlight.
- SpotlightCard.css, ScrollVelocity.css — demo colors/fonts replaced by the site's tokens.
- ScrollVelocity — the band only moves while it is on (or near) the screen.
