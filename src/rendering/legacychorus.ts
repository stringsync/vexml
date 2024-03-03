import { Clef } from './clef';
import { Config } from './config';
import { Division } from './division';
import { StemDirection } from './enums';
import { VoicePlaceholderEntry, LegacyVoice, VoiceEntry, LegacyVoiceRendering } from './legacyvoice';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import * as vexflow from 'vexflow';
import * as conversions from './conversions';
import { MeasureEntry, StaveSignature } from './stavesignature';
import { TimeSignature } from './timesignature';
import { KeySignature } from './keysignature';
import { GhostNote } from './ghostnote';
import { Chord } from './chord';
import { Rest } from './rest';
import { Note } from './note';
import { Address } from './address';
import { Spanners } from './spanners';

const UNDEFINED_VOICE_ID = '';

/** The result of rendering a chorus. */
export type LegacyChorusRendering = {
  type: 'legacychorus';
  address: Address<'chorus'>;
  voices: LegacyVoiceRendering[];
};

type VoiceEntryData = {
  voiceId: string;
  note: musicxml.Note;
  stem: StemDirection;
  start: Division;
  end: Division;
  directions: musicxml.Direction[];
  octaveShift: musicxml.OctaveShift | null;
};

type WholeRestChorusData = { type: 'wholerest' };

type MultiVoiceChorusData = {
  type: 'multivoice';
  quarterNoteDivisions: number;
  measureEntries: MeasureEntry[];
  keySignature: KeySignature;
};

type ChorusData = WholeRestChorusData | MultiVoiceChorusData;

/**
 * Represents a collection or cluster of musical voices within a single measure.
 *
 * This is *not* the same as a chorus from songwriting.
 *
 * The `Chorus` class encapsulates the harmonization and interaction of multiple voices, ensuring that the voices can be
 * interpreted, rendered, and managed cohesively.
 */
export class LegacyChorus {
  private config: Config;
  private data: ChorusData;
  private clef: Clef;
  private timeSignature: TimeSignature;

  private constructor(opts: { config: Config; data: ChorusData; clef: Clef; timeSignature: TimeSignature }) {
    this.config = opts.config;
    this.data = opts.data;
    this.clef = opts.clef;
    this.timeSignature = opts.timeSignature;
  }

  /** Creates a Chorus with multiple voices. */
  static multiVoice(opts: {
    config: Config;
    timeSignature: TimeSignature;
    clef: Clef;
    quarterNoteDivisions: number;
    measureEntries: MeasureEntry[];
    keySignature: KeySignature;
  }): LegacyChorus {
    return new LegacyChorus({
      config: opts.config,
      data: {
        type: 'multivoice',
        keySignature: opts.keySignature,
        measureEntries: opts.measureEntries,
        quarterNoteDivisions: opts.quarterNoteDivisions,
      },
      timeSignature: opts.timeSignature,
      clef: opts.clef,
    });
  }

  /** Creates a Chorus with a single voice that is a single whole note rest. */
  static wholeRest(opts: { config: Config; timeSignature: TimeSignature; clef: Clef }): LegacyChorus {
    return new LegacyChorus({
      config: opts.config,
      data: { type: 'wholerest' },
      timeSignature: opts.timeSignature,
      clef: opts.clef,
    });
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

  /** Renders the Chorus. */
  render(opts: { address: Address<'chorus'>; spanners: Spanners }): LegacyChorusRendering {
    const voiceRenderings = this.getVoices().map((voice, index) =>
      voice.render({
        address: opts.address.voice({ voiceIndex: index }),
        spanners: opts.spanners,
      })
    );

    return {
      type: 'legacychorus',
      address: opts.address,
      voices: voiceRenderings,
    };
  }

  @util.memoize()
  private getVoices(): LegacyVoice[] {
    switch (this.data.type) {
      case 'wholerest':
        return this.createWholeRest();
      case 'multivoice':
        return this.createMultiVoice({
          keySignature: this.data.keySignature,
          measureEntries: this.data.measureEntries,
          quarterNoteDivisions: this.data.quarterNoteDivisions,
        });
    }
  }

  private createWholeRest(): LegacyVoice[] {
    return [
      LegacyVoice.wholeRest({
        config: this.config,
        timeSignature: this.timeSignature,
        clef: this.clef,
      }),
    ];
  }

  private createMultiVoice(opts: {
    quarterNoteDivisions: number;
    measureEntries: MeasureEntry[];
    keySignature: KeySignature;
  }): LegacyVoice[] {
    const voiceEntryData = this.computeVoiceEntryData({
      measureEntries: opts.measureEntries,
      quarterNoteDivisions: opts.quarterNoteDivisions,
    });

    this.adjustStems(voiceEntryData);

    return this.computeFullyQualifiedVoices({
      voiceEntryData,
      keySignature: opts.keySignature,
      quarterNoteDivisions: opts.quarterNoteDivisions,
    });
  }

  private computeVoiceEntryData(opts: {
    quarterNoteDivisions: number;
    measureEntries: MeasureEntry[];
  }): Record<string, VoiceEntryData[]> {
    const result: Record<string, VoiceEntryData[]> = {};

    let voiceId = UNDEFINED_VOICE_ID;
    let quarterNoteDivisions = opts.quarterNoteDivisions;
    let divisions = Division.of(0, quarterNoteDivisions);
    const directionsByVoiceId: Record<string, musicxml.Direction[]> = {};
    let octaveShift: musicxml.OctaveShift | null = null;

    // Create the initial voice data. We won't be able to know the stem directions until it's fully populated.
    for (let index = 0; index < opts.measureEntries.length; index++) {
      const entry = opts.measureEntries[index];

      if (entry instanceof StaveSignature) {
        quarterNoteDivisions = entry.getQuarterNoteDivisions();
      }

      if (entry instanceof musicxml.Direction) {
        const voiceId = entry.getVoice() ?? UNDEFINED_VOICE_ID;
        directionsByVoiceId[voiceId] ??= [];
        directionsByVoiceId[voiceId].push(entry);

        entry
          .getTypes()
          .map((directionType) => directionType.getContent())
          .filter((content): content is musicxml.OctaveShiftDirectionTypeContent => content.type === 'octaveshift')
          .map((content) => content.octaveShift)
          .forEach((o) => {
            switch (o.getType()) {
              case 'up':
              case 'down':
                octaveShift = o;
                break;
              case 'continue':
                // TODO: This won't work when an octave shift spans multiple measure fragments. Detect octave shifts
                // upstream and handle continues correctly.
                break;
              case 'stop':
                octaveShift = null;
                break;
            }
          });
      }

      if (entry instanceof musicxml.Note) {
        const note = entry;

        voiceId = note.getVoice() ?? voiceId ?? UNDEFINED_VOICE_ID;
        result[voiceId] ??= [];

        if (note.isChordTail()) {
          continue;
        } else if (note.isGrace()) {
          result[voiceId].push({
            voiceId,
            note,
            start: divisions,
            end: divisions,
            stem: 'auto',
            // Directions are handled by stave notes. We don't want to process them multiple times.
            directions: [],
            octaveShift,
          });
        } else {
          const noteDuration = Division.of(note.getDuration(), quarterNoteDivisions);
          const startDivision = divisions;
          const endDivision = startDivision.add(noteDuration);

          const stem = conversions.fromStemToStemDirection(note.getStem());

          const directions = [
            ...(directionsByVoiceId[voiceId] ?? []),
            ...(directionsByVoiceId[UNDEFINED_VOICE_ID] ?? []),
          ];

          delete directionsByVoiceId[voiceId];
          delete directionsByVoiceId[UNDEFINED_VOICE_ID];

          result[voiceId].push({
            voiceId,
            note,
            start: startDivision,
            end: endDivision,
            stem,
            directions,
            octaveShift,
          });

          divisions = divisions.add(noteDuration);
        }
      }

      if (entry instanceof musicxml.Backup) {
        directionsByVoiceId[voiceId] ??= [];
        directionsByVoiceId[voiceId].push(...(directionsByVoiceId[UNDEFINED_VOICE_ID] ?? []));
        delete directionsByVoiceId[UNDEFINED_VOICE_ID];

        const backupDuration = Division.of(entry.getDuration(), quarterNoteDivisions);
        divisions = divisions.subtract(backupDuration);
      }

      if (entry instanceof musicxml.Forward) {
        directionsByVoiceId[voiceId] ??= [];
        directionsByVoiceId[voiceId].push(...(directionsByVoiceId[UNDEFINED_VOICE_ID] ?? []));
        delete directionsByVoiceId[UNDEFINED_VOICE_ID];

        const forwardDuration = Division.of(entry.getDuration(), quarterNoteDivisions);
        divisions = divisions.add(forwardDuration);
      }

      if (divisions.isLessThan(Division.zero())) {
        divisions = Division.zero();
      }
    }

    // Move all the undefined voice directions to the last voice.
    directionsByVoiceId[voiceId]?.push(...(directionsByVoiceId[UNDEFINED_VOICE_ID] ?? []));
    delete directionsByVoiceId[UNDEFINED_VOICE_ID];

    // Handle any leftover directions that weren't attached to a succeeding note _in the same voice_ by attaching them
    // to the last note in each voice. If there are no notes in a voice, the directions are discarded.
    for (const [voiceId, directions] of Object.entries(directionsByVoiceId)) {
      util.last(result[voiceId] ?? [])?.directions.push(...directions);
    }

    return result;
  }

  /**
   * Adjusts the stems based on the first non-rest note of each voice by mutating the voice entry data in place.
   *
   * This method does _not_ change any stem directions that were explicitly defined in the MusicXML document.
   */
  private adjustStems(voiceEntryData: Record<string, VoiceEntryData[]>): void {
    const voiceIds = Object.keys(voiceEntryData);

    const firstElgibleVoiceEntries = voiceIds
      .map((voiceId) => voiceEntryData[voiceId].find((entry) => !entry.note.isRest() && !entry.note.isGrace()))
      .filter((entry): entry is VoiceEntryData => typeof entry !== 'undefined');

    // Sort the notes by descending line based on the entry's highest note. This allows us to figure out which voice
    // should be on top, middle, and bottom easily.
    util.sortBy(firstElgibleVoiceEntries, (entry) => -this.staveNoteLine(entry.note, this.clef));

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

      for (const voiceId of voiceIds) {
        for (const entry of voiceEntryData[voiceId]) {
          // Only change stems that haven't been explicitly specified.
          if (entry.stem === 'auto') {
            entry.stem = stems[voiceId];
          }
        }
      }
    }
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

  private computeFullyQualifiedVoices(opts: {
    voiceEntryData: Record<string, VoiceEntryData[]>;
    quarterNoteDivisions: number;
    keySignature: KeySignature;
  }): LegacyVoice[] {
    const result = new Array<LegacyVoice>();

    const voiceEntryData = opts.voiceEntryData;
    const quarterNoteDivisions = opts.quarterNoteDivisions;
    const keySignature = opts.keySignature;
    const config = this.config;
    const clef = this.clef;
    const timeSignature = this.timeSignature;

    for (const voiceId of Object.keys(voiceEntryData)) {
      let divisions = Division.of(0, quarterNoteDivisions);
      const entries = new Array<VoiceEntry>();
      const placeholderEntries = new Array<VoicePlaceholderEntry>();

      for (const entry of opts.voiceEntryData[voiceId]) {
        const ghostNoteStart = divisions;
        const ghostNoteEnd = entry.start;
        const ghostNoteDuration = ghostNoteEnd.subtract(ghostNoteStart);

        if (ghostNoteDuration.toBeats() > 0) {
          const durationDenominator = conversions.fromDivisionsToNoteDurationDenominator(ghostNoteDuration);

          entries.push(
            new GhostNote({
              durationDenominator,
            })
          );

          placeholderEntries.push({
            division: ghostNoteStart,
            durationDenominator,
          });
        }

        const note = entry.note;
        const directions = entry.directions;
        const stem = entry.stem;
        const octaveShift = entry.octaveShift;

        const noteDuration = entry.end.subtract(entry.start);
        const durationDenominator =
          conversions.fromNoteTypeToNoteDurationDenominator(note.getType()) ??
          conversions.fromDivisionsToNoteDurationDenominator(noteDuration);

        placeholderEntries.push({
          division: entry.start,
          durationDenominator,
        });

        if (!note.printObject()) {
          entries.push(
            new GhostNote({
              durationDenominator,
            })
          );
        } else if (note.isChordHead()) {
          entries.push(
            new Chord({
              config,
              musicXML: { note, directions, octaveShift },
              stem,
              clef,
              durationDenominator,
              keySignature,
            })
          );
        } else if (note.isRest()) {
          entries.push(
            new Rest({
              config,
              musicXML: { note, directions },
              clef,
              durationDenominator,
            })
          );
        } else {
          entries.push(
            new Note({
              config,
              musicXML: { note, directions, octaveShift },
              stem,
              clef,
              durationDenominator,
              keySignature,
            })
          );
        }

        divisions = entry.end;
      }

      const voice = LegacyVoice.root({
        config,
        entries,
        timeSignature,
        placeholderEntries,
      });
      result.push(voice);
    }

    return result;
  }
}
