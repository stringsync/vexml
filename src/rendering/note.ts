import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import * as util from '@/util';
import * as conversions from './conversions';
import { Accidental, AccidentalRendering } from './accidental';
import { Config } from './config';
import { Lyric, LyricRendering } from './lyric';
import { NoteDurationDenominator, StemDirection } from './enums';
import { Clef } from './clef';
import { KeySignature } from './keysignature';
import { Token, TokenRendering } from './token';
import { Ornaments, OrnamentsRendering } from './ornaments';
import { Spanners } from './spanners';
import { Address } from './address';
import { Fermata, FermataRendering } from './fermata';
import { Arpeggio, ArpeggioRendering } from './arpeggio';
import { Articulations, ArticulationsRendering } from './articulations';
import { AccidentalMark, AccidentalMarkRendering } from './accidentalmark';
import { Tremolo, TremoloRendering } from './tremolo';
import { Technicals, TechnicalsRendering } from './technicals';
import { Rehearsal, RehearsalRendering } from './rehearsal';
import { TabPosition } from './types';
import { Tap, TapRendering } from './tap';

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

export type NoteModifierRendering =
  | AccidentalRendering
  | AccidentalMarkRendering
  | LyricRendering
  | TokenRendering
  | OrnamentsRendering
  | FermataRendering
  | ArpeggioRendering
  | ArticulationsRendering
  | TremoloRendering
  | TechnicalsRendering
  | RehearsalRendering;

export type TabNoteModifierRendering = TapRendering;

/** The result of rendering a Note. */
export type NoteRendering = StaveNoteRendering | GraceNoteRendering | TabNoteRendering | TabGraceNoteRendering;

/** The result of rendering a stave Note. */
export type StaveNoteRendering = {
  type: 'stavenote';
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
  hasSlur: boolean;
  vexflow: {
    graceNote: vexflow.GraceNote;
  };
  modifiers: NoteModifierRendering[];
};

/** The result of rendering a tab Note. */
export type TabNoteRendering = {
  type: 'tabnote';
  vexflow: {
    tabNote: vexflow.TabNote;
  };
};

/** The result of rendering a tab grace Note. */
export type TabGraceNoteRendering = {
  type: 'tabgracenote';
  hasSlur: boolean;
  vexflow: {
    graceNote: vexflow.GraceTabNote;
  };
};

type TabEntry = {
  position: TabPosition;
  harmonicType: musicxml.HarmonicType | null;
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
  static render(opts: { notes: Note[]; spanners: Spanners; address: Address<'voice'> }): NoteRendering[] {
    const notes = Note.sort(opts.notes);
    const spanners = opts.spanners;
    const address = opts.address;

    util.assert(notes.length > 0, 'cannot render empty notes');

    const durationDenominators = new Set(notes.map((note) => note.durationDenominator));
    util.assert(durationDenominators.size === 1, 'all notes must have the same durationDenominator');

    const dotCounts = new Set(notes.map((note) => note.getDotCount()));
    util.assert(dotCounts.size === 1, 'all notes must have the same dotCount');

    const clefTypes = new Set(notes.map((note) => note.clef));
    util.assert(clefTypes.size === 1, 'all notes must have the same clefTypes');

    const isTab = util.first(notes)!.clef.getType() === 'tab';
    const isStave = notes.every((note) => !note.musicXML.note.isGrace());
    const isGrace = notes.every((note) => note.musicXML.note.isGrace());

    if (isTab && isGrace) {
      return Note.renderTabGraceNotes({ notes });
    } else if (isTab) {
      return Note.renderTabNotes({ notes, spanners, address });
    } else if (isStave) {
      return Note.renderStaveNotes({ notes, spanners, address });
    } else if (isGrace) {
      return Note.renderGraceNotes({ notes });
    } else {
      throw new Error('cannot render grace notes and stave notes together');
    }
  }

  private static renderStaveNotes(opts: {
    notes: Note[];
    spanners: Spanners;
    address: Address<'voice'>;
  }): StaveNoteRendering[] {
    const notes = opts.notes;
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

      const tremolo = note.getTremolo();
      if (tremolo) {
        renderings.push(tremolo.render());
      }

      const accidentalMark = note.getAccidentalMark();
      if (accidentalMark) {
        renderings.push(accidentalMark.render());
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

      for (const fermata of note.getFermatas()) {
        renderings.push(fermata.render());
      }

      for (const arpeggio of note.getArpeggios()) {
        renderings.push(arpeggio.render());
      }

      for (const articulation of note.getArticulations()) {
        renderings.push(articulation.render());
      }

      for (const technical of note.getTechnicals()) {
        renderings.push(technical.render());
      }

      for (const rehearsal of note.getRehearsals()) {
        renderings.push(rehearsal.render());
      }

      return renderings;
    });

    for (let index = 0; index < modifierRenderingGroups.length; index++) {
      for (const modifierRendering of modifierRenderingGroups[index]) {
        switch (modifierRendering.type) {
          case 'accidental':
            vfStaveNote.addModifier(modifierRendering.vexflow.accidental, index);
            break;
          case 'accidentalmark':
            vfStaveNote.addModifier(modifierRendering.vexflow.ornament, index);
            break;
          case 'lyric':
            vfStaveNote.addModifier(modifierRendering.vexflow.annotation, index);
            break;
          case 'token':
            vfStaveNote.addModifier(modifierRendering.vexflow.annotation, index);
            break;
          case 'ornaments':
            modifierRendering.vexflow.ornaments.forEach((vfOrnament) => {
              vfStaveNote.addModifier(vfOrnament, index);
            });
            break;
          case 'fermata':
            vfStaveNote.addModifier(modifierRendering.vexflow.articulation, index);
            break;
          case 'arpeggio':
            vfStaveNote.addStroke(index, modifierRendering.vexflow.stroke);
            break;
          case 'articulations':
            modifierRendering.vexflow.modifiers.forEach((vfModifier) => {
              vfStaveNote.addModifier(vfModifier, index);
            });
            break;
          case 'tremolo':
            vfStaveNote.addModifier(modifierRendering.vexflow.tremolo, index);
            break;
          case 'technicals':
            modifierRendering.vexflow.modifiers.forEach((vfArticulation) => {
              vfStaveNote.addModifier(vfArticulation, index);
            });
            break;
          case 'rehearsal':
            vfStaveNote.addModifier(modifierRendering.vexflow.annotation, index);
            break;
        }
      }
    }

    const staveNoteRenderings = new Array<StaveNoteRendering>();

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
          type: 'stavenote',
          note: vfStaveNote,
        },
      });

      staveNoteRenderings.push({
        type: 'stavenote',
        key: keys[index],
        modifiers: modifierRenderingGroups[index],
        vexflow: {
          staveNote: vfStaveNote,
        },
        timeModification: notes[index].getTimeModification(),
      });
    }

    return staveNoteRenderings;
  }

  private static renderGraceNotes(opts: { notes: Note[] }): GraceNoteRendering[] {
    const notes = opts.notes;
    const keys = notes.map((note) => note.getKey());

    const vfGraceNote = new vexflow.GraceNote({
      keys,
      duration: util.first(notes)!.durationDenominator,
      dots: util.first(notes)!.getDotCount(),
      clef: util.first(notes)!.clef.getType(),
      slash: notes.some((note) => note.musicXML.note.hasGraceSlash()),
    });

    const modifierRenderingGroups = notes.map<NoteModifierRendering[]>((note) => {
      const renderings = new Array<NoteModifierRendering>();

      const accidental = note.getAccidental();
      if (accidental) {
        renderings.push(accidental.render());
      }

      return renderings;
    });

    for (let index = 0; index < modifierRenderingGroups.length; index++) {
      for (const modifierRendering of modifierRenderingGroups[index]) {
        switch (modifierRendering.type) {
          case 'accidental':
            vfGraceNote.addModifier(modifierRendering.vexflow.accidental, index);
            break;
        }
      }
    }

    const graceNoteRenderings = new Array<GraceNoteRendering>();

    const hasSlur = notes
      .flatMap((note) => note.musicXML.note.getNotations())
      .some((notation) => notation.getSlurs().length > 0);

    for (let index = 0; index < keys.length; index++) {
      graceNoteRenderings.push({
        type: 'gracenote',
        modifiers: modifierRenderingGroups[index],
        hasSlur,
        vexflow: {
          graceNote: vfGraceNote,
        },
      });
    }

    return graceNoteRenderings;
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

  private static renderTabNotes(opts: {
    notes: Note[];
    spanners: Spanners;
    address: Address<'voice'>;
  }): TabNoteRendering[] {
    const notes = opts.notes;

    const entries = notes.flatMap((note) => note.getTabEntries());

    const vfTabNote = new vexflow.TabNote({
      positions: entries.map((entry) => {
        const str = entry.position.string;

        let fret: string | number;
        if (entry.harmonicType === 'natural') {
          fret = `<${entry.position.fret}>`;
        } else {
          fret = entry.position.fret;
        }

        return { str, fret };
      }),
      duration: util.first(notes)!.durationDenominator,
    });

    const modifierRenderingGroups = notes.map<TabNoteModifierRendering[]>((note) => {
      const renderings = new Array<TabNoteModifierRendering>();

      for (const tap of note.getTaps()) {
        renderings.push(tap.render());
      }

      return renderings;
    });

    for (let index = 0; index < modifierRenderingGroups.length; index++) {
      for (const modifierRendering of modifierRenderingGroups[index]) {
        switch (modifierRendering.type) {
          case 'tap':
            vfTabNote.addModifier(modifierRendering.vexflow.annotation, index);
            break;
        }
      }
    }

    const tabNoteRenderings = new Array<TabNoteRendering>();

    for (let index = 0; index < entries.length; index++) {
      opts.spanners.process({
        keyIndex: index,
        address: opts.address,
        musicXML: {
          directions: notes[index].musicXML.directions,
          note: notes[index].musicXML.note,
          octaveShift: notes[index].musicXML.octaveShift,
        },
        vexflow: {
          type: 'tabnote',
          note: vfTabNote,
        },
      });

      tabNoteRenderings.push({
        type: 'tabnote',
        vexflow: {
          tabNote: vfTabNote,
        },
      });
    }

    return tabNoteRenderings;
  }

  private static renderTabGraceNotes(opts: { notes: Note[] }): TabGraceNoteRendering[] {
    const notes = opts.notes;

    const entries = notes.flatMap((note) => note.getTabEntries());

    const vfGraceTabNote = new vexflow.GraceTabNote({
      positions: entries.map((entry) => {
        const str = entry.position.string;

        let fret: string | number;
        if (entry.harmonicType === 'natural') {
          fret = `<${entry.position.fret}>`;
        } else {
          fret = entry.position.fret;
        }

        return { str, fret };
      }),
      duration: util.first(notes)!.durationDenominator,
    });

    const graceTabNoteRenderings = new Array<TabGraceNoteRendering>();

    const hasSlur = notes
      .flatMap((note) => note.musicXML.note.getNotations())
      .some((notation) => notation.getSlurs().length > 0);

    for (let index = 0; index < entries.length; index++) {
      graceTabNoteRenderings.push({
        type: 'tabgracenote',
        hasSlur,
        vexflow: {
          graceNote: vfGraceTabNote,
        },
      });
    }

    return graceTabNoteRenderings;
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
  render(opts: {
    spanners: Spanners;
    address: Address<'voice'>;
  }): StaveNoteRendering | GraceNoteRendering | TabNoteRendering | TabGraceNoteRendering {
    return util.first(
      Note.render({
        notes: [this],
        spanners: opts.spanners,
        address: opts.address,
      })
    )!;
  }

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

  private getLyrics(): Lyric[] {
    return this.musicXML.note
      .getLyrics()
      .sort((a, b) => a.getVerseNumber() - b.getVerseNumber())
      .map((lyric) => new Lyric({ musicXML: { lyric } }));
  }

  private getOrnaments(): Ornaments[] {
    return this.musicXML.note
      .getNotations()
      .flatMap((notations) => notations.getOrnaments())
      .map((ornaments) => new Ornaments({ musicXML: { ornaments } }));
  }

  private getFermatas(): Fermata[] {
    return this.musicXML.note
      .getNotations()
      .flatMap((notations) => notations.getFermatas())
      .map((fermata) => new Fermata({ musicXML: { fermata } }));
  }

  private getArpeggios(): Arpeggio[] {
    if (this.musicXML.note.isChordTail()) {
      return [];
    }

    return this.musicXML.note
      .getNotations()
      .filter((notations) => notations.isArpeggiated())
      .map((notations) => new Arpeggio({ musicXML: { notations } }));
  }

  private getArticulations(): Articulations[] {
    return this.musicXML.note
      .getNotations()
      .flatMap((notations) => notations.getArticulations())
      .map((articulations) => new Articulations({ musicXML: { articulations } }));
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

  /** Returns the accidental mark to be placed above or below (not next) the note. */
  private getAccidentalMark(): AccidentalMark | null {
    return util.first(
      this.musicXML.note
        .getNotations()
        .flatMap((notations) => notations.getAccidentalMarks())
        .map((accidentalMark) => new AccidentalMark({ musicXML: { accidentalMark } }))
    );
  }

  private getTremolo(): Tremolo | null {
    return util.first(
      this.musicXML.note
        .getNotations()
        .flatMap((notations) => notations.getOrnaments())
        .flatMap((ornaments) => ornaments.getTremolos())
        .map((tremolo) => new Tremolo({ musicXML: { tremolo: tremolo.value } }))
    );
  }

  private getTechnicals(): Technicals[] {
    return this.musicXML.note
      .getNotations()
      .flatMap((notations) => notations.getTechnicals())
      .map((technical) => new Technicals({ musicXML: { technical } }));
  }

  private getRehearsals(): Rehearsal[] {
    return this.musicXML.directions
      .flatMap((direction) => direction.getTypes())
      .flatMap((directionType) => directionType.getContent())
      .filter((content): content is musicxml.RehearsalDirectionTypeContent => content.type === 'rehearsal')
      .flatMap((content) => content.rehearsals)
      .map((rehearsal) => new Rehearsal({ config: this.config, musicXML: { rehearsal } }));
  }

  private getTabEntries(): TabEntry[] {
    return this.musicXML.note
      .getNotations()
      .flatMap((notations) => notations.getTechnicals())
      .flatMap((technical) => {
        const frets = technical.getFrets().map((fret) => fret.getNumber() ?? 0);
        const strings = technical.getTabStrings().map((string) => string.getNumber() ?? 1);
        const harmonicType = util.first(technical.getHarmonics())?.getType() ?? null;

        const length = Math.min(frets.length, strings.length);
        const entries = new Array<TabEntry>(length);
        for (let index = 0; index < length; index++) {
          entries[index] = {
            position: { fret: frets[index], string: strings[index] },
            harmonicType: harmonicType,
          };
        }
        return entries;
      });
  }

  private getTaps(): Tap[] {
    return this.musicXML.note
      .getNotations()
      .flatMap((notations) => notations.getTechnicals())
      .flatMap((technical) => technical.getTaps())
      .map(() => new Tap());
  }
}
