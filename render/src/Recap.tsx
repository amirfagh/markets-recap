import React from 'react';
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Captions } from './Captions';
import { useFonts } from './fonts';
import { AssetCard } from './scenes/AssetCard';
import { Hook } from './scenes/Hook';
import { Outro } from './scenes/Outro';
import { Summary } from './scenes/Summary';
import { AccentContext, moveColor, SAFE, theme, useAccent } from './theme';
import type { RecapProps } from './types';

/** Giant date part (20 / NOV / 2026) sitting behind everything, matching the grid cover. */
export const DateWatermark: React.FC<{ text: string; opacity?: number; y?: number }> = ({ text, opacity = 0.07, y = 1010 }) => {
  const accent = useAccent();
  // Sized to fit 1080px with no letter-spacing (Arabic disables it), for 2-6 characters.
  const size = text.length <= 2 ? 700 : text.length === 3 ? 500 : text.length === 4 ? 380 : 300;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: y - size * 0.62,
        textAlign: 'center',
        fontSize: size,
        fontWeight: 900,
        letterSpacing: 0,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        direction: 'ltr',
        unicodeBidi: 'isolate',
        color: accent,
        opacity,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {text}
    </div>
  );
};

const Background: React.FC<{ glow: string; datePart: string }> = ({ glow, datePart }) => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 1200], [0, -40]);
  return (
    <AbsoluteFill style={{ background: theme.bg }}>
      <AbsoluteFill style={{ background: `radial-gradient(70% 45% at 50% 30%, ${glow}22 0%, transparent 70%)` }} />
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${theme.line} 1px, transparent 1px), linear-gradient(90deg, ${theme.line} 1px, transparent 1px)`,
          backgroundSize: '90px 90px',
          opacity: 0.35,
          maskImage: 'radial-gradient(80% 60% at 50% 40%, black 0%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(80% 60% at 50% 40%, black 0%, transparent 80%)',
        }}
      />
      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${drift}px)` }}>
        <DateWatermark text={datePart} />
      </div>
    </AbsoluteFill>
  );
};

const Header: React.FC<{ title: string; dateLabel: string }> = ({ title, dateLabel }) => {
  const frame = useCurrentFrame();
  const accent = useAccent();
  const o = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div
      style={{
        position: 'absolute',
        top: SAFE.top + 8,
        left: SAFE.side,
        right: SAFE.side,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        opacity: o,
        fontSize: 30,
        fontWeight: 800,
        letterSpacing: 3,
        textTransform: 'uppercase',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 14, color: theme.text }}>
        <span style={{ width: 16, height: 16, borderRadius: 4, background: accent }} />
        {title}
      </span>
      <span style={{ color: theme.muted }}>{dateLabel}</span>
    </div>
  );
};

const Progress: React.FC<{ total: number }> = ({ total }) => {
  const frame = useCurrentFrame();
  const accent = useAccent();
  return (
    <div style={{ position: 'absolute', top: SAFE.top - 14, left: SAFE.side, right: SAFE.side, height: 6, borderRadius: 6, background: theme.line, overflow: 'hidden' }}>
      <div style={{ width: `${(frame / total) * 100}%`, height: '100%', background: accent }} />
    </div>
  );
};

export const Recap: React.FC<RecapProps> = (p) => {
  useFonts();
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const mover = p.assets.find((a) => a.id === p.moverId) ?? p.assets[0];
  const assetIndex = (id: string) => p.assets.findIndex((a) => a.id === id);
  const current = [...p.segments].reverse().find((s) => t >= s.start) ?? p.segments[0];
  const glowAsset = current?.scene === 'asset' ? p.assets[assetIndex(current.id)] : current?.scene === 'hook' ? mover : null;
  const glow = glowAsset ? moveColor(glowAsset.change_pct) : p.accent;

  return (
    <AccentContext.Provider value={p.accent}>
      <AbsoluteFill style={{ fontFamily: p.fontFamily, color: theme.text, direction: p.dir }}>
        {p.lang === 'ar' && <style>{'* { letter-spacing: 0 !important; }'}</style>}
        <Background glow={glow} datePart={p.datePart} />
        <Progress total={durationInFrames} />
        <Header title={p.title} dateLabel={p.dateLabel} />

        {p.segments.map((s, i) => {
          const from = Math.round(s.start * fps);
          const isLast = i === p.segments.length - 1;
          const dur = isLast ? durationInFrames - from : Math.round((s.start + s.duration) * fps) - from;
          let node: React.ReactNode = null;
          if (s.scene === 'hook') node = <Hook showPrice={p.hookShowsPrice} titleLines={p.titleLines} title={p.title} dateLabel={p.dateLabel} mover={mover} ui={p.ui} duration={dur} />;
          if (s.scene === 'asset') {
            const idx = assetIndex(s.id);
            const cards = p.segments.filter((x) => x.scene === 'asset');
            const pos = cards.findIndex((x) => x.id === s.id);
            node = <AssetCard asset={p.assets[idx]} index={pos} total={cards.length} ui={p.ui} duration={dur} />;
          }
          if (s.scene === 'summary') node = <Summary assets={p.assets} up={p.up} down={p.down} ui={p.ui} duration={dur} />;
          if (s.scene === 'outro') node = <Outro title={p.brand} dateLabel={p.dateLabel} ui={p.ui} />;
          return (
            <Sequence key={s.id} from={from} durationInFrames={dur} layout="none">
              {node}
            </Sequence>
          );
        })}

        <Captions segments={p.segments} dir={p.dir} />

        <div
          style={{
            position: 'absolute',
            bottom: 1920 - SAFE.bottom,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 28,
            fontWeight: 600,
            color: theme.muted,
            letterSpacing: 1,
          }}
        >
          {p.ui.disclaimer}
        </div>

        <Audio src={staticFile(p.audio)} />
      </AbsoluteFill>
    </AccentContext.Provider>
  );
};
