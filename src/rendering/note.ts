import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import * as util from '@/util';
import { Beam } from './beam';
import { Accidental, AccidentalRendering } from './accidental';
import { Config } from './config';
import { Lyric, LyricRendering } from './lyric';
import { NoteDurationDenominator } from './enums';

export type NoteModifierRendering = AccidentalRendering | LyricRendering;

/** The result rendering a Note. */
export type NoteRendering = {
  type: 'note';
  key: string;
  vexflow: {
    staveNote: vexflow.StaveNote;
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
  private key: string;
  private stem: musicxml.Stem | null;
  private lyrics: Lyric[];
  private beams: Beam[];
  private accidental: Accidental | null;
  private dotCount: number;
  private durationDenominator: NoteDurationDenominator;
  private clefType: musicxml.ClefType;

  private constructor(opts: {
    config: Config;
    key: string;
    stem: musicxml.Stem | null;
    lyrics: Lyric[];
    beams: Beam[];
    accidental: Accidental | null;
    dotCount: number;
    durationDenominator: NoteDurationDenominator;
    clefType: musicxml.ClefType;
  }) {
    this.config = opts.config;
    this.key = opts.key;
    this.stem = opts.stem;
    this.lyrics = opts.lyrics;
    this.beams = opts.beams;
    this.accidental = opts.accidental;
    this.dotCount = opts.dotCount;
    this.durationDenominator = opts.durationDenominator;
    this.clefType = opts.clefType;
  }

  /** Creates a Note. */
  static create(opts: {
    config: Config;
    musicXml: {
      note: musicxml.Note;
    };
    durationDenominator: NoteDurationDenominator;
    clefType: musicxml.ClefType;
  }): Note {
    const note = opts.musicXml.note;

    let accidental: Accidental | null = null;
    const alter = note.getAlter();
    const accidentalType = note.getAccidentalType();
    const hasAccidental = typeof alter === 'number' || musicxml.ACCIDENTAL_TYPES.includes(accidentalType);
    if (hasAccidental) {
      const isCautionary = note.hasAccidentalCautionary();
      accidental = Accidental.create({ accidentalType, alter, isCautionary });
    }

    const clefType = opts.clefType;
    const lyrics = note
      .getLyrics()
      .sort((a, b) => a.getVerseNumber() - b.getVerseNumber())
      .map((lyric) => Lyric.create({ lyric }));
    const stem = note.getStem();
    const beams = note.getBeams().map((beam) => Beam.create({ musicXml: { beam } }));
    const dotCount = note.getDotCount();
    const durationDenominator = opts.durationDenominator;

    let key = note.getPitch();
    const suffix = note.getNoteheadSuffix();
    if (suffix) {
      key += `/${suffix}`;
    }

    return new Note({
      config: opts.config,
      key,
      stem,
      lyrics,
      beams,
      accidental,
      dotCount,
      durationDenominator,
      clefType,
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

    const clefTypes = new Set(notes.map((note) => note.clefType));
    if (clefTypes.size > 1) {
      throw new Error('all notes must have the same clefTypes');
    }

    const keys = notes.map((note) => note.key);

    const { autoStem, stemDirection } = Note.getStemParameters(notes);

    const vfStaveNote = new vexflow.StaveNote({
      keys: notes.map((note) => note.key),
      duration: util.first(notes)!.durationDenominator,
      dots: util.first(notes)!.dotCount,
      clef: util.first(notes)!.clefType,
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
    }));
  }

  private static getStemParameters(notes: Note[]): { autoStem?: boolean; stemDirection?: number } {
    const autoStem = notes.every((note) => !note.stem);
    if (autoStem) {
      return { autoStem };
    }

    // TODO: Figure out what to do if some notes in a multivoice or chord have different specified stem directions.
    // https://sites.coloradocollege.edu/musicengraving/engraving-convention/notes-and-stems/ has some information,
    // but I'm not sure if vexflow has this capability. For now, we just auto stem since it'll be right ~most of the
    // time.
    return { autoStem: true };
  }

  /** Clones the Note. */
  clone(): Note {
    return new Note({
      config: this.config,
      key: this.key,
      stem: this.stem,
      lyrics: this.lyrics.map((lyric) => lyric.clone()),
      beams: this.beams.map((beam) => beam.clone()),
      accidental: this.accidental?.clone() ?? null,
      dotCount: this.dotCount,
      durationDenominator: this.durationDenominator,
      clefType: this.clefType,
    });
  }

  /** Renders the Note. */
  render(): NoteRendering {
    return util.first(Note.render([this]))!;
  }
}
