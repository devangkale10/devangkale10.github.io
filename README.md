# Devang Kale — portfolio

A one-page portfolio built from Devang's resume. Every fact on the page lives in
[`src/data/resume.js`](src/data/resume.js), so updating the site means editing that one file.

## Stack

| Piece | Used for |
| --- | --- |
| React 19 + Vite | App and build |
| [Lenis](https://github.com/darkroomengineering/lenis) | Smooth scrolling, driven by GSAP's ticker |
| [GSAP](https://gsap.com) (ScrollTrigger, SplitText, InertiaPlugin) | Scroll scenes, the stack diagram, timeline progress, reveals |
| [Vanta](https://www.vantajs.com) FOG + three.js | The hero field, shown through a CSS dot-matrix mask |
| three.js | The Selected work shelf: nine clothbound volumes you can take down, open and read |
| [React Bits](https://reactbits.dev) | SplitText, RotatingText, ScrollReveal, CountUp, ScrollVelocity, SpotlightCard, Magnet, DotGrid, MagicBento (skill cards) |
| Canvas 2D | The hero's 3D point cloud: live k-means (k = 3) you can rotate, poke and re-run |
| Motion | Used by the React Bits text components |
| Funnel Display / Funnel Sans, Martian Mono, Doto | Self-hosted fonts (SIL OFL) in `src/assets/fonts` |

## Run it

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # static site in dist/
npm run preview   # serve dist/ locally
```

Node 20.19+ is required (Vite 8).

## Deploy

`dist/` is a static site with relative paths, so it works on any static host:

- **Vercel / Netlify:** import the repo; build command `npm run build`, output directory `dist`.
- **GitHub Pages:** the included workflow (`.github/workflows/deploy.yml`) builds and publishes on every push to
  `main`. Name the repository `devangkale10.github.io` for the address `https://devangkale10.github.io/` (any other
  name serves at `https://devangkale10.github.io/<name>/`, which also works), then set Settings → Pages → Source to
  "GitHub Actions".

## Editing content

- **Text and numbers:** `src/data/resume.js`. Wrap a figure in `**double asterisks**` to highlight it.
- **Skill cards:** each skill group's `practice` list is what the card shows when flipped.
- **The shelf:** `volumes` (end of `resume.js`) lists one book per piece of work. Its `paragraphs` are the resume
  bullets themselves; `title`, `subtitle`, `metric`, `tools` and `plate` (the caption on the plate page) must stay
  traceable to them. `binding` sets the cloth and foil colors, `motif` picks the cover drawing, `size` the proportions.
- **Experience notes:** each bullet's `skills` array is the short tool note shown beside it.
- **Résumé button:** put a PDF in `public/` and set `profile.resumeUrl` (for example `'/Devang-Kale-Resume.pdf'`).
- **Phone number:** shown in the contact section because it is on the resume. Delete `phone` from `profile` to hide it.
- **Colors and type:** `src/styles/tokens.css`. The three layer colors (Move, Explain, Act) were checked as a
  categorical set for color-vision deficiencies and contrast on the dark background.

## Structure

```
src/
  data/resume.js          all content
  sections/               Hero, Stack, Outcomes, Ribbon, Experience, Shelf (selected work), Education, Contact
  shelf/                  the 3D shelf: art.js (covers, spines, pages, drawn on canvas), book.js (the hardcover
                          model and page curl), ShelfScene.js (scene, picking, transitions), theme.js (reading colors)
  components/             Nav, VantaField (hero background), ClusterField (hero point cloud), shared bits, icons
  components/reactbits/   React Bits sources (see the README there for local changes)
  lib/motion.js           Lenis + GSAP wiring, reduced-motion hook, active-section hook
  lib/useReveal.js        scroll-in reveals
  styles/                 fonts, tokens, base styles
```

## The intro

`src/components/Intro.jsx` plays once on arrival: a data point splits into the three layers, a dot field spreads
while the page loads (fonts and assets, waiting at most a moment longer), then an aperture opens onto the site as it
comes into focus. The status line under the percentage (cleaning the data…, almost there…, ok, it's clean.) is
paced so each can be read. Any click, key or scroll skips ahead, and with reduced motion there is no intro. The hero waits for it (`src/lib/intro.js`) before playing its own entrance.

## Accessibility and performance

- `prefers-reduced-motion` turns off smooth scrolling, the WebGL field, counters, marquee and reveals; all text is
  present without animation.
- three.js and Vanta load after first paint as a separate chunk; the hero shows a static dot field until then.
- Canvas and WebGL animations pause while off screen. The shelf renders only when something moves.
- The shelf loads shortly after the intro (or as soon as it is within two screens) and builds a few milliseconds'
  worth of books per frame, so it is standing before anyone scrolls to it. The hero field, the tool band and the
  shelf all stop their loops while off screen. Every control
  is an HTML button (previous, open, next, a marker per volume, page buttons), arrow keys work, Escape closes the
  reading view, focus stays inside it, and changes are announced. Without WebGL it becomes a plain list.

## The shelf

Selected work is an original three.js scene (it takes the idea of the
[Complete Shelf](https://github.com/mengto/complete-shelf) experience, which has no license, so none of its code
or art is used). Each volume is a separate back board, spine, page block, headbands and a hinged front board.
Cloth, foil, paper, page edges and walnut are drawn procedurally; the foil is written into a
roughness/metalness map so it catches the light, and the cloth weave is flattened under it.

- **Browse:** swipe sideways on a trackpad (the shelf follows your fingers and settles on a book), drag, or use
  the arrow buttons, markers or keys.
  Vertical scrolling always scrolls the page.
- **Read:** click a book (or Open volume). It leaves the shelf at its exact pose, the shelf recedes behind a veil
  in the book's color, and the book lands beside a panel with the same content as HTML. Hover the cover to crack it,
  click or drag to open it, drag pages either way, drag beside the book to tilt it and scroll to zoom.
- **Back:** Escape, Back to the shelf, or Next on the last page. An open book closes from the back, the way you
  close a book you have finished: the unread half folds over the pages already read. It then turns round on the way
  home and lands in its slot at its exact local pose. A closed book flies straight back.
