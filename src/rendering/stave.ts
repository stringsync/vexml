import * as musicxml from '@/musicxml';
import * as vexflow from 'vexflow';
import { Config } from './config';
import * as util from '@/util';
import { MultiRest, MultiRestRendering } from './multirest';
import { Chorus, ChorusRendering } from './chorus';

/** A possible component of a Stave. */
export type StaveEntry = Chorus | MultiRest;

export type StaveEntryRendering = ChorusRendering | MultiRestRendering;

/** The result of rendering a Stave. */
export type StaveRendering = {
  type: 'stave';
  staveNumber: number;
  width: number;
  vexflow: {
    stave: vexflow.Stave;
    begginningBarlineType: vexflow.BarlineType;
    endBarlineType: vexflow.BarlineType;
  };
  entry: StaveEntryRendering;
};

/** The modifiers of a stave. */
export type StaveModifier = 'clefType' | 'keySignature' | 'timeSignature';

/**
 * Represents a single stave (or staff) in a measure, providing the graphical foundation for musical symbols such as
 * notes, rests, clefs, and key signatures.
 *
 * The `Stave` class acts as a container for musical elements that are vertically aligned in a score or sheet music. It
 * typically corresponds to a specific voice or set of voices, especially in multi-stave instruments like the piano.
 */
export class Stave {
  private config: Config;
  private staveNumber: number;
  private clefType: musicxml.ClefType;
  private timeSignature: musicxml.TimeSignature;
  private keySignature: string;
  private beginningBarStyle: musicxml.BarStyle;
  private endBarStyle: musicxml.BarStyle;
  private entry: StaveEntry;

  private constructor(opts: {
    config: Config;
    staveNumber: number;
    clefType: musicxml.ClefType;
    timeSignature: musicxml.TimeSignature;
    keySignature: string;
    beginningBarStyle: musicxml.BarStyle;
    endBarStyle: musicxml.BarStyle;
    entry: StaveEntry;
  }) {
    this.config = opts.config;
    this.staveNumber = opts.staveNumber;
    this.timeSignature = opts.timeSignature;
    this.keySignature = opts.keySignature;
    this.beginningBarStyle = opts.beginningBarStyle;
    this.endBarStyle = opts.endBarStyle;
    this.clefType = opts.clefType;
    this.entry = opts.entry;
  }

  /** Creates a Stave. */
  static create(opts: {
    config: Config;
    staveNumber: number;
    clefType: musicxml.ClefType | null;
    timeSignature: musicxml.TimeSignature | null;
    keySignature: string | null;
    multiRestCount: number;
    measureEntries: musicxml.MeasureEntry[];
    quarterNoteDivisions: number;
    previousStave: Stave | null;
    beginningBarStyle: musicxml.BarStyle;
    endBarStyle: musicxml.BarStyle;
  }): Stave {
    const config = opts.config;
    const staveNumber = opts.staveNumber;
    const measureEntries = opts.measureEntries;
    const multiRestCount = opts.multiRestCount;
    const quarterNoteDivisions = opts.quarterNoteDivisions;
    const beginningBarStyle = opts.beginningBarStyle;
    const endBarStyle = opts.endBarStyle;
    const previousStave = opts.previousStave;

    const clefType = opts.clefType ?? previousStave?.clefType ?? 'treble';
    const keySignature = opts.keySignature ?? previousStave?.keySignature ?? 'C';
    const timeSignature = opts.timeSignature ?? previousStave?.timeSignature ?? musicxml.TimeSignature.common();

    let entry: StaveEntry;

    if (multiRestCount === 1) {
      entry = Chorus.wholeRest({ config, clefType, timeSignature });
    } else if (multiRestCount > 1) {
      entry = MultiRest.create({ count: multiRestCount });
    } else {
      entry = Chorus.create({
        config,
        measureEntries: measureEntries,
        clefType,
        timeSignature,
        quarterNoteDivisions,
      });
    }

    return new Stave({
      config,
      staveNumber,
      clefType,
      timeSignature,
      keySignature,
      beginningBarStyle,
      endBarStyle,
      entry,
    });
  }

  /** Returns the minimum justify width for the stave in a measure context. */
  @util.memoize()
  getMinJustifyWidth(): number {
    if (this.entry instanceof MultiRest) {
      // This is much easier being configurable. Otherwise, we would have to create a dummy context to render it, then
      // get the width via MultiMeasureRest.getBoundingBox. There is no "preCalculateMinTotalWidth" for non-voices at
      // the moment.
      return this.config.MULTI_MEASURE_REST_WIDTH;
    }

    if (this.entry instanceof Chorus) {
      return this.entry.getMinJustifyWidth();
    }

    return 0;
  }

  /** Returns the width that the modifiers take up. */
  getModifiersWidth(modifiers: StaveModifier[]): number {
    let width = 0;

    if (modifiers.includes('clefType')) {
      width += this.getClefWidth();
    }
    if (modifiers.includes('keySignature')) {
      width += this.getKeySignatureWidth();
    }
    if (modifiers.includes('timeSignature')) {
      width += this.getTimeSignatureWidth();
    }

    return width;
  }

  /** Returns the number of measures the multi rest is active for. 0 means there's no multi rest. */
  getMultiRestCount(): number {
    return this.entry instanceof MultiRest ? this.entry.getCount() : 0;
  }

  /** Cleans the Stave. */
  clone(): Stave {
    return new Stave({
      config: this.config,
      staveNumber: this.staveNumber,
      clefType: this.clefType,
      timeSignature: this.timeSignature.clone(),
      keySignature: this.keySignature,
      beginningBarStyle: this.beginningBarStyle,
      endBarStyle: this.endBarStyle,
      entry: this.entry.clone(),
    });
  }

  /** Wether the staves have the same modifiers. */
  getModifierChanges(stave: Stave): StaveModifier[] {
    const result = new Array<StaveModifier>();

    if (this.clefType !== stave.clefType) {
      result.push('clefType');
    }
    if (this.keySignature !== stave.keySignature) {
      result.push('keySignature');
    }
    if (!this.timeSignature.isEqual(stave.timeSignature)) {
      result.push('timeSignature');
    }

    return result;
  }

  /** Renders the Stave. */
  render(opts: { x: number; y: number; width: number; modifiers: StaveModifier[] }): StaveRendering {
    const vfStave = this.toVexflowStave({
      x: opts.x,
      y: opts.y,
      width: opts.width,
      modifiers: opts.modifiers,
    });

    const staveEntryRendering = this.entry.render();

    switch (staveEntryRendering.type) {
      case 'multirest':
        staveEntryRendering.vexflow.multiMeasureRest.setStave(vfStave);
        break;
      case 'chorus':
        const vfVoices = staveEntryRendering.voices.map((voice) => voice.vexflow.voice);
        for (const vfVoice of vfVoices) {
          vfVoice.setStave(vfStave);
        }

        const vfTickables = vfVoices.flatMap((vfVoice) => vfVoice.getTickables());
        if (vfTickables.length > 0) {
          new vexflow.Formatter().joinVoices(vfVoices).formatToStave(vfVoices, vfStave);
        }
        break;
    }

    return {
      type: 'stave',
      staveNumber: this.staveNumber,
      width: opts.width,
      vexflow: {
        stave: vfStave,
        begginningBarlineType: this.getBeginningBarlineType(),
        endBarlineType: this.getEndBarlineType(),
      },
      entry: staveEntryRendering,
    };
  }

  /** Returns the width that the clef takes up. */
  @util.memoize()
  private getClefWidth(): number {
    return this.toVexflowStave({
      x: 0,
      y: 0,
      width: this.getMinJustifyWidth(),
      modifiers: ['clefType'],
    }).getNoteStartX();
  }

  /** Returns the width that the key signature takes up. */
  @util.memoize()
  private getKeySignatureWidth(): number {
    return this.keySignature === 'C'
      ? 0
      : this.toVexflowStave({
          x: 0,
          y: 0,
          width: this.getMinJustifyWidth(),
          modifiers: ['keySignature'],
        }).getNoteStartX();
  }

  /** Returns the width that the time signature takes up. */
  @util.memoize()
  private getTimeSignatureWidth(): number {
    return this.toVexflowStave({
      x: 0,
      y: 0,
      width: this.getMinJustifyWidth(),
      modifiers: ['timeSignature'],
    }).getNoteStartX();
  }

  private toVexflowStave(opts: { x: number; y: number; width: number; modifiers: StaveModifier[] }): vexflow.Stave {
    const vfStave = new vexflow.Stave(opts.x, opts.y, opts.width)
      .setBegBarType(this.getBeginningBarlineType())
      .setEndBarType(this.getEndBarlineType());

    if (opts.modifiers.includes('clefType')) {
      vfStave.addClef(this.clefType);
    }
    if (opts.modifiers.includes('keySignature')) {
      vfStave.addKeySignature(this.keySignature);
    }
    if (opts.modifiers.includes('timeSignature')) {
      vfStave.addTimeSignature(this.getTimeSpec());
    }

    return vfStave;
  }

  private getBeginningBarlineType(): vexflow.BarlineType {
    return this.getBarlineType(this.beginningBarStyle);
  }

  private getEndBarlineType(): vexflow.BarlineType {
    return this.getBarlineType(this.endBarStyle);
  }

  private getBarlineType(barStyle: musicxml.BarStyle): vexflow.BarlineType {
    switch (barStyle) {
      case 'regular':
      case 'short':
      case 'dashed':
      case 'dotted':
      case 'heavy':
        return vexflow.BarlineType.SINGLE;
      case 'heavy-light':
      case 'heavy-heavy':
      case 'light-light':
      case 'tick':
        return vexflow.BarlineType.DOUBLE;
      case 'light-heavy':
        return vexflow.BarlineType.END;
      case 'none':
        return vexflow.BarlineType.NONE;
      default:
        return vexflow.BarlineType.NONE;
    }
  }

  private getTimeSpec(): string {
    switch (this.timeSignature.getSymbol()) {
      case 'common':
        return 'C';
      case 'cut':
        return 'C|';
      default:
        return `${this.timeSignature.getBeatsPerMeasure()}/${this.timeSignature.getBeatValue()}`;
    }
  }
}
