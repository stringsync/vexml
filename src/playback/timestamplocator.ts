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

      for (let index = 0; index < opts.sequence.getLength(); index++) {
        const entry = opts.sequence.getEntry(index);
        util.assertNotNull(entry);
        entries.push({ xRange: entry.xRange, durationRange: entry.durationRange });
      }

      return { index: systemIndex, yRange, entries };
    });

    return new TimestampLocator(systems);
  }

  /**
   * Locates the timestamp at the given point in the score. If a given point is passed multiple times within a playback
   * (e.g. repeats), only the first occurrence will be returned.
   */
  locate(point: spatial.Point): Duration | null {
    // Let S be the number of systems and E be the number of entries in a system. The time complexity is O(S*E), but
    // this is ok because we expect S and E to be small and have an upper bound of O(100).
    for (const system of this.systems) {
      if (!system.yRange.includes(point.y)) {
        continue;
      }
      for (const entry of system.entries) {
        if (!entry.xRange.includes(point.x)) {
          continue;
        }
        const startMs = entry.durationRange.getLeft().ms;
        const stopMs = entry.durationRange.getRight().ms;
        const alpha = (point.x - entry.xRange.getLeft()) / entry.xRange.getSize();
        const timestampMs = util.lerp(startMs, stopMs, alpha);
        return Duration.ms(timestampMs);
      }
    }
    return null;
  }
}
