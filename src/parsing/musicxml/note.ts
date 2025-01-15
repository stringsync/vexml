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
import { Curve } from './curve';
import { Beam } from './beam';
import { Tuplet } from './tuplet';
import { Vibrato } from './vibrato';
import { Articulation } from './articulation';
import { Bend } from './bend';
import { TabPosition } from './tabposition';
import { Config } from '@/config';
import { Logger } from '@/debug';

type GraceNote = {
  type: 'gracenote';
  note: Note;
};

/** Container object to avoid a circular reference to Chord. */
type GraceChord = {
  type: 'gracechord';
  head: Note;
  tail: Note[];
};

type GraceEntry = GraceNote | GraceChord;

export class Note {
  constructor(
    private config: Config,
    private log: Logger,
    private pitch: Pitch,
    private head: Notehead,
    private durationType: data.DurationType,
    private dotCount: number,
    private stemDirection: StemDirection,
    private duration: Fraction,
    private measureBeat: Fraction,
    private lyrics: Annotation[],
    private accidental: Accidental,
    private curves: Curve[],
    private tuplets: Tuplet[],
    private beam: Beam | null,
    private slash: boolean,
    private graceEntries: GraceEntry[],
    private vibratos: Vibrato[],
    private articulations: Articulation[],
    private bends: Bend[],
    private tabPositions: TabPosition[]
  ) {}

  static create(
    config: Config,
    log: Logger,
    measureBeat: util.Fraction,
    duration: util.Fraction,
    musicXML: { note: musicxml.Note }
  ): Note {
    const pitch = new Pitch(config, log, musicXML.note.getStep(), musicXML.note.getOctave());
    const head = conversions.fromNoteheadToNotehead(musicXML.note.getNotehead());

    let durationType = conversions.fromNoteTypeToDurationType(musicXML.note.getType());
    let dotCount = musicXML.note.getDotCount();
    if (!durationType) {
      [durationType, dotCount] = conversions.fromFractionToDurationType(duration);
    }

    const stem = conversions.fromStemToStemDirection(musicXML.note.getStem());
    const annotations = musicXML.note.getLyrics().map((lyric) => Annotation.fromLyric(config, log, { lyric }));

    const code =
      conversions.fromAccidentalTypeToAccidentalCode(musicXML.note.getAccidentalType()) ??
      conversions.fromAlterToAccidentalCode(musicXML.note.getAlter()) ??
      'n';
    const isCautionary = musicXML.note.hasAccidentalCautionary();
    const accidental = new Accidental(config, log, code, isCautionary);

    const curves = musicXML.note.getNotations().flatMap((notation) => Curve.create(config, log, { notation }));

    const tuplets = musicXML.note
      .getNotations()
      .flatMap((notation) => notation.getTuplets())
      .map((tuplet) => Tuplet.create(config, log, { tuplet }));

    const vibratos = musicXML.note
      .getNotations()
      .flatMap((notation) => notation.getOrnaments())
      .flatMap((ornament) => ornament.getWavyLines())
      .map((entry) => Vibrato.create(config, log, { wavyLine: entry.value }));

    // Since data.Note is a superset of data.GraceNote, we can use the same model. We terminate recursion by checking if
    // the note is a grace note.
    const graceEntries = new Array<GraceEntry>();
    if (!musicXML.note.isGrace()) {
      for (const graceNote of musicXML.note.getGraceNotes()) {
        if (graceNote.isChordTail()) {
          continue;
        }

        const note = Note.create(config, log, measureBeat, util.Fraction.zero(), { note: graceNote });

        if (graceNote.isChordHead()) {
          const tail = graceNote
            .getChordTail()
            .map((note) => Note.create(config, log, measureBeat, util.Fraction.zero(), { note }));
          graceEntries.push({ type: 'gracechord', head: note, tail });
        } else {
          graceEntries.push({ type: 'gracenote', note });
        }
      }
    }

    // MusicXML encodes each beam line as a separate <beam>. We only care about the presence of beams, so we only check
    // the first one. vexflow will eventually do the heavy lifting of inferring the note durations and beam structures.
    let beam: Beam | null = null;
    if (musicXML.note.getBeams().length > 0) {
      beam = Beam.create(config, log, { beam: musicXML.note.getBeams().at(0)! });
    }

    const articulations = Articulation.create(config, log, { note: musicXML.note });

    const bends = musicXML.note
      .getNotations()
      .flatMap((n) => n.getTechnicals())
      .flatMap((t) => t.getBends())
      .map((bend) => Bend.create(config, log, { bend }));

    const slash = musicXML.note.hasGraceSlash();

    const fretPositions = TabPosition.create(config, log, { note: musicXML.note });

    return new Note(
      config,
      log,
      pitch,
      head,
      durationType,
      dotCount,
      stem,
      new Fraction(duration),
      new Fraction(measureBeat),
      annotations,
      accidental,
      curves,
      tuplets,
      beam,
      slash,
      graceEntries,
      vibratos,
      articulations,
      bends,
      fretPositions
    );
  }

  parse(voiceCtx: VoiceContext): data.Note {
    const voiceEntryCtx = VoiceEntryContext.note(voiceCtx, this.pitch.getStep(), this.pitch.getOctave());

    const tupletIds = util.unique([
      ...this.tuplets.map((tuplet) => tuplet.parse(voiceEntryCtx)).filter((id) => id !== null),
      ...voiceEntryCtx.continueOpenTuplets(),
    ]);

    // Grace entries need to be parsed before the curves because a slur may start on a grace entry.
    const graceEntries = this.parseGraceEntries(voiceEntryCtx);

    const curveIds = this.curves.map((curve) => curve.parse(voiceEntryCtx));

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
      curveIds,
      tupletIds,
      beamId: this.beam?.parse(voiceEntryCtx) ?? null,
      graceEntries,
      wedgeId: voiceEntryCtx.continueOpenWedge(),
      pedalMark: voiceEntryCtx.continueOpenPedal(),
      octaveShiftId: voiceEntryCtx.continueOpenOctaveShift(),
      vibratoIds: this.vibratos.map((vibrato) => vibrato.parse(voiceEntryCtx)),
      articulations: this.articulations.map((articulation) => articulation.parse()),
      bends: this.bends.map((bend) => bend.parse()),
      tabPositions: this.tabPositions.map((fretPosition) => fretPosition.parse()),
    };
  }

  private parseAnnotations(): data.Annotation[] {
    return [...this.lyrics].map((annotation) => annotation.parse());
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

  private parseGraceEntries(voiceEntryCtx: VoiceEntryContext): data.GraceEntry[] {
    return this.graceEntries.map((graceEntry) => {
      switch (graceEntry.type) {
        case 'gracenote':
          return this.parseGraceNote(voiceEntryCtx, graceEntry);
        case 'gracechord':
          return this.parseGraceChord(voiceEntryCtx, graceEntry);
        default:
          util.assertUnreachable();
      }
    });
  }

  private parseGraceNote(voiceEntryCtx: VoiceEntryContext, graceNote: GraceNote): data.GraceNote {
    const note = graceNote.note;
    return {
      type: 'gracenote',
      head: note.head,
      accidental: note.maybeParseAccidental(voiceEntryCtx),
      beamId: note.beam?.parse(voiceEntryCtx) ?? null,
      durationType: note.durationType,
      curveIds: note.curves.map((curve) => curve.parse(voiceEntryCtx)),
      pitch: note.pitch.parse(),
      slash: note.slash,
      tabPositions: note.tabPositions.map((tabPosition) => tabPosition.parse()),
    };
  }

  private parseGraceChord(voiceEntryCtx: VoiceEntryContext, graceChord: GraceChord): data.GraceChord {
    const notes = [graceChord.head, ...graceChord.tail].map<data.GraceChordNote>((note) => ({
      type: 'gracechordnote',
      pitch: note.pitch.parse(),
      head: note.head,
      accidental: note.maybeParseAccidental(voiceEntryCtx),
      curveIds: note.curves.map((curve) => curve.parse(voiceEntryCtx)),
      slash: note.slash,
      tabPositions: note.tabPositions.map((tabPosition) => tabPosition.parse()),
    }));

    return {
      type: 'gracechord',
      beamId: graceChord.head.beam?.parse(voiceEntryCtx) ?? null,
      durationType: graceChord.head.durationType,
      notes,
    };
  }
}
