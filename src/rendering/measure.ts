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
import { Barline } from './barline';
import { EndingBracket, EndingBracketRendering } from './endingbracket';
import { StaveRendering } from './stave';

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
  endingBracket: EndingBracketRendering | null;
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
  private musicXML: {
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
    musicXML: {
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
    this.musicXML = opts.musicXML;
    this.leadingStaveSignatures = opts.leadingStaveSignatures;
    this.entries = opts.entries;
  }

  /** Returns the absolute index of the measure. */
  getIndex(): number {
    return this.index;
  }

  /** Returns the max specified width of the measure across all parts. */
  getMaxSpecifiedWidth(): number | null {
    return (
      util.max(
        this.musicXML.measures
          .map((measure) => measure.value.getWidth())
          .filter((width): width is number => typeof width === 'number')
      ) || null // Disallow 0 width.
    );
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

  /** Returns the number of measures the multi rest is active for. 0 means there's no multi rest. */
  getMultiRestCount(): number {
    return util.sum(this.getFragments().map((fragment) => fragment.getMultiRestCount()));
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
    return this.getEndBarline().getWidth();
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

    const endingBracketRendering = this.getEndingBracket()?.render() ?? null;

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

        if (isFirst && endingBracketRendering) {
          const vfStaves = fragmentRendering.parts
            .flatMap((part) => util.first(part.staves))
            .filter((stave): stave is StaveRendering => stave?.type === 'stave')
            .map((stave) => stave.vexflow.stave);

          // Render the ending brackets for the top staves only.
          for (const vfStave of vfStaves) {
            vfStave.setVoltaType(endingBracketRendering.vexflow.voltaType, endingBracketRendering.label, 0);
          }
        }

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
      endingBracket: endingBracketRendering,
    };
  }

  @util.memoize()
  private getFragments(): MeasureFragment[] {
    const result = new Array<MeasureFragment>();

    const startBarline = this.getStartBarline();
    const endBarline = this.getEndBarline();
    const boundaries = this.getFragmentBoundaries();

    const iterators: Record<string, MeasureEntryIterator> = {};
    for (const partId of this.partIds) {
      iterators[partId] = this.getMeasureEntryIterator(partId);
      iterators[partId].next(); // initialize iterator
    }

    for (let index = 0; index < boundaries.length; index++) {
      const boundary = boundaries[index];
      const isFirstBoundary = index === 0;
      const isLastBoundary = index === boundaries.length - 1;

      const startBarlines = new Array<PartScoped<Barline>>();
      const endBarlines = new Array<PartScoped<Barline>>();
      const measureEntries = new Array<PartScoped<MeasureEntry>>();
      const staveSignatures = new Array<PartScoped<StaveSignature>>();

      for (const partId of this.partIds) {
        const iterator = iterators[partId];

        const staveSignature = iterator.getStaveSignature();
        staveSignatures.push({ partId, value: staveSignature });

        let iteration = iterator.peek();

        while (!iteration.done && iteration.value.start.isLessThan(boundary)) {
          measureEntries.push({ partId, value: iteration.value.entry });
          iteration = iterator.next();
        }
      }

      if (measureEntries.length > 0) {
        for (const partId of this.partIds) {
          if (isFirstBoundary) {
            startBarlines.push({ partId, value: startBarline });
          }
          if (isLastBoundary) {
            endBarlines.push({ partId, value: endBarline });
          }
        }
      }

      // Ignore completely empty fragments.
      if (measureEntries.length === 0) {
        continue;
      }

      result.push(
        new MeasureFragment({
          config: this.config,
          index: result.length,
          partIds: this.partIds,
          partNames: this.partNames,
          startBarlines,
          endBarlines,
          musicXML: {
            staveLayouts: this.musicXML.staveLayouts,
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

    const measure = this.musicXML.measures.find((measure) => measure.partId === partId)?.value;
    if (!measure) {
      return '';
    }

    if (measure.isImplicit()) {
      return '';
    }

    return measure.getNumber() || (this.index + 1).toString();
  }

  private getFragmentBoundaries(): Division[] {
    const boundaries = new Array<Division>();

    for (const partId of this.partIds) {
      const iterator = this.getMeasureEntryIterator(partId);

      let iteration = iterator.next();

      while (!iteration.done) {
        const entry = iteration.value.entry;

        const isStaveSignature = entry instanceof StaveSignature;
        const hasMetronome = entry instanceof musicxml.Direction && entry.getMetronomes().length > 0;

        if (isStaveSignature || hasMetronome) {
          boundaries.push(iteration.value.end);
        }
        iteration = iterator.next();
      }
    }

    boundaries.push(Division.max());

    const seen = new Set<number>();
    const unique = new Array<Division>();
    for (const boundary of boundaries) {
      const beats = boundary.toBeats();
      if (!seen.has(beats)) {
        unique.push(boundary);
        seen.add(beats);
      }
    }

    return util.sortBy(unique, (boundary) => boundary.toBeats());
  }

  private getStartBarline(): Barline {
    return (
      util.first(
        this.musicXML.measures
          .flatMap((measure) => measure.value.getBarlines())
          .filter((barline) => barline.getLocation() === 'left')
          .map((barline) => Barline.fromMusicXML({ config: this.config, musicXML: { barline } }))
      ) ?? new Barline({ config: this.config, type: 'single', location: 'left' })
    );
  }

  private getEndBarline(): Barline {
    return (
      util.first(
        this.musicXML.measures
          .flatMap((measure) => measure.value.getBarlines())
          .filter((barline) => barline.getLocation() === 'right')
          .map((barline) => Barline.fromMusicXML({ config: this.config, musicXML: { barline } }))
      ) ?? new Barline({ config: this.config, type: 'single', location: 'right' })
    );
  }

  private getEndingBracket(): EndingBracket | null {
    const barline = util.first(
      this.musicXML.measures.flatMap((measure) => measure.value.getBarlines()).filter((barline) => barline.isEnding())
    );
    return barline ? EndingBracket.fromMusicXML({ config: this.config, musicXML: { barline: barline } }) : null;
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
