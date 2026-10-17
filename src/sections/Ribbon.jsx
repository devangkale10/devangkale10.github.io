import { ribbon } from '../data/resume';
import { useReducedMotion } from '../lib/motion';
import ScrollVelocity from '../components/reactbits/ScrollVelocity';
import './Ribbon.css';

/* A decorative band of tool names; it speeds up with scroll velocity. The same skills are listed in full above. */
export default function Ribbon() {
  const reduced = useReducedMotion();
  if (reduced) return null;

  return (
    <div className="ribbon-wrap">
      <p className="eyebrow container ribbon__label">Tools I reach for</p>
      <div className="ribbon" aria-hidden="true">
      <ScrollVelocity
        texts={ribbon.map(row => row.join(' · '))}
        velocity={32}
        numCopies={4}
        className="ribbon__text"
        parallaxClassName="ribbon__row"
        scrollerClassName="ribbon__scroller"
      />
      </div>
    </div>
  );
}
