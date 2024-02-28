import { Division } from './division';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import * as vexflow from 'vexflow';
import * as conversions from './conversions';
import { StemDirection } from './enums';
import { StaveSignature } from './stavesignature';
import { Config } from './config';
import { Spanners } from './spanners';
import { Address } from './address';
import { GraceNoteRendering, Note, StaveNoteRendering } from './note';
import { Chord, GraceChordRendering, StaveChordRendering } from './chord';
import { Rest, RestRendering } from './rest';
import { GhostNote, GhostNoteRendering } from './ghostnote';

const DURATIONS_SHORTER_THAN_QUARTER_NOTE = ['1024', '512', '256', '128', '64', '32', '16', '8'];

/** The result of rendering a voice. */
export type VoiceRendering = {
  type: 'voice';
  address: Address<'voice'>;
  vexflow: {
    voice: vexflow.Voice;
  };
  entries: VoiceEntryRendering[];
};

/** The result rendering a VoiceEntry. */
export type VoiceEntryRendering =
  | StaveNoteRendering
  | StaveChordRendering
  | GraceNoteRendering
  | GraceChordRendering
  | RestRendering
  | GhostNoteRendering;

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
export type VoiceEntry = Note | Chord | Rest | GhostNote;

/**
 * Represents a musical voice within a stave, containing a distinct sequence of notes, rests, and other musical
 * symbols.
 */
export class Voice {
  private config: Config;
  private id: string;
  private inputs: VoiceInput[];

  constructor(opts: { config: Config; id: string; inputs: VoiceInput[] }) {
    this.config = opts.config;
    this.id = opts.id;
    this.inputs = opts.inputs;
  }

  /** Renders the voice. */
  render(opts: { address: Address<'voice'>; spanners: Spanners }): VoiceRendering {
    const address = opts.address;
    const spanners = opts.spanners;

    const voiceEntryRenderings = this.getEntries().map((entry) => {
      if (entry instanceof Note) {
        return entry.render({ address, spanners });
      }
      if (entry instanceof Chord) {
        return entry.render({ address, spanners });
      }
      if (entry instanceof Rest) {
        return entry.render({ address, spanners, voiceEntryCount: this.inputs.length });
      }
      if (entry instanceof GhostNote) {
        return entry.render();
      }
      // If this error is thrown, this is a problem with vexml, not the musicXML document.
      throw new Error(`unexpected voice entry: ${entry}`);
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

    // TODO: It's incorrect for the Voice to have a single stave number. It should have a list of stave numbers.
    const staveNumber = util.first(this.inputs)?.note.getStaveNumber() ?? 1;
    const timeSignature = util.first(this.inputs)!.staveSignature.getTimeSignature(staveNumber);
    const fraction = timeSignature.toFraction();
    const vfVoice = new vexflow.Voice({
      numBeats: fraction.numerator,
      beatValue: fraction.denominator,
    })
      .setStrict(false)
      .addTickables(vfTickables);

    return {
      type: 'voice',
      address,
      vexflow: {
        voice: vfVoice,
      },
      entries: voiceEntryRenderings,
    };
  }

  @util.memoize()
  private getEntries(): VoiceEntry[] {
    const result = new Array<VoiceEntry>();

    let divisions = Division.zero();

    for (const input of this.inputs) {
      const ghostNoteStart = divisions;
      const ghostNoteEnd = input.start;
      const ghostNoteDuration = ghostNoteEnd.subtract(ghostNoteStart);

      if (ghostNoteDuration.isGreaterThan(Division.zero())) {
        const durationDenominator = conversions.fromDivisionsToNoteDurationDenominator(ghostNoteDuration);
        const ghostNote = new GhostNote({ durationDenominator });
        result.push(ghostNote);
      }

      const entry = this.toEntry(input);
      result.push(entry);

      divisions = input.end;
    }

    // TODO: Check to see if we need to fill the remaining duration of the measure with a ghost note.

    return result;
  }

  private toEntry(input: VoiceInput): VoiceEntry {
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
      return new GhostNote({ durationDenominator });
    } else if (note.isChordHead()) {
      return new Chord({
        config: this.config,
        // TODO: Calculate octave shifts from the stave signature.
        musicXML: { note, directions, octaveShift: null },
        stem,
        clef,
        durationDenominator,
        keySignature,
      });
    } else if (note.isRest()) {
      return new Rest({
        config: this.config,
        musicXML: { note, directions },
        // TODO: Remove dotCount since it can be inferred from the musicxml.Note.
        dotCount: note.getDotCount(),
        clef,
        durationDenominator,
      });
    } else {
      return new Note({
        config: this.config,
        // TODO: Calculate octave shifts from the stave signature.
        musicXML: { note, directions, octaveShift: null },
        stem,
        clef,
        durationDenominator,
        keySignature,
      });
    }
  }
}
