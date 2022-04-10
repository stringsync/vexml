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
  | BeamEndMessage;

export type EasyScoreMessageReceiver = {
  onMessage(message: EasyScoreMessage): void;
};

export type Getter<T> = () => T;

export interface CodeTracker {
  let<T>(variableName: string, getter: Getter<T>): T;
  const<T>(variableName: string, getter: Getter<T>): T;
  literal(literal: string): void;
  expression<T>(getter: Getter<T>): T;
  comment(comment: string): void;
  newline(): void;
}
