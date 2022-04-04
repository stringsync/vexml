export type VoiceStartMessage = {
  type: 'voiceStart';
};

export type VoiceEndMessage = {
  type: 'voiceEnd';
};

export type BeamStartMessage = {
  type: 'beamStart';
};

export type BeamEndMessage = {
  type: 'beamEnd';
};

export type NoteMessage = {
  type: 'note';
  stem: string;
  pitch: string;
  duration: string;
  accidental: string;
};

export type ClefMessage = {
  type: 'clef';
  clef: string;
};

export type TimeSignatureMessage = {
  type: 'timeSignature';
  top: string;
  bottom: string;
};

export type EasyScoreMessage =
  | NoteMessage
  | ClefMessage
  | TimeSignatureMessage
  | VoiceStartMessage
  | VoiceEndMessage
  | BeamStartMessage
  | BeamEndMessage;

export type EasyScoreMessageReceiver = {
  onMessage(message: EasyScoreMessage): void;
};
