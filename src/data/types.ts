import { AccidentalCode, ClefSign, KeyMode, Notehead, StemDirection, TimeSymbol } from './enums';

export type Score = {
  type: 'score';
  title: string | null;
  partLabels: string[];
  systems: System[];
};

export type System = {
  type: 'system';
  measures: Measure[];
};

export type Measure = {
  type: 'measure';
  label: number;
  entries: Array<MeasureEntry>;
};

export type MeasureEntry = Fragment | Gap;

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

export type VoiceEntry = Note;

export type Note = {
  type: 'note';
  pitch: string;
  octave: number;
  head: Notehead;
  dotCount: number;
  stemDirection: StemDirection;
  duration: Fraction;
  measureBeat: Fraction;
  mods: NoteMod[];
};

export type NoteMod = Accidental;

export type Accidental = {
  type: 'accidental';
  code: AccidentalCode;
  isCautionary: boolean;
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
