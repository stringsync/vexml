import * as musicxml from '@/musicxml';
import * as util from '@/util';
import * as drawables from '@/drawables';
import * as vexflow from 'vexflow';
import * as conversions from './conversions';
import { Config } from './config';
import { MeasureFragment, MeasureFragmentRendering } from './measurefragment';
import { MeasureEntry, StaveSignature } from './stavesignature';
import { Address } from './address';
import { Spanners } from './spanners';

const MEASURE_LABEL_OFFSET_X = 0;
const MEASURE_LABEL_OFFSET_Y = 24;
const MEASURE_LABEL_COLOR = '#aaaaaa';

/** The result of rendering a Measure. */
export type MeasureRendering = {
  type: 'measure';
  address: Address<'measure'>;
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
  private musicXml: {
    measure: musicxml.Measure;
    staveLayouts: musicxml.StaveLayout[];
  };
  private leadingStaveSignature: StaveSignature;

  private staveCount: number;
  private measureEntries: MeasureEntry[];

  constructor(opts: {
    config: Config;
    index: number;
    musicXml: {
      measure: musicxml.Measure;
      staveLayouts: musicxml.StaveLayout[];
    };
    leadingStaveSignature: StaveSignature;
    staveCount: number;
    measureEntries: MeasureEntry[];
  }) {
    this.config = opts.config;
    this.index = opts.index;
    this.musicXml = opts.musicXml;
    this.leadingStaveSignature = opts.leadingStaveSignature;
    this.staveCount = opts.staveCount;
    this.measureEntries = opts.measureEntries;
  }

  /** Returns the minimum required width for the Measure. */
  getMinRequiredWidth(opts: {
    address: Address<'measure'>;
    systemMeasureIndex: number;
    previousMeasure: Measure | null;
  }): number {
    let sum = 0;

    util.forEachTriple(this.getFragments(), ([previousMeasureFragment, currentMeasureFragment], { isFirst }) => {
      if (isFirst) {
        previousMeasureFragment = util.last(opts.previousMeasure?.getFragments() ?? []);
      }
      sum += currentMeasureFragment.getMinRequiredWidth({
        address: opts.address.measureFragment(),
        systemMeasureIndex: opts.systemMeasureIndex,
        previousMeasureFragment,
      });
    });

    return sum;
  }

  /** Returns the top padding required for the Measure. */
  getTopPadding(): number {
    return util.max(this.getFragments().map((fragment) => fragment.getTopPadding()));
  }

  /** Returns the number of measures the multi rest is active for. 0 means there's no multi rest. */
  getMultiRestCount(): number {
    return util.sum(this.getFragments().map((fragment) => fragment.getMultiRestCount()));
  }

  /** Renders the Measure. */
  render(opts: {
    x: number;
    y: number;
    showLabel: boolean;
    address: Address<'measure'>;
    spanners: Spanners;
    isLastSystem: boolean;
    targetSystemWidth: number;
    minRequiredSystemWidth: number;
    systemMeasureIndex: number;
    previousMeasure: Measure | null;
    nextMeasure: Measure | null;
  }): MeasureRendering {
    const fragmentRenderings = new Array<MeasureFragmentRendering>();

    let x = opts.x;
    let width = 0;

    util.forEachTriple(
      this.getFragments(),
      ([previousFragment, currentFragment, nextFragment], { isFirst, isLast }) => {
        if (isFirst) {
          previousFragment = util.last(opts.previousMeasure?.getFragments() ?? []);
        }
        if (isLast) {
          nextFragment = util.first(opts.nextMeasure?.getFragments() ?? []);
        }

        // currentFragment can be null for the first or last fragments.
        const fragmentRendering = currentFragment!.render({
          x,
          y: opts.y,
          address: opts.address.measureFragment(),
          isLastSystem: opts.isLastSystem,
          minRequiredSystemWidth: opts.minRequiredSystemWidth,
          targetSystemWidth: opts.targetSystemWidth,
          systemMeasureIndex: opts.systemMeasureIndex,
          previousMeasureFragment: previousFragment,
          nextMeasureFragment: nextFragment,
          spanners: opts.spanners,
        });
        fragmentRenderings.push(fragmentRendering);

        x += fragmentRendering.width;
        width += fragmentRendering.width;
      }
    );

    const vfStaveConnectors = new Array<vexflow.StaveConnector>();

    const staveRenderings = util.first(fragmentRenderings)?.staves ?? [];
    if (staveRenderings.length > 1) {
      const topStave = util.first(staveRenderings)!;
      const bottomStave = util.last(staveRenderings)!;

      const begginingStaveConnectorType = conversions.fromBarlineTypeToBeginningStaveConnectorType(
        topStave.vexflow.beginningBarlineType
      );
      vfStaveConnectors.push(
        new vexflow.StaveConnector(topStave.vexflow.stave, bottomStave.vexflow.stave).setType(
          begginingStaveConnectorType
        )
      );

      const endStaveConnectorType = conversions.fromBarlineTypeToEndingStaveConnectorType(
        topStave.vexflow.endBarlineType
      );
      vfStaveConnectors.push(
        new vexflow.StaveConnector(topStave.vexflow.stave, bottomStave.vexflow.stave).setType(endStaveConnectorType)
      );
    }

    const label = new drawables.Text({
      content: opts.showLabel ? this.getLabel() : '',
      italic: true,
      x: opts.x + MEASURE_LABEL_OFFSET_X,
      y: opts.y + MEASURE_LABEL_OFFSET_Y,
      color: MEASURE_LABEL_COLOR,
      size: this.config.MEASURE_NUMBER_FONT_SIZE,
    });

    return {
      type: 'measure',
      address: opts.address,
      vexflow: {
        staveConnectors: vfStaveConnectors,
      },
      index: this.index,
      label,
      fragments: fragmentRenderings,
      width,
    };
  }

  @util.memoize()
  private getFragments(): MeasureFragment[] {
    const fragments = new Array<MeasureFragment>();

    const measureIndex = this.index;

    const beginningBarStyle =
      this.musicXml.measure
        .getBarlines()
        .find((barline) => barline.getLocation() === 'left')
        ?.getBarStyle() ?? 'regular';

    const endBarStyle =
      this.musicXml.measure
        .getEndingMeasure()
        .getBarlines()
        .find((barline) => barline.getLocation() === 'right')
        ?.getBarStyle() ?? 'regular';

    let staveSignature = this.leadingStaveSignature;
    let currentMeasureEntries = new Array<MeasureEntry>();

    const config = this.config;
    const staveCount = this.staveCount;
    const staveLayouts = this.musicXml.staveLayouts;

    let measureFragmentIndex = 0;

    function addFragment(
      leadingStaveSignature: StaveSignature,
      measureEntries: MeasureEntry[],
      beginningBarStyle: musicxml.BarStyle,
      endBarStyle: musicxml.BarStyle
    ) {
      const fragment = new MeasureFragment({
        config,
        index: measureFragmentIndex++,
        leadingStaveSignature,
        beginningBarStyle: beginningBarStyle,
        endBarStyle: endBarStyle,
        staveCount,
        staveLayouts,
        measureEntries,
      });
      fragments.push(fragment);
    }

    for (let measureEntryIndex = 0; measureEntryIndex < this.measureEntries.length; measureEntryIndex++) {
      const measureEntry = this.measureEntries[measureEntryIndex];
      const isLastMeasureEntry = measureEntryIndex === this.measureEntries.length - 1;

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
      } else if (
        measureEntry instanceof musicxml.Direction &&
        measureEntry.getTypes().some((directionType) => {
          const content = directionType.getContent();
          return content.type === 'metronome' && content.metronome.isSupported();
        }) &&
        currentMeasureEntries.length > 0
      ) {
        // prettier-ignore
        addFragment(
          staveSignature,
          currentMeasureEntries,
          fragments.length === 0 ? beginningBarStyle : 'none',
          'none'
        )
        currentMeasureEntries = [];
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

  private getLabel(): string {
    return this.musicXml.measure.isImplicit() ? '' : this.musicXml.measure.getNumber() || (this.index + 1).toString();
  }
}
