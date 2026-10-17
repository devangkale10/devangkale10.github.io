/* Small inline icons. Arrows are drawn rather than typed so they match at every size. */

const base = {
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false
};

export const ArrowUpRight = props => (
  <svg {...base} {...props}>
    <path d="M7 17 17 7" />
    <path d="M8 7h9v9" />
  </svg>
);

export const ArrowRight = props => (
  <svg {...base} {...props}>
    <path d="M4 12h16" />
    <path d="m14 6 6 6-6 6" />
  </svg>
);

export const ArrowLeft = props => (
  <svg {...base} {...props}>
    <path d="M20 12H4" />
    <path d="m10 6-6 6 6 6" />
  </svg>
);

export const ChevronLeft = props => (
  <svg {...base} {...props}>
    <path d="m14.5 6-6 6 6 6" />
  </svg>
);

export const ChevronRight = props => (
  <svg {...base} {...props}>
    <path d="m9.5 6 6 6-6 6" />
  </svg>
);

export const ArrowDown = props => (
  <svg {...base} {...props}>
    <path d="M12 4v16" />
    <path d="m6 14 6 6 6-6" />
  </svg>
);

export const ArrowUp = props => (
  <svg {...base} {...props}>
    <path d="M12 20V4" />
    <path d="m6 10 6-6 6 6" />
  </svg>
);

export const CopyIcon = props => (
  <svg {...base} {...props}>
    <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
    <path d="M15.5 5.5v-.25A1.75 1.75 0 0 0 13.75 3.5h-8.5A1.75 1.75 0 0 0 3.5 5.25v8.5c0 .97.78 1.75 1.75 1.75h.25" />
  </svg>
);

export const CheckIcon = props => (
  <svg {...base} {...props}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

/* Contact icons: simple symbols for each channel (not the services' own logos) */
export const PhoneIcon = props => (
  <svg {...base} {...props}>
    <path d="M6.6 3.5h2.6l1.4 4.1-2 1.4a12 12 0 0 0 6.4 6.4l1.4-2 4.1 1.4v2.6a2.1 2.1 0 0 1-2.3 2.1A16.6 16.6 0 0 1 4.5 5.8 2.1 2.1 0 0 1 6.6 3.5Z" />
  </svg>
);

export const ProfileIcon = props => (
  <svg {...base} {...props}>
    <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
    <circle cx="9" cy="10.5" r="2.2" />
    <path d="M5.8 16.2c.6-1.7 1.8-2.6 3.2-2.6s2.6.9 3.2 2.6" />
    <path d="M14.5 10h3.5M14.5 13.5h3.5" />
  </svg>
);

export const CodeIcon = props => (
  <svg {...base} {...props}>
    <path d="m8.5 7.5-4.5 4.5 4.5 4.5" />
    <path d="m15.5 7.5 4.5 4.5-4.5 4.5" />
    <path d="m13.5 5-3 14" />
  </svg>
);

export const ChartIcon = props => (
  <svg {...base} {...props}>
    <path d="M4 20h16" />
    <path d="M7 16.5V11M12 16.5V6.5M17 16.5v-4" />
  </svg>
);

export const HeartIcon = props => (
  <svg {...base} fill="currentColor" stroke="none" {...props}>
    <path d="M12 20.3s-7.6-4.6-9.2-9.4C1.7 7.5 3.8 4.2 7.2 4.2c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.4 0 5.5 3.3 4.4 6.7-1.6 4.8-9.2 9.4-9.2 9.4Z" />
  </svg>
);
