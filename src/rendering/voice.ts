import * as vexflow from 'vexflow';
import { GraceNoteRendering, Note, StaveNoteRendering } from './note';
import { Chord, StaveChordRendering, GraceChordRendering } from './chord';
import { Rest, RestRendering } from './rest';
import { Config } from './config';
import { GhostNote, GhostNoteRendering } from './ghostnote';
import { Clef } from './clef';
import { TimeSignature } from './timesignature';
import { Address } from './address';
import { Spanners } from './spanners';
import { NoteDurationDenominator } from './enums';
import { Division } from './division';

/** A component of a Voice. */
export type VoiceEntry = Note | Chord | Rest | GhostNote;

/** The result rendering a VoiceEntry. */
export type VoiceEntryRendering =
  | StaveNoteRendering
  | StaveChordRendering
  | GraceNoteRendering
  | GraceChordRendering
  | RestRendering
  | GhostNoteRendering;

/** The result rendering a Voice. */
export type VoiceRendering = {
  type: 'voice';
  address: Address<'voice'>;
  vexflow: {
    voice: vexflow.Voice;
  };
  entries: VoiceEntryRendering[];
  isPlaceholder: boolean;
};

export type VoicePlaceholderEntry = {
  division: Division;
  durationDenominator: NoteDurationDenominator;
};

const DURATIONS_SHORTER_THAN_QUARTER_NOTE = ['1024', '512', '256', '128', '64', '32', '16', '8'];

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
  private placeholderEntries: VoicePlaceholderEntry[];
  private parent: Voice | null;

  private constructor(opts: {
    config: Config;
    entries: VoiceEntry[];
    timeSignature: TimeSignature;
    placeholderEntries: VoicePlaceholderEntry[];
    parent: Voice | null;
  }) {
    this.config = opts.config;
    this.entries = opts.entries;
    this.timeSignature = opts.timeSignature;
    this.placeholderEntries = opts.placeholderEntries;
    this.parent = opts.parent;
  }

  /** Creates a root voice, which can be used to spawn child placeholder voices. */
  static root(opts: {
    config: Config;
    entries: VoiceEntry[];
    timeSignature: TimeSignature;
    placeholderEntries: VoicePlaceholderEntry[];
  }): Voice {
    return new Voice({
      config: opts.config,
      entries: opts.entries,
      timeSignature: opts.timeSignature,
      placeholderEntries: opts.placeholderEntries,
      parent: null,
    });
  }

  /** Creates a voice with a single whole note rest. */
  static wholeRest(opts: { config: Config; timeSignature: TimeSignature; clef: Clef }): Voice {
    const wholeRest = Rest.whole({
      config: opts.config,
      clef: opts.clef,
    });

    return Voice.root({
      config: opts.config,
      timeSignature: opts.timeSignature,
      entries: [wholeRest],
      placeholderEntries: [{ division: Division.zero(), durationDenominator: '1' }],
    });
  }

  /**
   * Creates a placeholder voice that mirrors the current voice using GhostNotes.
   *
   * NOTE: You cannot create a placeholder voice from a placeholder voice. Use the root voice.
   *
   * This is particularly useful for vexflow structures that cannot be attached to a note, but needs to be associated
   * with a note. For example, a `vexflow.TextDynamics` is a `vexflow.Note`, not a `vexflow.Modifier`. It needs to be
   * rendered in its own voice.
   */
  toPlaceholder(): Voice {
    if (this.isPlaceholder()) {
      throw new Error('cannot create a placeholder voice from a placeholder voice');
    }

    const placeholderEntries = this.placeholderEntries.map((entry) => ({ ...entry }));
    const entries = this.placeholderEntries.map(
      (entry) => new GhostNote({ durationDenominator: entry.durationDenominator })
    );

    return new Voice({
      config: this.config,
      entries,
      timeSignature: this.timeSignature,
      placeholderEntries: placeholderEntries,
      parent: this,
    });
  }

  /** Renders the Voice. */
  render(opts: { address: Address<'voice'>; spanners: Spanners }): VoiceRendering {
    const voiceEntryRenderings = this.entries.map<VoiceEntryRendering>((entry) => {
      if (entry instanceof Note) {
        return entry.render({ spanners: opts.spanners, address: opts.address });
      }
      if (entry instanceof Chord) {
        return entry.render({ spanners: opts.spanners, address: opts.address });
      }
      if (entry instanceof Rest) {
        return entry.render({ spanners: opts.spanners, voiceEntryCount: this.entries.length, address: opts.address });
      }
      if (entry instanceof GhostNote) {
        return entry.render();
      }
      // If this error is thrown, this is a problem with vexml, not the musicXML document.
      throw new Error(`unexpected voice entry: ${entry}`);
    });

    const vfTickables = new Array<vexflow.Tickable>();

    // Accumulate tickables.
    for (const voiceEntryRendering of voiceEntryRenderings) {
      switch (voiceEntryRendering.type) {
        case 'stavenote':
          vfTickables.push(voiceEntryRendering.vexflow.staveNote);
          break;
        case 'stavechord':
          vfTickables.push(voiceEntryRendering.notes[0].vexflow.staveNote);
          break;
        case 'rest':
          vfTickables.push(voiceEntryRendering.vexflow.staveNote);
          break;
        case 'ghostnote':
          vfTickables.push(voiceEntryRendering.vexflow.ghostNote);
          break;
      }
    }

    let vfGraceNotes = new Array<vexflow.GraceNote>();
    let hasSlur = false;

    // Attach preceding grace notes to the nearest stave note.
    for (const voiceEntryRendering of voiceEntryRenderings) {
      let vfStaveNote: vexflow.StaveNote | null = null;

      switch (voiceEntryRendering.type) {
        case 'gracenote':
          vfGraceNotes.push(voiceEntryRendering.vexflow.graceNote);
          hasSlur = hasSlur || voiceEntryRendering.hasSlur;
          break;
        case 'gracechord':
          vfGraceNotes.push(voiceEntryRendering.graceNotes[0].vexflow.graceNote);
          hasSlur = hasSlur || voiceEntryRendering.graceNotes[0].hasSlur;
          break;
        case 'stavenote':
          vfStaveNote = voiceEntryRendering.vexflow.staveNote;
          break;
        case 'stavechord':
          vfStaveNote = voiceEntryRendering.notes[0].vexflow.staveNote;
          break;
      }

      if (vfStaveNote && vfGraceNotes.length > 0) {
        const vfGraceNoteGroup = new vexflow.GraceNoteGroup(vfGraceNotes, hasSlur).setPosition(
          vexflow.ModifierPosition.LEFT
        );

        if (
          vfGraceNotes.length > 1 &&
          vfGraceNotes.every((vfGraceNote) => DURATIONS_SHORTER_THAN_QUARTER_NOTE.includes(vfGraceNote.getDuration()))
        ) {
          vfGraceNoteGroup.beamNotes();
        }

        vfStaveNote.addModifier(vfGraceNoteGroup);
        vfGraceNotes = [];
        hasSlur = false;
      }
    }

    const fraction = this.timeSignature.toFraction();
    const vfVoice = new vexflow.Voice({
      numBeats: fraction.numerator,
      beatValue: fraction.denominator,
    })
      .setStrict(false)
      .addTickables(vfTickables);

    return {
      type: 'voice',
      address: opts.address,
      vexflow: { voice: vfVoice },
      entries: voiceEntryRenderings,
      isPlaceholder: this.isPlaceholder(),
    };
  }

  private isPlaceholder(): boolean {
    return this.parent !== null;
  }
}
