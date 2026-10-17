import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works from any folder or subpath (GitHub Pages, Netlify, Vercel...).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    // three.js (used by the Vanta background) is loaded as its own chunk after first paint.
    chunkSizeWarningLimit: 900
  }
});
