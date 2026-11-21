export type Word = { text: string; start: number; end: number };

export type Segment = {
  id: string;
  scene: 'hook' | 'asset' | 'summary' | 'outro';
  start: number;
  duration: number;
  words: Word[];
};

export type Asset = {
  id: string;
  name: string;
  ticker: string;
  unit: 'pts' | 'usd' | 'ils' | 'fx' | 'sar' | 'egp';
  decimals: number;
  price: number;
  change_pct: number;
  spark: number[];
  topMover?: boolean;
  stale?: boolean;
};

export type Ui = {
  biggest_mover: string;
  today: string;
  five_day: string;
  summary: string;
  up: string;
  down: string;
  follow: string;
  disclaimer: string;
  top_mover: string;
  last_close: string;
  follow_btn: string;
};

export type RecapProps = {
  hookShowsPrice?: boolean;
  lang: string;
  titleLines: string[];
  fontFamily: string;
  brand: string;
  setId: string;
  setLabel: string;
  title: string;
  accent: string;
  datePart: string;
  datePartKind: 'day' | 'month' | 'year';
  dateLabel: string;
  fps: number;
  width: number;
  height: number;
  dir: 'ltr' | 'rtl';
  ui: Ui;
  audio: string;
  duration: number;
  moverId: string;
  up: number;
  down: number;
  assets: Asset[];
  segments: Segment[];
};
