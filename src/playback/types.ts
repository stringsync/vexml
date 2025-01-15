import * as elements from '@/elements';
import { NumberRange } from '@/util';
import { DurationRange } from './durationrange';

export type SequenceEntry = {
  anchorElement: elements.VoiceEntry;
  activeElements: elements.VoiceEntry[];
  durationRange: DurationRange;
  xRange: NumberRange;
};
