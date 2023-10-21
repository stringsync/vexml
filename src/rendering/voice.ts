import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Note, NoteRendering } from './note';
import { Chord, ChordRendering } from './chord';
import { Rest, RestRendering } from './rest';
import { Config } from './config';
import { NoteDurationDenominator, StemDirection } from './enums';
import { GhostNote, GhostNoteRendering } from './ghostnote';
import { Division } from './division';
import { Clef } from './clef';
import { TimeSignature } from './timesignature';
import { KeySignature } from './keysignature';
import { Token } from './token';

/** A component of a Voice. */
export type VoiceEntry = Note | Chord | Rest | GhostNote;

/** The result rendering a VoiceEntry. */
export type VoiceEntryRendering = NoteRendering | ChordRendering | RestRendering | GhostNoteRendering;

/** The result rendering a Voice. */
export type VoiceRendering = {
  type: 'voice';
  vexflow: {
    voice: vexflow.Voice;
  };
  entries: VoiceEntryRendering[];
};

export type VoiceEntryData = {
  voiceId: string;
  note: musicxml.Note;
  tokens: Array<Token>;
  stem: StemDirection;
  start: Division;
  end: Division;
};

const DURATION_DENOMINATOR_CONVERSIONS: Array<{
  case: Division;
  value: NoteDurationDenominator;
}> = [
  { case: Division.of(4, 1), value: '1' },
  { case: Division.of(2, 1), value: '2' },
  { case: Division.of(1, 1), value: '4' },
  { case: Division.of(1, 2), value: '8' },
  { case: Division.of(1, 8), value: '32' },
  { case: Division.of(1, 16), value: '64' },
  { case: Division.of(1, 32), value: '128' },
  { case: Division.of(1, 64), value: '256' },
  { case: Division.of(1, 128), value: '512' },
  { case: Division.of(1, 256), value: '1024' },
];

/**
 * Represents a musical voice within a stave, containing a distinct sequence of notes, rests, and other musical symbols.
 *
 * In Western musical notation, a voice is a particular series of musical events perceived as a single uninterrupted
 * stream. Especially in polyphonic settings, where multiple voices might exist simultaneously on a single stave, the
 * `Voice` class enables the separation and distinct representation of each of these melodic lines.
 */
export class Voice {
  private config: Config;
  private entries: VoiceEntry[];
  private timeSignature: TimeSignature;

  private constructor(opts: { config: Config; entries: VoiceEntry[]; timeSignature: TimeSignature }) {
    this.config = opts.config;
    this.entries = opts.entries;
    this.timeSignature = opts.timeSignature;
  }

  static create(opts: {
    config: Config;
    data: VoiceEntryData[];
    quarterNoteDivisions: number;
    timeSignature: TimeSignature;
    clef: Clef;
    keySignature: KeySignature;
  }): Voice {
    const config = opts.config;
    const timeSignature = opts.timeSignature;
    const quarterNoteDivisions = opts.quarterNoteDivisions;
    const clef = opts.clef;
    const keySignature = opts.keySignature;

    let divisions = Division.of(0, quarterNoteDivisions);
    const entries = new Array<VoiceEntry>();
    for (const entry of opts.data) {
      const ghostNoteStart = divisions;
      const ghostNoteEnd = entry.start;
      const ghostNoteDuration = ghostNoteEnd.subtract(ghostNoteStart);

      if (ghostNoteDuration.toBeats() > 0) {
        entries.push(Voice.createGhostNote(ghostNoteDuration));
      }
      entries.push(Voice.createVoiceEntry({ config, clef, entry, keySignature }));

      divisions = entry.end;
    }

    return new Voice({
      config,
      timeSignature,
      entries,
    });
  }

  /** Creates a voice with a single whole note rest. */
  static wholeRest(opts: { config: Config; timeSignature: TimeSignature; clef: Clef }): Voice {
    const wholeRest = Rest.whole({
      config: opts.config,
      clef: opts.clef,
    });

    return new Voice({
      config: opts.config,
      timeSignature: opts.timeSignature,
      entries: [wholeRest],
    });
  }

  static toDurationDenominator(noteType: musicxml.NoteType | null): NoteDurationDenominator | null {
    switch (noteType) {
      case '1024th':
        return '1024';
      case '512th':
        return '512';
      case '256th':
        return '256';
      case '128th':
        return '128';
      case '64th':
        return '64';
      case '32nd':
        return '32';
      case '16th':
        return '16';
      case 'eighth':
        return '8';
      case 'quarter':
        return '4';
      case 'half':
        return '2';
      case 'whole':
        return '1';
      case 'breve':
        return '1/2';
      case 'long':
        // VexFlow bug: should be '1/4' but it is not supported
        // return '1/4';
        return '1/2';
      default:
        return null;
    }
  }

  private static createGhostNote(divisions: Division): GhostNote {
    const durationDenominator = Voice.calculateDurationDenominator(divisions);
    return GhostNote.create({ durationDenominator });
  }

  private static createVoiceEntry(opts: {
    config: Config;
    entry: VoiceEntryData;
    clef: Clef;
    keySignature: KeySignature;
  }): VoiceEntry {
    const config = opts.config;
    const entry = opts.entry;
    const clef = opts.clef;
    const note = entry.note;
    const stem = entry.stem;
    const keySignature = opts.keySignature;
    const tokens = entry.tokens;

    const duration = entry.end.subtract(entry.start);

    // Sometimes the <type> of the <note> is omitted. If that's the case, infer the duration denominator from the
    // <duration>.
    const durationDenominator =
      Voice.toDurationDenominator(note.getType()) ?? Voice.calculateDurationDenominator(duration);

    if (note.isChordHead()) {
      return Chord.create({
        config,
        musicXml: { note, tokens },
        stem,
        clef,
        durationDenominator,
        keySignature,
      });
    }

    if (note.isRest()) {
      return Rest.create({
        config,
        musicXml: { note, tokens },
        clef,
        durationDenominator,
      });
    }

    return Note.create({
      config,
      musicXml: { note, tokens },
      stem,
      clef,
      durationDenominator,
      keySignature,
    });
  }

  private static calculateDurationDenominator(divisions: Division): NoteDurationDenominator {
    return DURATION_DENOMINATOR_CONVERSIONS.find((conversion) => conversion.case.isEqual(divisions))?.value ?? '1';
  }

  /** Clones the Voice. */
  clone(): Voice {
    return new Voice({
      config: this.config,
      entries: this.entries.map((entry) => {
        if (entry instanceof Note) {
          return entry.clone();
        }
        if (entry instanceof Chord) {
          return entry.clone();
        }
        if (entry instanceof Rest) {
          return entry.clone();
        }
        if (entry instanceof GhostNote) {
          return entry.clone();
        }
        // If this error is thrown, this is a problem with vexml, not the musicXML document.
        throw new Error(`unexpected voice entry: ${entry}`);
      }),
      timeSignature: this.timeSignature,
    });
  }

  /** Renders the Voice. */
  render(): VoiceRendering {
    const voiceEntryRenderings = this.entries.map<VoiceEntryRendering>((entry) => {
      if (entry instanceof Note) {
        return entry.render();
      }
      if (entry instanceof Chord) {
        return entry.render();
      }
      if (entry instanceof Rest) {
        return entry.render({ voiceEntryCount: this.entries.length });
      }
      if (entry instanceof GhostNote) {
        return entry.render();
      }
      // If this error is thrown, this is a problem with vexml, not the musicXML document.
      throw new Error(`unexpected voice entry: ${entry}`);
    });

    const vfTickables = voiceEntryRenderings.map((voiceEntryRendering) => {
      switch (voiceEntryRendering.type) {
        case 'note':
          return voiceEntryRendering.vexflow.staveNote;
        case 'chord':
          return voiceEntryRendering.notes[0].vexflow.staveNote;
        case 'rest':
          return voiceEntryRendering.vexflow.staveNote;
        case 'ghostnote':
          return voiceEntryRendering.vexflow.ghostNote;
        default:
          throw new Error(`unexpected voice entry rendering: ${voiceEntryRendering}`);
      }
    });

    const vfVoice = this.toVexflowVoice(vfTickables);

    return {
      type: 'voice',
      vexflow: { voice: vfVoice },
      entries: voiceEntryRenderings,
    };
  }

  private toVexflowVoice(vfTickables: vexflow.Tickable[]): vexflow.Voice {
    const fraction = this.timeSignature.toFraction();

    return new vexflow.Voice({
      numBeats: fraction.numerator,
      beatValue: fraction.denominator,
    })
      .setStrict(false)
      .addTickables(vfTickables);
  }
}
