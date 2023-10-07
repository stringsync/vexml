import { Config } from './config';
import { Division } from './division';
import { StemDirection } from './enums';
import { Voice, VoiceEntryData, VoiceRendering } from './voice';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import * as vexflow from 'vexflow';

/** The result of rendering a chorus. */
export type ChorusRendering = {
  type: 'chorus';
  voices: VoiceRendering[];
};

/** The data needed to specify multiple voices in a stave. */
export type ChorusEntry = musicxml.Note | musicxml.Backup | musicxml.Forward;

/**
 * Represents a collection or cluster of musical voices within a single measure.
 *
 * This is *not* the same as a chorus from songwriting.
 *
 * The `Chorus` class encapsulates the harmonization and interaction of multiple voices, ensuring that the voices can be
 * interpreted, rendered, and managed cohesively.
 */
export class Chorus {
  private config: Config;
  private voices: Voice[];

  private constructor(opts: { config: Config; voices: Voice[] }) {
    this.config = opts.config;
    this.voices = opts.voices;
  }

  /** Creates a Chorus. */
  static create(opts: {
    config: Config;
    entries: ChorusEntry[];
    clefType: musicxml.ClefType;
    timeSignature: musicxml.TimeSignature;
    quarterNoteDivisions: number;
  }): Chorus {
    const config = opts.config;
    const entries = opts.entries;
    const clefType = opts.clefType;
    const timeSignature = opts.timeSignature;
    const quarterNoteDivisions = opts.quarterNoteDivisions;

    const data: { [voiceId: string]: VoiceEntryData[] } = {};
    let divisions = Division.of(0, quarterNoteDivisions);

    // Create the initial voice data. We won't be able to know the stem directions until it's fully populated.
    for (const entry of entries) {
      if (entry instanceof musicxml.Note) {
        const note = entry;

        if (note.isGrace()) {
          continue;
        }
        if (note.isChordTail()) {
          continue;
        }

        const voiceId = note.getVoice();

        data[voiceId] ??= [];

        const noteDuration = Division.of(note.getDuration(), quarterNoteDivisions);
        const startDivision = divisions;
        const endDivision = startDivision.add(noteDuration);

        const stem = Chorus.toStemDirection(note.getStem());

        data[voiceId].push({
          voiceId,
          note,
          start: startDivision,
          end: endDivision,
          stem,
        });

        divisions = divisions.add(noteDuration);
      }

      if (entry instanceof musicxml.Backup) {
        const backupDuration = Division.of(entry.getDuration(), quarterNoteDivisions);
        divisions = divisions.subtract(backupDuration);
      }

      if (entry instanceof musicxml.Forward) {
        const forwardDuration = Division.of(entry.getDuration(), quarterNoteDivisions);
        divisions = divisions.add(forwardDuration);
      }
    }

    const voiceIds = Object.keys(data);

    // Adjust the stems based on the first non-rest note of each voice by mutating the voice entry data in place. Do not
    // change any stem directions that were explicitly defined in the MusicXML document.
    const firstNonRestVoiceEntries = voiceIds
      .map((voiceId) => data[voiceId].find((entry) => !entry.note.isRest()))
      .filter((entry): entry is VoiceEntryData => typeof entry !== 'undefined');

    // Sort the notes by descending line based on the entry's highest note. This allows us to figure out which voice
    // should be on top, middle, and bottom easily.
    util.sortBy(firstNonRestVoiceEntries, (entry) => -Chorus.toStaveNoteLine(entry.note));

    if (firstNonRestVoiceEntries.length > 1) {
      const stems: { [voiceId: string]: StemDirection } = {};

      const top = util.first(firstNonRestVoiceEntries)!;
      const middle = firstNonRestVoiceEntries.slice(1, -1);
      const bottom = util.last(firstNonRestVoiceEntries)!;

      stems[top.voiceId] = 'up';
      stems[bottom.voiceId] = 'down';
      for (const entry of middle) {
        stems[entry.voiceId] = 'none';
      }

      for (const voiceId of voiceIds) {
        for (const entry of data[voiceId]) {
          // Only change stems that haven't been explicitly specified.
          if (entry.stem === 'auto') {
            entry.stem = stems[voiceId];
          }
        }
      }
    }

    const voices = voiceIds.map((voiceId) =>
      Voice.create({
        config,
        id: voiceId,
        data: data[voiceId],
        quarterNoteDivisions,
        timeSignature,
        clefType,
      })
    );

    return new Chorus({ config, voices });
  }

  private static toStemDirection(stem: musicxml.Stem | null): StemDirection {
    switch (stem) {
      case 'up':
        return 'up';
      case 'down':
        return 'down';
      case 'none':
        return 'none';
      default:
        return 'auto';
    }
  }

  private static toStaveNoteLine(note: musicxml.Note): number {
    return new vexflow.StaveNote({
      duration: '4',
      keys: [note, ...note.getChordTail()].map((note) => {
        let key = note.getPitch();

        const suffix = note.getNoteheadSuffix();
        if (suffix) {
          key += `/${suffix}`;
        }

        return key;
      }),
    }).getKeyLine(0);
  }

  /** Returns the minimum justify width for the stave in a measure context. */
  @util.memoize()
  getMinJustifyWidth(): number {
    if (this.voices.length > 0) {
      const vfVoices = this.voices.map((voice) => voice.render().vexflow.voice);
      const vfFormatter = new vexflow.Formatter();
      return vfFormatter.joinVoices(vfVoices).preCalculateMinTotalWidth(vfVoices) + this.config.measurePadding;
    }
    return 0;
  }

  /** Clones the Chorus. */
  clone(): Chorus {
    return new Chorus({
      config: this.config,
      voices: this.voices.map((voice) => voice.clone()),
    });
  }

  /** Renders the Chorus. */
  render(): ChorusRendering {
    const voiceRenderings = this.voices.map((voice) => voice.render());

    return {
      type: 'chorus',
      voices: voiceRenderings,
    };
  }
}
