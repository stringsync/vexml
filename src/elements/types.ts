import { Fragment } from './fragment';
import { Measure } from './measure';
import { Note } from './note';
import { Part } from './part';
import { Rest } from './rest';
import { Score } from './score';
import { Stave } from './stave';
import { System } from './system';
import { Voice } from './voice';

/**
 * Represents a rendered musical element.
 *
 * NOTE: The type union order is the rendering hierarchy.
 */
export type Element = Score | System | Measure | Fragment | Part | Stave | Voice | VoiceEntry;

/**
 * Leaf elements that are rendered as part of a voice.
 */
export type VoiceEntry = Note | Rest;

export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type Point = {
  x: number;
  y: number;
};

export type EventMap = {
  click: ClickEvent;
  enter: EnterEvent;
  exit: ExitEvent;
  longpress: LongPressEvent;
  scroll: ScrollEvent;
};

export type ClickEvent = {
  type: 'click';
  timestampMs: number | null;
  closestTarget: Element;
  targets: Element[];
  point: Point;
  native: MouseEvent | TouchEvent;
};

export type EnterEvent = {
  type: 'enter';
  timestampMs: number | null;
  target: Element;
  point: Point;
  native: MouseEvent | TouchEvent;
};

export type ExitEvent = {
  type: 'exit';
  timestampMs: number | null;
  target: Element;
  point: Point;
  native: MouseEvent | TouchEvent;
};

export type LongPressEvent = {
  type: 'longpress';
  timestampMs: number | null;
  target: Element;
  point: Point;
  native: MouseEvent | TouchEvent;
};

export type ScrollEvent = {
  type: 'scroll';
  scrollX: number;
  scrollY: number;
  native: Event;
};
