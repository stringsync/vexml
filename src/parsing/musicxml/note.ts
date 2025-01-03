import * as data from '@/data';
import * as musicxml from '@/musicxml';
import * as conversions from './conversions';
import * as util from '@/util';
import { Notehead, StemDirection } from './enums';
import { Accidental } from './accidental';
import { Fraction } from './fraction';
import { Key } from './key';

export type NoteMod = Accidental;

export class Note {
  constructor(
    private pitch: string,
    private octave: number,
    private head: Notehead,
    private dotCount: number,
    private stemDirection: StemDirection,
    private duration: util.Fraction,
    private measureBeat: util.Fraction,
    private accidental: Accidental
  ) {}

  static fromMusicXML(measureBeat: util.Fraction, duration: util.Fraction, musicXML: { note: musicxml.Note }): Note {
    const pitch = musicXML.note.getStep();
    const octave = musicXML.note.getOctave();
    const head = conversions.fromNoteheadToNotehead(musicXML.note.getNotehead());
    const dotCount = musicXML.note.getDotCount();
    const stem = conversions.fromStemToStemDirection(musicXML.note.getStem());

    const accidental = Accidental.fromMusicXML({ note: musicXML.note });
    return new Note(pitch, octave, head, dotCount, stem, duration, measureBeat, accidental);
  }

  parse(key: Key): data.Note {
    return {
      type: 'note',
      pitch: this.pitch,
      octave: this.octave,
      head: this.head,
      dotCount: this.dotCount,
      stemDirection: this.stemDirection,
      duration: this.getDuration().parse(),
      measureBeat: this.getMeasureBeat().parse(),
      mods: this.parseMods(key),
    };
  }

  private parseMods(key: Key): data.NoteMod[] {
    const mods = new Array<data.NoteMod>();

    const keyAccidentalCode = key.getAccidentalCode(this.pitch);
    const accidental = this.accidental.parse(keyAccidentalCode);
    if (accidental) {
      mods.push(accidental);
    }

    return mods;
  }

  private getDuration(): Fraction {
    return new Fraction(this.duration);
  }

  private getMeasureBeat(): Fraction {
    return new Fraction(this.measureBeat);
  }
}
