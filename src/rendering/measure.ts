import * as musicxml from '@/musicxml';
import * as util from '@/util';
import * as vexflow from 'vexflow';
import { Config } from './config';
import { Text } from './text';
import { MeasureFragment, MeasureFragmentRendering } from './measurefragment';
import { StaveSignature } from './stavesignature';
import { StaveSignatureRegistry } from './stavesignatureregistry';

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
  label: Text;
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
    staveSignatureRegistry: StaveSignatureRegistry;
    staveLayouts: musicxml.StaveLayout[];
  }): Measure {
    const xmlMeasure = opts.musicXml.measure;

    const tbdBeginningBarStyle =
      xmlMeasure
        .getBarlines()
        .find((barline) => barline.getLocation() === 'left')
        ?.getBarStyle() ?? 'regular';

    const tbdEndBarStyle =
      xmlMeasure
        .getEndingMeasure()
        .getBarlines()
        .find((barline) => barline.getLocation() === 'right')
        ?.getBarStyle() ?? 'regular';

    const label = xmlMeasure.isImplicit() ? '' : xmlMeasure.getNumber() || (opts.index + 1).toString();

    const fragments = new Array<MeasureFragment>();

    const measureIndex = opts.index;
    const measureEntries = xmlMeasure.getEntries();
    const staveSignatureRegistry = opts.staveSignatureRegistry;

    let staveSignature = opts.leadingStaveSignature;
    let currentMeasureEntries = new Array<musicxml.MeasureEntry>();

    function create(beginningBarStyle: musicxml.BarStyle, endBarStyle: musicxml.BarStyle) {
      fragments.push(
        MeasureFragment.create({
          config: opts.config,
          systemId: opts.systemId,
          leadingStaveSignature: staveSignature,
          musicXml: {
            measureEntries: currentMeasureEntries,
          },
          tbdBeginningBarStyle: beginningBarStyle,
          tbdEndBarStyle: endBarStyle,
          staveCount: opts.staveCount,
          staveLayouts: opts.staveLayouts,
        })
      );
      currentMeasureEntries = [];
    }

    for (let measureEntryIndex = 0; measureEntryIndex < measureEntries.length; measureEntryIndex++) {
      const measureEntry = measureEntries[measureEntryIndex];
      const isLastMeasureEntry = measureEntryIndex === measureEntries.length - 1;

      if (measureEntry instanceof musicxml.Attributes) {
        // This should not be null assuming that the [measureIndex, measureEntryIndex] valid.
        staveSignature = staveSignatureRegistry.getStaveSignature(measureIndex, measureEntryIndex);
        util.assertNotNull(staveSignature);

        const didStaveModifiersChange = staveSignature.getChangedStaveModifiers().includes('clefType');
        if (didStaveModifiersChange) {
          create(fragments.length === 0 ? tbdBeginningBarStyle : 'none', 'none');
        }
      }

      currentMeasureEntries.push(measureEntry);

      if (isLastMeasureEntry) {
        create(fragments.length === 0 ? tbdBeginningBarStyle : 'none', tbdEndBarStyle);
      }
    }

    return new Measure({
      config: opts.config,
      index: opts.index,
      label,
      fragments,
    });
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
  }): MeasureRendering {
    const fragmentRenderings = new Array<MeasureFragmentRendering>();

    let previousFragment = util.last(opts.previousMeasure?.fragments ?? []);
    let x = opts.x;
    let width = 0;

    for (const fragment of this.fragments) {
      const fragmentRendering = fragment.render({
        x,
        y: opts.y,
        isLastSystem: opts.isLastSystem,
        minRequiredSystemWidth: opts.minRequiredSystemWidth,
        targetSystemWidth: opts.targetSystemWidth,
        previousMeasureFragment: previousFragment,
      });
      fragmentRenderings.push(fragmentRendering);

      previousFragment = fragment;
      x += fragmentRendering.width;
      width += fragmentRendering.width;
    }

    const vfStaveConnectors = new Array<vexflow.StaveConnector>();

    const staveRenderings = util.first(fragmentRenderings)?.staves ?? [];
    if (staveRenderings.length > 1) {
      const topStave = util.first(staveRenderings)!;
      const bottomStave = util.last(staveRenderings)!;

      const begginingStaveConnectorType = this.toBeginningStaveConnectorType(topStave.vexflow.begginningBarlineType);
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

    const label = new Text({
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
