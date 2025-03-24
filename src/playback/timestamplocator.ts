import * as spatial from '@/spatial';
import * as elements from '@/elements';
import * as util from '@/util';
import { Duration } from './duration';
import { LegacySequence } from './legacysequence';
import { LegacySequenceEntry } from './types';

type System = {
  yRange: util.NumberRange;
  entries: LegacySequenceEntry[];
};

export class TimestampLocator {
  private constructor(private systems: System[]) {}

  static create(score: elements.Score, sequences: LegacySequence[]): TimestampLocator {
    const systems = score.getSystems().map((system) => {
      const yRange = new util.NumberRange(system.rect().top(), system.rect().bottom());

      const entries = new Array<LegacySequenceEntry>();
      for (const sequence of sequences) {
        entries.push(
          ...sequence.getEntries().filter((entry) => entry.anchorElement.getSystemIndex() === system.getIndex())
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
        const startMs = entry.durationRange.start.ms;
        const stopMs = entry.durationRange.end.ms;
        const alpha = (point.x - entry.xRange.start) / entry.xRange.getSize();
        const timestampMs = util.lerp(startMs, stopMs, alpha);
        return Duration.ms(timestampMs);
      }
    }
    return null;
  }
}
