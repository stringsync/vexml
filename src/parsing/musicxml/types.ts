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
  beat: Fraction;
  musicXML: {
    note: musicxml.Note;
  };
};

export type AttributesEvent = {
  type: 'attributes';
  partId: string;
  measureIndex: number;
  beat: Fraction;
  musicXML: {
    attributes: musicxml.Attributes;
  };
};

export type MetronomeEvent = {
  type: 'metronome';
  partId: string;
  measureIndex: number;
  beat: Fraction;
  musicXML: {
    metronome: musicxml.Metronome;
  };
};

export type MeasureEvent = NoteEvent | AttributesEvent | MetronomeEvent;

export type LeafEvent = NoteEvent;
