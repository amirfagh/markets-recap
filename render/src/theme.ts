import { createContext, useContext } from 'react';
import type { Asset } from './types';

export const theme = {
  bg: '#07080B',
  surface: '#0E1015',
  surface2: '#14171E',
  line: 'rgba(255,255,255,0.07)',
  text: '#F4F5F7',
  muted: '#8A8F9C',
  up: '#22C55E',
  down: '#F04444',
  flat: '#9AA0AC',
  accent: '#FFB547',
  font: "'Inter', system-ui, sans-serif",
};

// Platform UI safe zones for a 1080x1920 frame: nothing in top 10% or bottom 15%.
export const SAFE = { top: 192, bottom: 1920 - 288, side: 72 };

export const FLAT = 0.05;

export const moveColor = (pct: number) =>
  Math.abs(pct) < FLAT ? theme.flat : pct > 0 ? theme.up : theme.down;

// Wrap numbers in Unicode LTR isolates so "−3.8%" / "$3,547" never get reordered inside RTL text.
const ltr = (s: string) => `\u2066${s}\u2069`;

export const fmtPct = (pct: number, digits = 2) =>
  ltr(`${pct >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(digits)}%`);

export const fmtPrice = (a: Pick<Asset, 'unit' | 'decimals'>, value: number) => {
  const num = value.toLocaleString('en-US', {
    minimumFractionDigits: a.decimals,
    maximumFractionDigits: a.decimals,
  });
  if (a.unit === 'usd') return ltr(`$${num}`);
  if (a.unit === 'ils') return ltr(`₪${num}`);
  if (a.unit === 'sar') return ltr(`${num} SAR`);
  if (a.unit === 'egp') return ltr(`${num} EGP`);
  return ltr(num);
};

export const arrow = (pct: number) => (Math.abs(pct) < FLAT ? '•' : pct > 0 ? '▲' : '▼');

/** Per-set accent colour (Wall Street blue / Crypto purple / Macro amber), provided at the root. */
export const AccentContext = createContext<string>(theme.accent);
export const useAccent = () => useContext(AccentContext);
