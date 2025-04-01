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

export type PlaybackElement = elements.VoiceEntry | elements.Fragment | elements.Measure;

export type Moment = {
  time: Duration;
  events: MomentEvent[];
};

export type MomentEvent = ElementTransitionEvent | JumpEvent | SystemEndEvent;

export type ElementTransitionEvent = {
  type: 'transition';
  kind: 'start' | 'stop';
  element: PlaybackElement;
};

export type JumpEvent = {
  type: 'jump';
};

export type SystemEndEvent = {
  type: 'systemend';
};
