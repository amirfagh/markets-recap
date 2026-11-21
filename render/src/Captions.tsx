import React, { useMemo } from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { theme, useAccent } from './theme';
import type { Segment, Word } from './types';

const MAX_WORDS = 3;
// Lower third, above Instagram's caption block and clear of the right-hand action rail.
const CENTER_Y = 1340;

type Chunk = { words: Word[]; start: number; end: number };

const toChunks = (segments: Segment[]): Chunk[] => {
  const chunks: Chunk[] = [];
  for (const seg of segments) {
    let cur: Word[] = [];
    seg.words.forEach((w, i) => {
      cur.push(w);
      const breakAfter = /[.,!?;:]$/.test(w.text) || cur.length >= MAX_WORDS || i === seg.words.length - 1;
      if (breakAfter) {
        chunks.push({ words: cur, start: cur[0].start, end: cur[cur.length - 1].end });
        cur = [];
      }
    });
  }
  return chunks;
};

export const Captions: React.FC<{ segments: Segment[]; dir: 'ltr' | 'rtl' }> = ({ segments, dir }) => {
  const frame = useCurrentFrame();
  const accent = useAccent();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const chunks = useMemo(() => toChunks(segments), [segments]);

  const idx = chunks.findIndex((c, i) => t >= c.start - 0.05 && t < (chunks[i + 1]?.start ?? c.end + 0.6) - 0.05);
  if (idx < 0) return null;
  const chunk = chunks[idx];
  // Hide during long pauses between scenes.
  if (t > chunk.end + 0.45) return null;
  const pop = spring({ frame: frame - Math.round(chunk.start * fps), fps, config: { damping: 13, stiffness: 220, mass: 0.5 } });

  return (
    <AbsoluteFill style={{ top: CENTER_Y - 110, height: 220, alignItems: 'center', justifyContent: 'center', padding: '0 150px' }}>
      <div
        dir={dir}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '0 34px',
          transform: `scale(${0.86 + pop * 0.14})`,
          opacity: Math.min(1, pop * 1.4),
        }}
      >
        {chunk.words.map((w, i) => {
          const active = t >= w.start - 0.03 && t < (chunk.words[i + 1]?.start ?? chunk.end + 0.45);
          return (
            <span
              key={i}
              style={{
                fontSize: 88,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: -1,
                lineHeight: 1.1,
                color: active ? accent : theme.text,
                transform: `scale(${active ? 1.08 : 1})`,
                display: 'inline-block',
                WebkitTextStroke: '3px rgba(0,0,0,0.85)',
                paintOrder: 'stroke fill',
                textShadow: '0 8px 30px rgba(0,0,0,0.75)',
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
