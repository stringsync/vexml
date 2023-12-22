import { System } from './system';
import { Config } from './config';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import { PartScoped } from './types';
import { Measure } from './measure';
import { Address } from './address';
import { MeasureEntry, StaveSignature } from './stavesignature';
import { MeasureFragmentWidth } from './measurefragment';

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
    let measures = new Array<Measure>();
    let minRequiredFragmentWidths = new Array<MeasureFragmentWidth>();
    let systemAddress = Address.system({ systemIndex: systems.length, origin: 'Seed.prototype.split' });

    const addSystem = () => {
      const minRequiredSystemWidth = util.sum(minRequiredFragmentWidths.map(({ value }) => value));

      const widths = minRequiredFragmentWidths.map<MeasureFragmentWidth>(
        ({ measureIndex, measureFragmentIndex, value }) => {
          const widthDeficit = width - minRequiredSystemWidth;
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
          measureFragmentWidths: widths,
        })
      );
    };

    util.forEachTriple(this.getMeasures(), ([previousMeasure, currentMeasure], { isLast, index }) => {
      let measureMinRequiredFragmentWidths = currentMeasure.getMinRequiredFragmentWidths({
        previousMeasure,
        address: systemAddress.measure({
          systemMeasureIndex: index,
          measureIndex: currentMeasure.getIndex(),
        }),
      });
      let required = util.sum(measureMinRequiredFragmentWidths.map(({ value }) => value));

      if (remaining < required) {
        addSystem();

        // Reset state.
        remaining = width;
        measures = [];
        minRequiredFragmentWidths = [];

        // Start a new system and re-measure.
        systemAddress = Address.system({ systemIndex: systems.length, origin: 'Seed.prototype.split' });
        measureMinRequiredFragmentWidths = currentMeasure.getMinRequiredFragmentWidths({
          previousMeasure,
          address: systemAddress.measure({
            systemMeasureIndex: index,
            measureIndex: currentMeasure.getIndex(),
          }),
        });
        required = util.sum(measureMinRequiredFragmentWidths.map(({ value }) => value));
      }

      remaining -= required;
      measures.push(currentMeasure);
      minRequiredFragmentWidths.push(...measureMinRequiredFragmentWidths);

      if (isLast) {
        addSystem();
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

  private getMeasures(): Measure[] {
    const measures = new Array<Measure>();

    const measureCount = this.getMeasureCount();

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      measures.push(
        new Measure({
          config: this.config,
          index: measureIndex,
          partIds: this.getPartIds(),
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
