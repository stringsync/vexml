import { Fraction } from '@/util';
import * as musicxml from '@/musicxml';

export type SignatureChange =
  | { type: 'metronome' }
  | { type: 'stavecount'; partId: string }
  | { type: 'stavelinecount'; partId: string; staveNumber: number }
  | { type: 'clef'; partId: string; staveNumber: number }
  | { type: 'key'; partId: string; staveNumber: number }
  | { type: 'time'; partId: string; staveNumber: number };

export type NoteEvent = {
  type: 'note';
  partId: string;
  measureIndex: number;
  staveNumber: number;
  voiceId: string;
  measureBeat: Fraction;
  musicXML: {
    note: musicxml.Note;
  };
};

export type AttributesEvent = {
  type: 'attributes';
  partId: string;
  measureIndex: number;
  measureBeat: Fraction;
  musicXML: {
    attributes: musicxml.Attributes;
  };
};

export type MetronomeEvent = {
  type: 'metronome';
  partId: string;
  measureIndex: number;
  measureBeat: Fraction;
  musicXML: {
    metronome: musicxml.Metronome;
  };
};

export type MeasureStyleEvent = {
  type: 'measurestyle';
  partId: string;
  measureIndex: number;
  staveNumber: number;
  measureBeat: Fraction;
  musicXML: {
    measureStyle: musicxml.MeasureStyle;
  };
};

export type MusicXMLEvent = NoteEvent | AttributesEvent | MetronomeEvent | MeasureStyleEvent;

export type MeasureEvent = Extract<MusicXMLEvent, { measureIndex: number }>;

export type PartEvent = Extract<MusicXMLEvent, { partId: string }>;

export type StaveEvent = Extract<MusicXMLEvent, { staveNumber: number }>;

export type VoiceEvent = Extract<MusicXMLEvent, { voiceId: string }>;
