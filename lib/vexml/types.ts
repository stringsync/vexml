export type NoteMessage = {
  type: 'note';
  stem: 'up' | 'down';
  pitch: string;
};

export type EasyScoreMessage = NoteMessage;

export type EasyScoreMessageReceiver = {
  onMessage(message: EasyScoreMessage): void;
};
