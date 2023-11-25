import * as util from '@/util';
import { Config } from './config';
import { Part } from './part';
import { PartRendering } from './part';
import { Address } from './address';

/** The result of rendering a System. */
export type SystemRendering = {
  type: 'system';
  address: Address<'system'>;
  parts: PartRendering[];
};

/**
 * Represents a System in a musical score, a horizontal grouping of staves spanning the width of the viewport or page.
 * Each system contains a segment of musical content from one or more parts, and multiple systems collectively render
 * the entirety of those parts.
 */
export class System {
  private config: Config;
  private address: Address<'system'>;
  private parts: Part[];

  constructor(opts: { config: Config; address: Address<'system'>; parts: Part[] }) {
    this.config = opts.config;
    this.address = opts.address;
    this.parts = opts.parts;
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

    return {
      type: 'system',
      address: this.address,
      parts: partRenderings,
    };
  }

  private getMinRequiredWidth(): number {
    let totalWidth = 0;
    const measureCount = this.getMeasureCount();

    const measureGroups = this.parts.map((part) => part.getMeasures());

    // Iterate over each measure index, accumulating the max width from each measure "column" (across all parts). We
    // can't take the max of the whole part together, because min required width varies for each _measure_ across all
    // parts.
    for (let systemMeasureIndex = 0; systemMeasureIndex < measureCount; systemMeasureIndex++) {
      totalWidth += util.max(
        measureGroups
          .map((measures) => measures[systemMeasureIndex])
          .map((measure) => measure.getMinRequiredWidth(systemMeasureIndex))
      );
    }

    return totalWidth;
  }

  private getMeasureCount(): number {
    return this.parts[0]?.getMeasures().length ?? 0;
  }
}
