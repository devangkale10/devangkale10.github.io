/*
 * Colours for the reading view, taken from a book's cloth: a dark ground that keeps the
 * cloth's hue (light text stays well above 4.5:1 on it) and a softer pool of light behind
 * the book. Plain JS so the page can use it without loading three.js.
 */

function toHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

function toHex(h, s, l) {
  const f = n => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function themeFor(binding) {
  const [h, s] = toHsl(binding.cloth);
  return {
    tint: toHex(h, Math.min(0.42, s * 0.62), 0.105),
    glow: toHex(h, Math.min(0.5, s * 0.7), 0.3),
    panel: toHex(h, Math.min(0.36, s * 0.5), 0.135),
    accent: toHex(h, Math.min(0.6, Math.max(0.3, s * 0.85)), 0.72)
  };
}

export const SHELF_BG = '#0b0e12';
