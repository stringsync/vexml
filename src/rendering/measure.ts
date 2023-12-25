import * as musicxml from '@/musicxml';
import * as util from '@/util';
import * as drawables from '@/drawables';
import { Config } from './config';
import { PartScoped } from './types';
import { Address } from './address';
import { MeasureFragment, MeasureFragmentRendering, MeasureFragmentWidth } from './measurefragment';
import { MeasureEntry, StaveSignature } from './stavesignature';
import { Division } from './division';
import { Spanners } from './spanners';
import { PartName } from './partname';
import { MeasureEntryIterator } from './measureentryiterator';

const MEASURE_LABEL_OFFSET_X = 0;
const MEASURE_LABEL_OFFSET_Y = 24;
const MEASURE_LABEL_COLOR = '#aaaaaa';

const STAVE_CONNECTOR_BRACE_WIDTH = 16;

/** The result of rendering a Measure. */
export type MeasureRendering = {
  type: 'measure';
  address: Address<'measure'>;
  index: number;
  label: drawables.Text;
  fragments: MeasureFragmentRendering[];
  width: number;
};

/** Describes when a measure fragment should be instantiated in a given part. */
type MeasureFragmentEvent = {
  at: Division;
};

/**
 * Represents a Measure in a musical score, corresponding to the <measure> element in MusicXML. A Measure contains a
 * specific segment of musical content, defined by its beginning and ending beats, and is the primary unit of time in a
 * score. Measures are sequenced consecutively within a system.
 */
export class Measure {
  private config: Config;
  private index: number;
  private partIds: string[];
  private partNames: PartScoped<PartName>[];
  private musicXml: {
    measures: PartScoped<musicxml.Measure>[];
    staveLayouts: musicxml.StaveLayout[];
  };
  private leadingStaveSignatures: PartScoped<StaveSignature>[];
  private entries: PartScoped<MeasureEntry>[];

  constructor(opts: {
    config: Config;
    index: number;
    partIds: string[];
    partNames: PartScoped<PartName>[];
    musicXml: {
      measures: PartScoped<musicxml.Measure>[];
      staveLayouts: musicxml.StaveLayout[];
    };
    leadingStaveSignatures: PartScoped<StaveSignature>[];
    entries: PartScoped<MeasureEntry>[];
  }) {
    this.config = opts.config;
    this.partIds = opts.partIds;
    this.partNames = opts.partNames;
    this.index = opts.index;
    this.musicXml = opts.musicXml;
    this.leadingStaveSignatures = opts.leadingStaveSignatures;
    this.entries = opts.entries;
  }

  /** Returns the absolute index of the measure. */
  getIndex(): number {
    return this.index;
  }

  /** Returns the minimum required width for each measure fragment. */
  getMinRequiredFragmentWidths(opts: {
    address: Address<'measure'>;
    previousMeasure: Measure | null;
  }): MeasureFragmentWidth[] {
    const widths = new Array<MeasureFragmentWidth>();

    util.forEachTriple(this.getFragments(), ([previousFragment, currentFragment], { isFirst }) => {
      if (isFirst) {
        previousFragment = util.last(opts.previousMeasure?.getFragments() ?? []);
      }
      widths.push({
        measureIndex: this.index,
        measureFragmentIndex: currentFragment.getIndex(),
        value: currentFragment.getMinRequiredWidth({
          address: opts.address.measureFragment({ measureFragmentIndex: currentFragment.getIndex() }),
          previousMeasureFragment: previousFragment,
        }),
      });
    });

    return widths;
  }

  /** Returns the top padding for the measure. */
  getTopPadding(): number {
    return util.max(this.getFragments().map((fragment) => fragment.getTopPadding()));
  }

  /** Returns how much to offset the measure by. */
  getStaveOffsetX(opts: { address: Address<'measure'> }): number {
    let result = 0;

    const isFirstSystem = opts.address.getSystemIndex() === 0;
    const isFirstMeasure = opts.address.getMeasureIndex() === 0;
    const isFirstSystemMeasure = opts.address.getSystemMeasureIndex() === 0;

    const hasMultipleStaves = this.leadingStaveSignatures.some(
      (staveSignature) => staveSignature.value.getStaveCount() > 1
    );
    if (isFirstSystemMeasure && hasMultipleStaves) {
      result += STAVE_CONNECTOR_BRACE_WIDTH;
    }

    if (isFirstSystem && isFirstMeasure) {
      result += util.max(this.partNames.map((partName) => partName.value.getWidth()));
    }

    return result;
  }

  /** Returns the width of the end barline. */
  getEndBarlineWidth(): number {
    return this.getEndBarStyle() === 'none' ? 0 : 1;
  }

  /** Renders the measure. */
  render(opts: {
    x: number;
    y: number;
    fragmentWidths: MeasureFragmentWidth[];
    address: Address<'measure'>;
    spanners: Spanners;
    previousMeasure: Measure | null;
    nextMeasure: Measure | null;
  }): MeasureRendering {
    const fragmentRenderings = new Array<MeasureFragmentRendering>();

    const staveOffsetX = this.getStaveOffsetX({ address: opts.address });

    let x = opts.x + staveOffsetX;
    const y = opts.y;

    const label = new drawables.Text({
      content: this.getLabelTextContent(),
      italic: true,
      x: x + MEASURE_LABEL_OFFSET_X,
      y: y + MEASURE_LABEL_OFFSET_Y,
      color: MEASURE_LABEL_COLOR,
      size: this.config.MEASURE_NUMBER_FONT_SIZE,
    });

    util.forEachTriple(
      this.getFragments(),
      ([previousFragment, currentFragment, nextFragment], { isFirst, isLast }) => {
        if (isFirst) {
          previousFragment = util.last(opts.previousMeasure?.getFragments() ?? []);
        }
        if (isLast) {
          nextFragment = util.first(opts.nextMeasure?.getFragments() ?? []);
        }

        const width = opts.fragmentWidths.find(
          ({ measureFragmentIndex }) => measureFragmentIndex === currentFragment.getIndex()
        );
        if (!width) {
          const address = opts.address.toDebugString();
          const widths = JSON.stringify(opts.fragmentWidths);
          throw new Error(`Width not found for measure fragment: ${address}, got: ${widths}`);
        }

        const fragmentRendering = currentFragment.render({
          x,
          y,
          width,
          address: opts.address.measureFragment({ measureFragmentIndex: currentFragment.getIndex() }),
          spanners: opts.spanners,
          previousMeasureFragment: previousFragment,
          nextMeasureFragment: nextFragment,
        });
        fragmentRenderings.push(fragmentRendering);

        x += fragmentRendering.width;
      }
    );

    return {
      type: 'measure',
      address: opts.address,
      fragments: fragmentRenderings,
      index: this.index,
      label,
      width: staveOffsetX + util.sum(fragmentRenderings.map((fragment) => fragment.width)),
    };
  }

  @util.memoize()
  private getFragments(): MeasureFragment[] {
    const result = new Array<MeasureFragment>();

    const beginningBarStyle = this.getBeginningBarStyle();
    const endBarStyle = this.getEndBarStyle();
    const events = this.getFragmentEvents();

    const iterators: Record<string, MeasureEntryIterator> = {};
    for (const partId of this.partIds) {
      iterators[partId] = this.getMeasureEntryIterator(partId);
    }

    for (let index = 0; index < events.length; index++) {
      const event = events[index];
      const isFirstEvent = index === 0;
      const isLastEvent = index === events.length - 1;

      const beginningBarStyles = new Array<PartScoped<musicxml.BarStyle>>();
      const endBarStyles = new Array<PartScoped<musicxml.BarStyle>>();
      const measureEntries = new Array<PartScoped<MeasureEntry>>();
      const staveSignatures = new Array<PartScoped<StaveSignature>>();

      for (const partId of this.partIds) {
        const iterator = iterators[partId];

        const upper = isLastEvent ? Division.max() : event.at;

        staveSignatures.push({ partId, value: iterator.current().staveSignature });

        while (iterator.hasNext()) {
          measureEntries.push({ partId, value: iterator.current().entry });

          if (isFirstEvent) {
            beginningBarStyles.push({ partId, value: beginningBarStyle });
          } else {
            beginningBarStyles.push({ partId, value: 'none' });
          }

          if (isLastEvent) {
            endBarStyles.push({ partId, value: endBarStyle });
          } else {
            endBarStyles.push({ partId, value: 'none' });
          }

          iterator.next();

          if (iterator.current().divisions.isGreaterThan(upper)) {
            break;
          }
          if (iterator.current().entry instanceof StaveSignature) {
            break;
          }
          if (this.isSupportedMetronome(iterator.current().entry)) {
            break;
          }
        }
      }

      console.log(staveSignatures, measureEntries);

      result.push(
        new MeasureFragment({
          config: this.config,
          index: result.length,
          partIds: this.partIds,
          partNames: this.partNames,
          musicXml: {
            staveLayouts: this.musicXml.staveLayouts,
            beginningBarStyles,
            endBarStyles,
          },
          measureEntries,
          staveSignatures,
        })
      );
    }

    return result;
  }

  private getLabelTextContent(): string {
    const partId = util.first(this.partIds);
    if (!partId) {
      return '';
    }

    const measure = this.musicXml.measures.find((measure) => measure.partId === partId)?.value;
    if (!measure) {
      return '';
    }

    if (measure.isImplicit()) {
      return '';
    }

    return measure.getNumber() || (this.index + 1).toString();
  }

  private getFragmentEvents(): MeasureFragmentEvent[] {
    const events = new Array<MeasureFragmentEvent>();
    const seen = new Set<number>();

    function addEvent(event: MeasureFragmentEvent): void {
      const beats = event.at.toBeats();
      if (!seen.has(beats)) {
        seen.add(beats);
        events.push(event);
      }
    }

    for (const partId of this.partIds) {
      const iterator = this.getMeasureEntryIterator(partId);

      let previous = Division.zero();

      while (iterator.hasNext()) {
        const { entry, divisions } = iterator.current();

        if (entry instanceof StaveSignature) {
          addEvent({ at: previous });
        }

        if (this.isSupportedMetronome(entry)) {
          addEvent({ at: previous });
        }

        previous = divisions;
        iterator.next();
      }
    }

    return util.sortBy(events, (event) => event.at.toBeats());
  }

  private isSupportedMetronome(entry: MeasureEntry): boolean {
    return (
      entry instanceof musicxml.Direction &&
      entry
        .getTypes()
        .map((directionType) => directionType.getContent())
        .some((content) => content.type === 'metronome' && content.metronome.isSupported())
    );
  }

  private getBeginningBarStyle(): musicxml.BarStyle {
    return (
      util.first(
        this.musicXml.measures
          .flatMap((measure) => measure.value.getBarlines())
          .filter((barline) => barline.getLocation() === 'left')
          .map((barline) => barline.getBarStyle())
      ) ?? 'regular'
    );
  }

  private getEndBarStyle(): musicxml.BarStyle {
    return (
      util.first(
        this.musicXml.measures
          .flatMap((measure) => measure.value.getBarlines())
          .filter((barline) => barline.getLocation() === 'right')
          .map((barline) => barline.getBarStyle())
      ) ?? 'regular'
    );
  }

  private getMeasureEntryIterator(partId: string): MeasureEntryIterator {
    const entries = this.entries.filter((entry) => entry.partId === partId).map((entry) => entry.value);

    const staveSignature = this.leadingStaveSignatures.find(
      (staveSignature) => staveSignature.partId === partId
    )?.value;
    if (!staveSignature) {
      throw new Error(`Stave signature not found for part: ${partId}`);
    }

    return new MeasureEntryIterator({ entries, staveSignature });
  }
}
