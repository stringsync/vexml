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
import { Note } from './note';
import { Chord } from './chord';
import { Rest } from './rest';
import { GhostNote } from './ghostnote';

const DURATIONS_SHORTER_THAN_QUARTER_NOTE = ['1024', '512', '256', '128', '64', '32', '16', '8'];

/** The result of rendering a voice. */
export type VoiceRendering = {
  type: 'voice';
  address: Address<'voice'>;
  vexflow: {
    voice: vexflow.Voice;
  };
};

/** The input data of a Voice. */
export type VoiceEntry = {
  voiceId: string;
  staveSignature: StaveSignature;
  note: musicxml.Note;
  stem: StemDirection;
  start: Division;
  end: Division;
  directions: musicxml.Direction[];
};

/** The renderable objects of a Voice. */
export type VoiceComponent = Note | Chord | Rest | GhostNote;

/**
 * Represents a musical voice within a stave, containing a distinct sequence of notes, rests, and other musical
 * symbols.
 */
export class Voice {
  private config: Config;
  private id: string;
  private entries: VoiceEntry[];

  constructor(opts: { config: Config; id: string; entries: VoiceEntry[] }) {
    this.config = opts.config;
    this.id = opts.id;
    this.entries = opts.entries;
  }

  /** Renders the voice. */
  render(opts: { address: Address<'voice'>; spanners: Spanners }): VoiceRendering {
    const address = opts.address;
    const spanners = opts.spanners;

    const voiceComponentRenderings = this.getComponents().map((component) => {
      if (component instanceof Note) {
        return component.render({ address, spanners });
      }
      if (component instanceof Chord) {
        return component.render({ address, spanners });
      }
      if (component instanceof Rest) {
        return component.render({ address, spanners, voiceEntryCount: this.entries.length });
      }
      if (component instanceof GhostNote) {
        return component.render();
      }
      // If this error is thrown, this is a problem with vexml, not the musicXML document.
      throw new Error(`unexpected voice component: ${component}`);
    });

    const vfTickables = new Array<vexflow.Tickable>();

    for (const voiceComponentRendering of voiceComponentRenderings) {
      switch (voiceComponentRendering.type) {
        case 'stavenote':
          vfTickables.push(voiceComponentRendering.vexflow.staveNote);
          break;
        case 'stavechord':
          vfTickables.push(voiceComponentRendering.notes[0].vexflow.staveNote);
          break;
        case 'rest':
          vfTickables.push(voiceComponentRendering.vexflow.staveNote);
          break;
        case 'ghostnote':
          vfTickables.push(voiceComponentRendering.vexflow.ghostNote);
          break;
      }
    }

    let vfGraceNotes = new Array<vexflow.GraceNote>();
    let hasSlur = false;

    // Attach preceding grace notes to the nearest stave note.
    for (const voiceComponentRendering of voiceComponentRenderings) {
      let vfStaveNote: vexflow.StaveNote | null = null;

      switch (voiceComponentRendering.type) {
        case 'gracenote':
          vfGraceNotes.push(voiceComponentRendering.vexflow.graceNote);
          hasSlur = hasSlur || voiceComponentRendering.hasSlur;
          break;
        case 'gracechord':
          vfGraceNotes.push(voiceComponentRendering.graceNotes[0].vexflow.graceNote);
          hasSlur = hasSlur || voiceComponentRendering.graceNotes[0].hasSlur;
          break;
        case 'stavenote':
          vfStaveNote = voiceComponentRendering.vexflow.staveNote;
          break;
        case 'stavechord':
          vfStaveNote = voiceComponentRendering.notes[0].vexflow.staveNote;
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
    const staveNumber = util.first(this.entries)?.note.getStaveNumber() ?? 1;
    const timeSignature = util.first(this.entries)!.staveSignature.getTimeSignature(staveNumber);
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
    };
  }

  @util.memoize()
  private getComponents(): VoiceComponent[] {
    const result = new Array<VoiceComponent>();

    let divisions = Division.zero();

    for (const entry of this.entries) {
      const ghostNoteStart = divisions;
      const ghostNoteEnd = entry.start;
      const ghostNoteDuration = ghostNoteEnd.subtract(ghostNoteStart);

      if (ghostNoteDuration.isGreaterThan(Division.zero())) {
        const durationDenominator = conversions.fromDivisionsToNoteDurationDenominator(ghostNoteDuration);
        const ghostNote = new GhostNote({ durationDenominator });
        result.push(ghostNote);
      }

      const component = this.toComponent(entry);
      result.push(component);

      divisions = entry.end;
    }

    // TODO: Check to see if we need to fill the remaining duration of the measure with a ghost note.

    return result;
  }

  private toComponent(entry: VoiceEntry): VoiceComponent {
    const note = entry.note;
    const stem = entry.stem;
    const directions = entry.directions;
    const duration = entry.end.subtract(entry.start);
    const staveNumber = note.getStaveNumber();
    const clef = entry.staveSignature.getClef(staveNumber);
    const keySignature = entry.staveSignature.getKeySignature(staveNumber);

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
