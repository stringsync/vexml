import * as musicxml from '@/musicxml';
import { Stave, StaveModifier, StaveRendering } from './stave';
import { Config } from './config';
import * as util from '@/util';
import { Text } from './text';
import * as vexflow from 'vexflow';

const MEASURE_LABEL_OFFSET_X = 0;
const MEASURE_LABEL_OFFSET_Y = 24;
const MEASURE_LABEL_FONT_SIZE = 8;
const MEASURE_LABEL_COLOR = '#aaaaaa';

/** The result of rendering a Measure. */
export type MeasureRendering = {
  type: 'measure';
  vexflow: {
    staveConnectors: vexflow.StaveConnector[];
  };
  index: number;
  label: Text;
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
  private label: string;
  private staves: Stave[];
  private systemId: symbol;

  private constructor(opts: { config: Config; index: number; label: string; staves: Stave[]; systemId: symbol }) {
    this.config = opts.config;
    this.index = opts.index;
    this.label = opts.label;
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
    staveCount: number;
    systemId: symbol;
    previousMeasure: Measure | null;
  }): Measure {
    const measure = opts.musicXml.measure;
    const staves = new Array<Stave>(opts.staveCount);

    const label = measure.isImplicit() ? '' : measure.getNumber() || (opts.index + 1).toString();

    for (let staffNumber = 1; staffNumber <= opts.staveCount; staffNumber++) {
      const staffIndex = staffNumber - 1;
      staves[staffIndex] = Stave.create({
        config: opts.config,
        staffNumber,
        musicXml: {
          measure: measure,
        },
        previousStave: opts.previousMeasure?.staves[staffIndex] ?? null,
      });
    }

    return new Measure({ config: opts.config, index: opts.index, label, staves, systemId: opts.systemId });
  }

  /** Deeply clones the Measure, but replaces the systemId. */
  clone(systemId: symbol): Measure {
    return new Measure({
      systemId,
      index: this.index,
      label: this.label,
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
    const staveRenderings = new Array<StaveRendering>();

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

    const vfStaveConnectors = new Array<vexflow.StaveConnector>();

    if (staveRenderings.length > 1) {
      const topStave = util.first(staveRenderings)!;
      const bottomStave = util.last(staveRenderings)!;

      const add = (type: vexflow.StaveConnectorType) =>
        vfStaveConnectors.push(
          new vexflow.StaveConnector(topStave.vexflow.stave, bottomStave.vexflow.stave).setType(type)
        );

      const begginingStaveConnectorType = this.toBeginningStaveConnectorType(topStave.vexflow.begginningBarlineType);
      add(begginingStaveConnectorType);

      const endStaveConnectorType = this.toEndStaveConnectorType(topStave.vexflow.endBarlineType);
      add(endStaveConnectorType);
    }

    const label = new Text({
      content: this.label,
      italic: true,
      x: opts.x + MEASURE_LABEL_OFFSET_X,
      y: opts.y + MEASURE_LABEL_OFFSET_Y,
      color: MEASURE_LABEL_COLOR,
      size: MEASURE_LABEL_FONT_SIZE,
    });

    return {
      type: 'measure',
      vexflow: {
        staveConnectors: vfStaveConnectors,
      },
      index: this.index,
      label,
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

  private toBeginningStaveConnectorType(beginningBarlineType: vexflow.BarlineType): vexflow.StaveConnectorType {
    switch (beginningBarlineType) {
      case vexflow.BarlineType.SINGLE:
        return 'singleLeft';
      case vexflow.BarlineType.DOUBLE:
        return 'boldDoubleLeft';
      default:
        return vexflow.BarlineType.SINGLE;
    }
  }

  private toEndStaveConnectorType(endBarlineType: vexflow.BarlineType): vexflow.StaveConnectorType {
    switch (endBarlineType) {
      case vexflow.BarlineType.SINGLE:
        return 'singleRight';
      case vexflow.BarlineType.END:
        return 'boldDoubleRight';
      default:
        return vexflow.BarlineType.SINGLE;
    }
  }
}
