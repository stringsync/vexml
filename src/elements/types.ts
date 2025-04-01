import { Point } from '@/spatial';
import { Fragment } from './fragment';
import { Measure } from './measure';
import { Note } from './note';
import { Part } from './part';
import { Rest } from './rest';
import { Score } from './score';
import { Stave } from './stave';
import { System } from './system';
import { Voice } from './voice';
import { Enum, EnumValues } from '@/util';

/**
 * Represents a rendered musical element.
 *
 * NOTE: The type union order is the rendering hierarchy.
 */
export type VexmlElement = Score | System | Measure | Fragment | Part | Stave | Voice | VoiceEntry;

/**
 * Leaf elements that are rendered as part of a voice.
 */
export type VoiceEntry = Note | Rest;

export type AccidentalCode = EnumValues<typeof ACCIDENTAL_CODES>;
export const ACCIDENTAL_CODES = new Enum(['#', '##', 'b', 'bb', 'n', 'd', '_', 'db', '+', '++'] as const);

export type Pitch = {
  step: string;
  octave: number;
  accidentalCode: AccidentalCode | null;
};

export type EventMap = {
  click: ClickEvent;
  enter: EnterEvent;
  exit: ExitEvent;
  longpress: LongPressEvent;
  scroll: ScrollEvent;
};

export type EventType = keyof EventMap;

export type AnyEvent = EventMap[EventType];

export type AnyEventListener = (event: EventMap[EventType]) => void;
export type ClickEventListener = (event: EventMap['click']) => void;
export type EnterEventListener = (event: EventMap['enter']) => void;
export type ExitEventListener = (event: EventMap['exit']) => void;
export type LongpressEventListener = (event: EventMap['longpress']) => void;
export type ScrollEventListener = (event: EventMap['scroll']) => void;

export type ClickEvent = {
  type: 'click';
  timestampMs: number | null;
  target: VexmlElement;
  point: Point;
  native: MouseEvent | TouchEvent;
};

export type LongPressEvent = {
  type: 'longpress';
  timestampMs: number | null;
  target: VexmlElement;
  point: Point;
  native: MouseEvent | TouchEvent;
};

export type EnterEvent = {
  type: 'enter';
  timestampMs: number | null;
  target: VexmlElement;
  point: Point;
  native: MouseEvent | TouchEvent;
};

export type ExitEvent = {
  type: 'exit';
  timestampMs: number | null;
  target: VexmlElement;
  point: Point;
  native: MouseEvent | TouchEvent;
};

export type ScrollEvent = {
  type: 'scroll';
  scrollX: number;
  scrollY: number;
  native: Event;
};
