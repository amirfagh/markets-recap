import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { countUp, enter, exit } from '../anim';
import { arrow, fmtPct, fmtPrice, moveColor, SAFE, theme, useAccent } from '../theme';
import type { Asset, Ui } from '../types';
import { Sparkline } from './Sparkline';

type Props = { asset: Asset; index: number; total: number; ui: Ui; duration: number };

export const AssetCard: React.FC<Props> = ({ asset, index, total, ui, duration }) => {
  const frame = useCurrentFrame();
  const accent = useAccent();
  const { fps, width } = useVideoConfig();
  const color = moveColor(asset.change_pct);
  const inP = enter(frame, fps);
  const out = exit(frame, duration);
  const k = countUp(frame, fps, 4);
  const start = asset.spark[0] ?? asset.price;
  const price = start + (asset.price - start) * k;
  const pct = asset.change_pct * k;
  const pill = enter(frame, fps, 10, 12);
  const cardW = width - SAFE.side * 2;

  return (
    <AbsoluteFill
      style={{
        top: SAFE.top + 120,
        left: SAFE.side,
        right: SAFE.side,
        width: cardW,
        height: 900,
        opacity: out,
        transform: `translateY(${(1 - inP) * 80 - (1 - out) * 40}px) scale(${0.96 + inP * 0.04})`,
      }}
    >
      <div
        style={{
          background: `linear-gradient(180deg, ${theme.surface2} 0%, ${theme.surface} 100%)`,
          border: `2px solid ${theme.line}`,
          borderRadius: 56,
          padding: '56px 60px 40px',
          height: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: `0 40px 120px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div
            style={{
              color: accent,
              border: `2px solid ${accent}55`,
              background: `${accent}14`,
              borderRadius: 999,
              padding: '10px 26px',
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: 2,
            }}
          >
            {asset.ticker}
          </div>
          {asset.topMover && (
            <div style={{ color: theme.muted, fontSize: 28, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginInlineStart: 20, flex: 1 }}>
              {ui.top_mover}
            </div>
          )}
          <div style={{ color: theme.muted, fontSize: 32, fontWeight: 600, letterSpacing: 1 }}>
            {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </div>
        </div>

        <div style={{ marginTop: 40, fontSize: 84, fontWeight: 800, color: theme.text, letterSpacing: -1.5 }}>
          {asset.name}
        </div>
        <div
          style={{
            fontSize: 150,
            fontWeight: 900,
            color: theme.text,
            letterSpacing: -5,
            lineHeight: 1.05,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {fmtPrice(asset, price)}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 18 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              background: `${color}1F`,
              color,
              borderRadius: 22,
              padding: '12px 26px',
              fontSize: 60,
              fontWeight: 900,
              fontVariantNumeric: 'tabular-nums',
              transform: `scale(${0.8 + pill * 0.2})`,
              transformOrigin: 'center',
              opacity: pill,
            }}
          >
            <span style={{ fontSize: 40 }}>{arrow(asset.change_pct)}</span>
            {fmtPct(pct)}
          </div>
          <div style={{ color: theme.muted, fontSize: 34, fontWeight: 600, opacity: pill }}>{asset.stale ? ui.last_close : ui.today}</div>
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', color: theme.muted, fontSize: 28, fontWeight: 600, marginBottom: 6 }}>
          <span>{ui.five_day}</span>
          <span style={{ opacity: interpolate(frame, [20, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
            {fmtPrice(asset, Math.min(...asset.spark))} – {fmtPrice(asset, Math.max(...asset.spark))}
          </span>
        </div>
        <Sparkline values={asset.spark} color={color} width={cardW - 120} height={300} delay={6} />
      </div>
    </AbsoluteFill>
  );
};
