import * as data from '@/data';
import * as musicxml from '@/musicxml';
import * as conversions from './conversions';
import * as util from '@/util';
import { Notehead, StemDirection } from './enums';
import { Accidental } from './accidental';
import { Fraction } from './fraction';
import { VoiceEntryContext, VoiceContext } from './contexts';
import { Annotation } from './annotation';
import { Pitch } from './pitch';
import { Slur } from './slur';
import { Tie } from './tie';
import { Beam } from './beam';
import { Tuplet } from './tuplet';

export type NoteMod = Accidental | Annotation;

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
    private accidental: Accidental,
    private ties: Tie[],
    private slurs: Slur[],
    private tuplets: Tuplet[],
    private beam: Beam | null,
    private graceNotes: Note[]
  ) {}

  static create(measureBeat: util.Fraction, duration: util.Fraction, musicXML: { note: musicxml.Note }): Note {
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

    const code =
      conversions.fromAccidentalTypeToAccidentalCode(musicXML.note.getAccidentalType()) ??
      conversions.fromAlterToAccidentalCode(musicXML.note.getAlter()) ??
      'n';
    const isCautionary = musicXML.note.hasAccidentalCautionary();
    const accidental = new Accidental(code, isCautionary);

    const ties = musicXML.note
      .getNotations()
      .flatMap((notation) => notation.getTieds())
      .map((tie) => Tie.create({ tied: tie }));

    const slurs = musicXML.note
      .getNotations()
      .flatMap((notation) => notation.getSlurs())
      .map((slur) => Slur.fromMusicXML({ slur }));

    const tuplets = musicXML.note
      .getNotations()
      .flatMap((notation) => notation.getTuplets())
      .map((tuplet) => Tuplet.create({ tuplet }));

    // Since data.Note is a superset of data.GraceNote, we can use the same model. We terminate recursion by checking if
    // the note is a grace note.
    let graceNotes = new Array<Note>();
    if (!musicXML.note.isGrace()) {
      graceNotes = musicXML.note
        .getGraceNotes()
        .map((graceNote) => Note.create(measureBeat, util.Fraction.zero(), { note: graceNote }));
    }

    // MusicXML encodes each beam line as a separate <beam>. We only care about the presence of beams, so we only check
    // the first one. vexflow will eventually do the heavy lifting of inferring the note durations and beam structures.
    let beam: Beam | null = null;
    if (musicXML.note.getBeams().length > 0) {
      beam = Beam.create({ beam: musicXML.note.getBeams().at(0)! });
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
      accidental,
      ties,
      slurs,
      tuplets,
      beam,
      graceNotes
    );
  }

  parse(voiceCtx: VoiceContext): data.Note {
    const voiceEntryCtx = VoiceEntryContext.note(voiceCtx, this.pitch, this.octave);

    const tupletIds = util.unique([
      ...this.tuplets.map((tuplet) => tuplet.parse(voiceEntryCtx)).filter((id) => id !== null),
      ...voiceEntryCtx.continueOpenTuplets(),
    ]);

    return {
      type: 'note',
      pitch: this.getPitch().parse(),
      head: this.head,
      dotCount: this.dotCount,
      stemDirection: this.stemDirection,
      durationType: this.durationType,
      duration: this.getDuration().parse(),
      measureBeat: this.getMeasureBeat().parse(),
      accidental: this.maybeParseAccidental(voiceEntryCtx) ?? null,
      annotations: this.getAnnotations().map((annotation) => annotation.parse()),
      curveIds: this.getCurves().map((curve) => curve.parse(voiceEntryCtx)),
      tupletIds,
      beamId: this.beam?.parse(voiceEntryCtx) ?? null,
      graceNotes: [],
    };
  }

  private getAnnotations(): Annotation[] {
    return this.lyrics;
  }

  private getCurves(): Array<Slur | Tie> {
    return [...this.slurs, ...this.ties];
  }

  private maybeParseAccidental(voiceEntryCtx: VoiceEntryContext): data.Accidental | null {
    const isCautionary = this.accidental.isCautionary;

    const noteAccidental = this.accidental.code;
    const keyAccidental = voiceEntryCtx.getKeyAccidental();
    const activeAccidental = voiceEntryCtx.getActiveAccidental();

    if (!isCautionary && keyAccidental === noteAccidental) {
      return null;
    }

    if (!isCautionary && activeAccidental === noteAccidental) {
      return null;
    }

    return new Accidental(this.accidental.code, this.accidental.isCautionary).parse(voiceEntryCtx);
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
