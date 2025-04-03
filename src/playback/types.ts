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

export type TimelineMoment = {
  time: Duration;
  events: TimelineMomentEvent[];
};

export type TimelineMomentEvent = ElementTransitionEvent | JumpEvent | SystemEndEvent;

export type ElementTransitionEvent = {
  type: 'transition';
  kind: 'start' | 'stop';
  measure: elements.Measure;
  element: PlaybackElement;
};

export type JumpEvent = {
  type: 'jump';
  measure: elements.Measure;
};

export type SystemEndEvent = {
  type: 'systemend';
  system: elements.System;
};

export type CursorFrameHint = RetriggerHint | SustainHint;

export type RetriggerHint = {
  type: 'retrigger';
  untriggerElement: PlaybackElement;
  retriggerElement: PlaybackElement;
};

export type SustainHint = {
  type: 'sustain';
  previousElement: PlaybackElement;
  currentElement: PlaybackElement;
};

export type CursorVerticalSpan = {
  fromPartIndex: number;
  toPartIndex: number;
};
