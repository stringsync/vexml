import { Config } from './config';
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
    musicXml: {
      measure: musicxml.Measure;
    };
    staffNumber: number;
    clefType: musicxml.ClefType;
  }): Chorus {
    const config = opts.config;
    const measure = opts.musicXml.measure;
    const staffNumber = opts.staffNumber;
    const clefType = opts.clefType;

    const data: { [voiceId: string]: VoiceEntryData[] } = {};
    let divisions = 0;

    // Create the initial voice data. We won't be able to know the stem directions until it's fully populated.
    for (const entry of measure.getEntries()) {
      if (entry instanceof musicxml.Note) {
        const note = entry;

        if (note.getStaffNumber() !== staffNumber) {
          continue;
        }
        if (note.isGrace()) {
          continue;
        }
        if (note.isChordTail()) {
          continue;
        }

        const voiceId = note.getVoice();

        data[voiceId] ??= [];

        const noteDuration = note.getDuration();
        const startDivision = divisions;
        const endDivision = startDivision + noteDuration;

        const stem = Chorus.toStemDirection(note.getStem());

        data[voiceId].push({
          voiceId,
          note,
          startDivision,
          endDivision,
          stem,
        });

        divisions += noteDuration;
      }

      if (entry instanceof musicxml.Backup) {
        divisions -= entry.getDuration();
      }

      if (entry instanceof musicxml.Forward) {
        divisions += entry.getDuration();
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

    // TODO: Handle attributes changing mid-measure.
    const attributes = measure.getAttributes();
    const quarterNoteDivisions = attributes.flatMap((attribute) => attribute.getQuarterNoteDivisions())[0] ?? 2;
    const timeSignature =
      attributes
        .flatMap((attribute) => attribute.getTimes())
        .find((time) => time.getStaffNumber() === staffNumber)
        ?.getTimeSignatures()[0] ?? new musicxml.TimeSignature(4, 4);

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
