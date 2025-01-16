import * as vexflow from 'vexflow';
import * as data from '@/data';
import { Rect } from '@/spatial';
import { Label } from './label';
import { ClefSign, StemDirection } from './enums';
import { GapOverlay } from './gapoverlay';
import { Fraction } from '@/util';

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

export type PedalKey = {
  pedalIndex: number;
};

export type OctaveShiftKey = {
  octaveShiftIndex: number;
};

export type VibratoKey = {
  vibratoIndex: number;
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

export type ArticulationKey = VoiceEntryKey & {
  articulationIndex: number;
};

export type ScoreRender = {
  type: 'score';
  rect: Rect;
  titleRender: TitleRender | null;
  systemRenders: SystemRender[];
  curveRenders: CurveRender[];
  wedgeRenders: WedgeRender[];
  pedalRenders: PedalRender[];
  octaveShiftRenders: OctaveShiftRender[];
  vibratoRenders: VibratoRender[];
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
  rectSrc: FragmentRectSrc;
  excessHeight: number;
  partLabelGroupRender: PartLabelGroupRender | null;
  partRenders: PartRender[];
  vexflowStaveConnectors: vexflow.StaveConnector[];
  gapOverlay: GapOverlay | null;
};

/**
 * The status of a fragment render.
 *
 *   - 'none' means the fragment has not been formatted yet.
 *   - 'draw' means the fragment has been formatted and drawn to the NoopRenderContext. It _cannot_ be drawn again.
 *   - 'cache' means the fragment has been formatted and the rects come from a separate cache. It can be drawn.
 *
 * The reason why this is needed is because drawing some elements (e.g. vexflow.Articulations) is not idempotent.
 * See https://github.com/vexflow/vexflow/issues/254
 */
export type FragmentRectSrc = 'none' | 'draw' | 'cache';

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
  vexflowElements: vexflow.Element[];
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
  playableRect: Rect;
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
  startMeasureBeat: Fraction;
  vexflowVoices: vexflow.Voice[];
  entryRenders: VoiceEntryRender[];
  beamRenders: BeamRender[];
  tupletRenders: TupletRender[];
};

export type BeamRender = {
  type: 'beam';
  rect: Rect;
  key: BeamKey;
  vexflowBeams: vexflow.Beam[];
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
  vexflowNote: vexflow.Note;
  curveIds: string[];
  beamId: string | null;
  wedgeId: string | null;
  tupletIds: string[];
  graceCurves: GraceCurve[];
  vexflowGraceNoteGroup: vexflow.GraceNoteGroup | null;
  pedalMark: data.PedalMark | null;
  octaveShiftId: string | null;
  vibratoIds: string[];
  bendRenders: BendRender[];
  graceBeamRenders: BeamRender[];
  articulationRenders: ArticulationRender[];
};

export type GraceCurve = {
  curveId: string;
  graceEntryIndex: number;
};

export type RestRender = {
  type: 'rest';
  key: VoiceEntryKey;
  rect: Rect;
  vexflowNote: vexflow.Note;
  beamId: string | null;
  tupletIds: string[];
};

export type DynamicsRender = {
  type: 'dynamics';
  key: VoiceEntryKey;
  rect: Rect;
  dynamicType: data.DynamicType;
  vexflowNote: vexflow.TextDynamics;
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

export type PedalRender = {
  type: 'pedal';
  key: PedalKey;
  rect: Rect;
  vexflowPedalMarkings: vexflow.PedalMarking[];
};

export type OctaveShiftRender = {
  type: 'octaveshift';
  key: OctaveShiftKey;
  rect: Rect;
  vexflowTextBrackets: vexflow.TextBracket[];
};

export type VibratoRender = {
  type: 'vibrato';
  rect: Rect;
  vexflowVibratoBrackets: vexflow.VibratoBracket[];
};

export type ArticulationRender = {
  type: 'articulation';
  key: ArticulationKey;
  rect: Rect;
  vexflowModifiers: vexflow.Modifier[];
};

export type BendRender = {
  type: 'bend';
  key: VoiceEntryKey;
  rect: Rect;
  vexflowModifiers: vexflow.Modifier[];
};
