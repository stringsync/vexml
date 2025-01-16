import * as elements from '@/elements';
import { NumberRange } from '@/util';
import { DurationRange } from './durationrange';

export type SequenceEntry = {
  anchorElement: PlaybackElement;
  activeElements: PlaybackElement[];
  durationRange: DurationRange;
  xRange: NumberRange;
};

export type PlaybackElement = elements.VoiceEntry | elements.Fragment | elements.Measure;
