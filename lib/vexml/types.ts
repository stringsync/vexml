export type NoteMessage = {
  type: 'note';
  stem: 'up' | 'down';
  pitch: string;
};

export type ClefMessage = {
  type: 'clef';
  clef: 'treble' | 'bass' | 'alto' | 'tenor';
};

export type TimeSignatureMessage = {
  type: 'timeSignature';
  top: number;
  bottom: number;
};

export type EasyScoreMessage = NoteMessage | ClefMessage | TimeSignatureMessage;

export type EasyScoreMessageReceiver = {
  onMessage(message: EasyScoreMessage): void;
};
