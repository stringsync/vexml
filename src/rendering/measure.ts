import * as musicxml from '@/musicxml';
import { Stave, StaveRendering } from './stave';
import { Config } from './config';
import * as util from '@/util';

/** The result of rendering a Measure. */
export type MeasureRendering = {
  type: 'measure';
  staves: StaveRendering[];
};

/**
 * Represents a Measure in a musical score, corresponding to the <measure> element in MusicXML. A Measure contains a
 * specific segment of musical content, defined by its beginning and ending beats, and is the primary unit of time in a
 * score. Measures are sequenced consecutively within a system.
 */
export class Measure {
  private config: Config;
  private staves: Stave[];
  private systemId: symbol;

  private constructor(opts: { config: Config; staves: Stave[]; systemId: symbol }) {
    this.config = opts.config;
    this.staves = opts.staves;
    this.systemId = opts.systemId;
  }

  /** Creates a Measure. */
  static create(opts: {
    config: Config;
    musicXml: {
      measure: musicxml.Measure;
    };
    systemId: symbol;
  }): Measure {
    const attributes = opts.musicXml.measure.getAttributes();

    const staveCount = Math.max(1, ...attributes.map((attribute) => attribute.getStaveCount()));
    const staves = new Array<Stave>(staveCount);

    for (let staffNumber = 1; staffNumber <= staveCount; staffNumber++) {
      staves[staffNumber - 1] = Stave.create({
        config: opts.config,
        staffNumber,
        musicXml: {
          measure: opts.musicXml.measure,
        },
      });
    }

    return new Measure({ config: opts.config, staves, systemId: opts.systemId });
  }

  /** Deeply clones the Measure, but replaces the systemId. */
  clone(systemId: symbol): Measure {
    return new Measure({
      systemId,
      config: this.config,
      staves: this.staves.map((stave) => stave.clone()),
    });
  }

  /** Returns the minimum required width for the Measure. */
  getMinRequiredWidth(previousMeasure: Measure | null): number {
    let requiredWidth = this.getMinJustifyWidth();
    if (this.shouldRenderModifiers(previousMeasure)) {
      requiredWidth += this.getModifiersWidth();
    }

    return requiredWidth;
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
    const staveRenderings = new Array<StaveRendering>();

    let y = opts.y;

    for (const stave of this.staves) {
      const renderModifiers = this.shouldRenderModifiers(opts.previousMeasure);

      let minRequiredMeasureWidth = this.getMinJustifyWidth();
      if (renderModifiers) {
        minRequiredMeasureWidth += this.getModifiersWidth();
      }

      if (!opts.isLastSystem) {
        const widthDeficit = opts.targetSystemWidth - opts.minRequiredSystemWidth;
        const widthFraction = minRequiredMeasureWidth / opts.minRequiredSystemWidth;
        const widthDelta = widthDeficit * widthFraction;

        minRequiredMeasureWidth += widthDelta;
      }

      const staveRendering = stave.render({
        x: opts.x,
        y,
        width: minRequiredMeasureWidth,
        renderModifiers: renderModifiers,
      });
      staveRenderings.push(staveRendering);

      const staffDistance =
        opts.staffLayouts.find((staffLayout) => staffLayout.staffNumber === staffLayout.staffNumber)?.staffDistance ??
        this.config.defaultStaffDistance;

      y += staffDistance;
    }

    return { type: 'measure', staves: staveRenderings };
  }

  private hasEqualModifiers(other: Measure | null): boolean {
    if (!other) {
      return false;
    }

    for (let index = 0; index < this.staves.length; index++) {
      const stave1 = this.staves[index];
      const stave2 = other.staves[index];

      if (!stave1.hasEqualModifiers(stave2)) {
        return false;
      }
    }

    return true;
  }

  /** Whether the Measure should render modifiers. */
  private shouldRenderModifiers(previousMeasure: Measure | null): boolean {
    return this.systemId !== previousMeasure?.systemId || !this.hasEqualModifiers(previousMeasure);
  }

  /** Returns the minimum justify width. */
  @util.memoize()
  private getMinJustifyWidth(): number {
    return util.math.max(this.staves.map((stave) => stave.getMinJustifyWidth()));
  }

  /** Returns the modifiers width. */
  @util.memoize()
  private getModifiersWidth(): number {
    return util.math.max(this.staves.map((stave) => stave.getModifiersWidth()));
  }
}
