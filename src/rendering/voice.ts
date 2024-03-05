import { Division } from './division';
import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import * as conversions from './conversions';
import * as util from '@/util';
import {
  DYNAMICS_CHARACETERS as DYNAMICS_CHARACTERS,
  DynamicsCharacter,
  NoteDurationDenominator,
  StemDirection,
} from './enums';
import { StaveSignature } from './stavesignature';
import { Config } from './config';
import { Spanners } from './spanners';
import { Address } from './address';
import { GraceNoteRendering, Note, StaveNoteRendering } from './note';
import { Chord, GraceChordRendering, StaveChordRendering } from './chord';
import { Rest, RestRendering } from './rest';
import { GhostNote, GhostNoteRendering } from './ghostnote';
import { TimeSignature } from './timesignature';
import { SymbolNote, SymbolNoteRendering } from './symbolnote';

const DURATIONS_SHORTER_THAN_QUARTER_NOTE = ['1024', '512', '256', '128', '64', '32', '16', '8'];

/** The result of rendering a voice. */
export type VoiceRendering = {
  type: 'voice';
  address: Address<'voice'>;
  vexflow: {
    voice: vexflow.Voice;
  };
  placeholders: VoiceRendering[];
  entries: VoiceEntryRendering[];
};

/** The result rendering a VoiceEntry. */
export type VoiceEntryRendering =
  | StaveNoteRendering
  | StaveChordRendering
  | GraceNoteRendering
  | GraceChordRendering
  | RestRendering
  | GhostNoteRendering
  | SymbolNoteRendering;

/** The input data of a Voice. */
export type VoiceInput = {
  voiceId: string;
  staveSignature: StaveSignature;
  note: musicxml.Note;
  stem: StemDirection;
  start: Division;
  end: Division;
  directions: musicxml.Direction[];
};

/** The renderable objects of a Voice. */
export type VoiceEntry = {
  start: Division;
  end: Division;
  value: Note | Chord | Rest | GhostNote | SymbolNote;
  directions: musicxml.Direction[];
};

/**
 * Represents a musical voice within a stave, containing a distinct sequence of notes, rests, and other musical
 * symbols.
 */
export class Voice {
  private config: Config;
  private id: string;
  private entries: VoiceEntry[];
  private timeSignature: TimeSignature;
  private parent: Voice | null;

  constructor(opts: {
    config: Config;
    id: string;
    entries: VoiceEntry[];
    timeSignature: TimeSignature;
    parent: Voice | null;
  }) {
    this.config = opts.config;
    this.id = opts.id;
    this.entries = opts.entries;
    this.timeSignature = opts.timeSignature;
    this.parent = opts.parent;
  }

  static fromInputs(opts: { config: Config; id: string; inputs: VoiceInput[]; timeSignature: TimeSignature }): Voice {
    const entries = new Array<VoiceEntry>();

    let divisions = Division.zero();
    let openOctaveShift: musicxml.OctaveShift | null = null;

    for (const input of opts.inputs) {
      const ghostNoteStart = divisions;
      const ghostNoteEnd = input.start;
      const ghostNoteDuration = ghostNoteEnd.subtract(ghostNoteStart);

      if (ghostNoteDuration.isGreaterThan(Division.zero())) {
        const durationDenominator = conversions.fromDivisionsToNoteDurationDenominator(ghostNoteDuration);
        const ghostNote = new GhostNote({ durationDenominator });
        entries.push({ start: ghostNoteStart, end: ghostNoteEnd, value: ghostNote, directions: [] });
      }

      let shouldCloseOctaveShift = false;
      const octaveShifts = input.directions.flatMap((direction) => direction.getOctaveShifts());
      for (const octaveShift of octaveShifts) {
        switch (octaveShift.getType()) {
          case 'up':
          case 'down':
            openOctaveShift = octaveShift;
            break;
          case 'continue':
            // TODO: This won't work when an octave shift spans multiple measure fragments. Detect octave shifts
            // upstream and handle continues correctly.
            break;
          case 'stop':
            shouldCloseOctaveShift = true;
            break;
        }
      }

      const entry = this.toEntry({ config: opts.config, input, octaveShift: openOctaveShift });
      entries.push(entry);

      if (shouldCloseOctaveShift) {
        openOctaveShift = null;
      }

      divisions = input.end;
    }

    return new Voice({ config: opts.config, id: opts.id, entries, timeSignature: opts.timeSignature, parent: null });
  }

  private static toEntry(opts: {
    config: Config;
    input: VoiceInput;
    octaveShift: musicxml.OctaveShift | null;
  }): VoiceEntry {
    const input = opts.input;
    const config = opts.config;
    const octaveShift = opts.octaveShift;
    const note = input.note;
    const stem = input.stem;
    const directions = input.directions;
    const duration = input.end.subtract(input.start);
    const staveNumber = note.getStaveNumber();
    const clef = input.staveSignature.getClef(staveNumber);
    const keySignature = input.staveSignature.getKeySignature(staveNumber);

    const durationDenominator =
      conversions.fromNoteTypeToNoteDurationDenominator(note.getType()) ??
      conversions.fromDivisionsToNoteDurationDenominator(duration);

    if (!note.printObject()) {
      return {
        start: input.start,
        end: input.end,
        value: new GhostNote({ durationDenominator }),
        directions,
      };
    } else if (note.isChordHead()) {
      return {
        start: input.start,
        end: input.end,
        value: new Chord({
          config,
          musicXML: { note, directions, octaveShift },
          stem,
          clef,
          durationDenominator,
          keySignature,
        }),
        directions,
      };
    } else if (note.isRest()) {
      return {
        start: input.start,
        end: input.end,
        value: new Rest({
          config,
          musicXML: { note, directions },
          clef,
          durationDenominator,
        }),
        directions,
      };
    } else {
      return {
        start: input.start,
        end: input.end,
        value: new Note({
          config,
          musicXML: { note, directions, octaveShift },
          stem,
          clef,
          durationDenominator,
          keySignature,
        }),
        directions,
      };
    }
  }

  /** Renders the voice. */
  render(opts: { address: Address<'voice'>; spanners: Spanners }): VoiceRendering {
    const address = opts.address;
    const spanners = opts.spanners;

    const voiceEntryRenderings = this.entries.map(({ value }) => {
      if (value instanceof Note) {
        return value.render({ address, spanners });
      }
      if (value instanceof Chord) {
        return value.render({ address, spanners });
      }
      if (value instanceof Rest) {
        return value.render({ address, spanners, voiceEntryCount: this.entries.length });
      }
      if (value instanceof GhostNote) {
        return value.render();
      }
      if (value instanceof SymbolNote) {
        return value.render();
      }
      // If this error is thrown, this is a problem with vexml, not the musicXML document.
      throw new Error(`unexpected voice entry: ${value}`);
    });

    const vfTickables = new Array<vexflow.Tickable>();

    for (const rendering of voiceEntryRenderings) {
      switch (rendering.type) {
        case 'stavenote':
          vfTickables.push(rendering.vexflow.staveNote);
          break;
        case 'stavechord':
          vfTickables.push(rendering.notes[0].vexflow.staveNote);
          break;
        case 'rest':
          vfTickables.push(rendering.vexflow.staveNote);
          break;
        case 'ghostnote':
          vfTickables.push(rendering.vexflow.ghostNote);
          break;
        case 'symbolnote':
          vfTickables.push(rendering.vexflow.textDynamics);
          break;
      }
    }

    let vfGraceNotes = new Array<vexflow.GraceNote>();
    let hasSlur = false;

    // Attach preceding grace notes to the nearest stave note.
    for (const rendering of voiceEntryRenderings) {
      let vfStaveNote: vexflow.StaveNote | null = null;

      switch (rendering.type) {
        case 'gracenote':
          vfGraceNotes.push(rendering.vexflow.graceNote);
          hasSlur = hasSlur || rendering.hasSlur;
          break;
        case 'gracechord':
          vfGraceNotes.push(rendering.graceNotes[0].vexflow.graceNote);
          hasSlur = hasSlur || rendering.graceNotes[0].hasSlur;
          break;
        case 'stavenote':
          vfStaveNote = rendering.vexflow.staveNote;
          break;
        case 'stavechord':
          vfStaveNote = rendering.notes[0].vexflow.staveNote;
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

    const placeholderVoiceRenderings = this.getPlaceholderVoices().map((voice) => voice.render({ address, spanners }));

    return {
      type: 'voice',
      address,
      vexflow: {
        voice: vfVoice,
      },
      entries: voiceEntryRenderings,
      placeholders: placeholderVoiceRenderings,
    };
  }

  private getPlaceholderVoices(): Voice[] {
    // First, cluster directions that need to rendered on placeholder voices by the division start time.
    const directionsByStartBeat: Record<number, musicxml.Direction[]> = {};
    for (const entry of this.entries) {
      const startBeat = entry.start.toBeats();
      const directions = entry.directions.filter((direction) => this.isPlaceholderVoiceRequired(direction));
      if (directions.length > 0) {
        directionsByStartBeat[startBeat] ??= [];
        directionsByStartBeat[startBeat].push(...directions);
      }
    }

    // The maximum number of placeholder voices we need to accommodate all the special directions.
    const placeholderVoiceCount = util.max(Object.values(directionsByStartBeat).map((directions) => directions.length));
    const placeholderVoices = new Array<Voice>();
    for (let ndx = 0; ndx < placeholderVoiceCount; ndx++) {
      const placeholderVoice = this.toPlaceholderVoice();
      placeholderVoices.push(placeholderVoice);
    }

    // Lastly, go through the direction clusters and determine where in the placeholder voices they should live.
    for (const [startBeat, directions] of Object.entries(directionsByStartBeat)) {
      for (let ndx = 0; ndx < directions.length; ndx++) {
        const placeholderVoice = placeholderVoices[ndx];

        const start = Division.of(parseFloat(startBeat), 1);

        const entry = placeholderVoice.getEntry(start);
        if (!entry) {
          throw new Error(`could not find a placeholder voice entry at beat: ${startBeat}`);
        }

        const duration = entry.end.subtract(entry.start);
        const durationDenominator = conversions.fromDivisionsToNoteDurationDenominator(duration);

        placeholderVoice.replaceEntry(start, {
          ...entry,
          value: this.toSymbolNote(directions[ndx], durationDenominator),
        });
      }
    }

    return placeholderVoices;
  }

  private toSymbolNote(direction: musicxml.Direction, durationDenominator: NoteDurationDenominator): SymbolNote {
    const dynamics = util.first(direction.getDynamics());
    if (dynamics) {
      return this.toDynamicsSymbolNote(dynamics, durationDenominator);
    }
    throw new Error(`unsupported direction`);
  }

  private toDynamicsSymbolNote(dynamics: musicxml.Dynamics, durationDenominator: NoteDurationDenominator): SymbolNote {
    const type = util.first(dynamics.getTypes()) ?? '?';
    if (!type) {
      throw new Error('dynamics direction is missing a type');
    }
    const characters = type.split('').filter((char): char is DynamicsCharacter => DYNAMICS_CHARACTERS.includes(char));
    return SymbolNote.dynamics({ characters, durationDenominator });
  }

  private getEntry(end: Division): VoiceEntry | null {
    return this.entries.find((entry) => entry.start.isEqual(end)) ?? null;
  }

  private replaceEntry(start: Division, voiceEntry: VoiceEntry): void {
    // NOTE: This is inefficient, but we don't expect Voice.entries to exceed 10 elements so we opt for simplicity.
    const index = this.entries.findIndex((entry) => entry.start.isEqual(start));
    if (index < 0) {
      throw new Error(`could not find somewhere to replace placeholder voice entry at beat: ${start.toBeats()}`);
    }

    this.entries[index] = voiceEntry;
  }

  private isPlaceholderVoiceRequired(direction: musicxml.Direction): boolean {
    return direction.getDynamics().length > 0;
  }

  private toPlaceholderVoice(): Voice {
    if (this.parent) {
      throw new Error(`cannot create a placeholder voice for a voice that is not a top-level voice`);
    }

    const entries = this.entries.map((entry) => this.toPlaceholderEntry(entry));

    return new Voice({
      config: this.config,
      id: this.id,
      entries,
      timeSignature: this.timeSignature,
      parent: this,
    });
  }

  private toPlaceholderEntry(entry: VoiceEntry): VoiceEntry {
    const start = entry.start;
    const end = entry.end;

    const duration = end.subtract(start);
    const durationDenominator = conversions.fromDivisionsToNoteDurationDenominator(duration);
    return {
      start,
      end,
      value: new GhostNote({ durationDenominator }),
      directions: [], // avoid processing directions multiple times
    };
  }
}
