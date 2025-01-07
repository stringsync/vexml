import * as data from '@/data';
import * as musicxml from '@/musicxml';
import * as conversions from './conversions';
import * as util from '@/util';
import { Notehead, StemDirection } from './enums';
import { Accidental } from './accidental';
import { Fraction } from './fraction';
import { NoteContext, VoiceContext } from './contexts';
import { Annotation } from './annotation';
import { Pitch } from './pitch';
import { Slur } from './slur';
import { Tie } from './tie';
import { Beam } from './beam';

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
    private durationType: data.DurationType,
    private dotCount: number,
    private stemDirection: StemDirection,
    private duration: util.Fraction,
    private measureBeat: util.Fraction,
    private lyrics: Annotation[],
    private accidentalProps: NoteAccidentalProps,
    private ties: Tie[],
    private beam: Beam | null
  ) {}

  static fromMusicXML(measureBeat: util.Fraction, duration: util.Fraction, musicXML: { note: musicxml.Note }): Note {
    const pitch = musicXML.note.getStep();
    const octave = musicXML.note.getOctave();
    const head = conversions.fromNoteheadToNotehead(musicXML.note.getNotehead());

    let durationType = conversions.fromNoteTypeToDurationType(musicXML.note.getType());
    let dotCount = musicXML.note.getDotCount();
    if (!durationType) {
      [durationType, dotCount] = conversions.fromFractionToDurationType(duration);
    }

    const stem = conversions.fromStemToStemDirection(musicXML.note.getStem());
    const annotations = musicXML.note.getLyrics().map((lyric) => Annotation.fromLyric({ lyric }));
    const accidentalProps = Note.getAccidentalProps(musicXML);

    const ties = musicXML.note
      .getNotations()
      .flatMap((notation) => notation.getTieds())
      .map((tie) => Tie.fromMusicXML({ tie }));

    // MusicXML encodes each beam line as a separate <beam>. We only care about the presence of beams, so we only check
    // the first one. vexflow will eventually do the heavy lifting of inferring the note durations and beam structures.
    let beam: Beam | null = null;
    if (musicXML.note.getBeams().length > 0) {
      beam = Beam.fromMusicXML({ beam: musicXML.note.getBeams().at(0)! });
    }

    return new Note(
      pitch,
      octave,
      head,
      durationType,
      dotCount,
      stem,
      duration,
      measureBeat,
      annotations,
      accidentalProps,
      ties,
      beam
    );
  }

  private static getAccidentalProps(musicXML: { note: musicxml.Note }): NoteAccidentalProps {
    const code =
      conversions.fromAccidentalTypeToAccidentalCode(musicXML.note.getAccidentalType()) ??
      conversions.fromAlterToAccidentalCode(musicXML.note.getAlter()) ??
      'n';
    const isCautionary = musicXML.note.hasAccidentalCautionary();
    return { code, isCautionary };
  }

  parse(voiceCtx: VoiceContext): data.Note {
    const noteCtx = new NoteContext(voiceCtx, this.pitch, this.octave);

    return {
      type: 'note',
      pitch: this.getPitch().parse(),
      head: this.head,
      dotCount: this.dotCount,
      stemDirection: this.stemDirection,
      durationType: this.durationType,
      duration: this.getDuration().parse(),
      measureBeat: this.getMeasureBeat().parse(),
      accidental: this.getAccidental(noteCtx)?.parse(noteCtx) ?? null,
      annotations: this.getAnnotations().map((annotation) => annotation.parse()),
      curveIds: this.getCurves().map((curve) => curve.parse(noteCtx)),
      beamId: this.beam?.parse(noteCtx) ?? null,
    };
  }

  private getAnnotations(): Annotation[] {
    return this.lyrics;
  }

  private getCurves(): Array<Slur | Tie> {
    return [...this.getSlurs(), ...this.ties];
  }

  private getSlurs(): Slur[] {
    return [];
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

  private getPitch(): Pitch {
    return new Pitch(this.pitch, this.octave);
  }
}
