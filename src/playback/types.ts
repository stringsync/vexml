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
  events: [TimelineMomentEvent, ...TimelineMomentEvent[]];
};

export type TimelineMomentEvent = ElementTransitionEvent | JumpEvent | SystemEndEvent;

export interface CursorFrameLocator {
  /** Returns the index of the element that is active at the given time. */
  locate(time: Duration): number | null;
}

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

export interface CursorStateHintProvider {
  get(): CursorStateHint[];
}

export type CursorStateHint = StartHint | StopHint | RetriggerHint | SustainHint;

export type StartHint = {
  type: 'start';
  element: PlaybackElement;
};

export type StopHint = {
  type: 'stop';
  element: PlaybackElement;
};

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
