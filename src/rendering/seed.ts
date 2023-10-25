import { Config } from './config';
import { Measure } from './measure';
import { LegacyPart } from './legacypart';
import { MeasureEntry, StaveSignature } from './stavesignature';
import { LegacySystem } from './legacysystem';
import * as musicxml from '@/musicxml';
import * as util from '@/util';

const DUMMY_SYSTEM_ID = Symbol('dummy');

/** A reusable data container that houses rendering data to spawn `System` objects. */
export class Seed {
  private config: Config;
  private parts: musicxml.Part[];
  private staveLayouts: musicxml.StaveLayout[];

  private constructor(opts: { config: Config; parts: musicxml.Part[]; staveLayouts: musicxml.StaveLayout[] }) {
    this.config = opts.config;
    this.parts = opts.parts;
    this.staveLayouts = opts.staveLayouts;
  }

  /** Splits the parts into discrete systems that can fit the given width.  */
  split(width: number): LegacySystem[] {
    const systems = new Array<LegacySystem>();

    let remainingWidth = width;
    const measureStartIndex = 0;
    const measureEndIndex = 0;

    /** Adds a system to the return value. */
    const commitSystem = () => {
      const parts = this.parts.map((part) => {
        const partId = part.getId();
        return new LegacyPart({
          config: this.config,
          musicXml: { part },
          id: partId,
          systemId: DUMMY_SYSTEM_ID,
          measures: this.getMeasures(partId).slice(measureStartIndex, measureEndIndex),
          staveCount: this.getStaveCount(partId),
          noopMeasureCount: 0,
        });
      });
      const system = new LegacySystem({
        config: this.config,
        id: DUMMY_SYSTEM_ID,
        parts,
      });
      systems.push(system);
    };

    /** Accounts for a system being added. */
    const continueSystem = (width: number) => {
      remainingWidth -= width;
    };

    const measureCount = this.getMeasureCount();

    // TODO: FIX THIS
    // for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
    //   const measures = this.parts.map((part) => ({
    //     previous: part.getMeasureAt(measureIndex - 1),
    //     current: part.getMeasureAt(measureIndex)!,
    //   }));

    //   let minRequiredWidth = util.max(measures.map((measure) => measure.current.getMinRequiredWidth(measure.previous)));

    //   const isProcessingLastMeasure = measureIndex === measureCount - 1;
    //   if (isProcessingLastMeasure) {
    //     if (minRequiredWidth <= widthBudget) {
    //       commitSystem(measureIndex + 1);
    //     } else {
    //       commitSystem(measureIndex);
    //       commitSystem(measureIndex + 1);
    //     }
    //   } else if (minRequiredWidth <= widthBudget) {
    //     continueSystem(minRequiredWidth);
    //   } else {
    //     commitSystem(measureIndex);
    //     // Recalculate to reflect the new conditions of the measure being on a different system, which is why null
    //     // is being used.
    //     minRequiredWidth = util.max(measures.map((measure) => measure.current.getMinRequiredWidth(null)));
    //     continueSystem(minRequiredWidth);
    //   }
    // }

    return systems;
  }

  @util.memoize()
  private getMeasuresByPartId(): Record<string, Measure[]> {
    const result: Record<string, Measure[]> = {};

    let multiMeasureCount = 0;

    for (const part of this.parts) {
      const partId = part.getId();
      result[partId] = [];

      let previousMeasure: Measure | null = null;

      const staveCount = this.getStaveCount(partId);
      const measures = part.getMeasures();

      for (let measureIndex = 0; measureIndex < measures.length; measureIndex++) {
        if (multiMeasureCount > 0) {
          multiMeasureCount--;
          continue;
        }

        const measure: Measure = new Measure({
          config: this.config,
          index: measureIndex,
          musicXml: {
            measure: measures[measureIndex],
            staveLayouts: this.staveLayouts,
          },
          staveCount,
          systemId: DUMMY_SYSTEM_ID,
          previousMeasure,
          leadingStaveSignature: this.getLeadingStaveSignature(partId, measureIndex),
          measureEntries: this.getMeasureEntries(partId, measureIndex),
        });

        result[partId].push(measure);
        previousMeasure = measure;

        // -1 since this measure is part of the multi rest.
        multiMeasureCount += measure.getMultiRestCount() - 1;
      }
    }

    return result;
  }

  @util.memoize()
  private getMeasureEntryGroupsByPartId(): Record<string, MeasureEntry[][]> {
    const result: Record<string, MeasureEntry[][]> = {};

    for (const part of this.parts) {
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

  private getMeasureCount(): number {
    return util.max(this.parts.map((part) => part.getMeasures().length));
  }

  /** Returns the stave signature that is active at the beginning of the measure. */
  private getLeadingStaveSignature(partId: string, measureIndex: number): StaveSignature | null {
    const measureEntryGroupsByPartId = this.getMeasureEntryGroupsByPartId();
    const measureEntryGroups = measureEntryGroupsByPartId[partId];

    const staveSignatures = measureEntryGroups
      .flat()
      .filter((entry): entry is StaveSignature => entry instanceof StaveSignature)
      .filter((staveSignature) => staveSignature.getMeasureIndex() <= measureIndex);

    // Get the first stave signature that matches the measure index or get the last stave signature seen before this
    // measure index.
    return (
      staveSignatures.find((staveSignature) => staveSignature.getMeasureIndex() === measureIndex) ??
      util.last(staveSignatures)
    );
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

  private getPartIds(): string[] {
    return this.parts.map((part) => part.getId());
  }
}
