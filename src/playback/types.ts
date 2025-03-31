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

export type TimelineEvent = LegacyTransitionEvent | LegacyJumpEvent | LegacySystemEndEvent;

export type LegacyTransitionEvent = {
  type: 'transition';
  time: Duration;
  transitions: ElementTransition[];
};

export type ElementTransition = {
  type: 'start' | 'stop';
  element: PlaybackElement;
};

export type LegacyJumpEvent = {
  type: 'jump';
  time: Duration;
};

export type LegacySystemEndEvent = {
  type: 'systemend';
  time: Duration;
};

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
