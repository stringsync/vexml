import * as debug from '@/debug';
import { Clef } from './clef';
import { Config } from '@/config';
import { KeySignature } from './keysignature';
import { MeasureEntry, StaveSignature } from './stavesignature';
import { MultiRest, MultiRestRendering } from './multirest';
import { TimeSignature } from './timesignature';
import * as conversions from './conversions';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import * as vexflow from 'vexflow';
import { Address } from './address';
import { Spanners } from './spanners';
import { Chorus, ChorusRendering } from './chorus';
import { Voice } from './voice';
import { Rest } from './rest';
import { Division } from './division';

const METRONOME_TOP_PADDING = 8;

/** A possible component of a Stave. */
export type StaveEntry = Chorus | MultiRest;

/** The result of rendering a Stave entry. */
export type StaveEntryRendering = ChorusRendering | MultiRestRendering;

/** The result of rendering a Stave. */
export type StaveRendering = {
  type: 'stave';
  address: Address<'stave'>;
  staveNumber: number;
  signature: StaveSignature;
  width: number;
  vexflow: {
    stave: vexflow.Stave;
  };
  entry: StaveEntryRendering;
};

/** The modifiers of a stave. */
export type StaveModifier = 'clef' | 'keySignature' | 'timeSignature';

/**
 * Represents a single stave (or staff) in a measure, providing the graphical foundation for musical symbols such as
 * notes, rests, clefs, and key signatures.
 *
 * The `Stave` class acts as a container for musical elements that are vertically aligned in a score or sheet music. It
 * typically corresponds to a specific voice or set of voices, especially in multi-stave instruments like the piano.
 */
export class Stave {
  private config: Config;
  private log: debug.Logger;
  private number: number;
  private staveSignature: StaveSignature;
  private measureEntries: MeasureEntry[];

  constructor(opts: {
    config: Config;
    log: debug.Logger;
    number: number;
    staveSignature: StaveSignature;
    measureEntries: MeasureEntry[];
  }) {
    this.config = opts.config;
    this.log = opts.log;
    this.number = opts.number;
    this.staveSignature = opts.staveSignature;
    this.measureEntries = opts.measureEntries;
  }

  @util.memoize()
  getEntry(): StaveEntry {
    const config = this.config;
    const log = this.log;
    const timeSignature = this.getTimeSignature();
    const clef = this.getClef();
    const multiRestCount = this.getMultiRestCount();
    const measureEntries = this.measureEntries;

    if (multiRestCount === 1) {
      return new Chorus({
        config,
        log,
        voices: [
          new Voice({
            config,
            id: '-1',
            entries: [
              {
                start: Division.zero(),
                end: Division.of(1, 1),
                value: Rest.whole({ config, clef }),
                directions: [],
              },
            ],
            timeSignature,
            parent: null,
          }),
        ],
      });
    }

    if (multiRestCount > 1) {
      return new MultiRest({ config, log, count: multiRestCount });
    }

    return Chorus.fromMusicXML({
      config,
      log,
      measureEntries,
      staveSignature: this.staveSignature,
    });
  }

  /** Returns the stave signature. */
  getSignature(): StaveSignature {
    return this.staveSignature;
  }

  /** Returns the stave number. */
  getNumber(): number {
    return this.number;
  }

  /** Returns the number of measures the multi rest is active for. 0 means there's no multi rest. */
  getMultiRestCount(): number {
    return this.staveSignature?.getMultiRestCount(this.number) ?? 0;
  }

  /**
   * Returns the stave modifiers that changed.
   *
   * The same StaveSignature can be used across multiple measures/measure fragments/staves/etc. If you use
   * `StaveSignature.getChangedStaveModifiers`, it may not be applicable to the current stave. Therefore, we need to
   * check the Stave objects directly to see what modifiers changed across them.
   */
  getModifierChanges(opts: { previousStave: Stave | null }): StaveModifier[] {
    if (!opts.previousStave) {
      return ['clef', 'keySignature', 'timeSignature'];
    }

    const result = new Array<StaveModifier>();

    if (!this.getClef().isEqual(opts.previousStave.getClef())) {
      result.push('clef');
    }
    if (!this.getKeySignature().isEqual(opts.previousStave.getKeySignature())) {
      result.push('keySignature');
    }
    if (!this.getTimeSignature().isEqual(opts.previousStave.getTimeSignature())) {
      result.push('timeSignature');
    }

    return result;
  }

  /** Returns the top padding of the stave. */
  getTopPadding(): number {
    let topPadding = 0;

    if (this.getMetronome()) {
      topPadding += METRONOME_TOP_PADDING;
    }

    return topPadding;
  }

  /** Renders the Stave. */
  render(opts: {
    x: number;
    y: number;
    vexflow: { formatter: vexflow.Formatter };
    address: Address<'stave'>;
    spanners: Spanners;
    width: number;
    beginningModifiers: StaveModifier[];
    endModifiers: StaveModifier[];
    previousStave: Stave | null;
    nextStave: Stave | null;
  }): StaveRendering {
    const staveSignatureRendering = this.staveSignature.render({ staveNumber: this.number });

    const vfStave =
      this.getClef().getType() === 'tab'
        ? new vexflow.TabStave(opts.x, opts.y, opts.width, { numLines: this.getStaveLineCount() })
        : new vexflow.Stave(opts.x, opts.y, opts.width, { numLines: this.getStaveLineCount() });

    if (opts.beginningModifiers.includes('clef')) {
      vfStave.addModifier(staveSignatureRendering.clef.vexflow.clef);
    }
    if (opts.beginningModifiers.includes('keySignature')) {
      vfStave.addModifier(staveSignatureRendering.keySignature.vexflow.keySignature);
    }
    if (opts.beginningModifiers.includes('timeSignature')) {
      for (const timeSignature of staveSignatureRendering.timeSignature.vexflow.timeSignatures) {
        vfStave.addModifier(timeSignature);
      }
    }

    const nextStaveSignature = this.staveSignature.getNext();
    if (opts.endModifiers.includes('clef') && nextStaveSignature) {
      const nextStaveSignatureRendering = nextStaveSignature.render({ staveNumber: this.number });
      vfStave.addEndModifier(nextStaveSignatureRendering.clef.vexflow.clef);
    }

    const metronome = this.getMetronome();
    const metronomeMark = metronome?.getMark();

    if (metronomeMark) {
      const vfStaveTempoOpts: vexflow.StaveTempoOptions = {};

      vfStaveTempoOpts.parenthesis = metronome?.parentheses() ?? undefined;

      vfStaveTempoOpts.duration =
        conversions.fromNoteTypeToNoteDurationDenominator(metronomeMark.left.unit) ?? undefined;
      vfStaveTempoOpts.dots = metronomeMark.left.dotCount;

      switch (metronomeMark.right.type) {
        case 'note':
          vfStaveTempoOpts.duration2 =
            conversions.fromNoteTypeToNoteDurationDenominator(metronomeMark.right.unit) ?? undefined;
          vfStaveTempoOpts.dots2 = metronomeMark.right.dotCount;
          break;
        case 'bpm':
          vfStaveTempoOpts.bpm = metronomeMark.right.bpm;
          break;
      }

      vfStave.setTempo(vfStaveTempoOpts, -METRONOME_TOP_PADDING);
    }

    const staveEntry = this.getEntry();

    let staveEntryRendering: StaveEntryRendering;
    if (staveEntry instanceof MultiRest) {
      staveEntryRendering = staveEntry.render({
        address: opts.address,
      });
    } else if (staveEntry instanceof Chorus) {
      staveEntryRendering = staveEntry.render({
        address: opts.address.chorus(),
        spanners: opts.spanners,
      });
    } else {
      throw new Error(`Unsupported stave entry: ${staveEntry}`);
    }

    switch (staveEntryRendering.type) {
      case 'measurerest':
        staveEntryRendering.vexflow.multiMeasureRest.setStave(vfStave);
        break;
      case 'chorus':
        const vfVoices = staveEntryRendering.voices.flatMap((voice) => [
          voice.vexflow.voice,
          ...voice.placeholders.map((voice) => voice.vexflow.voice),
        ]);
        opts.vexflow.formatter.joinVoices(vfVoices);
        vfVoices.forEach((vfVoice) => {
          vfVoice.setStave(vfStave);
        });
        vfVoices
          .flatMap((vfVoice) => vfVoice.getTickables())
          .forEach((vfTickable) => {
            vfTickable.setStave(vfStave);
          });
        break;
    }

    return {
      type: 'stave',
      address: opts.address,
      signature: this.staveSignature,
      staveNumber: this.number,
      width: opts.width,
      vexflow: {
        stave: vfStave,
      },
      entry: staveEntryRendering,
    };
  }

  @util.memoize()
  private getMetronome(): musicxml.Metronome | null {
    return util.first(
      this.measureEntries
        .filter((measureEntry): measureEntry is musicxml.Direction => measureEntry instanceof musicxml.Direction)
        .flatMap((direction) => direction.getMetronomes())
    );
  }

  private getClef(): Clef {
    return this.staveSignature.getClef(this.number);
  }

  private getKeySignature(): KeySignature {
    return this.staveSignature.getKeySignature(this.number);
  }

  private getTimeSignature(): TimeSignature {
    return this.staveSignature.getTimeSignature(this.number);
  }

  private getStaveLineCount(): number {
    return this.staveSignature.getStaveLineCount(this.number);
  }
}
