import * as musicxml from '@/musicxml';
import * as conversions from './conversions';
import { Fraction } from '@/util';
import { Notehead, StemDirection } from './enums';
import { Accidental } from './accidental';

export type NoteMod = Accidental;

export class Note {
  constructor(
    private pitch: string,
    private octave: number,
    private head: Notehead,
    private dotCount: number,
    private stemDirection: StemDirection,
    private duration: Fraction,
    private measureBeat: Fraction,
    private mods: NoteMod[]
  ) {}

  static fromMusicXML(measureBeat: Fraction, duration: Fraction, musicXML: { note: musicxml.Note }): Note {
    const pitch = musicXML.note.getStep();
    const octave = musicXML.note.getOctave();
    const head = conversions.fromNoteheadToNotehead(musicXML.note.getNotehead());
    const dotCount = musicXML.note.getDotCount();
    const stem = conversions.fromStemToStemDirection(musicXML.note.getStem());
    return new Note(pitch, octave, head, dotCount, stem, duration, measureBeat, []);
  }

  getPitch(): string {
    return this.pitch;
  }

  getOctave(): number {
    return this.octave;
  }

  getHead(): Notehead {
    return this.head;
  }

  getDotCount(): number {
    return this.dotCount;
  }

  getStemDirection(): StemDirection {
    return this.stemDirection;
  }

  getDuration(): Fraction {
    return this.duration;
  }

  getMeasureBeat(): Fraction {
    return this.measureBeat;
  }

  getMods(): NoteMod[] {
    return this.mods;
  }
}
