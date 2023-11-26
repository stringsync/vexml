import * as util from '@/util';
import { Config } from './config';
import { Part } from './part';
import { PartRendering } from './part';
import { Address } from './address';
import { Spanners2 } from './spanners2';

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
  private parts: Part[];

  constructor(opts: { config: Config; address: Address<'system'>; parts: Part[] }) {
    this.config = opts.config;
    this.parts = opts.parts;
  }

  render(opts: {
    x: number;
    y: number;
    spanners: Spanners2;
    width: number;
    isLastSystem: boolean;
    previousSystem: System | null;
    nextSystem: System | null;
  }): SystemRendering {
    const address = Address.system();

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
        address: address.part(),
        spanners: opts.spanners,
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
      address,
      parts: partRenderings,
    };
  }

  private getMinRequiredWidth(): number {
    // This is a dummy "seed" address and spanners used exclusively for measuring. This should be ok since we're only
    // measuring one System, which suggests we're past the seed phase, since that is the phase where systems are
    // created.
    const systemAddress = Address.system();

    let totalWidth = 0;
    const measureCount = this.getMeasureCount();

    const measureGroups = this.parts.map((part) => ({ address: systemAddress.part(), measures: part.getMeasures() }));

    // Iterate over each measure index, accumulating the max width from each measure "column" (across all parts). We
    // can't take the max of the whole part together, because min required width varies for each _measure_ across all
    // parts.
    for (let systemMeasureIndex = 0; systemMeasureIndex < measureCount; systemMeasureIndex++) {
      totalWidth += util.max(
        measureGroups
          .map((data) => ({
            partAddress: data.address,
            previous: data.measures[systemMeasureIndex - 1] ?? null,
            current: data.measures[systemMeasureIndex],
          }))
          .map((measures) =>
            measures.current.getMinRequiredWidth({
              address: measures.partAddress.measure(),
              systemMeasureIndex,
              previousMeasure: measures.previous,
            })
          )
      );
    }

    return totalWidth;
  }

  private getMeasureCount(): number {
    return this.parts[0]?.getMeasures().length ?? 0;
  }
}
