export type NoteMessage = {
  type: 'note';
  stem: 'up' | 'down';
  pitch: string;
  duration: '1/16' | '1/8' | '1/4' | '1/2' | '1'
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

// TODO(jaredjj3/vexml#1): Formalize a node definition.
export type XMLNode = any;