import * as musicxml from '@/musicxml';
import { Stave, StaveModifier, StaveRendering } from './stave';
import { Config } from './config';
import * as util from '@/util';

/** The result of rendering a Measure. */
export type MeasureRendering = {
  type: 'measure';
  index: number;
  staves: StaveRendering[];
};

/**
 * Represents a Measure in a musical score, corresponding to the <measure> element in MusicXML. A Measure contains a
 * specific segment of musical content, defined by its beginning and ending beats, and is the primary unit of time in a
 * score. Measures are sequenced consecutively within a system.
 */
export class Measure {
  private config: Config;
  private index: number;
  private staves: Stave[];
  private systemId: symbol;

  private constructor(opts: { config: Config; index: number; staves: Stave[]; systemId: symbol }) {
    this.config = opts.config;
    this.index = opts.index;
    this.staves = opts.staves;
    this.systemId = opts.systemId;
  }

  /** Creates a Measure. */
  static create(opts: {
    config: Config;
    index: number;
    musicXml: {
      measure: musicxml.Measure;
    };
    systemId: symbol;
    previousMeasure: Measure | null;
  }): Measure {
    const attributes = opts.musicXml.measure.getAttributes();

    const staveCount = util.max([1, ...attributes.map((attribute) => attribute.getStaveCount())]);
    const staves = new Array<Stave>(staveCount);

    const label = opts.musicXml.measure.getNumber() || (opts.index + 1).toString();

    for (let staffNumber = 1; staffNumber <= staveCount; staffNumber++) {
      const staffIndex = staffNumber - 1;
      staves[staffIndex] = Stave.create({
        config: opts.config,
        staffNumber,
        musicXml: {
          measure: opts.musicXml.measure,
        },
        label,
        previousStave: opts.previousMeasure?.staves[staffIndex] ?? null,
      });
    }

    return new Measure({ config: opts.config, index: opts.index, staves, systemId: opts.systemId });
  }

  /** Deeply clones the Measure, but replaces the systemId. */
  clone(systemId: symbol): Measure {
    return new Measure({
      systemId,
      index: this.index,
      config: this.config,
      staves: this.staves.map((stave) => stave.clone()),
    });
  }

  /** Returns the minimum required width for the Measure. */
  getMinRequiredWidth(previousMeasure: Measure | null): number {
    const staveModifiersChanges = this.getChangedStaveModifiers(previousMeasure);
    const staveModifiersWidth = this.getStaveModifiersWidth(staveModifiersChanges);
    return this.getMinJustifyWidth() + staveModifiersWidth;
  }

  /** Returns the number of measures the multi rest is active for. 0 means there's no multi rest. */
  getMultiRestCount(): number {
    return util.max(this.staves.map((stave) => stave.getMultiRestCount()));
  }

  /** Renders the Measure. */
  render(opts: {
    x: number;
    y: number;
    isLastSystem: boolean;
    targetSystemWidth: number;
    minRequiredSystemWidth: number;
    previousMeasure: Measure | null;
    staffLayouts: musicxml.StaffLayout[];
  }): MeasureRendering {
    const staveRenderings = [];

    let y = opts.y;

    for (const stave of this.staves) {
      const staveModifiers = this.getChangedStaveModifiers(opts.previousMeasure);
      let minRequiredWidth = this.getMinRequiredWidth(opts.previousMeasure);

      if (!opts.isLastSystem) {
        const widthDeficit = opts.targetSystemWidth - opts.minRequiredSystemWidth;
        const widthFraction = minRequiredWidth / opts.minRequiredSystemWidth;
        const widthDelta = widthDeficit * widthFraction;

        minRequiredWidth += widthDelta;
      }

      const staveRendering = stave.render({
        x: opts.x,
        y,
        width: minRequiredWidth,
        modifiers: staveModifiers,
      });
      staveRenderings.push(staveRendering);

      const staffDistance =
        opts.staffLayouts.find((staffLayout) => staffLayout.staffNumber === staffLayout.staffNumber)?.staffDistance ??
        this.config.defaultStaffDistance;

      y += staffDistance;
    }

    return {
      type: 'measure',
      index: this.index,
      staves: staveRenderings,
    };
  }

  /** Returns the minimum justify width. */
  @util.memoize()
  private getMinJustifyWidth(): number {
    return util.max(this.staves.map((stave) => stave.getMinJustifyWidth()));
  }

  /** Returns the modifiers width. */
  private getStaveModifiersWidth(staveModifiers: StaveModifier[]): number {
    return util.max(this.staves.map((stave) => stave.getModifiersWidth(staveModifiers)));
  }

  /** Returns what modifiers changed _in any stave_. */
  private getChangedStaveModifiers(previousMeasure: Measure | null): StaveModifier[] {
    if (!previousMeasure) {
      return ['clefType', 'keySignature', 'timeSignature'];
    }

    if (this.systemId !== previousMeasure.systemId) {
      return ['clefType', 'keySignature', 'timeSignature'];
    }

    const staveModifiersChanges = new Set<StaveModifier>();

    for (let index = 0; index < this.staves.length; index++) {
      const stave1 = this.staves[index];
      const stave2 = previousMeasure.staves[index];
      for (const modifier of stave1.getModifierChanges(stave2)) {
        staveModifiersChanges.add(modifier);
      }
    }

    return Array.from(staveModifiersChanges);
  }
}
