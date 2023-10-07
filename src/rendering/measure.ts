import * as musicxml from '@/musicxml';
import * as util from '@/util';
import * as vexflow from 'vexflow';
import { Config } from './config';
import { Text } from './text';
import { MeasureFragment, MeasureFragmentRendering } from './measurefragment';

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

type MeasureEntryGroup = {
  attributes: musicxml.Attributes | null;
  entries: musicxml.MeasureEntry[];
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
  private attributes: musicxml.Attributes[];

  private constructor(opts: {
    config: Config;
    index: number;
    label: string;
    fragments: MeasureFragment[];
    attributes: musicxml.Attributes[];
  }) {
    this.config = opts.config;
    this.index = opts.index;
    this.label = opts.label;
    this.fragments = opts.fragments;
    this.attributes = opts.attributes;
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

    const entryGroups = Measure.groupByStave(xmlMeasure.getEntries());
    const fragments = new Array<MeasureFragment>();
    let previousFragment = util.last(previousMeasure?.fragments ?? []);

    for (let index = 0; index < entryGroups.length; index++) {
      const entryGroup = entryGroups[index];
      const isFirst = index === 0;
      const isLast = index === entryGroups.length - 1;

      const fragment = MeasureFragment.create({
        config,
        systemId,
        musicXml: {
          attributes: entryGroup.attributes,
          measureEntries: entryGroup.entries,
          beginningBarStyle: isFirst ? beginningBarStyle : 'none',
          endBarStyle: isLast ? endBarStyle : 'none',
        },
        staveCount,
        previousFragment,
      });
      fragments.push(fragment);

      previousFragment = fragment;
    }

    return new Measure({
      config: opts.config,
      index: opts.index,
      label,
      fragments,
      attributes: xmlMeasure.getAttributes(),
    });
  }

  /** Takes the entries, and groups them by <attributes> changes that would require a new stave. */
  private static groupByStave(xmlMeasureEntries: musicxml.MeasureEntry[]): MeasureEntryGroup[] {
    const groups = new Array<MeasureEntryGroup>();

    let entries = new Array<musicxml.MeasureEntry>();
    let attributes: musicxml.Attributes | null = null;

    for (let index = 0; index < xmlMeasureEntries.length; index++) {
      const entry = xmlMeasureEntries[index];
      const isFirst = index === 0;
      const isLast = index === xmlMeasureEntries.length - 1;

      if (entry instanceof musicxml.Attributes) {
        if (!isFirst && xmlMeasureEntries.length > 0 && Measure.shouldRenderSeparateStave(attributes, entry)) {
          groups.push({ attributes, entries });
          entries = [];
        }
        attributes = entry;
      }

      entries.push(entry);

      if (isLast) {
        groups.push({ attributes, entries });
      }
    }

    return groups;
  }

  private static shouldRenderSeparateStave(
    attributes1: musicxml.Attributes | null,
    attributes2: musicxml.Attributes
  ): boolean {
    if (!attributes1) {
      return false;
    }

    // Check to see if the key signature changed in a manner that requires a separate stave.
    const keys1 = attributes1.getKeys().reduce<Record<number, string>>((memo, key) => {
      memo[key.getStaveNumber()] = key.getKeySignature();
      return memo;
    }, {});

    for (const key2 of attributes2.getKeys()) {
      const staffNumber = key2.getStaveNumber();
      const keySignature1 = keys1[staffNumber];
      const keySignature2 = key2.getKeySignature();

      if (keySignature1 && keySignature1 !== keySignature2) {
        return true;
      }
    }

    // Check to see if the time signature changed in a manner that requires a separate stave.
    const times1 = attributes1.getTimes().reduce<Record<number, string>>((memo, time) => {
      memo[time.getStaveNumber()] = util.first(time.getTimeSignatures())?.toString() ?? '';
      return memo;
    }, {});

    for (const time2 of attributes2.getTimes()) {
      const staffNumber = time2.getStaveNumber();
      const timeSignature1 = times1[staffNumber];
      const timeSignature2 = util.first(time2.getTimeSignatures())?.toString();

      if (timeSignature1 && timeSignature1 !== timeSignature2) {
        return true;
      }
    }

    // Nothing changed that warrants a new stave.
    return false;
  }

  /** Deeply clones the Measure, but replaces the systemId. */
  clone(systemId: symbol): Measure {
    return new Measure({
      index: this.index,
      label: this.label,
      config: this.config,
      fragments: this.fragments.map((fragment) => fragment.clone(systemId)),
      attributes: this.attributes,
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
    staffLayouts: musicxml.StaveLayout[];
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
        staffLayouts: opts.staffLayouts,
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

  private getLastFragment(): MeasureFragment | null {
    return util.last(this.fragments);
  }
}
