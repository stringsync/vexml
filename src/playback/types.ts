import * as elements from '@/elements';
import { NumberRange } from '@/util';
import { DurationRange } from './durationrange';
import { Duration } from './duration';

export type LegacySequenceEntry = {
  anchorElement: PlaybackElement;
  activeElements: PlaybackElement[];
  durationRange: DurationRange;
  xRange: NumberRange;
};

export type SequenceEvent = {
  time: Duration;
  x: number;
  transitions: SequenceTransition[];
};

export type SequenceTransition = {
  type: SequenceTransitionType;
  element: PlaybackElement;
};

/**
 * Describes what is changing during a sequence event.
 */
export enum SequenceTransitionType {
  /** The element is transitioning from inactive to active.  */
  Start = 'start',
  /** The element is transitioning from active to inactive. */
  Stop = 'stop',
}

export type PlaybackElement = elements.VoiceEntry | elements.Fragment | elements.Measure;
