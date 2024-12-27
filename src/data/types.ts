export type Score = {
  type: 'score';
  title: string;
  systems: System[];
};

export type System = {
  type: 'system';
  measures: Measure[];
};

export type Measure = {
  type: 'measure';
  label: string;
  entries: Array<Fragment | Gap>;
};

export type Fragment = {
  type: 'fragment';
  signature: FragmentSignature;
  parts: Part[];
};

export type FragmentSignature = {
  type: 'fragmentsignature';
  metronome: Metronome;
};

export type Gap = {
  type: 'gap';
  text?: string;
  width?: number;
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
  chorus: Chorus;
};

export type StaveSignature = {
  type: 'stavesignature';
  lineCount: number;
  clef: Clef;
  key: Key;
  time: Time;
};

export type Chorus = {
  type: 'chorus';
};

export type Voice = {
  type: 'voice';
  id: string;
  entries: Array<VoiceEntry>;
};

export type VoiceEntry =
  | StaveNote
  | StaveChord
  | StaveGraceNote
  | StaveGraceChord
  | TabNote
  | TabChord
  | TabGraceNote
  | TabGraceChord
  | Rest
  | SymbolNote;

export type StaveNote = {
  type: 'stavenote';
  duration: Fraction;
};

export type StaveChord = {
  type: 'stavechord';
  notes: StaveNote[];
};

export type StaveGraceNote = {
  type: 'stavegracenote';
  duration: Fraction;
};

export type StaveGraceChord = {
  type: 'stavegracechord';
  notes: StaveNote[];
};

export type TabNote = {
  type: 'tabnote';
  duration: Fraction;
};

export type TabChord = {
  type: 'tabchord';
  notes: TabNote[];
};

export type TabGraceNote = {
  type: 'tabgracenote';
  duration: Fraction;
};

export type TabGraceChord = {
  type: 'tabgracechord';
  notes: TabGraceNote[];
};

export type Rest = {
  type: 'rest';
  duration: Fraction;
};

export type SymbolNote = {
  type: 'symbolnote';
  duration: Fraction;
};

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
