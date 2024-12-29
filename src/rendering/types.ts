import * as spatial from '@/spatial';

export interface Format {
  getScoreWidth(): number;
  getScoreHeight(): number;
  getTitlePosition(): spatial.Point;
}

export type SystemKey = {
  systemIndex: number;
};

export type MeasureKey = SystemKey & {
  measureIndex: number;
};

export type MeasureEntryKey = MeasureKey & {
  entryIndex: number;
};
