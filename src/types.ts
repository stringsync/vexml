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
  pitch: string[];
  type: string;
  duration: string;
  accidental: string;
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
