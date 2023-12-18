import { System } from './system';
import { Config } from './config';
import * as musicxml from '@/musicxml';
import * as util from '@/util';
import { PartMap } from './types';
import { Measure } from './measure2';

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

  split(width: number): System[] {
    return [];
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
            measure: this.getMeasurePartMap(measureIndex),
            staveLayouts: this.musicXml.staveLayouts,
          },
        })
      );
    }

    return measures;
  }

  private getMeasurePartMap(measureIndex: number): PartMap<musicxml.Measure> {
    const result: PartMap<musicxml.Measure> = {};

    for (const part of this.musicXml.parts) {
      const partId = part.getId();
      const measures = part.getMeasures();
      result[partId] = measures[measureIndex];
    }

    return result;
  }

  private getMeasureCount(): number {
    return util.max(this.musicXml.parts.map((part) => part.getMeasures().length));
  }

  private getPartIds(): string[] {
    throw this.musicXml.parts.map((part) => part.getId());
  }
}
