import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { countUp, enter, exit } from '../anim';
import { arrow, fmtPct, fmtPrice, moveColor, SAFE, theme, useAccent } from '../theme';
import type { Asset, Ui } from '../types';

type Props = { showPrice?: boolean; titleLines: string[]; title: string; dateLabel: string; mover: Asset; ui: Ui; duration: number };

export const Hook: React.FC<Props> = ({ showPrice, titleLines, dateLabel, mover, ui, duration }) => {
  const frame = useCurrentFrame();
  const accent = useAccent();
  const { fps } = useVideoConfig();
  const color = moveColor(mover.change_pct);
  const out = exit(frame, duration);
  const t1 = enter(frame, fps, 0);
  const t2 = enter(frame, fps, 6);
  const t3 = enter(frame, fps, 10, 11);
  const pct = mover.change_pct * countUp(frame, fps, 8, 0.8);
  const bar = enter(frame, fps, 4, 20);

  return (
    <AbsoluteFill style={{ top: SAFE.top + 90, left: SAFE.side, right: SAFE.side, width: 1080 - SAFE.side * 2, opacity: out }}>
      <div style={{ transform: `translateY(${(1 - t1) * 60}px)`, opacity: t1 }}>
        <div style={{ fontSize: titleLines[0].length > 12 ? 96 : 112, fontWeight: 900, lineHeight: 1.02, letterSpacing: -4, color: theme.text }}>
          {titleLines[0]}
          <br />
          <span style={{ color: accent }}>{titleLines[1]}</span>
        </div>
        <div
          style={{
            height: 8,
            width: 220 * bar,
            background: accent,
            borderRadius: 8,
            marginTop: 28,
          }}
        />
        <div style={{ marginTop: 22, fontSize: 38, color: theme.muted, fontWeight: 600 }}>{dateLabel}</div>
      </div>

      <div
        style={{
          marginTop: 90,
          padding: '48px 56px',
          borderRadius: 56,
          background: `radial-gradient(120% 140% at 0% 0%, ${color}26 0%, ${theme.surface} 60%)`,
          border: `2px solid ${color}40`,
          transform: `translateY(${(1 - t2) * 80}px)`,
          opacity: t2,
        }}
      >
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 4, color: theme.muted, textTransform: 'uppercase' }}>
          {ui.biggest_mover}
        </div>
        <div style={{ fontSize: 96, fontWeight: 800, color: theme.text, marginTop: 10, letterSpacing: -2 }}>
          {mover.name}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 22,
            color,
            fontSize: 170,
            fontWeight: 900,
            letterSpacing: -7,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            transform: `scale(${0.85 + t3 * 0.15})`,
            transformOrigin: 'center',
          }}
        >
          <span style={{ fontSize: 90 }}>{arrow(mover.change_pct)}</span>
          {fmtPct(pct, 1)}
        </div>
        {showPrice && (
          <div style={{ marginTop: 18, fontSize: 64, fontWeight: 800, color: theme.text, fontVariantNumeric: 'tabular-nums', opacity: t3 }}>
            {fmtPrice(mover, mover.price)}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
