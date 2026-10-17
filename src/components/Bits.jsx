import { useEffect, useRef, useState } from 'react';
import { layerById } from '../data/resume';
import { CheckIcon, CopyIcon } from './Icons';

/** Renders resume text, turning **figures** into highlighted spans. */
export function RichText({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') ? (
      <strong key={i} className="fig">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    )
  );
}

/** Colored dot plus the layer's name, so the color never carries meaning alone. */
export function LayerTag({ id, withIndex = false, className = '' }) {
  const layer = layerById[id];
  if (!layer) return null;
  return (
    <span className={`layer-tag ${className}`} data-layer={id}>
      <span className="layer-dot" aria-hidden="true" />
      {withIndex && <span className="layer-tag__index">{layer.index}</span>}
      {layer.name}
    </span>
  );
}

/** Copies a value; falls back to a hidden textarea where the Clipboard API is refused. */
export function CopyButton({ value, label = 'Copy', copiedLabel = 'Copied', className = '', iconOnly = false }) {
  const [state, setState] = useState('idle');
  const timer = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  const settle = next => {
    setState(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 2200);
  };

  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    Object.assign(ta.style, { position: 'fixed', top: '0', left: '0', opacity: '0' });
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    settle(ok ? 'copied' : 'failed');
  };

  const onClick = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(value).then(() => settle('copied'), fallback);
    } else {
      fallback();
    }
  };

  const text = state === 'copied' ? copiedLabel : state === 'failed' ? 'Select the text to copy' : label;

  return (
    <button
      type="button"
      className={`copy-btn ${className}`}
      data-state={state}
      onClick={onClick}
      aria-label={iconOnly ? `${label} ${value}` : undefined}
    >
      {state === 'copied' ? <CheckIcon /> : <CopyIcon />}
      {!iconOnly && <span>{text}</span>}
      <span className="sr-only" aria-live="polite">
        {state === 'copied' ? `${value} copied to clipboard` : ''}
      </span>
    </button>
  );
}

/** Section heading block: small mono eyebrow, then the display heading. */
export function SectionHead({ eyebrow, title, aside, id }) {
  return (
    <header className="section-head">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="section-title" id={id}>
        {title}
      </h2>
      {aside && <div className="section-head__aside">{aside}</div>}
    </header>
  );
}
