import {
  AccidentalCode,
  AnnotationHorizontalJustification,
  AnnotationVerticalJustification,
  ClefSign,
  DurationType,
  KeyMode,
  Notehead,
  StemDirection,
  TimeSymbol,
} from './enums';

export type Score = {
  type: 'score';
  title: string | null;
  partLabels: string[];
  systems: System[];
  curves: Curve[];
};

export type Curve = {
  type: 'curve';
  id: string;
};

export type CurveRef = {
  type: 'curveref';
  curveId: string;
  phase: CurvePhase;
};

export type CurvePhase = 'start' | 'continue' | 'end';

export type System = {
  type: 'system';
  measures: Measure[];
};

export type Measure = {
  type: 'measure';
  label: number;
  fragments: Fragment[];
};

export type Fragment = {
  type: 'fragment';
  signature: FragmentSignature;
  parts: Part[];
  width: number | null;
};

export type FragmentSignature = {
  type: 'fragmentsignature';
  metronome: Metronome;
};

export type Gap = {
  type: 'gap';
  text: string | null;
  width: number | null;
  parts: Part[];
  durationMs: number;
};

export type Part = {
  type: 'part';
  staves: Stave[];
  signature: PartSignature;
};

export type PartSignature = {
  type: 'partsignature';
  staveCount: number;
};

export type Stave = {
  type: 'stave';
  signature: StaveSignature;
  voices: Voice[];
  multiRestCount: number;
};

export type StaveSignature = {
  type: 'stavesignature';
  lineCount: number;
  clef: Clef;
  key: Key;
  time: Time;
};

export type Voice = {
  type: 'voice';
  entries: VoiceEntry[];
};

export type VoiceEntry = Note | Rest;

export type Note = {
  type: 'note';
  pitch: Pitch;
  head: Notehead;
  stemDirection: StemDirection;
  duration: Fraction;
  durationType: DurationType;
  dotCount: number;
  measureBeat: Fraction;
  mods: NoteMod[];
  curveRefs: CurveRef[];
};

export type NoteMod = Accidental | Annotation;

export type Accidental = {
  type: 'accidental';
  code: AccidentalCode;
  isCautionary: boolean;
};

export type Annotation = {
  type: 'annotation';
  text: string;
  horizontalJustification: AnnotationHorizontalJustification | null;
  verticalJustification: AnnotationVerticalJustification | null;
};

export type Rest = {
  type: 'rest';
  measureBeat: Fraction;
  durationType: DurationType;
  dotCount: number;
  duration: Fraction;
  displayPitch: Pitch | null;
};

export type Pitch = {
  type: 'pitch';
  step: string;
  octave: number;
};

export type Clef = {
  type: 'clef';
  sign: ClefSign;
  octaveChange: number | null;
};

export type Key = {
  type: 'key';
  previousKey: PreviousKey | null;
  fifths: number;
  mode: KeyMode;
};

export type PreviousKey = {
  type: 'previouskey';
  fifths: number;
  mode: KeyMode;
};

export type Time = {
  type: 'time';
  components: Fraction[];
  symbol: TimeSymbol | null;
};

export type Fraction = {
  type: 'fraction';
  numerator: number;
  denominator: number;
};

export type Metronome = {
  type: 'metronome';
  name?: string;
  parenthesis?: boolean;
  duration?: string;
  dots?: number;
  bpm?: number | string;
  duration2?: string;
  dots2?: number;
};
