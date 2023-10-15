import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Accidental, AccidentalCode, AccidentalRendering } from './accidental';
import { Config } from './config';
import { Lyric, LyricRendering } from './lyric';
import { NoteDurationDenominator, StemDirection } from './enums';
import { Clef } from './clef';
import { KeySignature } from './keysignature';

export type NoteModifierRendering = AccidentalRendering | LyricRendering;

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
  private key: string;
  private stem: StemDirection;
  private lyrics: Lyric[];
  private accidental: Accidental | null;
  private dotCount: number;
  private durationDenominator: NoteDurationDenominator;
  private clef: Clef;
  private beamValue: musicxml.BeamValue | null;

  private constructor(opts: {
    config: Config;
    key: string;
    stem: StemDirection;
    lyrics: Lyric[];
    accidental: Accidental | null;
    dotCount: number;
    durationDenominator: NoteDurationDenominator;
    clef: Clef;
    beamValue: musicxml.BeamValue | null;
  }) {
    this.config = opts.config;
    this.key = opts.key;
    this.stem = opts.stem;
    this.lyrics = opts.lyrics;
    this.accidental = opts.accidental;
    this.dotCount = opts.dotCount;
    this.durationDenominator = opts.durationDenominator;
    this.clef = opts.clef;
    this.beamValue = opts.beamValue;
  }

  /** Creates a Note. */
  static create(opts: {
    config: Config;
    musicXml: {
      note: musicxml.Note;
    };
    stem: StemDirection;
    durationDenominator: NoteDurationDenominator;
    clef: Clef;
    keySignature: KeySignature;
  }): Note {
    const note = opts.musicXml.note;
    const keySignature = opts.keySignature;

    let accidental: Accidental | null = null;
    const noteAccidentalCode = Note.getAccidentalCode({ note });
    const keySignatureAccidentalCode = keySignature.getAccidentalCode(note.getStep());
    const hasExplicitAccidental = note.getAccidentalType() !== null;
    if (hasExplicitAccidental || noteAccidentalCode !== keySignatureAccidentalCode) {
      const isCautionary = note.hasAccidentalCautionary();
      accidental = Accidental.create({ code: noteAccidentalCode, isCautionary });
    }

    const clef = opts.clef;
    const lyrics = note
      .getLyrics()
      .sort((a, b) => a.getVerseNumber() - b.getVerseNumber())
      .map((lyric) => Lyric.create({ lyric }));
    const stem = opts.stem;
    const dotCount = note.getDotCount();
    const durationDenominator = opts.durationDenominator;

    let key = `${note.getStep()}/${note.getOctave() - clef.getOctaveChange()}`;
    const suffix = note.getNoteheadSuffix();
    if (suffix) {
      key += `/${suffix}`;
    }

    // vexflow does the heavy lifting of figuring out the specific beams. We just need to know when a beam starts,
    // continues, or stops.
    const beams = util.sortBy(note.getBeams(), (beam) => beam.getNumber());
    const beamValue = util.first(beams)?.getBeamValue() ?? null;

    return new Note({
      config: opts.config,
      key,
      stem,
      lyrics,
      accidental,
      dotCount,
      durationDenominator,
      clef,
      beamValue,
    });
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

    const dotCounts = new Set(notes.map((note) => note.dotCount));
    if (dotCounts.size > 1) {
      throw new Error('all notes must have the same dotCount');
    }

    const clefTypes = new Set(notes.map((note) => note.clef));
    if (clefTypes.size > 1) {
      throw new Error('all notes must have the same clefTypes');
    }

    const keys = notes.map((note) => note.key);

    const { autoStem, stemDirection } = Note.getStemParams(notes);

    const vfStaveNote = new vexflow.StaveNote({
      keys: notes.map((note) => note.key),
      duration: util.first(notes)!.durationDenominator,
      dots: util.first(notes)!.dotCount,
      clef: util.first(notes)!.clef.getType(),
      autoStem,
      stemDirection,
    });

    for (let index = 0; index < util.first(notes)!.dotCount; index++) {
      vexflow.Dot.buildAndAttach([vfStaveNote], { all: true });
    }

    const modifierRenderingGroups = notes.map<NoteModifierRendering[]>((note) => {
      const renderings = new Array<NoteModifierRendering>();

      if (note.accidental) {
        renderings.push(note.accidental.render());
      }

      // Lyrics sorted by ascending verse number.
      for (const lyric of note.lyrics) {
        renderings.push(lyric.render());
      }

      return renderings;
    });

    for (let index = 0; index < modifierRenderingGroups.length; index++) {
      for (const modifierRendering of modifierRenderingGroups[index]) {
        switch (modifierRendering?.type) {
          case 'accidental':
            vfStaveNote.addModifier(modifierRendering.vexflow.accidental, index);
            break;
          case 'lyric':
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
      beamValue: notes[index].beamValue,
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

  private static getAccidentalCode(musicXml: { note: musicxml.Note }): AccidentalCode {
    const accidentalType = musicXml.note.getAccidentalType();
    // AccidentalType takes precedence over alter.
    switch (accidentalType) {
      case 'sharp':
        return '#';
      case 'double-sharp':
        return '##';
      case 'flat':
        return 'b';
      case 'flat-flat':
        return 'bb';
      case 'natural':
        return 'n';
      case 'quarter-sharp':
        return '+';
    }

    const alter = musicXml.note.getAlter();
    switch (alter) {
      case 1:
        return '#';
      case 2:
        return '##';
      case -1:
        return 'b';
      case -2:
        return 'bb';
      case 0:
        return 'n';
      case -0.5:
        return 'd';
      case 0.5:
        return '+';
      case -1.5:
        return 'db';
      case 1.5:
        return '++';
    }

    return 'n';
  }

  /** Clones the Note. */
  clone(): Note {
    return new Note({
      config: this.config,
      key: this.key,
      stem: this.stem,
      lyrics: this.lyrics.map((lyric) => lyric.clone()),
      accidental: this.accidental?.clone() ?? null,
      dotCount: this.dotCount,
      durationDenominator: this.durationDenominator,
      clef: this.clef,
      beamValue: this.beamValue,
    });
  }

  /** Renders the Note. */
  render(): NoteRendering {
    return util.first(Note.render([this]))!;
  }
}
