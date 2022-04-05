export type MeasureStartMessage = {
  msgType: 'measureStart';
  width: string;
  staves: string;
  clef: string[];
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
  rest: boolean;
  stem: string;
  pitch: string;
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
