import { interpolate, spring } from 'remotion';

/** Spring-in (0→1) starting at `delay` frames. */
export const enter = (frame: number, fps: number, delay = 0, damping = 16) =>
  spring({ frame: frame - delay, fps, config: { damping, stiffness: 140, mass: 0.7 } });

/** Fade/slide-out over the last `len` frames of a scene (1→0). */
export const exit = (frame: number, duration: number, len = 8) =>
  interpolate(frame, [duration - len, duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/** Eased count-up progress (0→1) over `len` frames. */
export const countUp = (frame: number, fps: number, delay = 0, len = 0.9) =>
  interpolate(frame - delay, [0, len * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });
