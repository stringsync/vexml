import { Config } from './config';
import { Measure } from './measure';
import { MeasureEntry, StaveSignature } from './stavesignature';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import { Part } from './part';
import { System } from './system';
import { Address } from './address';
import { PartName } from './partname';

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

    let systemMeasureIndex = 0;
    let remainingWidth = width;
    let measureStartIndex = 0;

    /** Adds a system to the return value. */
    const commitSystem = (measureEndIndex: number) => {
      const parts = this.musicXml.parts.map((part) => {
        const partId = part.getId();
        return new Part({
          config: this.config,
          staveCount: this.getStaveCount(partId),
          name: measureStartIndex === 0 ? this.getPartName(partId) : null,
          musicXml: { part },
          measures: this.getMeasures(partId).slice(measureStartIndex, measureEndIndex),
        });
      });

      const system = new System({
        config: this.config,
        index: systems.length,
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

    const systemAddress = Address.system({ systemIndex: 0 });

    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      // Account for the width that the part name will take up for the very first measure.
      if (measureIndex === 0) {
        remainingWidth -= util.max(
          this.musicXml.parts
            .map((part) => part.getId())
            .map((partId) => this.getPartName(partId))
            .map((partName) => partName?.getWidth() ?? 0)
        );
      }

      // Represents a column of measures across each part.
      const measures = this.musicXml.parts
        .map((part) => part.getId())
        .map((partId) => ({ address: systemAddress.part(), measures: this.getMeasures(partId) }))
        .map((data) => ({
          address: data.address.measure(),
          previous: data.measures[measureIndex - 1] ?? null,
          current: data.measures[measureIndex],
        }));

      const getMinRequiredWidth = () =>
        util.max(
          measures.map((measure) =>
            measure.current.getMinRequiredWidth({
              address: measure.address,
              systemMeasureIndex,
              previousMeasure: measure.previous,
            })
          )
        );

      let minRequiredWidth = getMinRequiredWidth();

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
        minRequiredWidth = getMinRequiredWidth();
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
          leadingStaveSignature: this.getLeadingStaveSignature(partId, measureIndex),
          measureEntries: this.getMeasureEntries(partId, measureIndex),
        });

        result[partId].push(measure);

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

  @util.memoize()
  private getPartNameByPartId(): Record<string, PartName> {
    const result: Record<string, PartName> = {};

    for (const partDetail of this.musicXml.partDetails) {
      result[partDetail.id] = new PartName({ config: this.config, content: partDetail.name });
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

  private getPartName(partId: string): PartName | null {
    const partNameByPartId = this.getPartNameByPartId();
    return partNameByPartId[partId] ?? null;
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
