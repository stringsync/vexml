import { System } from './system';
import { Config } from './config';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import { PartScoped } from './types';
import { Measure } from './measure';
import { Address } from './address';
import { MeasureEntry, StaveSignature } from './stavesignature';
import { MeasureFragmentWidth } from './measurefragment';
import { PartName } from './partname';

// Space needed to be able to show the end barlines.
const LAST_SYSTEM_REMAINING_WIDTH_STRETCH_THRESHOLD = 0.25;

/** A reusable data container that houses rendering data to spawn `System` objects. */
export class Seed {
  private config: Config;
  private musicXml: {
    parts: musicxml.Part[];
    partDetails: musicxml.PartDetail[];
    staveLayouts: musicxml.StaveLayout[];
  };

  constructor(opts: {
    config: Config;
    musicXml: {
      parts: musicxml.Part[];
      partDetails: musicxml.PartDetail[];
      staveLayouts: musicxml.StaveLayout[];
    };
  }) {
    this.config = opts.config;
    this.musicXml = opts.musicXml;
  }

  /** Splits the measures into parts and systems that fit the given width. */
  split(width: number): System[] {
    const systems = new Array<System>();

    let remaining = width;
    let staveOffsetX = 0;
    let measures = new Array<Measure>();
    let minRequiredFragmentWidths = new Array<MeasureFragmentWidth>();
    let systemAddress = Address.system({ systemIndex: systems.length, origin: 'Seed.prototype.split' });
    let endBarlineWidth = 0;

    const addSystem = (opts: { stretch: boolean }) => {
      const minRequiredSystemWidth = util.sum(minRequiredFragmentWidths.map(({ value }) => value));

      const stretchedWidths = minRequiredFragmentWidths.map<MeasureFragmentWidth>(
        ({ measureIndex, measureFragmentIndex, value }) => {
          const targetWidth = width - endBarlineWidth - staveOffsetX;
          const widthDeficit = targetWidth - minRequiredSystemWidth;
          const widthFraction = value / minRequiredSystemWidth;
          const widthDelta = widthDeficit * widthFraction;

          return { measureIndex, measureFragmentIndex, value: value + widthDelta };
        }
      );

      systems.push(
        new System({
          config: this.config,
          index: systems.length,
          measures,
          measureFragmentWidths: opts.stretch ? stretchedWidths : minRequiredFragmentWidths,
        })
      );
    };

    util.forEachTriple(this.getMeasures(), ([previousMeasure, currentMeasure], { isLast }) => {
      const measureAddress = systemAddress.measure({
        systemMeasureIndex: measures.length,
        measureIndex: currentMeasure.getIndex(),
      });

      let measureMinRequiredFragmentWidths = currentMeasure.getMinRequiredFragmentWidths({
        previousMeasure,
        address: measureAddress,
      });

      endBarlineWidth = currentMeasure.getEndBarlineWidth();
      staveOffsetX += currentMeasure.getStaveOffsetX({ address: measureAddress });

      let required =
        util.sum(measureMinRequiredFragmentWidths.map(({ value }) => value)) + endBarlineWidth + staveOffsetX;

      if (remaining < required) {
        addSystem({ stretch: true });

        // Reset state.
        remaining = width;
        measures = [];
        minRequiredFragmentWidths = [];

        // Start a new system and re-measure.
        systemAddress = Address.system({ systemIndex: systems.length, origin: 'Seed.prototype.split' });

        endBarlineWidth = currentMeasure.getEndBarlineWidth();
        staveOffsetX = currentMeasure.getStaveOffsetX({ address: measureAddress });

        measureMinRequiredFragmentWidths = currentMeasure.getMinRequiredFragmentWidths({
          previousMeasure,
          address: systemAddress.measure({
            systemMeasureIndex: 0,
            measureIndex: currentMeasure.getIndex(),
          }),
        });

        required =
          util.sum(measureMinRequiredFragmentWidths.map(({ value }) => value)) + endBarlineWidth + staveOffsetX;
      }

      remaining -= required;
      measures.push(currentMeasure);
      minRequiredFragmentWidths.push(...measureMinRequiredFragmentWidths);

      if (isLast) {
        addSystem({ stretch: remaining / width <= LAST_SYSTEM_REMAINING_WIDTH_STRETCH_THRESHOLD });
      }
    });

    return systems;
  }

  @util.memoize()
  private getMeasureEntryGroups(): PartScoped<MeasureEntry[][]>[] {
    const result = [];

    for (const part of this.musicXml.parts) {
      const partId = part.getId();
      result.push({ partId, value: StaveSignature.toMeasureEntryGroups({ part }) });
    }

    return result;
  }

  @util.memoize()
  private getPartNames(): PartScoped<PartName>[] {
    const result = new Array<PartScoped<PartName>>();

    for (const partDetail of this.musicXml.partDetails) {
      const partId = partDetail.id;
      const partName = new PartName({ config: this.config, content: partDetail.name });
      result.push({ partId, value: partName });
    }

    return result;
  }

  private getMeasures(): Measure[] {
    const measures = new Array<Measure>();

    const measureCount = this.getMeasureCount();

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      measures.push(
        new Measure({
          config: this.config,
          index: measureIndex,
          partIds: this.getPartIds(),
          partNames: this.getPartNames(),
          musicXml: {
            measures: this.musicXml.parts.map((part) => ({
              partId: part.getId(),
              value: part.getMeasures()[measureIndex],
            })),
            staveLayouts: this.musicXml.staveLayouts,
          },
          leadingStaveSignatures: this.getLeadingStaveSignatures(measureIndex),
          entries: this.getMeasureEntries(measureIndex),
        })
      );
    }

    return measures;
  }

  private getMeasureCount(): number {
    return util.max(this.musicXml.parts.map((part) => part.getMeasures().length));
  }

  private getPartIds(): string[] {
    return this.musicXml.parts.map((part) => part.getId());
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
        staveSignatures.find((staveSignature) => staveSignature.getMeasureIndex() === measureIndex) ??
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
