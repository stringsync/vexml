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
    private pitch: Pitch,
    private head: Notehead,
    private durationType: data.DurationType,
    private dotCount: number,
    private stemDirection: StemDirection,
    private duration: Fraction,
    private measureBeat: Fraction,
    private lyrics: Annotation[],
    private accidental: Accidental,
    private ties: Tie[],
    private slurs: Slur[],
    private tuplets: Tuplet[],
    private beam: Beam | null,
    private slash: boolean,
    private graceNotes: Note[]
  ) {}

  static create(measureBeat: util.Fraction, duration: util.Fraction, musicXML: { note: musicxml.Note }): Note {
    const pitch = new Pitch(musicXML.note.getStep(), musicXML.note.getOctave());
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
    const graceNotes = new Array<Note>();
    if (!musicXML.note.isGrace()) {
      graceNotes.push(
        ...musicXML.note
          .getGraceNotes()
          .map((graceNote) => Note.create(measureBeat, util.Fraction.zero(), { note: graceNote }))
      );
    }

    // MusicXML encodes each beam line as a separate <beam>. We only care about the presence of beams, so we only check
    // the first one. vexflow will eventually do the heavy lifting of inferring the note durations and beam structures.
    let beam: Beam | null = null;
    if (musicXML.note.getBeams().length > 0) {
      beam = Beam.create({ beam: musicXML.note.getBeams().at(0)! });
    }

    const slash = musicXML.note.hasGraceSlash();

    return new Note(
      pitch,
      head,
      durationType,
      dotCount,
      stem,
      new Fraction(duration),
      new Fraction(measureBeat),
      annotations,
      accidental,
      ties,
      slurs,
      tuplets,
      beam,
      slash,
      graceNotes
    );
  }

  parse(voiceCtx: VoiceContext): data.Note {
    const voiceEntryCtx = VoiceEntryContext.note(voiceCtx, this.pitch.getStep(), this.pitch.getOctave());

    const tupletIds = util.unique([
      ...this.tuplets.map((tuplet) => tuplet.parse(voiceEntryCtx)).filter((id) => id !== null),
      ...voiceEntryCtx.continueOpenTuplets(),
    ]);

    return {
      type: 'note',
      pitch: this.pitch.parse(),
      head: this.head,
      dotCount: this.dotCount,
      stemDirection: this.stemDirection,
      durationType: this.durationType,
      duration: this.duration.parse(),
      measureBeat: this.measureBeat.parse(),
      accidental: this.maybeParseAccidental(voiceEntryCtx) ?? null,
      annotations: this.parseAnnotations(),
      curveIds: this.parseCurves(voiceEntryCtx),
      tupletIds,
      beamId: this.beam?.parse(voiceEntryCtx) ?? null,
      graceNotes: this.parseGraceNotes(voiceEntryCtx),
    };
  }

  private parseAnnotations(): data.Annotation[] {
    return [...this.lyrics].map((annotation) => annotation.parse());
  }

  private parseCurves(voiceEntryCtx: VoiceEntryContext): string[] {
    return [...this.slurs, ...this.ties].map((curve) => curve.parse(voiceEntryCtx));
  }

  private parseGraceNotes(voiceEntryCtx: VoiceEntryContext): data.GraceNote[] {
    return this.graceNotes.map((note) => ({
      type: 'gracenote',
      head: note.head,
      accidental: note.maybeParseAccidental(voiceEntryCtx),
      beamId: note.beam?.parse(voiceEntryCtx) ?? null,
      durationType: note.durationType,
      curveIds: note.parseCurves(voiceEntryCtx),
      pitch: note.pitch.parse(),
      slash: note.slash,
    }));
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

    return this.accidental.parse(voiceEntryCtx);
  }
}
