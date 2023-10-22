import { Config } from './config';
import { Measure } from './measure';
import { MeasureEntry, StaveSignature } from './stavesignature';
import { System } from './system';
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
  split(width: number): System[] {
    const systems = new Array<System>();

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

        const measure = Measure.create({
          config: this.config,
          index: measureIndex,
          musicXml: {
            measure: measures[measureIndex],
          },
          staveCount,
          isFirstPartMeasure: measureIndex === 0,
          isLastPartMeasure: measureIndex === measures.length - 1,
          systemId: DUMMY_SYSTEM_ID,
          previousMeasure,
          leadingStaveSignature: this.getFirstActiveStaveSignature(partId, measureIndex),
          measureEntries: this.getMeasureEntries(partId, measureIndex),
          staveLayouts: this.staveLayouts,
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

  private getMeasureCount(): number {
    return util.max(this.parts.map((part) => part.getMeasures().length));
  }

  /** Returns the stave signature that is active at the beginning of the measure. */
  private getFirstActiveStaveSignature(partId: string, measureIndex: number): StaveSignature | null {
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

  private getMeasureEntries(partId: string, measureIndex: number): MeasureEntry[] {
    const measureEntryGroupsByPartId = this.getMeasureEntryGroupsByPartId();
    return measureEntryGroupsByPartId[partId][measureIndex];
  }

  private getPartIds(): string[] {
    return this.parts.map((part) => part.getId());
  }
}
