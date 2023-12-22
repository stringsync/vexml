import { System } from './system2';
import { Config } from './config';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import { PartScoped } from './types';
import { Measure } from './measure2';
import { Address } from './address';
import { MeasureEntry, StaveSignature } from './stavesignature';

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
    let data = new Array<{ measure: Measure; minRequiredWidth: number }>();
    let systemAddress = Address.system({ systemIndex: systems.length, origin: 'Seed.prototype.split' });

    const addSystem = () => {
      const minRequiredSystemWidth = util.sum(data.map(({ minRequiredWidth }) => minRequiredWidth));

      systems.push(
        new System({
          config: this.config,
          index: systems.length,
          data: data.map(({ measure, minRequiredWidth }) => {
            const widthDeficit = width - minRequiredSystemWidth;
            const widthFraction = minRequiredWidth / minRequiredSystemWidth;
            const widthDelta = widthDeficit * widthFraction;
            return { measure, width: minRequiredWidth + widthDelta };
          }),
        })
      );
    };

    util.forEachTriple(this.getMeasures(), ([previousMeasure, currentMeasure], { isLast, index }) => {
      let required = currentMeasure.getMinRequiredWidth({
        previousMeasure,
        address: systemAddress.measure({
          systemMeasureIndex: index,
          measureIndex: currentMeasure.getIndex(),
        }),
      });

      if (remaining < required) {
        addSystem();
        remaining = width;
        data = [];
        systemAddress = Address.system({ systemIndex: systems.length, origin: 'Seed.prototype.split' });
        required = currentMeasure.getMinRequiredWidth({
          previousMeasure,
          address: systemAddress.measure({
            systemMeasureIndex: index,
            measureIndex: currentMeasure.getIndex(),
          }),
        });
      }

      remaining -= required;
      data.push({ measure: currentMeasure, minRequiredWidth: required });

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
