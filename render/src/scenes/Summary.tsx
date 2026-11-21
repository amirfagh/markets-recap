import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { enter, exit } from '../anim';
import { arrow, fmtPct, moveColor, SAFE, theme } from '../theme';
import type { Asset, Ui } from '../types';

type Props = { assets: Asset[]; up: number; down: number; ui: Ui; duration: number };

export const Summary: React.FC<Props> = ({ assets, up, down, ui, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const out = exit(frame, duration);
  const head = enter(frame, fps);
  const maxAbs = Math.max(...assets.map((a) => Math.abs(a.change_pct)), 0.01);

  return (
    <AbsoluteFill style={{ top: SAFE.top + 110, left: SAFE.side, right: SAFE.side, width: 1080 - SAFE.side * 2, opacity: out }}>
      <div style={{ opacity: head, transform: `translateY(${(1 - head) * 40}px)` }}>
        <div style={{ fontSize: 84, fontWeight: 900, color: theme.text, letterSpacing: -2 }}>{ui.summary}</div>
        <div style={{ fontSize: 40, fontWeight: 700, marginTop: 6 }}>
          <span style={{ color: theme.up }}>{up} {ui.up}</span>
          <span style={{ color: theme.muted }}>  ·  </span>
          <span style={{ color: theme.down }}>{down} {ui.down}</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, marginTop: 44 }}>
        {assets.map((a, i) => {
          const p = enter(frame, fps, 4 + i * 3, 14);
          const c = moveColor(a.change_pct);
          const last = i === assets.length - 1 && assets.length % 2 === 1;
          return (
            <div
              key={a.id}
              style={{
                gridColumn: last ? 'span 2' : undefined,
                background: theme.surface,
                border: `2px solid ${theme.line}`,
                borderRadius: 34,
                padding: '24px 30px',
                opacity: p,
                transform: `translateY(${(1 - p) * 50}px) scale(${0.94 + p * 0.06})`,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: 2, color: theme.muted }}>{a.ticker}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
                <span style={{ fontSize: 40, fontWeight: 800, color: theme.text }}>{a.name}</span>
                <span style={{ fontSize: 44, fontWeight: 900, color: c, fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ fontSize: 26, marginRight: 6 }}>{arrow(a.change_pct)}</span>
                  {fmtPct(a.change_pct, 1)}
                </span>
              </div>
              <div style={{ position: 'absolute', left: 0, bottom: 0, height: 6, width: `${(Math.abs(a.change_pct) / maxAbs) * 100 * p}%`, background: c }} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
