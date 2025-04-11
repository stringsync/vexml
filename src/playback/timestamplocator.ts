import * as spatial from '@/spatial';
import * as elements from '@/elements';
import * as util from '@/util';
import { Duration } from './duration';
import { CursorPath } from './cursorpath';
import { CursorFrame } from './types';

type System = {
  yRange: util.NumberRange;
  frames: CursorFrame[];
};

export class TimestampLocator {
  private constructor(private systems: System[]) {}

  static create(score: elements.Score, paths: CursorPath[]): TimestampLocator {
    const systems = score.getSystems().map((system) => {
      const yRange = new util.NumberRange(system.rect().top(), system.rect().bottom());

      const frames = new Array<CursorFrame>();
      for (const path of paths) {
        frames.push(
          ...path
            .getFrames()
            .filter((frame) =>
              frame.getActiveElements().some((element) => element.getSystemIndex() === system.getIndex())
            )
        );
      }

      return { yRange, frames };
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
      for (const frame of system.frames) {
        if (!frame.xRange.includes(point.x)) {
          continue;
        }
        const startMs = frame.tRange.start.ms;
        const stopMs = frame.tRange.end.ms;
        const alpha = (point.x - frame.xRange.start) / frame.xRange.getSize();
        const timestampMs = util.lerp(startMs, stopMs, alpha);
        return Duration.ms(timestampMs);
      }
    }
    return null;
  }
}
