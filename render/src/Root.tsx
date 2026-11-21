import React from 'react';
import { CalculateMetadataFunction, Composition } from 'remotion';
import { Cover } from './Cover';
import { Recap } from './Recap';
import type { RecapProps } from './types';

const OUTRO_HOLD_S = 0.8;

const calculateMetadata: CalculateMetadataFunction<RecapProps> = ({ props }) => ({
  durationInFrames: Math.ceil((props.duration + OUTRO_HOLD_S) * props.fps),
  fps: props.fps,
  width: props.width,
  height: props.height,
});

const defaultProps: RecapProps = {
  lang: 'en',
  titleLines: ['Wall Street', 'in 30 Seconds'],
  fontFamily: "'Inter', system-ui, sans-serif",
  brand: 'Markets in 30 Seconds',
  setId: 'wallstreet',
  setLabel: 'Wall Street',
  title: 'Wall Street in 30 Seconds',
  accent: '#4C8DFF',
  datePart: '20',
  datePartKind: 'day',
  dateLabel: '—',
  fps: 30,
  width: 1080,
  height: 1920,
  dir: 'ltr',
  ui: {
    biggest_mover: 'Biggest mover', today: 'Today', five_day: '5-day', summary: "Today's board",
    up: 'up', down: 'down', follow: "Follow for tomorrow's recap", disclaimer: 'Not financial advice.',
    top_mover: 'Top mega-cap mover', last_close: 'Last close', follow_btn: '+ Follow',
  },
  audio: 'voice.wav',
  duration: 1,
  moverId: '',
  up: 0,
  down: 0,
  assets: [],
  segments: [],
};

export const Root: React.FC = () => (
  <>
    <Composition
      id="Recap"
      component={Recap}
      durationInFrames={30}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={defaultProps}
      calculateMetadata={calculateMetadata}
    />
    <Composition id="Cover" component={Cover} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={defaultProps} />
  </>
);
