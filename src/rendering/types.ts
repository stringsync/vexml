import * as vexflow from 'vexflow';
import * as data from '@/data';
import { Document } from './document';
import { Rect } from '@/spatial';
import { Label } from './label';
import { ClefSign, StemDirection } from './enums';

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

export type WedgeKey = {
  wedgeIndex: number;
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

export type BeamKey = VoiceKey & {
  beamIndex: number;
};

export type TupletKey = VoiceKey & {
  tupletIndex: number;
};

export type VoiceEntryKey = VoiceKey & {
  voiceEntryIndex: number;
};

export type ScoreRender = {
  type: 'score';
  rect: Rect;
  titleRender: TitleRender | null;
  systemRenders: SystemRender[];
  curveRenders: CurveRender[];
  wedgeRenders: WedgeRender[];
};

export type TitleRender = {
  type: 'title';
  rect: Rect;
  label: Label;
};

export type SystemRender = {
  type: 'system';
  key: SystemKey;
  rect: Rect;
  measureRenders: MeasureRender[];
};

export type MeasureRender = {
  type: 'measure';
  key: MeasureKey;
  rect: Rect;
  absoluteIndex: number;
  fragmentRenders: FragmentRender[];
  multiRestCount: number;
  jumps: data.Jump[];
};

export type FragmentRender = {
  type: 'fragment';
  key: FragmentKey;
  rect: Rect;
  excessHeight: number;
  partLabelGroupRender: PartLabelGroupRender | null;
  partRenders: PartRender[];
  vexflowStaveConnectors: vexflow.StaveConnector[];
};

export type PartLabelGroupRender = {
  type: 'partlabelgroup';
  rect: Rect;
  partLabelRenders: PartLabelRender[];
};

export type PartLabelRender = {
  type: 'partLabel';
  key: PartLabelKey;
  rect: Rect;
  label: Label;
};

export type CurveRender = {
  type: 'curve';
  rect: Rect;
  key: CurveKey;
  vexflowCurves: vexflow.Curve[];
};

export type PartRender = {
  type: 'part';
  key: PartKey;
  rect: Rect;
  staveRenders: StaveRender[];
  vexflowBrace: vexflow.StaveConnector | null;
};

export type StaveRender = {
  type: 'stave';
  key: StaveKey;
  rect: Rect;
  intrinsicRect: Rect;
  excessHeight: number;
  voiceRenders: VoiceRender[];
  startClefRender: ClefRender | null;
  endClefRender: ClefRender | null;
  keyRender: KeyRender | null;
  timeRender: TimeRender | null;
  vexflowStave: vexflow.Stave;
  vexflowMultiMeasureRest: vexflow.MultiMeasureRest | null;
};

export type ClefRender = {
  type: 'clef';
  key: StaveKey;
  width: number;
  sign: ClefSign;
  vexflowClef: vexflow.Clef;
};

export type TimeRender = {
  type: 'time';
  rect: Rect;
  key: StaveKey;
  vexflowTimeSignatures: vexflow.TimeSignature[];
  width: number;
};

export type VoiceRender = {
  type: 'voice';
  key: VoiceKey;
  rect: Rect;
  vexflowVoices: vexflow.Voice[];
  entryRenders: VoiceEntryRender[];
  beamRenders: BeamRender[];
  tupletRenders: TupletRender[];
};

export type BeamRender = {
  type: 'beam';
  rect: Rect;
  key: BeamKey;
  vexflowBeam: vexflow.Beam;
};

export type TupletRender = {
  type: 'tuplet';
  rect: Rect;
  key: TupletKey;
  vexflowTuplet: vexflow.Tuplet;
};

export type VoiceEntryRender = NoteRender | RestRender | DynamicsRender;

export type NoteRender = {
  type: 'note';
  key: VoiceEntryKey;
  rect: Rect;
  stemDirection: StemDirection;
  vexflowTickable: vexflow.StaveNote;
  curveIds: string[];
  beamId: string | null;
  wedgeId: string | null;
  tupletIds: string[];
  graceCurves: GraceCurve[];
  graceBeamRenders: BeamRender[];
  vexflowGraceNoteGroup: vexflow.GraceNoteGroup | null;
};

export type GraceCurve = {
  curveId: string;
  graceEntryIndex: number;
};

export type RestRender = {
  type: 'rest';
  key: VoiceEntryKey;
  rect: Rect;
  vexflowTickable: vexflow.StaveNote;
  beamId: string | null;
  tupletIds: string[];
};

export type DynamicsRender = {
  type: 'dynamics';
  key: VoiceEntryKey;
  rect: Rect;
  dynamicType: data.DynamicType;
  vexflowTickable: vexflow.TextDynamics;
};

export type KeyRender = {
  type: 'key';
  key: StaveKey;
  rect: Rect;
  width: number;
  vexflowKeySignature: vexflow.KeySignature;
};

export type WedgeRender = {
  type: 'wedge';
  key: WedgeKey;
  rect: Rect;
  vexflowStaveHairpins: vexflow.StaveHairpin[];
};
