import * as data from '@/data';
import * as musicxml from '@/musicxml';
import * as conversions from './conversions';
import * as util from '@/util';
import { Notehead, StemDirection } from './enums';
import { Accidental } from './accidental';
import { Fraction } from './fraction';
import { NoteContext, VoiceContext } from './contexts';
import { Annotation } from './annotation';

export type NoteMod = Accidental | Annotation;

type NoteAccidentalProps = {
  code: data.AccidentalCode;
  isCautionary: boolean;
};

export class Note {
  constructor(
    private pitch: string,
    private octave: number,
    private head: Notehead,
    private dotCount: number,
    private stemDirection: StemDirection,
    private duration: util.Fraction,
    private measureBeat: util.Fraction,
    private lyrics: Annotation[],
    private accidentalProps: NoteAccidentalProps
  ) {}

  static fromMusicXML(measureBeat: util.Fraction, duration: util.Fraction, musicXML: { note: musicxml.Note }): Note {
    const pitch = musicXML.note.getStep();
    const octave = musicXML.note.getOctave();
    const head = conversions.fromNoteheadToNotehead(musicXML.note.getNotehead());
    const dotCount = musicXML.note.getDotCount();
    const stem = conversions.fromStemToStemDirection(musicXML.note.getStem());
    const annotations = musicXML.note.getLyrics().map((lyric) => Annotation.fromLyric({ lyric }));
    const accidentalProps = Note.getAccidentalProps(musicXML);
    return new Note(pitch, octave, head, dotCount, stem, duration, measureBeat, annotations, accidentalProps);
  }

  private static getAccidentalProps(musicXML: { note: musicxml.Note }): NoteAccidentalProps {
    const code =
      conversions.fromAccidentalTypeToAccidentalCode(musicXML.note.getAccidentalType()) ??
      conversions.fromAlterToAccidentalCode(musicXML.note.getAlter()) ??
      'n';
    const isCautionary = musicXML.note.hasAccidentalCautionary();
    return { code, isCautionary };
  }

  getPitch(): string {
    return this.pitch;
  }

  parse(voiceCtx: VoiceContext): data.Note {
    const noteCtx = new NoteContext(voiceCtx, this.pitch, this.octave);

    return {
      type: 'note',
      pitch: this.pitch,
      octave: this.octave,
      head: this.head,
      dotCount: this.dotCount,
      stemDirection: this.stemDirection,
      duration: this.getDuration().parse(),
      measureBeat: this.getMeasureBeat().parse(),
      mods: this.getMods(noteCtx).map((mod) => mod.parse(noteCtx)),
    };
  }

  private getMods(noteCtx: NoteContext): NoteMod[] {
    const mods = new Array<NoteMod>();

    const accidental = this.getAccidental(noteCtx);
    if (accidental) {
      mods.push(accidental);
    }

    mods.push(...this.lyrics);

    return mods;
  }

  private getAccidental(noteCtx: NoteContext): Accidental | null {
    const isCautionary = this.accidentalProps.isCautionary;

    const noteAccidental = this.accidentalProps.code;
    const keyAccidental = noteCtx.getKeyAccidental();
    const activeAccidental = noteCtx.getActiveAccidental();

    if (!isCautionary && keyAccidental === noteAccidental) {
      return null;
    }

    if (!isCautionary && activeAccidental === noteAccidental) {
      return null;
    }

    return new Accidental(this.accidentalProps.code, this.accidentalProps.isCautionary);
  }

  private getDuration(): Fraction {
    return new Fraction(this.duration);
  }

  private getMeasureBeat(): Fraction {
    return new Fraction(this.measureBeat);
  }
}
