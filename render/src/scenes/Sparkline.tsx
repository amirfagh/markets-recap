import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { theme } from '../theme';

type Props = { values: number[]; color: string; width: number; height: number; delay?: number };

export const Sparkline: React.FC<Props> = ({ values, color, width, height, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pad = 18;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [
    pad + (i / Math.max(values.length - 1, 1)) * (width - pad * 2),
    pad + (1 - (v - min) / span) * (height - pad * 2),
  ]);
  // Smooth path through points (Catmull-Rom → cubic Bézier).
  const d = pts.reduce((acc, [x, y], i, a) => {
    if (i === 0) return `M ${x} ${y}`;
    const [x0, y0] = a[i - 2] ?? a[i - 1];
    const [x1, y1] = a[i - 1];
    const [x3, y3] = a[i + 1] ?? [x, y];
    const c1 = [x1 + (x - x0) / 6, y1 + (y - y0) / 6];
    const c2 = [x - (x3 - x1) / 6, y - (y3 - y1) / 6];
    return `${acc} C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${x} ${y}`;
  }, '');
  const [lx, ly] = pts[pts.length - 1];
  const area = `${d} L ${lx} ${height} L ${pts[0][0]} ${height} Z`;

  const draw = interpolate(frame - delay, [0, 0.9 * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
  const dotIn = interpolate(frame - delay, [0.8 * fps, 1.0 * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const pulse = (Math.sin((frame / fps) * Math.PI * 2) + 1) / 2;
  const gid = `g-${color.replace('#', '')}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
        <clipPath id={`${gid}-clip`}>
          <rect x={0} y={0} width={width * draw} height={height} />
        </clipPath>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={0} x2={width} y1={height * f} y2={height * f} stroke={theme.line} strokeWidth={2} />
      ))}
      <path d={area} fill={`url(#${gid})`} clipPath={`url(#${gid}-clip)`} />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - draw}
      />
      <circle cx={lx} cy={ly} r={18 + pulse * 10} fill={color} opacity={0.18 * dotIn} />
      <circle cx={lx} cy={ly} r={11 * dotIn} fill={color} />
    </svg>
  );
};
