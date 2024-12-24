export type Score = {
  title: string;
  measures: Measure[];
};

export type Measure = {
  index: number;
  label: string;
  entries: Array<Fragment | Gap>;
};

export type Fragment = {
  type: 'fragment';
  staveSignature: StaveSignature;
  parts: [Part, ...Part[]];
};

export type Gap = {
  type: 'gap';
};

export type Part = {
  staves: [Stave[], ...Stave[]];
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
  entries: any[];
};

export type StaveNote = {
  type: 'stavenote';
};

export type StaveChord = {
  type: 'stavechord';
  notes: StaveNote[];
};

export type StaveGraceNote = {
  type: 'stavegracenote';
};

export type StaveGraceChord = {
  type: 'stavegracechord';
  notes: StaveNote[];
};

export type TabNote = {
  type: 'tabnote';
};

export type TabChord = {
  type: 'tabchord';
  notes: TabNote[];
};

export type TabGraceNote = {
  type: 'tabgracenote';
};

export type TabGraceChord = {
  type: 'tabgracechord';
  notes: TabGraceNote[];
};

export type Rest = {
  type: 'rest';
};

export type GhostNote = {
  type: 'ghostnote';
};

export type SymbolNote = {
  type: 'symbolnote';
};

export type StaveSignature = {
  clef: Clef;
};

export type Clef = {
  sign: ClefSign;
  line: number | null;
  octaveChange: number | null;
};

export type ClefSign = 'G' | 'F' | 'C';
