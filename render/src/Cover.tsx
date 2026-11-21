import React from 'react';
import { AbsoluteFill } from 'remotion';
import { useFonts } from './fonts';
import { AccentContext, arrow, fmtPct, moveColor, theme } from './theme';
import type { RecapProps } from './types';

/**
 * Reel cover (1080x1920). Everything that matters sits inside Instagram's centre 3:4 grid crop
 * (y 240–1680), so a profile row reads e.g.  20 | NOV | 2026.
 */
export const Cover: React.FC<RecapProps> = (p) => {
  useFonts();
  const mover = p.assets.find((a) => a.id === p.moverId) ?? p.assets[0];
  const size = p.datePart.length <= 2 ? 600 : p.datePart.length === 3 ? 430 : 330;
  const c = mover ? moveColor(mover.change_pct) : theme.muted;

  return (
    <AccentContext.Provider value={p.accent}>
      <AbsoluteFill style={{ fontFamily: p.fontFamily, background: theme.bg, color: theme.text, alignItems: 'center', direction: p.dir }}>
        {p.lang === 'ar' && <style>{'* { letter-spacing: 0 !important; }'}</style>}
        <AbsoluteFill style={{ background: `radial-gradient(65% 40% at 50% 50%, ${p.accent}40 0%, transparent 72%)` }} />
        <AbsoluteFill
          style={{
            backgroundImage: `linear-gradient(${theme.line} 1px, transparent 1px), linear-gradient(90deg, ${theme.line} 1px, transparent 1px)`,
            backgroundSize: '90px 90px',
            opacity: 0.5,
            maskImage: 'radial-gradient(60% 45% at 50% 50%, black 0%, transparent 85%)',
            WebkitMaskImage: 'radial-gradient(60% 45% at 50% 50%, black 0%, transparent 85%)',
          }}
        />
        {/* Accent bars at top/bottom of the visible grid crop */}
        <div style={{ position: 'absolute', top: 300, left: 90, right: 90, height: 10, borderRadius: 10, background: p.accent }} />
        <div style={{ position: 'absolute', bottom: 300, left: 90, right: 90, height: 10, borderRadius: 10, background: p.accent, opacity: 0.35 }} />

        <div
          style={{
            position: 'absolute',
            top: 380,
            padding: '16px 40px',
            borderRadius: 999,
            border: `3px solid ${p.accent}`,
            color: p.accent,
            fontSize: 54,
            fontWeight: 900,
            letterSpacing: 6,
            textTransform: 'uppercase',
          }}
        >
          {p.setLabel}
        </div>

        <div
          style={{
            position: 'absolute',
            top: 960 - size * 0.58,
            width: '100%',
            textAlign: 'center',
            fontSize: size,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: -size * 0.045,
            color: theme.text,
            fontVariantNumeric: 'tabular-nums',
            textShadow: `0 0 120px ${p.accent}66`,
          }}
        >
          {p.datePart}
        </div>

        {mover && (
          <div
            style={{
              position: 'absolute',
              top: 1300,
              display: 'flex',
              alignItems: 'center',
              gap: 22,
              fontSize: 64,
              fontWeight: 900,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span style={{ color: theme.text }}>{mover.ticker}</span>
            <span style={{ color: c }}>
              <span style={{ fontSize: 44, marginRight: 8 }}>{arrow(mover.change_pct)}</span>
              {fmtPct(mover.change_pct, 1)}
            </span>
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            top: 1430,
            fontSize: 40,
            fontWeight: 800,
            letterSpacing: 5,
            color: theme.muted,
            textTransform: 'uppercase',
          }}
        >
          {p.brand} · {p.dateLabel}
        </div>
      </AbsoluteFill>
    </AccentContext.Provider>
  );
};
