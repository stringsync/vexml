import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Accidental, AccidentalRendering } from './accidental';
import { Config } from './config';
import { Lyric, LyricRendering } from './lyric';
import { NoteDurationDenominator, StemDirection } from './enums';
import { Clef } from './clef';
import { KeySignature } from './keysignature';
import { Token, TokenRendering } from './token';
import * as conversions from './conversions';

import { Ornament, OrnamentRendering } from './ornament';
import { Spanners } from './spanners';
import { Address } from './address';

const STEP_ORDER = [
  'Cb',
  'C',
  'C#',
  'Db',
  'D',
  'D#',
  'Eb',
  'E',
  'Fb',
  'F',
  'F#',
  'Gb',
  'G',
  'G#',
  'Ab',
  'A',
  'A#',
  'Bb',
  'B',
  'B#',
];

const DURATIONS_SHORTER_THAN_QUARTER_NOTE: NoteDurationDenominator[] = [
  '1024',
  '512',
  '256',
  '128',
  '64',
  '32',
  '16',
  '8',
];

export type NoteModifierRendering = AccidentalRendering | LyricRendering | TokenRendering | OrnamentRendering;

/** The result of rendering a Note. */
export type NoteRendering = {
  type: 'note';
  key: string;
  vexflow: {
    staveNote: vexflow.StaveNote;
  };
  modifiers: NoteModifierRendering[];
  timeModification: musicxml.TimeModification | null;
};

/** The result of rendering a grace Note. */
export type GraceNoteRendering = {
  type: 'gracenote';
  vexflow: {
    graceNote: vexflow.GraceNote;
  };
  modifiers: NoteModifierRendering[];
};

/**
 * Represents an individual musical note, encapsulating its pitch, duration, and other associated notations.
 *
 * The `Note` class is foundational to musical notation, capturing the basic elements required to convey a musical idea.
 * Whether representing a sounded pitch, each note carries with it a wealth of information, including its rhythmic
 * value, position on the stave, and potential modifications or embellishments.
 *
 * Notes can exist in various forms ranging from whole notes to sixteenth notes and beyond, with potential ties, dots,
 * and other modifiers affecting their duration and representation.
 */
export class Note {
  private config: Config;
  private musicXML: {
    note: musicxml.Note;
    directions: musicxml.Direction[];
    octaveShift: musicxml.OctaveShift | null;
  };
  private stem: StemDirection;
  private clef: Clef;
  private keySignature: KeySignature;
  private durationDenominator: NoteDurationDenominator;

  constructor(opts: {
    config: Config;
    musicXML: {
      note: musicxml.Note;
      directions: musicxml.Direction[];
      octaveShift: musicxml.OctaveShift | null;
    };
    stem: StemDirection;
    durationDenominator: NoteDurationDenominator;
    clef: Clef;
    keySignature: KeySignature;
  }) {
    this.config = opts.config;
    this.musicXML = opts.musicXML;
    this.stem = opts.stem;
    this.durationDenominator = opts.durationDenominator;
    this.clef = opts.clef;
    this.keySignature = opts.keySignature;
  }

  /**
   * Renders multiple notes as a single vexflow.StaveNote.
   *
   * This exists to dedup code with rendering.Chord without exposing private members in this class.
   */
  static render(opts: {
    notes: Note[];
    spanners: Spanners;
    address: Address<'voice'>;
  }): Array<NoteRendering | GraceNoteRendering> {
    const notes = Note.sort(opts.notes);

    util.assert(notes.length > 0, 'cannot render empty notes');

    const durationDenominators = new Set(notes.map((note) => note.durationDenominator));
    util.assert(durationDenominators.size === 1, 'all notes must have the same durationDenominator');

    const dotCounts = new Set(notes.map((note) => note.getDotCount()));
    util.assert(dotCounts.size === 1, 'all notes must have the same dotCount');

    const clefTypes = new Set(notes.map((note) => note.clef));
    util.assert(clefTypes.size === 1, 'all notes must have the same clefTypes');

    const keys = notes.map((note) => note.getKey());

    const { autoStem, stemDirection } = Note.getStemParams(notes);

    const vfStaveNote = new vexflow.StaveNote({
      keys,
      duration: util.first(notes)!.durationDenominator,
      dots: util.first(notes)!.getDotCount(),
      clef: util.first(notes)!.clef.getType(),
      autoStem,
      stemDirection,
    });

    for (let index = 0; index < util.first(notes)!.getDotCount(); index++) {
      vexflow.Dot.buildAndAttach([vfStaveNote], { all: true });
    }

    const modifierRenderingGroups = notes.map<NoteModifierRendering[]>((note) => {
      const renderings = new Array<NoteModifierRendering>();

      const accidental = note.getAccidental();
      if (accidental) {
        renderings.push(accidental.render());
      }

      // Lyrics sorted by ascending verse number.
      for (const lyric of note.getLyrics()) {
        renderings.push(lyric.render());
      }

      for (const token of note.getTokens()) {
        renderings.push(token.render());
      }

      for (const ornament of note.getOrnaments()) {
        renderings.push(ornament.render());
      }

      return renderings;
    });

    for (let index = 0; index < modifierRenderingGroups.length; index++) {
      for (const modifierRendering of modifierRenderingGroups[index]) {
        switch (modifierRendering.type) {
          case 'accidental':
            vfStaveNote.addModifier(modifierRendering.vexflow.accidental, index);
            break;
          case 'lyric':
            vfStaveNote.addModifier(modifierRendering.vexflow.annotation, index);
            break;
          case 'token':
            vfStaveNote.addModifier(modifierRendering.vexflow.annotation, index);
            break;
          case 'ornament':
            vfStaveNote.addModifier(modifierRendering.vexflow.ornament, index);
            break;
        }
      }
    }

    const noteRenderings = new Array<NoteRendering>();

    for (let index = 0; index < keys.length; index++) {
      opts.spanners.process({
        keyIndex: index,
        address: opts.address,
        musicXML: {
          directions: notes[index].musicXML.directions,
          note: notes[index].musicXML.note,
          octaveShift: notes[index].musicXML.octaveShift,
        },
        vexflow: {
          staveNote: vfStaveNote,
        },
      });

      noteRenderings.push({
        type: 'note',
        key: keys[index],
        modifiers: modifierRenderingGroups[index],
        vexflow: {
          staveNote: vfStaveNote,
        },
        timeModification: notes[index].getTimeModification(),
      });
    }

    return noteRenderings;
  }

  private static sort(notes: Note[]): Note[] {
    return [...notes].sort((note1, note2) => {
      // Get the pitches and octaves
      const step1 = note1.getStep();
      const octave1 = note1.getOctave();
      const step2 = note2.getStep();
      const octave2 = note2.getOctave();

      // Compare by octave first
      if (octave1 < octave2) return -1;
      if (octave1 > octave2) return 1;

      // If octaves are equal, compare by pitch
      const indexA = STEP_ORDER.indexOf(step1);
      const indexB = STEP_ORDER.indexOf(step2);

      return indexA - indexB;
    });
  }

  private static getStemParams(notes: Note[]): { autoStem?: boolean; stemDirection?: number } {
    switch (notes[0]?.stem) {
      case 'up':
        return { stemDirection: vexflow.Stem.UP };
      case 'down':
        return { stemDirection: vexflow.Stem.DOWN };
      case 'none':
        return {};
      default:
        return { autoStem: true };
    }
  }

  /** Renders the Note. */
  render(opts: { spanners: Spanners; address: Address<'voice'> }): NoteRendering | GraceNoteRendering {
    return util.first(
      Note.render({
        notes: [this],
        spanners: opts.spanners,
        address: opts.address,
      })
    )!;
  }

  @util.memoize()
  private getAccidental(): Accidental | null {
    const noteAccidentalCode =
      conversions.fromAccidentalTypeToAccidentalCode(this.musicXML.note.getAccidentalType()) ??
      conversions.fromAlterToAccidentalCode(this.musicXML.note.getAlter());

    const keySignatureAccidentalCode = this.keySignature.getAccidentalCode(this.musicXML.note.getStep());

    const hasExplicitAccidental = this.musicXML.note.getAccidentalType() !== null;
    if (hasExplicitAccidental || noteAccidentalCode !== keySignatureAccidentalCode) {
      const isCautionary = this.musicXML.note.hasAccidentalCautionary();
      return new Accidental({ code: noteAccidentalCode, isCautionary });
    }

    return null;
  }

  @util.memoize()
  private getLyrics(): Lyric[] {
    return this.musicXML.note
      .getLyrics()
      .sort((a, b) => a.getVerseNumber() - b.getVerseNumber())
      .map((lyric) => new Lyric({ musicXML: { lyric } }));
  }

  private getOrnaments(): Ornament[] {
    return this.musicXML.note
      .getNotations()
      .flatMap((notations) => notations.getOrnaments())
      .flatMap((ornaments) => new Ornament({ musicXML: { ornaments } }));
  }

  private getDotCount(): number {
    return this.musicXML.note.getDotCount();
  }

  private getStep(): string {
    return this.musicXML.note.getStep();
  }

  private getOctave(): number {
    return (
      this.musicXML.note.getOctave() -
      this.clef.getOctaveChange() +
      conversions.fromOctaveShiftToOctaveCount(this.musicXML.octaveShift)
    );
  }

  private getKey(): string {
    const step = this.getStep();
    const octave = this.getOctave();
    const notehead = this.musicXML.note.getNotehead();
    const suffix = conversions.fromNoteheadToNoteheadSuffix(notehead);
    return suffix ? `${step}/${octave}/${suffix}` : `${step}/${octave}`;
  }

  private getTimeModification(): musicxml.TimeModification | null {
    return this.musicXML.note.getTimeModification();
  }

  private getTokens(): Token[] {
    return this.musicXML.directions
      .flatMap((direction) => direction.getTypes())
      .flatMap((directionType) => directionType.getContent())
      .filter((content): content is musicxml.TokensDirectionTypeContent => content.type === 'tokens')
      .flatMap((content) => content.tokens)
      .map((token) => new Token({ musicXML: { token } }));
  }

  private getVfGraceNoteGroup(opts: {
    musicXML: { notes: musicxml.Note[] };
    vexflow: { modifierPosition: vexflow.ModifierPosition };
  }): vexflow.GraceNoteGroup {
    const graceNotes = opts.musicXML.notes.map(
      (note) =>
        new Note({
          config: this.config,
          clef: this.clef,
          durationDenominator: conversions.fromNoteTypeToNoteDurationDenominator(note.getType()) ?? '8',
          musicXML: { note, directions: [], octaveShift: this.musicXML.octaveShift },
          keySignature: this.keySignature,
          stem: this.stem,
        })
    );

    const vfGraceNotes = graceNotes.map((note) => {
      const vfGraceNote = new vexflow.GraceNote({
        keys: [note.getKey()],
        slash: note.musicXML.note.hasGraceSlash(),
        duration: note.durationDenominator,
      });

      const vfAccidental = note.getAccidental()?.render().vexflow.accidental;
      if (vfAccidental) {
        vfGraceNote.addModifier(vfAccidental, 0);
      }

      return vfGraceNote;
    });

    const hasGraceSlur = graceNotes
      .flatMap((note) => note.musicXML.note.getNotations())
      .some((notation) => notation.getSlurs().length > 0);

    const vfGraceNoteGroup = new vexflow.GraceNoteGroup(vfGraceNotes, hasGraceSlur).setPosition(
      opts.vexflow.modifierPosition
    );

    if (
      graceNotes.length > 1 &&
      graceNotes.every((note) => DURATIONS_SHORTER_THAN_QUARTER_NOTE.includes(note.durationDenominator))
    ) {
      vfGraceNoteGroup.beamNotes();
    }

    return vfGraceNoteGroup;
  }
}
