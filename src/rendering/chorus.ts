import * as debug from '@/debug';
import { Config } from '@/config';
import { MeasureEntryIteration, MeasureEntryIterator } from './measureentryiterator';
import { MeasureEntry, StaveSignature } from './stavesignature';
import { Voice, VoiceInput, VoiceRendering } from './voice';
import * as util from '@/util';
import * as musicxml from '@/musicxml';
import * as conversions from './conversions';
import * as vexflow from 'vexflow';
import { Clef } from './clef';
import { StemDirection } from './enums';
import { Address } from './address';
import { Spanners } from './spanners';

/** The result of rendering a chorus. */
export type ChorusRendering = {
  type: 'chorus';
  address: Address<'chorus'>;
  voices: VoiceRendering[];
};

/** Houses the coordination of several voices. */
export class Chorus {
  private config: Config;
  private log: debug.Logger;
  private voices: Voice[];

  constructor(opts: { config: Config; log: debug.Logger; voices: Voice[] }) {
    this.config = opts.config;
    this.log = opts.log;
    this.voices = opts.voices;
  }

  static fromMusicXML(opts: {
    config: Config;
    log: debug.Logger;
    measureEntries: MeasureEntry[];
    staveSignature: StaveSignature;
  }): Chorus {
    const calculator = new VoiceCalculator({
      config: opts.config,
      measureEntries: opts.measureEntries,
      staveSignature: opts.staveSignature,
    });

    return new Chorus({
      config: opts.config,
      log: opts.log,
      voices: calculator.calculate(),
    });
  }

  /** Returns the minimum justify width for the stave in a measure context. */
  @util.memoize()
  getMinJustifyWidth(address: Address<'chorus'>): number {
    const spanners = new Spanners(this.log);

    if (this.voices.length > 0) {
      const vfVoices = this.voices.map(
        (voice) =>
          voice.render({
            address: address.voice({ voiceId: voice.getId() }),
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
    const voiceRenderings = this.voices.map((voice) =>
      voice.render({
        address: opts.address.voice({ voiceId: voice.getId() }),
        spanners: opts.spanners,
      })
    );

    return {
      type: 'chorus',
      address: opts.address,
      voices: voiceRenderings,
    };
  }
}

/** A utility that calculates the voices from a list of measure entries. */
class VoiceCalculator {
  private static readonly UNDEFINED_VOICE_ID = '';

  private config: Config;
  private measureEntries: MeasureEntry[];
  private staveSignature: StaveSignature;
  private voiceId = VoiceCalculator.UNDEFINED_VOICE_ID;
  private directions: Record<string, musicxml.Direction[]> = {};
  private voiceInputs: Record<string, VoiceInput[]> = {};
  private iteration: MeasureEntryIteration = { done: true, value: null };

  constructor(opts: { config: Config; measureEntries: MeasureEntry[]; staveSignature: StaveSignature }) {
    this.config = opts.config;
    this.measureEntries = opts.measureEntries;
    this.staveSignature = opts.staveSignature;
  }

  /**
   * Calculates the voices from the given data.
   *
   * Since this class is stateful, this method is memoized to prevent multiple calculations.
   */
  @util.memoize()
  calculate(): Voice[] {
    const iterator = new MeasureEntryIterator({
      entries: this.measureEntries,
      staveSignature: this.staveSignature,
    });

    this.iteration = iterator.next();

    while (!this.iteration.done) {
      const entry = this.iteration.value.entry;

      if (entry instanceof StaveSignature) {
        this.handleStaveSignature(entry);
      } else if (entry instanceof musicxml.Direction) {
        this.handleDirection(entry);
      } else if (entry instanceof musicxml.Note) {
        this.handleNote(entry);
      } else if (entry instanceof musicxml.Backup) {
        this.handleBackup(entry);
      } else if (entry instanceof musicxml.Forward) {
        this.handleForward(entry);
      }

      this.iteration = iterator.next();
    }

    this.consumeDanglingDirections();
    this.adjustStems();

    return Object.entries(this.voiceInputs).map(([id, inputs]) => {
      const staveNumber = util.first(inputs)?.note.getStaveNumber() ?? 1;
      const timeSignature = util.first(inputs)!.staveSignature.getTimeSignature(staveNumber);
      return Voice.fromInputs({ config: this.config, id, inputs, timeSignature });
    });
  }

  /**
   * Assigns remaining directions such that `this.directions` will be empty and completely accounted for.
   *
   * This is intended to only be used after all measure entries have been processed. "Dangling" refers to directions
   * whose note association is ambiguous.
   */
  private consumeDanglingDirections() {
    // Move all the undefined voice directions to the last voice.
    const directions = this.takeDirections(VoiceCalculator.UNDEFINED_VOICE_ID);
    this.getLastVoiceInput(this.voiceId)?.directions.push(...directions);

    // Handle any leftover directions that weren't attached to a succeeding note _in the same voice_ by attaching them
    // to the last note in each voice. If there are no notes in a voice, the directions are discarded.
    for (const voiceId of Object.keys(this.directions)) {
      const directions = this.takeDirections(voiceId);
      this.getLastVoiceInput(voiceId)?.directions.push(...directions);
    }
  }

  /**
   * Adjusts the stems based on the first non-rest note of each voice by mutating the voice entry data in place.
   *
   * This method does _not_ change any stem directions that were explicitly defined in the MusicXML document.
   */
  private adjustStems() {
    const firstElgibleVoiceInput = Object.values(this.voiceInputs)
      .map((voiceInputs) => voiceInputs.find((input) => !input.note.isRest() && !input.note.isGrace()))
      .filter((input): input is VoiceInput => typeof input !== 'undefined');

    // Sort the notes by descending line based on the entry's highest note. This allows us to figure out which voice
    // should be on top, middle, and bottom easily.
    util.sortBy(firstElgibleVoiceInput, (input) => {
      const note = input.note;
      const staveNumber = note.getStaveNumber();
      const clef = input.staveSignature.getClef(staveNumber);
      return -this.staveNoteLine(note, clef);
    });

    if (firstElgibleVoiceInput.length > 1) {
      const stems: { [voiceId: string]: StemDirection } = {};

      const top = util.first(firstElgibleVoiceInput)!;
      const middle = firstElgibleVoiceInput.slice(1, -1);
      const bottom = util.last(firstElgibleVoiceInput)!;

      stems[top.voiceId] = 'up';
      stems[bottom.voiceId] = 'down';
      for (const input of middle) {
        stems[input.voiceId] = 'none';
      }

      for (const input of Object.values(this.voiceInputs).flat()) {
        // Only change stems that haven't been explicitly specified.
        if (input.stem === 'auto') {
          input.stem = stems[input.voiceId];
        }
      }
    }
  }

  private handleStaveSignature(staveSignature: StaveSignature) {
    this.staveSignature = staveSignature;
  }

  private handleDirection(direction: musicxml.Direction) {
    // Directions should not change the current voice ID, nor should they default to the current voice ID.
    const voiceId = direction.getVoice() || VoiceCalculator.UNDEFINED_VOICE_ID;
    this.pushDirections(voiceId, direction);
  }

  private handleNote(note: musicxml.Note) {
    this.voiceId = note.getVoice() || this.voiceId;

    if (note.isChordTail()) {
      this.handleChordTail(note);
    } else if (note.isGrace()) {
      this.handleGrace(note);
    } else {
      this.handleStaveNote(note);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleChordTail(note: musicxml.Note) {
    // noop
  }

  private handleGrace(note: musicxml.Note) {
    const voiceInput = this.createVoiceInput({ note, directions: [] });
    this.pushVoiceInputs(this.voiceId, voiceInput);
  }

  private handleStaveNote(note: musicxml.Note) {
    const directions = this.takeDirections(this.voiceId, VoiceCalculator.UNDEFINED_VOICE_ID);
    const voiceInput = this.createVoiceInput({ note, directions });
    this.pushVoiceInputs(this.voiceId, voiceInput);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleBackup(backup: musicxml.Backup) {
    this.moveDirections(VoiceCalculator.UNDEFINED_VOICE_ID, this.voiceId);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleForward(forward: musicxml.Forward) {
    this.moveDirections(VoiceCalculator.UNDEFINED_VOICE_ID, this.voiceId);
  }

  private takeDirections(...voiceIds: string[]): musicxml.Direction[] {
    const directions = new Array<musicxml.Direction>();
    for (const voiceId of voiceIds) {
      const voiceDirections = this.directions[voiceId] ?? [];
      directions.push(...voiceDirections);
      delete this.directions[voiceId];
    }
    return directions;
  }

  private pushDirections(voiceId: string, ...directions: musicxml.Direction[]) {
    this.directions[voiceId] ??= [];
    this.directions[voiceId].push(...directions);
  }

  private moveDirections(srcVoiceId: string, dstVoiceId: string) {
    const directions = this.takeDirections(srcVoiceId);
    this.pushDirections(dstVoiceId, ...directions);
  }

  private getLastVoiceInput(voiceId: string): VoiceInput | null {
    return util.last(this.voiceInputs[voiceId] ?? []);
  }

  private createVoiceInput(opts: { note: musicxml.Note; directions: musicxml.Direction[] }): VoiceInput {
    return {
      voiceId: this.voiceId,
      note: opts.note,
      start: this.iteration.value!.start,
      end: this.iteration.value!.end,
      stem: conversions.fromStemToStemDirection(opts.note.getStem()),
      directions: opts.directions,
      staveSignature: this.staveSignature,
    };
  }

  private pushVoiceInputs(voiceId: string, ...voiceInputs: VoiceInput[]) {
    this.voiceInputs[voiceId] ??= [];
    this.voiceInputs[voiceId].push(...voiceInputs);
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
