import { System } from './system';
import { Config } from '@/config';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import * as debug from '@/debug';
import { PartScoped } from './types';
import { Measure } from './measure';
import { Address } from './address';
import { MeasureEntry, StaveSignature } from './stavesignature';
import { MeasureFragmentWidth } from './measurefragment';
import { PartName } from './partname';

const LAST_SYSTEM_WIDTH_STRETCH_THRESHOLD = 0.75;

/** A reusable data container that houses rendering data to spawn `System` objects. */
export class Seed {
  private config: Config;
  private log: debug.Logger;
  private musicXML: {
    parts: musicxml.Part[];
    partDetails: musicxml.PartDetail[];
    staveLayouts: musicxml.StaveLayout[];
  };

  constructor(opts: {
    config: Config;
    log: debug.Logger;
    musicXML: {
      parts: musicxml.Part[];
      partDetails: musicxml.PartDetail[];
      staveLayouts: musicxml.StaveLayout[];
    };
  }) {
    this.config = opts.config;
    this.log = opts.log;
    this.musicXML = opts.musicXML;
  }

  /** Splits the measures into parts and systems that fit the given width. */
  split(width: number): System[] {
    this.log.debug('splitting measures into systems', { width });

    const calculator = new SystemCalculator({
      config: this.config,
      log: this.log,
      width,
      measures: this.getMeasures(),
    });
    return calculator.calculate();
  }

  @util.memoize()
  private getMeasureEntryGroups(): PartScoped<MeasureEntry[][]>[] {
    const result = [];

    for (const part of this.musicXML.parts) {
      const partId = part.getId();
      result.push({
        partId,
        value: StaveSignature.toMeasureEntryGroups({ config: this.config, log: this.log, musicXML: { part } }),
      });
    }

    return result;
  }

  @util.memoize()
  private getPartNames(): PartScoped<PartName>[] {
    const result = new Array<PartScoped<PartName>>();

    for (const partDetail of this.musicXML.partDetails) {
      const partId = partDetail.id;
      const partName = new PartName({ config: this.config, log: this.log, content: partDetail.name });
      result.push({ partId, value: partName });
    }

    return result;
  }

  private getMeasures(): Measure[] {
    // TODO: Account for message measures.
    const measures = new Array<Measure>();
    const measureCount = this.getMeasureCount();

    let multiRestMeasureCount = 0;

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      if (multiRestMeasureCount > 0) {
        multiRestMeasureCount--;
        continue;
      }

      const measure = Measure.fromMusicXML({
        config: this.config,
        log: this.log,
        index: measureIndex,
        partIds: this.getPartIds(),
        partNames: this.getPartNames(),
        musicXML: {
          measures: this.musicXML.parts.map((part) => ({
            partId: part.getId(),
            value: part.getMeasures()[measureIndex],
          })),
          staveLayouts: this.musicXML.staveLayouts,
        },
        leadingStaveSignatures: this.getLeadingStaveSignatures(measureIndex),
        entries: this.getMeasureEntries(measureIndex),
      });

      measures.push(measure);

      // -1 since this measure is part of the multi rest.
      multiRestMeasureCount += measure.getMultiRestCount() - 1;
    }

    return measures;
  }

  private getMeasureCount(): number {
    return util.max(this.musicXML.parts.map((part) => part.getMeasures().length));
  }

  private getPartIds(): string[] {
    return this.musicXML.parts.map((part) => part.getId());
  }

  private getLeadingStaveSignatures(measureIndex: number): PartScoped<StaveSignature>[] {
    return this.getPartIds().map((partId) => {
      const measureEntryGroups = this.getMeasureEntryGroups()
        .filter((measureEntryGroup) => measureEntryGroup.partId === partId)
        .flatMap((measureEntryGroup) => measureEntryGroup.value);

      const staveSignatures = measureEntryGroups
        .flat()
        .filter((entry): entry is StaveSignature => entry instanceof StaveSignature)
        .filter((staveSignature) => staveSignature.getMeasureIndex() <= measureIndex);

      // Get the first stave signature that matches the measure index or get the last stave signature seen before this
      // measure index.
      const leadingStaveSignature =
        staveSignatures.find(
          (staveSignature) =>
            staveSignature.getMeasureIndex() === measureIndex && staveSignature.getMeasureEntryIndex() === 0
        ) ??
        staveSignatures.findLast((staveSignature) => staveSignature.getMeasureIndex() < measureIndex) ??
        util.last(staveSignatures);

      // We don't expect this to ever happen since we assume that StaveSignatures are created correctly. However, if this
      // error ever throws, investigate how StaveSignatures are created. Don't default StaveSignature because it exposes
      // getPrevious and getNext, which the caller expects to be a well formed linked list.
      if (!leadingStaveSignature) {
        throw new Error('expected leading stave signature');
      }

      return { partId, value: leadingStaveSignature };
    });
  }

  private getMeasureEntries(measureIndex: number): PartScoped<MeasureEntry>[] {
    return this.getMeasureEntryGroups().flatMap((measureEntryGroup) =>
      measureEntryGroup.value[measureIndex].map((measureEntry) => ({
        partId: measureEntryGroup.partId,
        value: measureEntry,
      }))
    );
  }
}

/** A private utility to calculate systems for Seed. */
class SystemCalculator {
  private config: Config;
  private log: debug.Logger;
  private width: number;
  private measures: Measure[];
  private systems = new Array<System>();
  private buffer = new Array<{ measure: Measure; width: MeasureWidth }>();
  private required = 0;
  private shiftX = 0;
  private endBarlineWidth = 0;
  private systemAddress = Address.system({ systemIndex: 0, origin: 'SystemCalculator.constructor' });

  constructor(opts: { config: Config; log: debug.Logger; width: number; measures: Measure[] }) {
    this.config = opts.config;
    this.log = opts.log;
    this.width = opts.width;
    this.measures = opts.measures;
  }

  /** Calculates the systems targeting a specific container width. */
  calculate(): System[] {
    this.systems = [];

    this.reset();

    util.forEachTriple(this.measures, ([previousMeasure, measure], { isLast, index }) => {
      let measureAddress = this.measureAddress(index);
      let measureWidth = MeasureWidth.create({ log: this.log, measure, previousMeasure, address: measureAddress });
      let measureShiftX = measure.getStaveOffsetX({ address: measureAddress });
      let measureEndBarlineWidth = measure.getEndBarlineWidth();

      const projectedWidth = this.required + measureWidth.getValue() + measureShiftX + measureEndBarlineWidth;

      if (projectedWidth > this.width && this.buffer.length > 0) {
        this.log.debug('not enough space for measure, adding stretched system', {
          measureIndex: measure.getIndex(),
          projectedWidth,
          width: this.width,
        });
        this.addSystem({ stretch: true });
        this.reset();

        measureAddress = this.measureAddress(index);
        measureWidth = MeasureWidth.create({ log: this.log, measure, previousMeasure, address: measureAddress });
        measureShiftX = measure.getStaveOffsetX({ address: measureAddress });
        measureEndBarlineWidth = measure.getEndBarlineWidth();
      }

      this.buffer.push({ measure, width: measureWidth });
      this.required += measureWidth.getValue() + measureShiftX + measureEndBarlineWidth;
      this.shiftX += measureShiftX;
      this.endBarlineWidth = measureEndBarlineWidth;

      if (isLast) {
        const stretch = this.isAboveStretchThreshold();
        this.log.debug('adding last system', { stretch });
        this.addSystem({ stretch });
      }
    });

    return this.systems;
  }

  private reset(): void {
    this.buffer = [];
    this.required = 0;
    this.shiftX = 0;
    this.endBarlineWidth = 0;
    this.systemAddress = Address.system({
      systemIndex: this.systems.length,
      origin: 'SystemCalculator.prototype.reset',
    });
  }

  private measureAddress(measureIndex: number): Address<'measure'> {
    return this.systemAddress.measure({ systemMeasureIndex: this.buffer.length, measureIndex });
  }

  private addSystem(opts: { stretch: boolean }): void {
    let measureFragmentWidths = this.buffer.flatMap(({ width }) => width.getFragments());

    if (opts.stretch) {
      const minRequiredSystemWidth = util.sum(
        this.buffer.flatMap(({ width }) => width.getFragments()).map((fragment) => fragment.value)
      );
      const targetWidth = this.width - this.shiftX - this.endBarlineWidth;
      const widthDeficit = targetWidth - minRequiredSystemWidth;

      measureFragmentWidths = measureFragmentWidths.map(({ measureIndex, measureFragmentIndex, value }) => {
        const widthFraction = value / minRequiredSystemWidth;
        const widthDelta = widthDeficit * widthFraction;
        return { measureIndex, measureFragmentIndex, value: value + widthDelta };
      });
    }

    this.systems.push(
      new System({
        config: this.config,
        log: this.log,
        index: this.systems.length,
        measures: this.buffer.map(({ measure }) => measure),
        measureFragmentWidths,
      })
    );
  }

  private isAboveStretchThreshold(): boolean {
    return this.required / this.width >= LAST_SYSTEM_WIDTH_STRETCH_THRESHOLD;
  }
}

/** Describes the width of a measure including a breakdown of its components. */
class MeasureWidth {
  private log: debug.Logger;
  private measure: Measure;
  private fragments: MeasureFragmentWidth[];

  constructor(opts: { log: debug.Logger; measure: Measure; fragments: MeasureFragmentWidth[] }) {
    this.log = opts.log;
    this.measure = opts.measure;
    this.fragments = opts.fragments;
  }

  static create(opts: {
    log: debug.Logger;
    measure: Measure;
    previousMeasure: Measure | null;
    address: Address<'measure'>;
  }): MeasureWidth {
    const log = opts.log;
    const measure = opts.measure;
    const fragments = measure.getMinRequiredFragmentWidths({
      previousMeasure: opts.previousMeasure,
      address: opts.address,
    });
    return new MeasureWidth({ log, measure, fragments });
  }

  /** Returns the value of the measure width. */
  getValue(): number {
    const measureIndex = this.measure.getIndex();
    const maxSpecifiedWidth = this.measure.getMaxSpecifiedWidth();
    if (typeof maxSpecifiedWidth === 'number') {
      this.log.debug('detected a max specified width', { measureIndex, maxSpecifiedWidth });
      return maxSpecifiedWidth;
    } else {
      this.log.debug('no width specified, inferring measure width from its fragments', { measureIndex });
      return util.sum(this.fragments.map(({ value }) => value));
    }
  }

  /** Returns the fragments of the measure width. */
  getFragments(): MeasureFragmentWidth[] {
    return this.fragments;
  }
}
