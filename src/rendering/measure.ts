import * as musicxml from '@/musicxml';
import * as util from '@/util';
import * as drawables from '@/drawables';
import * as vexflow from 'vexflow';
import { Config } from './config';
import { MeasureFragment, MeasureFragmentRendering } from './measurefragment';
import { MeasureEntry, StaveSignature } from './stavesignature';

const MEASURE_LABEL_OFFSET_X = 0;
const MEASURE_LABEL_OFFSET_Y = 24;
const MEASURE_LABEL_COLOR = '#aaaaaa';

/** The result of rendering a Measure. */
export type MeasureRendering = {
  type: 'measure';
  vexflow: {
    staveConnectors: vexflow.StaveConnector[];
  };
  index: number;
  label: drawables.Text;
  fragments: MeasureFragmentRendering[];
  width: number;
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
  private fragments: MeasureFragment[];

  private constructor(opts: { config: Config; index: number; label: string; fragments: MeasureFragment[] }) {
    this.config = opts.config;
    this.index = opts.index;
    this.label = opts.label;
    this.fragments = opts.fragments;
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
    isFirstPartMeasure: boolean;
    isLastPartMeasure: boolean;
    previousMeasure: Measure | null;
    leadingStaveSignature: StaveSignature | null;
    measureEntries: MeasureEntry[];
    staveLayouts: musicxml.StaveLayout[];
  }): Measure {
    const measure = opts.musicXml.measure;

    const label = measure.isImplicit() ? '' : measure.getNumber() || (opts.index + 1).toString();

    const fragments = Measure.fragment({
      config: opts.config,
      measureIndex: opts.index,
      systemId: opts.systemId,
      musicXml: {
        measure: opts.musicXml.measure,
      },
      previousMeasure: opts.previousMeasure,
      leadingStaveSignature: opts.leadingStaveSignature,
      measureEntries: opts.measureEntries,
      staveCount: opts.staveCount,
      staveLayouts: opts.staveLayouts,
    });

    return new Measure({
      config: opts.config,
      index: opts.index,
      label,
      fragments,
    });
  }

  private static fragment(opts: {
    config: Config;
    measureIndex: number;
    systemId: symbol;
    musicXml: {
      measure: musicxml.Measure;
    };
    previousMeasure: Measure | null;
    leadingStaveSignature: StaveSignature | null;
    staveCount: number;
    staveLayouts: musicxml.StaveLayout[];
    measureEntries: MeasureEntry[];
  }): MeasureFragment[] {
    const fragments = new Array<MeasureFragment>();

    const measureIndex = opts.measureIndex;

    const beginningBarStyle =
      opts.musicXml.measure
        .getBarlines()
        .find((barline) => barline.getLocation() === 'left')
        ?.getBarStyle() ?? 'regular';

    const endBarStyle =
      opts.musicXml.measure
        .getEndingMeasure()
        .getBarlines()
        .find((barline) => barline.getLocation() === 'right')
        ?.getBarStyle() ?? 'regular';

    let staveSignature = opts.leadingStaveSignature;
    let currentMeasureEntries = new Array<MeasureEntry>();
    let previousMeasureFragment = util.last(opts.previousMeasure?.fragments ?? []);

    function addFragment(
      leadingStaveSignature: StaveSignature | null,
      measureEntries: MeasureEntry[],
      beginningBarStyle: musicxml.BarStyle,
      endBarStyle: musicxml.BarStyle
    ) {
      const fragment = MeasureFragment.create({
        config: opts.config,
        measureIndex,
        measureFragmentIndex: fragments.length,
        systemId: opts.systemId,
        leadingStaveSignature,
        beginningBarStyle: beginningBarStyle,
        endBarStyle: endBarStyle,
        staveCount: opts.staveCount,
        staveLayouts: opts.staveLayouts,
        measureEntries,
        previousMeasureFragment,
      });
      fragments.push(fragment);
      previousMeasureFragment = fragment;
    }

    for (let measureEntryIndex = 0; measureEntryIndex < opts.measureEntries.length; measureEntryIndex++) {
      const measureEntry = opts.measureEntries[measureEntryIndex];
      const isLastMeasureEntry = measureEntryIndex === opts.measureEntries.length - 1;

      if (measureEntry instanceof StaveSignature) {
        const didStaveModifiersChange = measureEntry.getChangedStaveModifiers().length > 0;
        if (didStaveModifiersChange && currentMeasureEntries.length > 0) {
          // prettier-ignore
          addFragment(
            staveSignature,
            currentMeasureEntries,
            fragments.length === 0 ? beginningBarStyle : 'none',
            'none'
          );
          currentMeasureEntries = [];
        }

        staveSignature = measureEntry;
      }

      currentMeasureEntries.push(measureEntry);

      if (isLastMeasureEntry) {
        const nextStaveSignature = staveSignature?.getNext();
        const hasClefChangeAtMeasureBoundary =
          nextStaveSignature?.getChangedStaveModifiers().includes('clef') &&
          nextStaveSignature?.getMeasureIndex() === measureIndex + 1 &&
          nextStaveSignature?.getMeasureEntryIndex() === 0;

        if (hasClefChangeAtMeasureBoundary) {
          // prettier-ignore
          addFragment(
            staveSignature,
            currentMeasureEntries, 
            fragments.length === 0 ? beginningBarStyle : 'none', 
            'none',
          );

          // prettier-ignore
          addFragment(
            nextStaveSignature,
            [nextStaveSignature],
            'none',
            endBarStyle
          );
        } else {
          // prettier-ignore
          addFragment(
            staveSignature,
            currentMeasureEntries,
            fragments.length === 0 ? beginningBarStyle : 'none',
            endBarStyle
          );
        }
      }
    }

    return fragments;
  }

  /** Deeply clones the Measure, but replaces the systemId and partMeasuresLength. */
  clone(systemId: symbol): Measure {
    return new Measure({
      index: this.index,
      label: this.label,
      config: this.config,
      fragments: this.fragments.map((fragment) => fragment.clone(systemId)),
    });
  }

  /** Returns the minimum required width for the Measure. */
  getMinRequiredWidth(previousMeasure: Measure | null): number {
    let sum = 0;

    let previousMeasureFragment = util.last(previousMeasure?.fragments ?? []);
    for (const fragment of this.fragments) {
      sum += fragment.getMinRequiredWidth(previousMeasureFragment);
      previousMeasureFragment = fragment;
    }

    return sum;
  }

  /** Returns the number of measures the multi rest is active for. 0 means there's no multi rest. */
  getMultiRestCount(): number {
    return util.sum(this.fragments.map((fragment) => fragment.getMultiRestCount()));
  }

  /** Renders the Measure. */
  render(opts: {
    x: number;
    y: number;
    isLastSystem: boolean;
    targetSystemWidth: number;
    minRequiredSystemWidth: number;
    previousMeasure: Measure | null;
    nextMeasure: Measure | null;
  }): MeasureRendering {
    const fragmentRenderings = new Array<MeasureFragmentRendering>();

    let x = opts.x;
    let width = 0;

    util.forEachTriple(this.fragments, ([previousFragment, currentFragment, nextFragment], index) => {
      if (index === 0) {
        previousFragment = util.last(opts.previousMeasure?.fragments ?? []);
      }
      if (index === this.fragments.length - 1) {
        nextFragment = util.first(opts.nextMeasure?.fragments ?? []);
      }

      const fragmentRendering = currentFragment.render({
        x,
        y: opts.y,
        isLastSystem: opts.isLastSystem,
        minRequiredSystemWidth: opts.minRequiredSystemWidth,
        targetSystemWidth: opts.targetSystemWidth,
        previousMeasureFragment: previousFragment,
        nextMeasureFragment: nextFragment,
      });
      fragmentRenderings.push(fragmentRendering);

      x += fragmentRendering.width;
      width += fragmentRendering.width;
    });

    const vfStaveConnectors = new Array<vexflow.StaveConnector>();

    const staveRenderings = util.first(fragmentRenderings)?.staves ?? [];
    if (staveRenderings.length > 1) {
      const topStave = util.first(staveRenderings)!;
      const bottomStave = util.last(staveRenderings)!;

      const begginingStaveConnectorType = this.toBeginningStaveConnectorType(topStave.vexflow.beginningBarlineType);
      vfStaveConnectors.push(
        new vexflow.StaveConnector(topStave.vexflow.stave, bottomStave.vexflow.stave).setType(
          begginingStaveConnectorType
        )
      );

      const endStaveConnectorType = this.toEndStaveConnectorType(topStave.vexflow.endBarlineType);
      vfStaveConnectors.push(
        new vexflow.StaveConnector(topStave.vexflow.stave, bottomStave.vexflow.stave).setType(endStaveConnectorType)
      );
    }

    const label = new drawables.Text({
      content: this.label,
      italic: true,
      x: opts.x + MEASURE_LABEL_OFFSET_X,
      y: opts.y + MEASURE_LABEL_OFFSET_Y,
      color: MEASURE_LABEL_COLOR,
      size: this.config.MEASURE_NUMBER_FONT_SIZE,
    });

    return {
      type: 'measure',
      vexflow: {
        staveConnectors: vfStaveConnectors,
      },
      index: this.index,
      label,
      fragments: fragmentRenderings,
      width,
    };
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
