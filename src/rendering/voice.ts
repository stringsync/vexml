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

/** The result of rendering a voice. */
export type VoiceRendering = {
  type: 'voice';
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
    const vfVoice = new vexflow.Voice({ numBeats: 4, beatValue: 4 }).setStrict(false);

    return {
      type: 'voice',
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
