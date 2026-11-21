import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { enter } from '../anim';
import { SAFE, theme, useAccent } from '../theme';
import type { Ui } from '../types';

type Props = { title: string; dateLabel: string; ui: Ui };

export const Outro: React.FC<Props> = ({ title, dateLabel, ui }) => {
  const frame = useCurrentFrame();
  const accent = useAccent();
  const { fps } = useVideoConfig();
  const a = enter(frame, fps);
  const b = enter(frame, fps, 8, 9);
  const pulse = 1 + Math.sin((frame / fps) * Math.PI * 2.2) * 0.025;

  return (
    <AbsoluteFill
      style={{
        top: SAFE.top + 140,
        left: SAFE.side,
        right: SAFE.side,
        width: 1080 - SAFE.side * 2,
        height: 860,
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <div style={{ opacity: a, transform: `translateY(${(1 - a) * 50}px)` }}>
        <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: 4, color: theme.muted, textTransform: 'uppercase' }}>
          {title}
        </div>
        <div style={{ fontSize: 108, fontWeight: 900, color: theme.text, letterSpacing: -3, lineHeight: 1.02, marginTop: 24 }}>
          {ui.follow}
        </div>
      </div>
      <div
        style={{
          marginTop: 64,
          background: accent,
          color: '#111',
          fontSize: 52,
          fontWeight: 900,
          borderRadius: 999,
          padding: '26px 70px',
          transform: `scale(${b * pulse})`,
          boxShadow: `0 20px 80px ${accent}55`,
        }}
      >
        {ui.follow_btn}
      </div>
      <div style={{ marginTop: 40, fontSize: 34, color: theme.muted, fontWeight: 600, opacity: b }}>{dateLabel}</div>
    </AbsoluteFill>
  );
};
