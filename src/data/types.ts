export type Score = {
  title: string;
  systems: System[];
};

export type System = {
  measures: Measure[];
};

export type Measure = {
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
  staves: Stave[];
};

export type Stave = {
  entry: Chorus | MultiRest;
};

export type Chorus = {
  type: 'chorus';
};

export type MultiRest = {
  type: 'multirest';
};

export type Voice = {
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
  metronome: Metronome;
  clefs: Clef[];
  keySignatures: KeySignature[];
  timeSignatures: TimeSignature[];
  staveLineCounts: StaveLineCount[];
};

export type Clef = {
  partId: string;
  staveNumber: number;
  sign: ClefSign;
  line: number | null;
  octaveChange: number | null;
};

export type ClefSign = 'G' | 'F' | 'C' | 'percussion' | 'TAB' | 'jianpu' | 'none';

export type KeySignature = {
  partId: string;
  staveNumber: number;
  previousKeySignature: KeySignature | null;
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
  partId: string;
  staveNumber: number;
  components: Fraction[];
};

export type Fraction = {
  numerator: number;
  denominator: number;
};

export type Metronome = {
  name?: string;
  parenthesis?: boolean;
  duration?: string;
  dots?: number;
  bpm?: number | string;
  duration2?: string;
  dots2?: number;
};

export type StaveLineCount = {
  partId: string;
  staveNumber: number;
  lineCount: number;
};
