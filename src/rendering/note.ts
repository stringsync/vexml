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
import { toAccidentalCode } from './conversions';

export type NoteModifierRendering = AccidentalRendering | LyricRendering | TokenRendering;

/** The result rendering a Note. */
export type NoteRendering = {
  type: 'note';
  key: string;
  vexflow: {
    staveNote: vexflow.StaveNote;
  };
  modifiers: NoteModifierRendering[];
  beamValue: musicxml.BeamValue | null;
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
  private note: musicxml.Note;
  private stem: StemDirection;
  private durationDenominator: NoteDurationDenominator;
  private clef: Clef;
  private tokens: Token[];
  private keySignature: KeySignature;

  constructor(opts: {
    config: Config;
    musicXml: { note: musicxml.Note };
    stem: StemDirection;
    durationDenominator: NoteDurationDenominator;
    clef: Clef;
    tokens: Token[];
    keySignature: KeySignature;
  }) {
    this.config = opts.config;
    this.note = opts.musicXml.note;
    this.stem = opts.stem;
    this.durationDenominator = opts.durationDenominator;
    this.clef = opts.clef;
    this.tokens = opts.tokens;
    this.keySignature = opts.keySignature;
  }

  /**
   * Renders multiple notes as a single vexflow.StaveNote.
   *
   * This exists to dedup code with rendering.Chord without exposing private members in this class.
   */
  static render(notes: Note[]): NoteRendering[] {
    if (notes.length === 0) {
      throw new Error('cannot render empty notes');
    }

    const durationDenominators = new Set(notes.map((note) => note.durationDenominator));
    if (durationDenominators.size > 1) {
      throw new Error('all notes must have the same durationDenominator');
    }

    const dotCounts = new Set(notes.map((note) => note.getDotCount()));
    if (dotCounts.size > 1) {
      throw new Error('all notes must have the same dotCount');
    }

    const clefTypes = new Set(notes.map((note) => note.clef));
    if (clefTypes.size > 1) {
      throw new Error('all notes must have the same clefTypes');
    }

    const keys = notes.map((note) => note.getKey());

    const { autoStem, stemDirection } = Note.getStemParams(notes);

    const vfStaveNote = new vexflow.StaveNote({
      keys: notes.map((note) => note.getKey()),
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

      for (const token of note.tokens) {
        renderings.push(token.render());
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
        }
      }
    }

    return keys.map((key, index) => ({
      type: 'note',
      key,
      modifiers: modifierRenderingGroups[index],
      vexflow: { staveNote: vfStaveNote },
      beamValue: notes[index].getBeamValue(),
    }));
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

  /** Clones the Note. */
  clone(): Note {
    return new Note({
      config: this.config,
      musicXml: { note: this.note },
      stem: this.stem,
      durationDenominator: this.durationDenominator,
      clef: this.clef,
      tokens: this.tokens,
      keySignature: this.keySignature,
    });
  }

  /** Renders the Note. */
  render(): NoteRendering {
    return util.first(Note.render([this]))!;
  }

  @util.memoize()
  private getKey(): string {
    const step = this.note.getStep();
    const octave = this.note.getOctave() - this.clef.getOctaveChange();
    const suffix = this.note.getNoteheadSuffix();
    return suffix ? `${step}/${octave}/${suffix}` : `${step}/${octave}`;
  }

  @util.memoize()
  private getAccidental(): Accidental | null {
    const noteAccidentalCode = toAccidentalCode({
      accidentalType: this.note.getAccidentalType(),
      alter: this.note.getAlter(),
    });

    const keySignatureAccidentalCode = this.keySignature.getAccidentalCode(this.note.getStep());

    const hasExplicitAccidental = this.note.getAccidentalType() !== null;
    if (hasExplicitAccidental || noteAccidentalCode !== keySignatureAccidentalCode) {
      const isCautionary = this.note.hasAccidentalCautionary();
      return Accidental.create({ code: noteAccidentalCode, isCautionary });
    }

    return null;
  }

  @util.memoize()
  private getLyrics(): Lyric[] {
    return this.note
      .getLyrics()
      .sort((a, b) => a.getVerseNumber() - b.getVerseNumber())
      .map((lyric) => Lyric.create({ lyric }));
  }

  @util.memoize()
  private getBeamValue(): musicxml.BeamValue | null {
    // vexflow does the heavy lifting of figuring out the specific beams. We just need to know when a beam starts,
    // continues, or stops.
    const beams = util.sortBy(this.note.getBeams(), (beam) => beam.getNumber());
    return util.first(beams)?.getBeamValue() ?? null;
  }

  @util.memoize()
  private getDotCount(): number {
    return this.note.getDotCount();
  }
}
