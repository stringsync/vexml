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

export type NoteModifierRendering = AccidentalRendering | LyricRendering | TokenRendering | OrnamentRendering;

/** The result rendering a Note. */
export type NoteRendering = {
  type: 'note';
  key: string;
  vexflow: {
    staveNote: vexflow.StaveNote;
  };
  modifiers: NoteModifierRendering[];
  timeModification: musicxml.TimeModification | null;
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
  private musicXml: { note: musicxml.Note; directions: musicxml.Direction[]; octaveShift: musicxml.OctaveShift | null };
  private stem: StemDirection;
  private clef: Clef;
  private keySignature: KeySignature;
  private durationDenominator: NoteDurationDenominator;

  constructor(opts: {
    config: Config;
    musicXml: {
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
    this.musicXml = opts.musicXml;
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
  static render(opts: { notes: Note[]; spanners: Spanners; address: Address<'voice'> }): NoteRendering[] {
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
        keyIndex: 0,
        address: opts.address,
        musicXml: {
          directions: notes[index].musicXml.directions,
          note: notes[index].musicXml.note,
          octaveShift: notes[index].musicXml.octaveShift,
        },
        vexflow: {
          staveNote: vfStaveNote,
        },
      });

      notes[index].addSpannerFragments({
        spanners: opts.spanners,
        keyIndex: index,
        vexflow: { staveNote: vfStaveNote },
      });

      noteRenderings.push({
        type: 'note',
        key: keys[index],
        modifiers: modifierRenderingGroups[index],
        vexflow: { staveNote: vfStaveNote },
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
  render(opts: { spanners: Spanners; address: Address<'voice'> }): NoteRendering {
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
      conversions.fromAccidentalTypeToAccidentalCode(this.musicXml.note.getAccidentalType()) ??
      conversions.fromAlterToAccidentalCode(this.musicXml.note.getAlter());

    const keySignatureAccidentalCode = this.keySignature.getAccidentalCode(this.musicXml.note.getStep());

    const hasExplicitAccidental = this.musicXml.note.getAccidentalType() !== null;
    if (hasExplicitAccidental || noteAccidentalCode !== keySignatureAccidentalCode) {
      const isCautionary = this.musicXml.note.hasAccidentalCautionary();
      return new Accidental({ code: noteAccidentalCode, isCautionary });
    }

    return null;
  }

  @util.memoize()
  private getLyrics(): Lyric[] {
    return this.musicXml.note
      .getLyrics()
      .sort((a, b) => a.getVerseNumber() - b.getVerseNumber())
      .map((lyric) => new Lyric({ musicXml: { lyric } }));
  }

  private getOrnaments(): Ornament[] {
    return this.musicXml.note
      .getNotations()
      .flatMap((notations) => notations.getOrnaments())
      .flatMap((ornaments) => new Ornament({ musicXml: { ornaments } }));
  }

  private getDotCount(): number {
    return this.musicXml.note.getDotCount();
  }

  private getStep(): string {
    return this.musicXml.note.getStep();
  }

  private getOctave(): number {
    return (
      this.musicXml.note.getOctave() -
      this.clef.getOctaveChange() +
      conversions.fromOctaveShiftToOctaveCount(this.musicXml.octaveShift)
    );
  }

  private getKey(): string {
    const step = this.getStep();
    const octave = this.getOctave();
    const notehead = this.musicXml.note.getNotehead();
    const suffix = conversions.fromNoteheadToNoteheadSuffix(notehead);
    return suffix ? `${step}/${octave}/${suffix}` : `${step}/${octave}`;
  }

  private getTimeModification(): musicxml.TimeModification | null {
    return this.musicXml.note.getTimeModification();
  }

  private getTokens(): Token[] {
    return this.musicXml.directions
      .flatMap((direction) => direction.getTypes())
      .flatMap((directionType) => directionType.getContent())
      .filter((content): content is musicxml.TokensDirectionTypeContent => content.type === 'tokens')
      .flatMap((content) => content.tokens)
      .map((token) => new Token({ musicXml: { token } }));
  }

  private addSpannerFragments(opts: {
    spanners: Spanners;
    keyIndex: number;
    vexflow: { staveNote: vexflow.StaveNote };
  }): void {
    this.addPedalFragments({ spanners: opts.spanners, vexflow: opts.vexflow });
  }

  private addPedalFragments(opts: { spanners: Spanners; vexflow: { staveNote: vexflow.StaveNote } }): void {
    this.musicXml.directions
      .flatMap((direction) => direction.getTypes())
      .flatMap((directionType) => directionType.getContent())
      .filter((content): content is musicxml.PedalDirectionTypeContent => content.type === 'pedal')
      .map((content) => content.pedal)
      .forEach((pedal) => {
        const pedalType = pedal.getType();
        switch (pedalType) {
          case 'start':
          case 'sostenuto':
          case 'resume':
            opts.spanners.addPedalFragment({
              type: pedalType,
              musicXml: { pedal },
              vexflow: { staveNote: opts.vexflow.staveNote },
            });
            break;
          case 'continue':
          case 'change':
            opts.spanners.addPedalFragment({
              type: pedalType,
              musicXml: { pedal },
              vexflow: { staveNote: opts.vexflow.staveNote },
            });
            break;
          case 'stop':
          case 'discontinue':
            opts.spanners.addPedalFragment({
              type: pedalType,
              musicXml: { pedal },
              vexflow: { staveNote: opts.vexflow.staveNote },
            });
            break;
        }
      });
  }
}
