import * as spatial from '@/spatial';
import * as elements from '@/elements';
import * as util from '@/util';
import { Duration } from './duration';
import { Sequence } from './sequence';
import { SequenceEntry } from './types';

type System = {
  yRange: util.NumberRange;
  entries: SequenceEntry[];
};

export class TimestampLocator {
  private constructor(private systems: System[]) {}

  static create(score: elements.Score, sequences: Sequence[]): TimestampLocator {
    const systems = score.getSystems().map((system) => {
      const yRange = new util.NumberRange(system.rect().getMinY(), system.rect().getMaxY());

      const entries = new Array<SequenceEntry>();
      for (const sequence of sequences) {
        entries.push(
          ...sequence.getEntries().filter((entry) => entry.mostRecentElement.getSystemIndex() === system.getIndex())
        );
      }

      return { yRange, entries };
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
        const startMs = entry.durationRange.getStart().ms;
        const stopMs = entry.durationRange.getEnd().ms;
        const alpha = (point.x - entry.xRange.getStart()) / entry.xRange.getSize();
        const timestampMs = util.lerp(startMs, stopMs, alpha);
        return Duration.ms(timestampMs);
      }
    }
    return null;
  }
}
