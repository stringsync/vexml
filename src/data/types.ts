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
  index: number;
  label: string;
  entries: Array<Fragment | Gap>;
};

export type Fragment = {
  type: 'fragment';
  signature: FragmentSignature | null;
  parts: Part[];
};

export type Gap = {
  type: 'gap';
};

export type Part = {
  type: 'part';
  id: string;
  staves: Stave[];
};

export type Stave = {
  type: 'stave';
  entry: Chorus | MultiRest;
};

export type Chorus = {
  type: 'chorus';
};

export type MultiRest = {
  type: 'multirest';
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
  | GhostNote
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

export type GhostNote = {
  type: 'ghostnote';
  duration: Fraction;
};

export type SymbolNote = {
  type: 'symbolnote';
  duration: Fraction;
};

export type FragmentSignature = {
  type: 'fragmentsignature';
  metronome: Metronome;
  clefs: Clef[];
  keySignatures: KeySignature[];
  timeSignatures: TimeSignature[];
  staveLineCounts: StaveLineCount[];
};

export type Clef = {
  type: 'clef';
  partId: string;
  staveNumber: number;
  sign: ClefSign;
  line: number | null;
  octaveChange: number | null;
};

export type ClefSign = 'G' | 'F' | 'C' | 'percussion' | 'TAB' | 'jianpu' | 'none';

export type KeySignature = {
  type: 'keysignature';
  partId: string;
  staveNumber: number;
  previousKeySignature: PreviousKeySignature | null;
  fifths: number;
  mode: KeyMode;
};

export type PreviousKeySignature = {
  type: 'previouskeysignature';
  partId: string;
  staveNumber: number;
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

export type TimeSignature = {
  type: 'timesignature';
  partId: string;
  staveNumber: number;
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

export type StaveLineCount = {
  type: 'stavelinecount';
  partId: string;
  staveNumber: number;
  lineCount: number;
};
