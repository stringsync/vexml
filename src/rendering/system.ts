import * as util from '@/util';
import { Config } from './config';
import { Part } from './part';
import { Measure } from './measure';
import { SystemRendering } from './legacysystem';
import { PartRendering } from './legacypart';

/**
 * Represents a System in a musical score, a horizontal grouping of staves spanning the width of the viewport or page.
 * Each system contains a segment of musical content from one or more parts, and multiple systems collectively render
 * the entirety of those parts.
 */
export class System {
  private config: Config;
  private parts: Part[];

  constructor(opts: { config: Config; parts: Part[] }) {
    System.assertPartsAreValid(opts.parts);

    this.config = opts.config;
    this.parts = opts.parts;
  }

  private static assertPartsAreValid(parts: Part[]): void {
    // Empty Parts means nothing is render for this system.
    if (parts.length === 0) {
      return;
    }

    const measureCounts = new Set(parts.map((part) => part.getMeasures().length));
    if (measureCounts.size > 1) {
      throw new Error('expected parts to have the same measure count');
    }
  }

  render(opts: {
    x: number;
    y: number;
    width: number;
    isLastSystem: boolean;
    previousSystem: System | null;
    nextSystem: System | null;
  }): SystemRendering {
    const minRequiredSystemWidth = this.getMinRequiredWidth();

    const partRenderings = new Array<PartRendering>();

    util.forEachTriple(this.parts, ([previousPart, currentPart, nextPart], { isFirst, isLast }) => {
      if (isFirst) {
        previousPart = util.last(opts.previousSystem?.parts ?? []);
      }
      if (isLast) {
        nextPart = util.first(opts.nextSystem?.parts ?? []);
      }

      const partRendering = currentPart.render({
        x: opts.x,
        y: opts.y,
        isLastSystem: opts.isLastSystem,
        minRequiredSystemWidth,
        targetSystemWidth: opts.width,
        previousPart,
        nextPart,
      });
      partRenderings.push(partRendering);
    });

    return { type: 'system', parts: partRenderings };
  }

  private getMinRequiredWidth(): number {
    let totalWidth = 0;
    const measureCount = this.getMeasureCount();

    const measureGroups = this.parts.map((part) => part.getMeasures());

    // Iterate over each measure index, accumulating the max width from each measure "column" (across all parts). We
    // can't take the max of the whole part together, because min required width varies for each _measure_ across all
    // parts.
    for (let measureIndex = 0; measureIndex < measureCount; measureIndex++) {
      totalWidth += util.max(
        measureGroups
          .map((measures): [currentMeasure: Measure, previousMeasure: Measure | null] => [
            measures[measureIndex],
            measures[measureIndex - 1],
          ])
          .map(([currentMeasure, previousMeasure]) => currentMeasure.getMinRequiredWidth(previousMeasure))
      );
    }

    return totalWidth;
  }

  private getMeasureCount(): number {
    return this.parts[0]?.getMeasures().length ?? 0;
  }
}
