import * as spatial from '@/spatial';
import * as rendering from '@/rendering';
import * as util from '@/util';
import { Duration } from './duration';
import { Sequence } from './sequence';
import { DurationRange } from './durationrange';

type System = {
  index: number;
  yRange: util.NumberRange;
  entries: SystemEntry[];
};

type SystemEntry = {
  xRange: util.NumberRange;
  durationRange: DurationRange;
};

export class TimestampLocator {
  private constructor(private systems: System[]) {}

  static create(opts: { score: rendering.ScoreRendering; sequence: Sequence }): TimestampLocator {
    const systemIndexes = rendering.Query.of(opts.score)
      .select('system')
      .map((system) => system.index);

    const systems = systemIndexes.map((systemIndex) => {
      const rects = rendering.Query.of(opts.score)
        .where(rendering.filters.forSystem(systemIndex))
        .select('measure')
        .map(rendering.InteractionModel.create)
        .map((model) => model.getBoundingBox());

      const rect = spatial.Rect.merge(rects);
      const yRange = new util.NumberRange(rect.getMinY(), rect.getMaxY());

      const entries = new Array<SystemEntry>();

      return { index: systemIndex, yRange, entries };
    });

    return new TimestampLocator(systems);
  }

  locate(point: spatial.Point): Duration | null {
    // Let S be the number of systems and E be the number of entries in a system. The time complexity is O(S*E), but
    // this is ok because we expect S and E to be small and have an upper bound of O(100).
    return null;
  }
}
