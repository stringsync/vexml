import * as elements from '@/elements';
import { NumberRange } from '@/util';
import { DurationRange } from './durationrange';

export type SequenceEntry = {
  mostRecentElement: elements.VoiceEntry;
  elements: elements.VoiceEntry[];
  durationRange: DurationRange;
  xRange: NumberRange;
};
