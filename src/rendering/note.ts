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
import { SpannerFragment } from './spanners';
import { TupletFragment } from './tuplet';
import { SlurFragment } from './slur';
import { WedgeFragment } from './wedge';
import { Ornament, OrnamentRendering } from './ornament';
import { OctaveShiftFragment } from './octaveshift';
import { VibratoFragment } from './vibrato';
import { PedalFragment } from './pedal';
import { BeamFragment } from './beam';
import { Spanners2 } from './spanners2';

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
  static render(opts: { notes: Note[]; spanners: Spanners2 }): NoteRendering[] {
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

    const beamFragments = notes
      .flatMap((note) => note.musicXml.note.getBeams())
      .map<BeamFragment>((beam) => ({
        number: beam.getNumber(),
        musicXml: { beam },
        vexflow: { stemmableNote: vfStaveNote },
      }));
    // vexflow does the heavy lifting of beam fragments, so we just want to track the lowest number for continuity info.
    const beamFragment = util.first(
      util.sortBy(beamFragments, (beamFragment) => beamFragment.musicXml.beam.getNumber())
    );
    if (beamFragment) {
      opts.spanners.addBeamFragment(beamFragment);
    }

    return keys.map((key, index) => ({
      type: 'note',
      key,
      modifiers: modifierRenderingGroups[index],
      vexflow: { staveNote: vfStaveNote },
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
  render(opts: { spanners: Spanners2 }): NoteRendering {
    return util.first(
      Note.render({
        notes: [this],
        spanners: opts.spanners,
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

  private getTokens(): Token[] {
    return this.musicXml.directions
      .flatMap((direction) => direction.getTypes())
      .flatMap((directionType) => directionType.getContent())
      .filter((content): content is musicxml.TokensDirectionTypeContent => content.type === 'tokens')
      .flatMap((content) => content.tokens)
      .map((token) => new Token({ musicXml: { token } }));
  }

  private getSpannerFragments(vfStaveNote: vexflow.StaveNote, keyIndex: number): SpannerFragment[] {
    return [
      ...this.getTupletFragments(vfStaveNote),
      ...this.getSlurFragments(vfStaveNote, keyIndex),
      ...this.getWedgeFragments(vfStaveNote),
      ...this.getWavyLineFragments(vfStaveNote, keyIndex),
      ...this.getOctaveShiftFragments(vfStaveNote),
      ...this.getPedalFragments(vfStaveNote),
    ];
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

  private getWedgeFragments(vfStaveNote: vexflow.StaveNote): WedgeFragment[] {
    // For applications where a specific direction is indeed attached to a specific note, the <direction> element can be
    // associated with the first <note> element that follows it in score order that is not in a different voice.
    // See https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/direction/

    const result = new Array<WedgeFragment>();

    for (const direction of this.musicXml.directions) {
      const directionPlacement = direction.getPlacement() ?? 'below';
      const modifierPosition = conversions.fromAboveBelowToModifierPosition(directionPlacement);

      for (const directionType of direction.getTypes()) {
        const content = directionType.getContent();
        if (content.type !== 'wedge') {
          continue;
        }

        const wedgeType = content.wedge.getType();
        const phase = conversions.fromWedgeTypeToSpannerFragmentPhase(wedgeType);
        const staveHairpinType = conversions.fromWedgeTypeToStaveHairpinType(wedgeType);

        switch (phase) {
          case 'start':
            result.push({
              type: 'wedge',
              phase,
              vexflow: {
                note: vfStaveNote,
                staveHairpinType,
                position: modifierPosition,
              },
            });
            break;
          case 'continue':
          case 'stop':
            result.push({
              type: 'wedge',
              phase,
              vexflow: {
                note: vfStaveNote,
              },
            });
        }
      }
    }

    return result;
  }

  private getWavyLineFragments(vfStaveNote: vexflow.StaveNote, keyIndex: number): VibratoFragment[] {
    return this.musicXml.note
      .getNotations()
      .flatMap((notation) => notation.getOrnaments())
      .flatMap((ornament) => ornament.getWavyLines())
      .map<VibratoFragment>((wavyLine) => {
        const phase = conversions.fromStartStopContinueToSpannerFragmentPhase(wavyLine.getType());
        return {
          type: 'vibrato',
          phase,
          keyIndex,
          vexflow: {
            note: vfStaveNote,
          },
        };
      });
  }

  private getOctaveShiftFragments(vfStaveNote: vexflow.StaveNote): OctaveShiftFragment[] {
    return this.musicXml.directions
      .flatMap((direction) => direction.getTypes())
      .flatMap((directionType) => directionType.getContent())
      .filter((content): content is musicxml.OctaveShiftDirectionTypeContent => content.type === 'octaveshift')
      .map((content) => content.octaveShift)
      .map<OctaveShiftFragment>((octaveShift) => {
        switch (octaveShift.getType()) {
          case 'up':
            return {
              type: 'octaveshift',
              phase: 'start',
              text: octaveShift.getSize().toString(),
              superscript: 'mb',
              vexflow: { note: vfStaveNote, textBracketPosition: vexflow.TextBracketPosition.BOTTOM },
            };
          case 'down':
            return {
              type: 'octaveshift',
              phase: 'start',
              text: octaveShift.getSize().toString(),
              superscript: 'va',
              vexflow: { note: vfStaveNote, textBracketPosition: vexflow.TextBracketPosition.TOP },
            };
          case 'continue':
            return {
              type: 'octaveshift',
              phase: 'continue',
              vexflow: { note: vfStaveNote },
            };
          case 'stop':
            return {
              type: 'octaveshift',
              phase: 'stop',
              vexflow: { note: vfStaveNote },
            };
        }
      });
  }

  private getPedalFragments(vfStaveNote: vexflow.StaveNote): PedalFragment[] {
    return this.musicXml.directions
      .flatMap((direction) => direction.getTypes())
      .flatMap((directionType) => directionType.getContent())
      .filter((content): content is musicxml.PedalDirectionTypeContent => content.type === 'pedal')
      .map((content) => content.pedal)
      .map<PedalFragment>((pedal) => {
        switch (pedal.getType()) {
          case 'start':
          case 'sostenuto':
          case 'resume':
            return {
              type: 'pedal',
              phase: 'start',
              musicXml: { pedal },
              vexflow: { staveNote: vfStaveNote },
            };

          case 'continue':
          case 'change':
            return {
              type: 'pedal',
              phase: 'continue',
              musicXml: { pedal },
              vexflow: { staveNote: vfStaveNote },
            };
          case 'stop':
          case 'discontinue':
            return {
              type: 'pedal',
              phase: 'stop',
              musicXml: { pedal },
              vexflow: { staveNote: vfStaveNote },
            };
        }
      });
  }
}
