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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
