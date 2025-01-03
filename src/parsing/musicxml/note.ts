import * as data from '@/data';
import * as musicxml from '@/musicxml';
import * as conversions from './conversions';
import * as util from '@/util';
import { Notehead, StemDirection } from './enums';
import { Accidental } from './accidental';
import { Fraction } from './fraction';

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
    private mods: NoteMod[]
  ) {}

  static fromMusicXML(measureBeat: util.Fraction, duration: util.Fraction, musicXML: { note: musicxml.Note }): Note {
    const pitch = musicXML.note.getStep();
    const octave = musicXML.note.getOctave();
    const head = conversions.fromNoteheadToNotehead(musicXML.note.getNotehead());
    const dotCount = musicXML.note.getDotCount();
    const stem = conversions.fromStemToStemDirection(musicXML.note.getStem());
    return new Note(pitch, octave, head, dotCount, stem, duration, measureBeat, []);
  }

  parse(): data.Note {
    return {
      type: 'note',
      pitch: this.pitch,
      octave: this.octave,
      head: this.head,
      dotCount: this.dotCount,
      stemDirection: this.stemDirection,
      duration: this.getDuration().parse(),
      measureBeat: this.getMeasureBeat().parse(),
      mods: this.mods.map((mod) => mod.parse()),
    };
  }

  private getDuration(): Fraction {
    return new Fraction(this.duration);
  }

  private getMeasureBeat(): Fraction {
    return new Fraction(this.measureBeat);
  }
}
