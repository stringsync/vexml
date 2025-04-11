import { NumberRange } from '@/util';
import { Duration } from './duration';
import { DurationRange } from './durationrange';
import { CursorFrame } from './types';

export class EmptyCursorFrame implements CursorFrame {
  tRange = new DurationRange(Duration.zero(), Duration.zero());
  xRange = new NumberRange(0, 0);
  yRange = new NumberRange(0, 0);

  getActiveElements() {
    return [];
  }

  toHumanReadable(): string[] {
    return ['[empty]'];
  }
}
