import { Fraction } from '@/util';
import { Clef } from './clef';
import { Metronome } from './metronome';
import { Key } from './key';
import { Time } from './time';
import { StaveLineCount } from './stavelinecount';
import { StaveCount } from './stavecount';
import { Note } from './note';

export type SignatureChange =
  | { type: 'metronome' }
  | { type: 'stavecount'; partId: string }
  | { type: 'stavelinecount'; partId: string; staveNumber: number }
  | { type: 'clef'; partId: string; staveNumber: number }
  | { type: 'key'; partId: string; staveNumber: number }
  | { type: 'time'; partId: string; staveNumber: number };

export type VoiceEntry = Note;

export type NoteEvent = {
  type: 'note';
  partId: string;
  measureIndex: number;
  staveNumber: number;
  voiceId: string;
  measureBeat: Fraction;
  // TODO: This will probably need to be exploded out into note subtypes.
};

export type StaveCountEvent = {
  type: 'stavecount';
  partId: string;
  measureIndex: number;
  measureBeat: Fraction;
  staveCount: StaveCount;
};

export type StaveLineCountEvent = {
  type: 'stavelinecount';
  partId: string;
  measureIndex: number;
  measureBeat: Fraction;
  staveNumber: number;
  staveLineCount: StaveLineCount;
};

export type ClefEvent = {
  type: 'clef';
  partId: string;
  measureIndex: number;
  measureBeat: Fraction;
  staveNumber: number;
  clef: Clef;
};

export type KeyEvent = {
  type: 'key';
  partId: string;
  measureIndex: number;
  measureBeat: Fraction;
  staveNumber: number;
  key: Key;
};

export type TimeEvent = {
  type: 'time';
  partId: string;
  measureIndex: number;
  measureBeat: Fraction;
  staveNumber: number;
  time: Time;
};

export type MetronomeEvent = {
  type: 'metronome';
  partId: string;
  measureIndex: number;
  measureBeat: Fraction;
  metronome: Metronome;
};

export type MultiRestEvent = {
  type: 'multirest';
  partId: string;
  measureIndex: number;
  staveNumber: number | null;
  measureBeat: Fraction;
  measureCount: number;
};

export type MusicXMLEvent =
  | NoteEvent
  | StaveCountEvent
  | StaveLineCountEvent
  | ClefEvent
  | KeyEvent
  | TimeEvent
  | MetronomeEvent
  | MultiRestEvent;

export type MeasureEvent = Extract<MusicXMLEvent, { measureIndex: number }>;

export type PartEvent = Extract<MusicXMLEvent, { partId: string }>;

export type StaveEvent = Extract<MusicXMLEvent, { staveNumber: number }>;

export type VoiceEvent = Extract<MusicXMLEvent, { voiceId: string }>;
