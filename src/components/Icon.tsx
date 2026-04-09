/**
 * Lightweight custom SVG icon system — replaces @expo/vector-icons
 * Feather-style line icons, 24×24 viewBox, stroke-rendered.
 * Works in Expo web export (React Native Web → DOM).
 * Native fallback: transparent placeholder View.
 */

import React from 'react';
import { View, Platform } from 'react-native';

// Each icon is an array of SVG element descriptors
type PathEl     = { t: 'path'; d: string; fill?: string };
type CircleEl   = { t: 'circle'; cx: number; cy: number; r: number };
type LineEl     = { t: 'line'; x1: number; y1: number; x2: number; y2: number };
type PolylineEl = { t: 'polyline'; points: string };
type PolygonEl  = { t: 'polygon'; points: string };
type RectEl     = { t: 'rect'; x: number; y: number; w: number; h: number; rx?: number };

type El = PathEl | CircleEl | LineEl | PolylineEl | PolygonEl | RectEl;

const p = (d: string, fill?: string): PathEl     => ({ t: 'path', d, ...(fill ? { fill } : {}) });
const c = (cx: number, cy: number, r: number): CircleEl => ({ t: 'circle', cx, cy, r });
const l = (x1: number, y1: number, x2: number, y2: number): LineEl => ({ t: 'line', x1, y1, x2, y2 });
const pl = (points: string): PolylineEl => ({ t: 'polyline', points });
const pg = (points: string): PolygonEl  => ({ t: 'polygon', points });
const r = (x: number, y: number, w: number, h: number, rx?: number): RectEl => ({ t: 'rect', x, y, w, h, ...(rx !== undefined ? { rx } : {}) });

// ── Icon definitions ──────────────────────────────────────────────────────────
const ICONS: Record<string, El[]> = {
  // Navigation
  'home': [
    p('M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'),
    p('M9 22V12h6v10'),
  ],
  'grid': [
    r(3, 3, 7, 7),
    r(14, 3, 7, 7),
    r(14, 14, 7, 7),
    r(3, 14, 7, 7),
  ],
  'star': [
    p('M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'),
  ],
  'shield': [
    p('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'),
  ],

  // Search & filters
  'search': [
    c(11, 11, 8),
    l(21, 21, 16.65, 16.65),
  ],
  'sliders': [
    l(4, 21, 4, 14),
    l(4, 10, 4, 3),
    l(12, 21, 12, 12),
    l(12, 8, 12, 3),
    l(20, 21, 20, 16),
    l(20, 12, 20, 3),
    l(1, 14, 7, 14),
    l(9, 8, 15, 8),
    l(17, 16, 23, 16),
  ],
  'x': [
    l(18, 6, 6, 18),
    l(6, 6, 18, 18),
  ],

  // Chevrons & arrows
  'chevron-down': [pl('6 9 12 15 18 9')],
  'chevron-up':   [pl('18 15 12 9 6 15')],
  'chevron-right':[pl('9 18 15 12 9 6')],
  'arrow-right': [
    l(5, 12, 19, 12),
    pl('12 5 19 12 12 19'),
  ],
  'arrow-up-right': [
    p('M7 17L17 7'),
    p('M7 7h10v10'),
  ],

  // Actions
  'edit-2': [
    p('M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z'),
  ],
  'external-link': [
    p('M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'),
    pl('15 3 21 3 21 9'),
    l(10, 14, 21, 3),
  ],

  // Location & property
  'map-pin': [
    p('M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z'),
    c(12, 10, 3),
  ],
  'droplet': [
    p('M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z'),
  ],

  // Data & charts
  'layers': [
    p('M12 2L2 7l10 5 10-5-10-5z'),
    p('M2 17l10 5 10-5'),
    p('M2 12l10 5 10-5'),
  ],
  'trending-up': [
    pl('23 6 13.5 15.5 8.5 10.5 1 18'),
    pl('17 6 23 6 23 12'),
  ],
  'trending-down': [
    pl('23 18 13.5 8.5 8.5 13.5 1 6'),
    pl('17 18 23 18 23 12'),
  ],
  'bar-chart-2': [
    l(18, 20, 18, 10),
    l(12, 20, 12, 4),
    l(6, 20, 6, 14),
  ],
  'database': [
    p('M 4 6 a 8 3 0 1 0 16 0 a 8 3 0 1 0 -16 0'),
    p('M4 6v6a8 3 0 0 0 16 0V6'),
    p('M4 12v6a8 3 0 0 0 16 0v-6'),
  ],
  'check-circle': [
    p('M22 11.08V12a10 10 0 1 1-5.93-9.14'),
    pl('22 4 12 14.01 9 11.01'),
  ],

  // Communication
  'message-circle': [
    p('M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z'),
  ],
  'message-square': [
    p('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'),
  ],

  // People
  'users': [
    p('M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'),
    c(9, 7, 4),
    p('M23 21v-2a4 4 0 0 0-3-3.87'),
    p('M16 3.13a4 4 0 0 1 0 7.75'),
  ],
  'user': [
    p('M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'),
    c(12, 7, 4),
  ],

  // Documents & info
  'file-text': [
    p('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'),
    pl('14 2 14 8 20 8'),
    l(16, 13, 8, 13),
    l(16, 17, 8, 17),
    l(10, 9, 8, 9),
  ],
  'info': [
    c(12, 12, 10),
    l(12, 8, 12, 8),
    l(12, 12, 12, 16),
  ],
  'lock': [
    r(3, 11, 18, 11, 2),
    p('M7 11V7a5 5 0 0 1 10 0v4'),
  ],

  // Misc
  'award': [
    c(12, 8, 6),
    p('M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32'),
  ],
  'zap': [
    pg('13 2 3 14 12 14 11 22 21 10 12 10 13 2'),
  ],
  'building': [
    p('M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'),
    l(9, 22, 9, 12),
    l(15, 12, 15, 22),
  ],
  'check': [
    pl('20 6 9 17 4 12'),
  ],
  'clock': [
    c(12, 12, 10),
    pl('12 6 12 12 16 14'),
  ],
};

// ── Renderer ─────────────────────────────────────────────────────────────────

function toSVGEl(el: El, i: number, color: string): React.ReactElement {
  const sharedStroke = {
    fill: 'none',
    stroke: color,
    strokeWidth: '2',
    strokeLinecap: 'round' as any,
    strokeLinejoin: 'round' as any,
    key: i,
  };

  switch (el.t) {
    case 'path':
      return React.createElement('path', { ...sharedStroke, d: el.d, fill: el.fill ?? 'none' });
    case 'circle':
      return React.createElement('circle', { ...sharedStroke, cx: el.cx, cy: el.cy, r: el.r });
    case 'line':
      return React.createElement('line', { ...sharedStroke, x1: el.x1, y1: el.y1, x2: el.x2, y2: el.y2 });
    case 'polyline':
      return React.createElement('polyline', { ...sharedStroke, points: el.points });
    case 'polygon':
      return React.createElement('polygon', { ...sharedStroke, points: el.points });
    case 'rect':
      return React.createElement('rect', {
        ...sharedStroke,
        x: el.x, y: el.y, width: el.w, height: el.h,
        ...(el.rx !== undefined ? { rx: el.rx } : {}),
      });
  }
}

// ── Public component ──────────────────────────────────────────────────────────

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

export default function Icon({ name, size = 24, color = '#000', style }: IconProps) {
  const els = ICONS[name];

  if (!els) {
    // Unknown icon — render empty placeholder so layout is preserved
    return React.createElement(View, { style: [{ width: size, height: size }, style] });
  }

  if (Platform.OS !== 'web') {
    // Native fallback: transparent square (app is web-exported)
    return React.createElement(View, { style: [{ width: size, height: size }, style] });
  }

  const svgEl = React.createElement(
    'svg' as any,
    {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: color,
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      style: { display: 'block', flexShrink: 0, ...(style || {}) },
    },
    ...els.map((el, i) => toSVGEl(el, i, color)),
  );

  return svgEl;
}
