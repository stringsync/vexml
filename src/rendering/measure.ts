import * as debug from '@/debug';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import * as drawables from '@/drawables';
import { Config } from '@/config';
import { Jump, Gap, PartScoped, StaveScoped } from './types';
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
import { TextMeasurer } from './textmeasurer';

const DEFAULT_MEASURE_WIDTH = 200;
const STAVE_CONNECTOR_BRACE_WIDTH = 16;
const FIRST_SYSTEM_MEASURE_NUMBER_X_SHIFT = 6;
const DEFAULT_GAP_MESSAGE_FONT_SIZE = '16px';
const DEFAULT_GAP_MESSAGE_FONT_FAMILY = 'Arial';
const DEFAULT_GAP_STROKE_STYLE = null;
const DEFAULT_GAP_FILL_STYLE = 'rgba(230, 230, 230, 0.7)';

/** The result of rendering a Measure. */
export type MeasureRendering = {
  type: 'measure';
  address: Address<'measure'>;
  index: number;
  fragments: MeasureFragmentRendering[];
  width: number;
  endingBracket: EndingBracketRendering | null;
  jumps: Jump[];
  bpm: number;
  gap: Gap | null;
  rect: drawables.Rect | null;
  text: drawables.Text | null;
};

/**
 * Represents a Measure in a musical score, corresponding to the <measure> element in MusicXML. A Measure contains a
 * specific segment of musical content, defined by its beginning and ending beats, and is the primary unit of time in a
 * score. Measures are sequenced consecutively within a system.
 */
export class Measure {
  private config: Config;
  private log: debug.Logger;
  private index: number;
  private measureNumber: number | null;
  private specifiedWidth: number | null;
  private partIds: string[];
  private partNames: PartScoped<PartName>[];
  private leadingStaveSignatures: PartScoped<StaveSignature>[];
  private entries: PartScoped<MeasureEntry>[];
  private staveDistances: StaveScoped<number>[];
  private startBarline: Barline;
  private endBarline: Barline;
  private endingBracket: EndingBracket | null;
  private bpm: number | null;
  private jumps: Jump[];
  private gap: Gap | null;

  constructor(opts: {
    config: Config;
    log: debug.Logger;
    index: number;
    measureNumber: number | null;
    specifiedWidth: number | null;
    partIds: string[];
    partNames: PartScoped<PartName>[];
    leadingStaveSignatures: PartScoped<StaveSignature>[];
    entries: PartScoped<MeasureEntry>[];
    staveDistances: StaveScoped<number>[];
    startBarline: Barline;
    endBarline: Barline;
    endingBracket: EndingBracket | null;
    bpm: number | null;
    jumps: Jump[];
    gap: Gap | null;
  }) {
    this.config = opts.config;
    this.log = opts.log;
    this.index = opts.index;
    this.measureNumber = opts.measureNumber;
    this.specifiedWidth = opts.specifiedWidth;
    this.partIds = opts.partIds;
    this.partNames = opts.partNames;
    this.leadingStaveSignatures = opts.leadingStaveSignatures;
    this.entries = opts.entries;
    this.staveDistances = opts.staveDistances;
    this.startBarline = opts.startBarline;
    this.endBarline = opts.endBarline;
    this.endingBracket = opts.endingBracket;
    this.bpm = opts.bpm;
    this.jumps = opts.jumps;
    this.gap = opts.gap;
  }

  static fromMusicXML(opts: {
    config: Config;
    log: debug.Logger;
    index: number;
    partIds: string[];
    partNames: PartScoped<PartName>[];
    musicXML: {
      measures: PartScoped<musicxml.Measure>[];
    };
    leadingStaveSignatures: PartScoped<StaveSignature>[];
    entries: PartScoped<MeasureEntry>[];
    staveDistances: StaveScoped<number>[];
  }): Measure {
    return FromMusicXMLFactory.create(opts);
  }

  static fromGap(opts: {
    config: Config;
    log: debug.Logger;
    gap: Gap;
    partIds: string[];
    partNames: PartScoped<PartName>[];
    leadingStaveSignatures: PartScoped<StaveSignature>[];
    staveDistances: StaveScoped<number>[];
  }): Measure {
    return FromGapFactory.create(opts);
  }

  /** Returns the absolute index of the measure. */
  getIndex(): number {
    return this.index;
  }

  /** Returns the max specified width of the measure across all parts. */
  getSpecifiedWidth(): number | null {
    return this.specifiedWidth;
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

    if (widths.every(({ value }) => value === 0)) {
      // If all fragments have a width of 0, then there are likely no measure entries. In this case, we should try to
      // default to a width for the measure.
      const width = this.getSpecifiedWidth() ?? DEFAULT_MEASURE_WIDTH;
      const widthPerFragment = width / widths.length;
      return widths.map((width) => ({ ...width, value: widthPerFragment }));
    }

    const specifiedWidth = this.getSpecifiedWidth();
    const minRequiredWidth = util.sum(widths.map((width) => width.value));
    if (specifiedWidth && specifiedWidth > minRequiredWidth) {
      const scale = specifiedWidth / minRequiredWidth;
      return widths.map((width) => ({ ...width, value: width.value * scale }));
    }

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

  /** Returns how much to offset the measure by due to the stave. */
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

    if (isFirstSystemMeasure) {
      // We need to nudge the first measure to the right to make room for the measure number.
      result += FIRST_SYSTEM_MEASURE_NUMBER_X_SHIFT;
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
    defaultBpm: number;
    fragmentWidths: MeasureFragmentWidth[];
    address: Address<'measure'>;
    spanners: Spanners;
    previousMeasure: Measure | null;
    nextMeasure: Measure | null;
  }): MeasureRendering {
    const measureIndex = this.index;
    this.log.debug('rendering measure', { measureIndex });

    const fragmentRenderings = new Array<MeasureFragmentRendering>();

    const endingBracketRendering = this.getEndingBracket()?.render() ?? null;
    if (endingBracketRendering) {
      this.log.debug('detected ending bracket', { measureIndex });
    } else {
      this.log.debug('did not detect ending bracket', { measureIndex });
    }

    const staveOffsetX = this.getStaveOffsetX({ address: opts.address });

    let x = opts.x + staveOffsetX;
    const y = opts.y;

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

        const vfStaves = fragmentRendering.parts
          .flatMap((part) => util.first(part.staves))
          .filter((stave): stave is StaveRendering => stave?.type === 'stave')
          .map((stave) => stave.vexflow.stave);

        const vfStave = util.first(vfStaves);
        const measureNumber = this.getMeasureNumber();
        if (isFirst && this.shouldShowMeasureNumber(opts.address) && vfStave && typeof measureNumber === 'number') {
          vfStave.setMeasure(measureNumber);
        }

        if (isFirst && endingBracketRendering) {
          // Render the ending brackets for the top staves only.
          for (const vfStave of vfStaves) {
            vfStave.setVoltaType(endingBracketRendering.vexflow.voltaType, endingBracketRendering.label, 0);
          }
        }

        x += fragmentRendering.width;
      }
    );

    let rect: drawables.Rect | null = null;
    let text: drawables.Text | null = null;
    if (this.gap) {
      const x = opts.x + staveOffsetX;
      const w = util.sum(fragmentRenderings.map((fragment) => fragment.width));

      const vfStaves = fragmentRenderings
        .flatMap((fragment) => fragment.parts)
        .flatMap((part) => part.staves)
        .map((stave) => stave.vexflow.stave);

      const yMin = util.first(vfStaves.map((vfStave) => vfStave.getYForLine(0))) ?? 0;
      const yMax = util.last(vfStaves.map((vfStave) => vfStave.getBottomLineBottomY())) ?? 0;

      const h = yMax - yMin;

      rect = new drawables.Rect({
        bounds: { x, y: yMin, w, h },
        strokeStyle: this.getGapStrokeStyle(),
        fillStyle: this.getGapFillStyle(),
      });

      if (this.gap.message) {
        const fontSize = this.gap.fontSize ?? DEFAULT_GAP_MESSAGE_FONT_SIZE;
        const fontFamily = this.gap.fontFamily ?? DEFAULT_GAP_MESSAGE_FONT_FAMILY;

        const textMeasurer = new TextMeasurer({
          text: this.gap.message,
          fontSize,
          fontFamily,
        });

        text = new drawables.Text({
          x: x + (w - textMeasurer.getWidth()) / 2,
          y: yMin + h / 2,
          content: this.gap.message,
          size: fontSize,
          family: fontFamily,
        });
      }
    }

    return {
      type: 'measure',
      address: opts.address,
      fragments: fragmentRenderings,
      index: this.index,
      width: staveOffsetX + util.sum(fragmentRenderings.map((fragment) => fragment.width)),
      endingBracket: endingBracketRendering,
      jumps: this.getJumps(),
      bpm: this.getBpm() ?? opts.defaultBpm,
      gap: this.gap,
      rect,
      text,
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
          log: this.log,
          index: result.length,
          partIds: this.partIds,
          partNames: this.partNames,
          startBarlines,
          endBarlines,
          measureEntries,
          staveSignatures,
          staveDistances: this.staveDistances,
        })
      );
    }

    this.log.debug('detected measure fragments', { measureIndex: this.index, fragmentCount: result.length });

    return result;
  }

  private getGapStrokeStyle(): string | null {
    if (typeof this.gap?.strokeStyle === 'undefined') {
      return DEFAULT_GAP_STROKE_STYLE;
    }
    return this.gap?.strokeStyle;
  }

  private getGapFillStyle(): string | null {
    if (typeof this.gap?.fillStyle === 'undefined') {
      return DEFAULT_GAP_FILL_STYLE;
    }
    return this.gap?.fillStyle;
  }

  private getMeasureNumber(): number | null {
    return this.measureNumber;
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
    return this.startBarline;
  }

  private getEndBarline(): Barline {
    return this.endBarline;
  }

  private getEndingBracket(): EndingBracket | null {
    return this.endingBracket;
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

  private getJumps(): Jump[] {
    return this.jumps;
  }

  private getBpm(): number | null {
    return this.bpm;
  }

  private shouldShowMeasureNumber(address: Address<'measure'>): boolean {
    const systemMeasureIndex = address.getSystemMeasureIndex()!;

    switch (this.config.MEASURE_NUMBERING_SCHEME) {
      case 'all':
        return true;
      case 'every2':
        return systemMeasureIndex % 2 === 0;
      case 'every3':
        return systemMeasureIndex % 3 === 0;
      case 'system':
        return systemMeasureIndex === 0;
      case 'none':
        return false;
    }
  }
}

/** Creates a Measure from MusicXML data. */
class FromMusicXMLFactory {
  private config: Config;
  private log: debug.Logger;
  private index: number;
  private partIds: string[];
  private partNames: PartScoped<PartName>[];
  private musicXML: {
    measures: PartScoped<musicxml.Measure>[];
  };
  private leadingStaveSignatures: PartScoped<StaveSignature>[];
  private entries: PartScoped<MeasureEntry>[];

  private constructor(opts: {
    config: Config;
    log: debug.Logger;
    index: number;
    partIds: string[];
    partNames: PartScoped<PartName>[];
    musicXML: {
      measures: PartScoped<musicxml.Measure>[];
    };
    leadingStaveSignatures: PartScoped<StaveSignature>[];
    entries: PartScoped<MeasureEntry>[];
  }) {
    this.config = opts.config;
    this.log = opts.log;
    this.index = opts.index;
    this.partIds = opts.partIds;
    this.partNames = opts.partNames;
    this.musicXML = opts.musicXML;
    this.leadingStaveSignatures = opts.leadingStaveSignatures;
    this.entries = opts.entries;
  }

  static create(opts: {
    config: Config;
    log: debug.Logger;
    index: number;
    partIds: string[];
    partNames: PartScoped<PartName>[];
    musicXML: {
      measures: PartScoped<musicxml.Measure>[];
    };
    leadingStaveSignatures: PartScoped<StaveSignature>[];
    entries: PartScoped<MeasureEntry>[];
    staveDistances: StaveScoped<number>[];
  }): Measure {
    const factory = new FromMusicXMLFactory(opts);
    return new Measure({
      config: factory.config,
      log: factory.log,
      index: factory.index,
      measureNumber: factory.getMeasureNumber(),
      specifiedWidth: factory.getSpecifiedWidth(),
      partIds: factory.partIds,
      partNames: factory.partNames,
      leadingStaveSignatures: factory.leadingStaveSignatures,
      entries: factory.entries,
      staveDistances: opts.staveDistances,
      startBarline: factory.getStartBarline(),
      endBarline: factory.getEndBarline(),
      endingBracket: factory.getEndingBracket(),
      bpm: factory.getBpm(),
      jumps: factory.getJumps(),
      gap: null,
    });
  }

  private getMeasureNumber(): number | null {
    const partId = util.first(this.partIds);
    if (!partId) {
      return null;
    }

    const measure = this.musicXML.measures.find((measure) => measure.partId === partId)?.value;
    if (!measure) {
      return null;
    }

    if (measure.isImplicit()) {
      return null;
    }

    const number = parseInt(measure.getNumber(), 0);
    if (Number.isInteger(number) && !Number.isNaN(number)) {
      return number;
    }

    return this.index + 1;
  }

  private getSpecifiedWidth(): number | null {
    return (
      util.max(
        this.musicXML.measures
          .map((measure) => measure.value.getWidth())
          .filter((width): width is number => typeof width === 'number')
      ) || null // Disallow 0 width.
    );
  }

  private getStartBarline(): Barline {
    return (
      util.first(
        this.musicXML.measures
          .flatMap((measure) => measure.value.getBarlines())
          .filter((barline) => barline.getLocation() === 'left')
          .map((barline) => Barline.fromMusicXML({ config: this.config, log: this.log, musicXML: { barline } }))
      ) ?? new Barline({ config: this.config, log: this.log, type: 'single', location: 'left' })
    );
  }

  private getEndBarline(): Barline {
    return (
      util.first(
        this.musicXML.measures
          .flatMap((measure) => measure.value.getBarlines())
          .filter((barline) => barline.getLocation() === 'right')
          .map((barline) => Barline.fromMusicXML({ config: this.config, log: this.log, musicXML: { barline } }))
      ) ?? new Barline({ config: this.config, log: this.log, type: 'single', location: 'right' })
    );
  }

  private getEndingBracket(): EndingBracket | null {
    const barline = util.first(
      this.musicXML.measures.flatMap((measure) => measure.value.getBarlines()).filter((barline) => barline.isEnding())
    );
    return barline
      ? EndingBracket.fromMusicXML({ config: this.config, log: this.log, musicXML: { barline: barline } })
      : null;
  }

  private getBpm(): number | null {
    for (const partId of this.partIds) {
      const bpm = this.musicXML.measures.find((measure) => measure.partId === partId)?.value.getFirstTempo();
      if (typeof bpm === 'number') {
        return bpm;
      }
    }
    return null;
  }

  private getJumps(): Jump[] {
    // TODO: Handle other directional symbols like codas and fines.
    const barlines = this.musicXML.measures.flatMap((measure) => measure.value.getBarlines());
    const repeatBarlines = barlines.filter((barline) => barline.isRepeat());

    // NOTE: Repeats can be specified in multiple parts, but the measure should be consistent across all parts. If a
    // measure in a single part has a start repeat, then all parts should have a start repeat. The same goes for end.

    const jumps = new Array<Jump>();

    const hasStartRepeat = repeatBarlines.some((barline) => barline.getRepeatDirection() === 'forward');
    if (hasStartRepeat) {
      jumps.push({ type: 'repeatstart' });
    }

    const endRepeat = repeatBarlines.find((barline) => barline.getRepeatDirection() === 'backward');
    if (endRepeat && endRepeat.isEnding()) {
      jumps.push({ type: 'repeatending', times: endRepeat.getEndingNumber().split(',').length });
    }
    if (endRepeat && !endRepeat.isEnding()) {
      jumps.push({ type: 'repeatend', times: endRepeat.getRepeatTimes() ?? 1 });
    }

    return jumps;
  }
}

/** Creates a Measure from a Gap. */
class FromGapFactory {
  static create(opts: {
    config: Config;
    log: debug.Logger;
    partIds: string[];
    partNames: PartScoped<PartName>[];
    gap: Gap;
    leadingStaveSignatures: PartScoped<StaveSignature>[];
    staveDistances: StaveScoped<number>[];
  }): Measure {
    return new Measure({
      config: opts.config,
      log: opts.log,
      index: opts.gap.absoluteMeasureIndex,
      measureNumber: null,
      specifiedWidth: opts.gap.width,
      partIds: opts.partIds,
      partNames: opts.partNames,
      leadingStaveSignatures: opts.leadingStaveSignatures,
      entries: [],
      staveDistances: opts.staveDistances,
      startBarline: new Barline({
        config: opts.config,
        log: opts.log,
        type: opts.gap.startBarlineType ?? 'none',
        location: 'left',
      }),
      endBarline: new Barline({
        config: opts.config,
        log: opts.log,
        type: opts.gap.endBarlineType ?? 'none',
        location: 'right',
      }),
      endingBracket: null,
      bpm: null,
      jumps: [],
      gap: opts.gap,
    });
  }
}
