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
  stemDirection: NoteStemDirection;
  duration: Fraction;
  measureBeat: Fraction;
  // TODO: Add NoteMod[]
};

// TODO: Add symbol leaf type

export type Notehead =
  | ''
  | 'D0'
  | 'D1'
  | 'D2'
  | 'D3'
  | 'T0'
  | 'T1'
  | 'T2'
  | 'T3'
  | 'X0'
  | 'X1'
  | 'X2'
  | 'X3'
  | 'S1'
  | 'S2'
  | 'R1'
  | 'R2'
  | 'DO'
  | 'RE'
  | 'MI'
  | 'FA'
  | 'FAUP'
  | 'SO'
  | 'LA'
  | 'TI'
  | 'D'
  | 'H'
  | 'N'
  | 'G'
  | 'M'
  | 'X'
  | 'CX'
  | 'CI'
  | 'S'
  | 'SQ'
  | 'TU'
  | 'TD'
  | 'SF'
  | 'SB';

export type NoteStemDirection = 'auto' | 'up' | 'down' | 'none';

export type Clef = {
  type: 'clef';
  sign: ClefSign | null;
  line: number | null;
  octaveChange: number | null;
};

export type ClefSign = 'G' | 'F' | 'C' | 'percussion' | 'TAB' | 'jianpu' | 'none';

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

export type KeyMode =
  | 'none'
  | 'major'
  | 'minor'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'aeolian'
  | 'ionian'
  | 'locrian';

export type Time = {
  type: 'time';
  components: Fraction[];
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
