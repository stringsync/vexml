import * as vexflow from 'vexflow';
import { Document } from './document';

/** Formatter produces a new formatted document from an unformatted one. */
export interface Formatter {
  format(document: Document): Document;
}

export interface Drawable {
  setContext(ctx: vexflow.RenderContext): this;
  draw(): this;
}

export type Padding = {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
};

export type PartLabelKey = {
  partIndex: number;
};

export type CurveKey = {
  curveIndex: number;
};

export type SystemArrangement = {
  from: number;
  to: number;
};

export type SystemKey = {
  systemIndex: number;
};

export type MeasureKey = SystemKey & {
  measureIndex: number;
};

export type FragmentKey = MeasureKey & {
  fragmentIndex: number;
};

export type PartKey = FragmentKey & {
  partIndex: number;
};

export type StaveKey = PartKey & {
  staveIndex: number;
};

export type VoiceKey = StaveKey & {
  voiceIndex: number;
};

export type VoiceEntryKey = VoiceKey & {
  voiceEntryIndex: number;
};
