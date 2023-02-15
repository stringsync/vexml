export type VexmlConfig = {
  DEFAULT_MEASURE_WIDTH_PX: number;
  DEFAULT_MEASURE_NUM_STAVES: number;
  DEFAULT_PART_ID: string;
  DEFAULT_STEP_VALUE: string;
  DEFAULT_OCTAVE_VALUE: string;
  DEFAULT_STEM_VALUE: string | null;
  DEFAULT_ACCIDENTAL_VALUE: string;
  DEFAULT_ACCIDENTAL_CAUTIONARY: boolean;
  DEFAULT_NOTEHEAD_VALUE: string;
  DEFAULT_NOTE_DURATION: number;
  DEFAULT_CLEF_SIGN: ClefSign;
  DEFAULT_STAFF_LINE: number;
  DEFAULT_BEATS: string;
  DEFAULT_BEAT_TYPE: string;
  DEFAULT_FIFTHS: number;
  DEFAULT_SYLLABIC: string;
};

export type MeasureStartMessage = {
  msgType: 'measureStart';
  width?: number;
  staves?: number;
};

export type PartStartMessage = {
  msgType: 'partStart';
  msgIndex: number;
  msgCount: number;
  id: string;
};

export type PrintMessage = {
  msgType: 'print';
  newSystem: boolean;
  newPage: boolean;
  systemLayout: { leftMargin?: number; rightMargin?: number; topSystemMargin?: number; systemMargin?: number };
  staffLayout: { staffDistance?: number }[];
};

// Receivers should prefer to use ClefMessage, TimeMessage, and KeyMessage.
export type LegacyAttributesMessage = {
  msgType: 'legacyAttributes';
  clefs: ClefMessage[];
  times: TimeMessage[];
  keys: KeyMessage[];
};

export type ClefSign = 'G' | 'F' | 'C' | 'percussion' | 'TAB' | 'jianpu' | 'none';

export type ClefMessage = {
  msgType: 'clef';
  staff: number | null;
  sign: ClefSign;
  line: number | null;
  octaveChange: number | null;
};

export type TimeMessage = {
  msgType: 'time';
  staff: number | null;
  beats: string;
  beatType: string;
};

export type KeyMessage = {
  msgType: 'key';
  staff: number | null;
  fifths: number;
};

export type DirectionMessage = {
  msgType: 'direction';
  codas: Record<string, never>[];
  segnos: Record<string, never>[];
};

export type MeasureEndMessage = {
  msgType: 'measureEnd';
};

export type PartEndMessage = {
  msgType: 'partEnd';
  msgIndex: number;
  msgCount: number;
  id: string;
};

export type BeamMessage = {
  msgType: 'beam';
  name: string;
  value: string;
  number: number;
  type?: string;
  placement?: string;
};

export type VoiceEndMessage = {
  msgType: 'voiceEnd';
  voice: string;
};

export type VoiceStartMessage = {
  msgType: 'voiceStart';
  voice: string;
};

export type NoteMessageHead = Array<{
  pitch: string;
  accidental: string;
  accidentalCautionary: boolean;
  notehead: string;
}>;

export type NoteMessage = {
  msgType: 'note';
  stem?: string | null;
  dots: number;
  head: NoteMessageHead;
  type: string;
  duration?: number;
  grace: boolean;
  graceSlash: boolean;
  arpeggiate: boolean;
  arpeggiateDirection?: string;
  voice: string;
  staff: number;
};

export type NotationMessage = {
  msgType: 'notation';
  name: string;
  value: string;
  number: number;
  type?: string;
  placement?: string;
};

export type LyricMessage = {
  msgType: 'lyric';
  text: string;
  syllabic: string;
};

export type BarlineMessage = {
  msgType: 'barline';
  barStyle?: string | null;
  repeatDirection?: string | null;
  location: string;
  ending?: { number: string; type: string; text: string } | null;
};

export type VexmlMessage =
  | BarlineMessage
  | LyricMessage
  | NoteMessage
  | NotationMessage
  | LegacyAttributesMessage
  | ClefMessage
  | TimeMessage
  | KeyMessage
  | DirectionMessage
  | MeasureStartMessage
  | MeasureEndMessage
  | PartStartMessage
  | PartEndMessage
  | PrintMessage
  | BeamMessage
  | VoiceStartMessage
  | VoiceEndMessage;

export interface VexmlMessageProducer<T = never> {
  sendMessages(receiver: VexmlMessageReceiver, ctx: T): void;
}

export interface VexmlMessageReceiver {
  onMessage(message: VexmlMessage): void;
}

export type Getter<T> = () => T;

export interface CodeTracker {
  let<T>(variableName: string, getter: Getter<T>): T;
  const<T>(variableName: string, getter: Getter<T>): T;
  expression<T>(getter: Getter<T>): T;
  comment(comment: string): void;
  newline(): void;
  literal(literal: string): void;
}
