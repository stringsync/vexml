export type MeasureStartMessage = {
  msgType: 'measureStart';
  width: number;
  staves: number;
  clefs: string[];
  time: string;
};

export type MeasureEndMessage = {
  msgType: 'measureEnd';
};

export type BeamStartMessage = {
  msgType: 'beamStart';
};

export type BeamEndMessage = {
  msgType: 'beamEnd';
};

export type VoiceEndMessage = {
  msgType: 'voiceEnd';
};

export type StaffEndMessage = {
  msgType: 'staffEnd';
  staff: string;
};

export type NoteMessage = {
  msgType: 'note';
  stem: string;
  dots: number;
  head: { pitch: string; accidental: string }[];
  type: string;
  duration: string;
  voice: string;
  staff: string;
};

export type EasyScoreMessage =
  | NoteMessage
  | MeasureStartMessage
  | MeasureEndMessage
  | BeamStartMessage
  | BeamEndMessage
  | VoiceEndMessage
  | StaffEndMessage;

export type EasyScoreMessageReceiver = {
  onMessage(message: EasyScoreMessage): void;
};

export type Getter<T> = () => T;

export interface CodeTracker {
  let<T>(variableName: string, getter: Getter<T>): T;
  const<T>(variableName: string, getter: Getter<T>): T;
  expression<T>(getter: Getter<T>): T;
  comment(comment: string): void;
  newline(): void;
  literal(literal: string): void;
}
