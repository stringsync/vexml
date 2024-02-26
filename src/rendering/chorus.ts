import { Config } from './config';
import { MeasureEntryIterator } from './measureentryiterator';
import { MeasureEntry, StaveSignature } from './stavesignature';
import { Voice, VoiceEntry, VoiceRendering } from './voice';
import * as util from '@/util';
import * as musicxml from '@/musicxml';
import * as conversions from './conversions';
import * as vexflow from 'vexflow';
import { Clef } from './clef';
import { StemDirection } from './enums';
import { Address } from './address';
import { Spanners } from './spanners';

const UNDEFINED_VOICE_ID = '';

/** The result of rendering a chorus. */
export type ChorusRendering = {
  type: 'chorus';
  voices: VoiceRendering[];
};

/** Houses the coordination of several voices. */
export class Chorus {
  private config: Config;
  private measureEntries: MeasureEntry[];
  private staveSignature: StaveSignature;

  private constructor(opts: { config: Config; measureEntries: MeasureEntry[]; staveSignature: StaveSignature }) {
    this.config = opts.config;
    this.measureEntries = opts.measureEntries;
    this.staveSignature = opts.staveSignature;
  }

  /** Returns the minimum justify width for the stave in a measure context. */
  @util.memoize()
  getMinJustifyWidth(address: Address<'chorus'>): number {
    const spanners = new Spanners();
    const voices = this.getVoices();

    if (voices.length > 0) {
      const vfVoices = voices.map(
        (voice, index) =>
          voice.render({
            address: address.voice({ voiceIndex: index }),
            spanners,
          }).vexflow.voice
      );

      const vfFormatter = new vexflow.Formatter();
      return vfFormatter.joinVoices(vfVoices).preCalculateMinTotalWidth(vfVoices) + this.config.VOICE_PADDING;
    }

    return 0;
  }

  /** Renders the chorus. */
  render(opts: { address: Address<'chorus'>; spanners: Spanners }): ChorusRendering {
    const voiceRenderings = this.getVoices().map((voice, index) =>
      voice.render({
        address: opts.address.voice({ voiceIndex: index }),
        spanners: opts.spanners,
      })
    );

    return {
      type: 'chorus',
      voices: voiceRenderings,
    };
  }

  @util.memoize()
  private getVoices(): Voice[] {
    // Calculate initial voice entry data.
    const directions: Record<string, musicxml.Direction[]> = {};
    const voiceEntries: Record<string, VoiceEntry[]> = {};

    let staveSignature = this.staveSignature;
    let voiceId = UNDEFINED_VOICE_ID;

    const iterator = new MeasureEntryIterator({
      entries: this.measureEntries,
      staveSignature,
    });

    let iteration = iterator.next();

    while (!iteration.done) {
      if (iteration.value.entry instanceof StaveSignature) {
        staveSignature = iteration.value.entry;
      }

      if (iteration.value.entry instanceof musicxml.Direction) {
        const direction = iteration.value.entry;
        const voiceId = direction.getVoice() || UNDEFINED_VOICE_ID;
        directions[voiceId] ??= [];
        directions[voiceId].push(direction);

        // TODO: Handle octave shifts.
      }

      if (iteration.value.entry instanceof musicxml.Note) {
        const note = iteration.value.entry;

        voiceId = note.getVoice() ?? voiceId ?? UNDEFINED_VOICE_ID;

        if (note.isChordTail()) {
          continue;
        } else if (note.isGrace()) {
          voiceEntries[voiceId] ??= [];
          voiceEntries[voiceId].push({
            voiceId,
            note,
            start: iteration.value.start,
            end: iteration.value.end,
            stem: 'auto',
            // Directions are handled by stave notes. We don't want to process them multiple times.
            directions: [],
            staveSignature,
          });
        } else {
          voiceEntries[voiceId] ??= [];
          voiceEntries[voiceId].push({
            voiceId,
            note,
            start: iteration.value.start,
            end: iteration.value.end,
            stem: conversions.fromStemToStemDirection(note.getStem()),
            directions: [...(directions[voiceId] ?? []), ...(directions[UNDEFINED_VOICE_ID] ?? [])],
            staveSignature,
          });
          delete directions[voiceId];
          delete directions[UNDEFINED_VOICE_ID];
        }
      }

      if (iteration.value.entry instanceof musicxml.Backup || iteration.value.entry instanceof musicxml.Forward) {
        directions[voiceId] ??= [];
        directions[voiceId].push(...(directions[UNDEFINED_VOICE_ID] ?? []));
        delete directions[UNDEFINED_VOICE_ID];
      }

      iteration = iterator.next();
    }

    // Move all the undefined voice directions to the last voice.
    directions[voiceId]?.push(...(directions[UNDEFINED_VOICE_ID] ?? []));
    delete directions[UNDEFINED_VOICE_ID];

    // Handle any leftover directions that weren't attached to a succeeding note _in the same voice_ by attaching them
    // to the last note in each voice. If there are no notes in a voice, the directions are discarded.
    for (const voiceId of Object.keys(directions)) {
      util.last(voiceEntries[voiceId] ?? [])?.directions.push(...directions[voiceId]);
    }

    // Adjust the voice entry data stems.
    const firstElgibleVoiceEntries = Object.values(voiceEntries)
      .map((voiceEntry) => voiceEntry.find((entry) => !entry.note.isRest() && !entry.note.isGrace()))
      .filter((entry): entry is VoiceEntry => typeof entry !== 'undefined');

    // Sort the notes by descending line based on the entry's highest note. This allows us to figure out which voice
    // should be on top, middle, and bottom easily.
    util.sortBy(firstElgibleVoiceEntries, (entry) => {
      const note = entry.note;
      const staveNumber = note.getStaveNumber();
      const clef = entry.staveSignature.getClef(staveNumber);
      return -this.staveNoteLine(note, clef);
    });

    if (firstElgibleVoiceEntries.length > 1) {
      const stems: { [voiceId: string]: StemDirection } = {};

      const top = util.first(firstElgibleVoiceEntries)!;
      const middle = firstElgibleVoiceEntries.slice(1, -1);
      const bottom = util.last(firstElgibleVoiceEntries)!;

      stems[top.voiceId] = 'up';
      stems[bottom.voiceId] = 'down';
      for (const entry of middle) {
        stems[entry.voiceId] = 'none';
      }

      for (const entry of Object.values(voiceEntries).flat()) {
        // Only change stems that haven't been explicitly specified.
        if (entry.stem === 'auto') {
          entry.stem = stems[voiceId];
        }
      }
    }

    // Create the voices.
    return Object.values(voiceEntries).map(
      (entries) =>
        new Voice({
          config: this.config,
          entries,
        })
    );
  }

  /** Returns the line that the note would be rendered on. */
  private staveNoteLine(note: musicxml.Note, clef: Clef): number {
    return new vexflow.StaveNote({
      duration: '4',
      keys: [note, ...note.getChordTail()].map((note) => {
        const step = note.getStep();
        const octave = note.getOctave() - clef.getOctaveChange();
        const notehead = note.getNotehead();
        const suffix = conversions.fromNoteheadToNoteheadSuffix(notehead);
        return suffix ? `${step}/${octave}/${suffix}` : `${step}/${octave}`;
      }),
    }).getKeyLine(0);
  }
}
