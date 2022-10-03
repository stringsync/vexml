export type VexmlConfig = {
  DEFAULT_MEASURE_WIDTH_PX: number;
  DEFAULT_MEASURE_NUM_STAVES: number;
  DEFAULT_PART_ID: string;
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

// see https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/attributes/
export type AttributesMessage = {
  msgType: 'attributes';
  clefs: { staff: number; sign: string; line?: number; octaveChange?: number }[];
  times: { staff?: number; signature: string }[];
  keys: { staff?: number; fifths: number }[];
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

export type NoteMessage = {
  msgType: 'note';
  stem?: string;
  dots: number;
  head: { pitch: string; accidental: string; accidentalCautionary: boolean; notehead: string }[];
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
  | AttributesMessage
  | MeasureStartMessage
  | MeasureEndMessage
  | PartStartMessage
  | PartEndMessage
  | BeamMessage
  | VoiceEndMessage;

export interface LegacyVexmlMessageProducer {
  message(receiver: VexmlMessageReceiver): void;
}

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
