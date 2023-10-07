import * as musicxml from '@/musicxml';
import { Config } from './config';
import * as util from '@/util';
import { Text } from './text';
import * as vexflow from 'vexflow';
import { MeasureFragment, MeasureFragmentRendering } from './measurefragment';
import { ChorusEntry } from './chorus';

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
};

/** Assigns a single Attributes to a list of MeasureFragEntries. */
type MeasureEntryGroup = {
  attributes: musicxml.Attributes | null;
  chorusEntries: ChorusEntry[];
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
    previousMeasure: Measure | null;
  }): Measure {
    const config = opts.config;
    const systemId = opts.systemId;
    const xmlMeasure = opts.musicXml.measure;
    const staveCount = opts.staveCount;
    const previousMeasure = opts.previousMeasure;

    const label = xmlMeasure.isImplicit() ? '' : xmlMeasure.getNumber() || (opts.index + 1).toString();

    const begginingMeasure = xmlMeasure;
    let beginningBarStyle: musicxml.BarStyle = 'regular';
    for (const barline of begginingMeasure.getBarlines()) {
      const barStyle = barline.getBarStyle();
      if (barline.getLocation() === 'left') {
        beginningBarStyle = barStyle;
      }
    }

    const endingMeasure = xmlMeasure.getEndingMeasure();
    let endBarStyle: musicxml.BarStyle = 'regular';
    for (const barline of endingMeasure.getBarlines()) {
      const barStyle = barline.getBarStyle();
      if (barline.getLocation() === 'right') {
        endBarStyle = barStyle;
      }
    }

    const entryGroups = Measure.createMeasureEntryGroups(xmlMeasure, previousMeasure);

    const fragments = entryGroups.map((group, index) => {
      const isFirst = index === 0;
      const isLast = index === entryGroups.length - 1;

      return MeasureFragment.create({
        config,
        systemId,
        musicXml: {
          attributes: group.attributes,
          chorusEntries: group.chorusEntries,
          beginningBarStyle: isFirst ? beginningBarStyle : 'none',
          endBarStyle: isLast ? endBarStyle : 'none',
        },
        staveCount,
      });
    });

    return new Measure({
      config: opts.config,
      index: opts.index,
      label,
      fragments,
    });
  }

  private static createMeasureEntryGroups(
    xmlMeasure: musicxml.Measure,
    previousMeasure: Measure | null
  ): MeasureEntryGroup[] {
    const groups = new Array<MeasureEntryGroup>();
    let attributes: musicxml.Attributes | null = previousMeasure?.getLastFragment()?.getAttributes() ?? null;
    let chorusEntries = new Array<ChorusEntry>();

    const xmlMeasureEntries = xmlMeasure.getEntries();

    for (let index = 0; index < xmlMeasureEntries.length; index++) {
      const xmlMeasureEntry = xmlMeasureEntries[index];
      const isFirst = index === 0;
      const isLast = index === xmlMeasureEntries.length - 1;

      if (xmlMeasureEntry instanceof musicxml.Attributes) {
        if (!isFirst) {
          groups.push({ attributes, chorusEntries });
        }
        attributes = xmlMeasureEntry;
        chorusEntries = [];
      } else {
        chorusEntries.push(xmlMeasureEntry);
      }

      if (isLast) {
        groups.push({ attributes, chorusEntries });
      }
    }

    return groups;
  }

  /** Deeply clones the Measure, but replaces the systemId. */
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
    staffLayouts: musicxml.StaffLayout[];
  }): MeasureRendering {
    const fragmentRenderings = new Array<MeasureFragmentRendering>();

    let previousFragment = util.last(opts.previousMeasure?.fragments ?? []);
    let x = opts.x;

    for (const fragment of this.fragments) {
      const fragmentRendering = fragment.render({
        x,
        y: opts.y,
        isLastSystem: opts.isLastSystem,
        minRequiredSystemWidth: opts.minRequiredSystemWidth,
        targetSystemWidth: opts.targetSystemWidth,
        previousMeasureFragment: previousFragment,
        staffLayouts: opts.staffLayouts,
      });
      fragmentRenderings.push(fragmentRendering);

      previousFragment = fragment;
      x += fragmentRendering.width;
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
      size: this.config.measureNumberFontSize,
    });

    return {
      type: 'measure',
      vexflow: {
        staveConnectors: vfStaveConnectors,
      },
      index: this.index,
      label,
      fragments: fragmentRenderings,
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

  private getLastFragment(): MeasureFragment | null {
    return util.last(this.fragments);
  }
}
