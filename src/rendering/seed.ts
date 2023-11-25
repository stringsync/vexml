import { Config } from './config';
import { Measure } from './measure';
import { MeasureEntry, StaveSignature } from './stavesignature';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import { Part } from './part';
import { System } from './system';
import { Address } from './address';

/** A reusable data container that houses rendering data to spawn `System` objects. */
export class Seed {
  private config: Config;
  private musicXml: {
    parts: musicxml.Part[];
    staveLayouts: musicxml.StaveLayout[];
  };

  constructor(opts: {
    config: Config;
    musicXml: {
      parts: musicxml.Part[];
      staveLayouts: musicxml.StaveLayout[];
    };
  }) {
    this.config = opts.config;
    this.musicXml = opts.musicXml;
  }

  /** Splits the measures into parts and systems that fit the given width. */
  split(width: number): System[] {
    const systems = new Array<System>();

    let systemMeasureIndex = 0;
    let remainingWidth = width;
    let measureStartIndex = 0;

    /** Adds a system to the return value. */
    const commitSystem = (measureEndIndex: number) => {
      const parts = this.musicXml.parts.map((part) => {
        const partId = part.getId();
        return new Part({
          config: this.config,
          musicXml: { part },
          measures: this.getMeasures(partId).slice(measureStartIndex, measureEndIndex),
        });
      });

      const system = new System({
        config: this.config,
        address: Address.system(),
        parts,
      });

      systems.push(system);

      measureStartIndex = measureEndIndex;
      systemMeasureIndex = 0;
      remainingWidth = width;
    };

    /** Accounts for a measure being added to a system. */
    const continueSystem = (width: number) => {
      remainingWidth -= width;
      systemMeasureIndex++;
    };

    const measureCount = util.max(
      this.musicXml.parts.map((part) => part.getId()).map((partId) => this.getMeasures(partId).length)
    );

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      // Represents a column of measures across each part.
      const measures = this.musicXml.parts
        .map((part) => part.getId())
        .map((partId) => this.getMeasures(partId))
        .map((measures) => measures[measureIndex]);

      let minRequiredWidth = util.max(measures.map((measure) => measure.getMinRequiredWidth(systemMeasureIndex)));

      const isProcessingLastMeasure = measureIndex === measureCount - 1;
      if (isProcessingLastMeasure) {
        if (minRequiredWidth <= remainingWidth) {
          commitSystem(measureIndex + 1);
        } else {
          commitSystem(measureIndex);
          commitSystem(measureIndex + 1);
        }
      } else if (minRequiredWidth <= remainingWidth) {
        continueSystem(minRequiredWidth);
      } else {
        commitSystem(measureIndex);
        minRequiredWidth = util.max(measures.map((measure) => measure.getMinRequiredWidth(systemMeasureIndex)));
        continueSystem(minRequiredWidth);
      }
    }

    return systems;
  }

  @util.memoize()
  private getMeasuresByPartId(): Record<string, Measure[]> {
    const result: Record<string, Measure[]> = {};

    let multiRestMeasureCount = 0;

    for (const part of this.musicXml.parts) {
      const partId = part.getId();
      result[partId] = [];

      let previousMeasure: Measure | null = null;

      const staveCount = this.getStaveCount(partId);
      const measures = part.getMeasures();

      for (let measureIndex = 0; measureIndex < measures.length; measureIndex++) {
        if (multiRestMeasureCount > 0) {
          multiRestMeasureCount--;
          continue;
        }

        const measure: Measure = new Measure({
          config: this.config,
          index: measureIndex,
          musicXml: {
            measure: measures[measureIndex],
            staveLayouts: this.musicXml.staveLayouts,
          },
          staveCount,
          previousMeasure,
          leadingStaveSignature: this.getLeadingStaveSignature(partId, measureIndex),
          measureEntries: this.getMeasureEntries(partId, measureIndex),
        });

        result[partId].push(measure);
        previousMeasure = measure;

        // -1 since this measure is part of the multi rest.
        multiRestMeasureCount += measure.getMultiRestCount() - 1;
      }
    }

    return result;
  }

  @util.memoize()
  private getMeasureEntryGroupsByPartId(): Record<string, MeasureEntry[][]> {
    const result: Record<string, MeasureEntry[][]> = {};

    for (const part of this.musicXml.parts) {
      const partId = part.getId();
      result[partId] = StaveSignature.toMeasureEntryGroups({ part });
    }

    return result;
  }

  private getMeasures(partId: string): Measure[] {
    const measuresByPartId = this.getMeasuresByPartId();
    return measuresByPartId[partId];
  }

  private getMeasureEntries(partId: string, measureIndex: number): MeasureEntry[] {
    const measureEntryGroups = this.getMeasureEntryGroups(partId);
    return measureEntryGroups[measureIndex];
  }

  private getMeasureEntryGroups(partId: string): MeasureEntry[][] {
    const measureEntryGroupsByPartId = this.getMeasureEntryGroupsByPartId();
    return measureEntryGroupsByPartId[partId];
  }

  /** Returns the stave signature that is active at the beginning of the measure. */
  private getLeadingStaveSignature(partId: string, measureIndex: number): StaveSignature {
    const measureEntryGroupsByPartId = this.getMeasureEntryGroupsByPartId();
    const measureEntryGroups = measureEntryGroupsByPartId[partId];

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

    return leadingStaveSignature;
  }

  private getStaveCount(partId: string): number {
    const measureEntryGroupsByPartId = this.getMeasureEntryGroupsByPartId();
    const measureEntryGroups = measureEntryGroupsByPartId[partId];

    return util.max(
      measureEntryGroups
        .flat()
        .filter((entry): entry is StaveSignature => entry instanceof StaveSignature)
        .map((entry) => entry.getStaveCount())
    );
  }
}
