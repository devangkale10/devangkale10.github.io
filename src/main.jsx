import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import 'lenis/dist/lenis.css';
import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';

import App from './App.jsx';
import { introWillPlay } from './lib/intro';

// Hold the hero's entrance until the opening intro has played; without the intro, drop its veil.
if (introWillPlay()) document.documentElement.classList.add('is-intro');
else document.getElementById('intro-veil')?.remove();

// Start downloading the 3D code (three.js and the shelf) now, before the first render, rather than
// when the hero and shelf mount. Later imports of the same modules reuse these requests.
// (A failure here is handled where they are used.)
import('three').catch(() => {});
import('./shelf/ShelfScene.js').catch(() => {});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
