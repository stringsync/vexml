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
import { BeamFragment, SlurFragment, SpannerFragment, TupletFragment } from './types';

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

export type NoteModifierRendering = AccidentalRendering | LyricRendering | TokenRendering;

/** The result rendering a Note. */
export type NoteRendering = {
  type: 'note';
  key: string;
  vexflow: {
    staveNote: vexflow.StaveNote;
  };
  modifiers: NoteModifierRendering[];
  slurs: musicxml.Slur[];
  timeModification: musicxml.TimeModification | null;
  spannerFragments: SpannerFragment[];
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
  private musicXml: { note: musicxml.Note };
  private stem: StemDirection;
  private tokens: Token[];
  private clef: Clef;
  private keySignature: KeySignature;
  private durationDenominator: NoteDurationDenominator;

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
    this.musicXml = opts.musicXml;
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

    const keys = Note.sort(notes).map((note) => note.getKey());

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
      slurs: notes[index].getSlurs(),
      timeModification: notes[index].getTimeModification(),
      spannerFragments: notes[index].getSpannerFragments(vfStaveNote, index),
    }));
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
  render(): NoteRendering {
    return util.first(Note.render([this]))!;
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

  private getBeamValue(): musicxml.BeamValue | null {
    // vexflow does the heavy lifting of figuring out the specific beams. We just need to know when a beam starts,
    // continues, or stops.
    const beams = util.sortBy(this.musicXml.note.getBeams(), (beam) => beam.getNumber());
    return util.first(beams)?.getBeamValue() ?? null;
  }

  private getDotCount(): number {
    return this.musicXml.note.getDotCount();
  }

  private getStep(): string {
    return this.musicXml.note.getStep();
  }

  private getOctave(): number {
    return this.musicXml.note.getOctave() - this.clef.getOctaveChange();
  }

  private getKey(): string {
    const step = this.getStep();
    const octave = this.getOctave();
    const notehead = this.musicXml.note.getNotehead();
    const suffix = conversions.fromNoteheadToNoteheadSuffix(notehead);
    return suffix ? `${step}/${octave}/${suffix}` : `${step}/${octave}`;
  }

  private getTuplets(): musicxml.Tuplet[] {
    return (
      this.musicXml.note
        .getNotations()
        .find((notations) => notations.hasTuplets())
        ?.getTuplets() ?? []
    );
  }

  private getSlurs(): musicxml.Slur[] {
    return this.musicXml.note.getNotations().flatMap((notations) => notations.getSlurs());
  }

  private getTimeModification(): musicxml.TimeModification | null {
    return this.musicXml.note.getTimeModification();
  }

  private getSpannerFragments(vfStaveNote: vexflow.StaveNote, keyIndex: number): SpannerFragment[] {
    return [
      ...this.getBeamFragments(vfStaveNote),
      ...this.getTupletFragments(vfStaveNote),
      ...this.getSlurFragments(vfStaveNote, keyIndex),
    ];
  }

  private getBeamFragments(vfStaveNote: vexflow.StaveNote): BeamFragment[] {
    const result = new Array<BeamFragment>();

    const beamValue = this.getBeamValue();
    if (beamValue) {
      result.push({
        type: 'beam',
        phase: conversions.fromBeamValueToSpannerFragmentPhase(beamValue),
        vexflow: {
          stemmableNote: vfStaveNote,
        },
      });
    }

    return result;
  }

  private getTupletFragments(vfStaveNote: vexflow.StaveNote): TupletFragment[] {
    const result = new Array<TupletFragment>();

    // TODO: Support multiple tuplets.
    const tuplet = util.first(this.getTuplets());
    const tupletType = tuplet?.getType() ?? null;
    const tupletPlacement = tuplet?.getPlacement() ?? 'below';
    switch (tupletType) {
      case 'start':
        result.push({
          type: 'tuplet',
          phase: 'start',
          vexflow: {
            location: conversions.fromAboveBelowToTupletLocation(tupletPlacement),
            note: vfStaveNote,
          },
        });
        break;
      case 'stop':
        result.push({
          type: 'tuplet',
          phase: 'stop',
          vexflow: {
            note: vfStaveNote,
          },
        });
        break;
      default:
        // Tuplets don't have an accounting mechanism of "continue" like beams. Therefore, we need to implicitly
        // continue if we've come across a "start" (denoted by the vfNotes length).
        result.push({
          type: 'tuplet',
          phase: 'unspecified',
          vexflow: {
            note: vfStaveNote,
          },
        });
    }

    return result;
  }

  private getSlurFragments(vfStaveNote: vexflow.StaveNote, keyIndex: number): SlurFragment[] {
    const result = new Array<SlurFragment>();

    for (const slur of this.getSlurs()) {
      const slurType = slur.getType();
      if (!slurType) {
        continue;
      }

      result.push({
        type: 'slur',
        phase: conversions.fromStartStopContinueToSpannerFragmentPhase(slurType),
        slurNumber: slur.getNumber(),
        vexflow: {
          note: vfStaveNote,
          keyIndex,
        },
      });
    }

    return result;
  }
}
