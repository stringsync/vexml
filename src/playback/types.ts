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

export type TimelineEvent = TransitionEvent | JumpEvent | SystemEndEvent;

export type TransitionEvent = {
  type: 'transition';
  time: Duration;
  transitions: ElementTransition[];
};

export type ElementTransition = {
  type: 'start' | 'stop';
  element: PlaybackElement;
};

export type JumpEvent = {
  type: 'jump';
  time: Duration;
};

export type SystemEndEvent = {
  type: 'systemend';
  time: Duration;
};
