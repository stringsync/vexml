import * as util from '@/util';

type Measure = {
  index: number;
  jumps: Jump[];
};

type Jump = { type: 'repeatstart' } | { type: 'repeatend'; times: number } | { type: 'repeatending'; times: number };

/**
 * A class that iterates over measures in playback order (accounting for repeats and jumps).
 */
export class MeasureSequenceIterator<T extends Measure> implements Iterable<number> {
  private measures: T[];

  constructor(measures: T[]) {
    this.measures = measures;
  }

  [Symbol.iterator](): Iterator<number> {
    const repeats = Repeat.from(this.measures);
    const activeRepeats = new util.Stack<Repeat>();

    function getState() {
      const activeRepeat = activeRepeats.peek();

      const measureRepeats = repeats.filter((repeat) => repeat.to === measureIndex);

      let measureRepeatIndex = measureRepeats.findIndex((repeat) => activeRepeat?.matches(repeat));
      measureRepeatIndex = measureRepeatIndex === -1 ? 0 : measureRepeatIndex;

      const measureRepeat = measureRepeats.at(measureRepeatIndex);
      const nextMeasureRepeat = measureRepeats.at(measureRepeatIndex + 1);

      return { activeRepeat, measureRepeat, nextMeasureRepeat };
    }

    let measureIndex = 0;

    const iterator: Iterator<number> = {
      next: () => {
        // We've reached the end of the measures.
        if (measureIndex >= this.measures.length) {
          return { value: null, done: true };
        }

        const measure = this.measures[measureIndex];

        const { activeRepeat, measureRepeat, nextMeasureRepeat } = getState();

        const isMeasureExcluded = activeRepeat?.isMeasureExcluded(measureIndex);
        if (isMeasureExcluded) {
          measureIndex++;
          return iterator.next();
        }

        const isMeasureRepeatActive = measureRepeat && activeRepeat && measureRepeat.matches(activeRepeat);

        // The measure repeat is active, has finished, and there is another repeat to process.
        if (isMeasureRepeatActive && activeRepeat.isFinished() && nextMeasureRepeat) {
          activeRepeats.pop();
          const nextActiveRepeat = nextMeasureRepeat.clone();
          activeRepeats.push(nextActiveRepeat);
          nextActiveRepeat.decrement();
          measureIndex = nextMeasureRepeat.from;
          return { value: measure.index, done: false };
        }

        // The measure repeat is active, has finished, and there is not another repeat to process.
        if (isMeasureRepeatActive && activeRepeat.isFinished() && !nextMeasureRepeat) {
          activeRepeats.pop();
          measureIndex++;
          return { value: measure.index, done: false };
        }

        // The measure repeat is active and has not finished.
        if (isMeasureRepeatActive && !activeRepeat.isFinished()) {
          activeRepeat.decrement();
          measureIndex = activeRepeat.from;
          return { value: measure.index, done: false };
        }

        // The measure repeat is not active, but it should be.
        if (measureRepeat && !measureRepeat.matches(activeRepeat)) {
          const nextActiveRepeat = measureRepeat.clone();
          activeRepeats.push(nextActiveRepeat);
          nextActiveRepeat.decrement();
          measureIndex = measureRepeat.from;
          return { value: measure.index, done: false };
        }

        // Nothing special to do with this measure, move forward.
        measureIndex++;
        return { value: measure.index, done: false };
      },
    };

    return iterator;
  }
}

/** A class that conveniently wraps repeat metadata. */
class Repeat {
  public readonly from: number;
  public readonly to: number;

  private id: number;
  private times: number;
  private excluding: number[];

  private constructor(opts: { id: number; times: number; from: number; to: number; excluding: number[] }) {
    this.from = opts.from;
    this.to = opts.to;
    this.id = opts.id;
    this.times = opts.times;
    this.excluding = opts.excluding;
  }

  static from(measures: Measure[]): Repeat[] {
    const result = new Array<Repeat>();

    let nextId = 1;
    const startMeasureIndexes = new util.Stack<number>();
    for (let measureIndex = 0; measureIndex < measures.length; measureIndex++) {
      const measure = measures[measureIndex];

      const hasRepeatEnding = measure.jumps.some((jump) => jump.type === 'repeatending');

      for (const jump of measure.jumps) {
        if (jump.type === 'repeatstart') {
          startMeasureIndexes.push(measureIndex);
        }

        // We only process repeatends if there is no repeatending in the same measure.
        if (!hasRepeatEnding && jump.type === 'repeatend') {
          // Not all repeatends have a corresponding repeatstart. Assume they're supposed to repeat from the beginning.
          const startMeasureIndex = startMeasureIndexes.pop() ?? 0;
          result.push(
            new Repeat({
              id: nextId++,
              times: jump.times,
              from: startMeasureIndex,
              to: measureIndex,
              excluding: [],
            })
          );
        }

        if (jump.type === 'repeatending' && jump.times > 0) {
          // Not all repeatendings have a corresponding repeatstart. Assume they're supposed to repeat from the
          // beginning.
          const startMeasureIndex = startMeasureIndexes.pop() ?? 0;
          if (jump.times > 1) {
            result.push(
              new Repeat({
                id: nextId++,
                times: jump.times - 1,
                from: startMeasureIndex,
                to: measureIndex,
                excluding: [],
              })
            );
          }

          // Exclude all the previous repeatendings.
          const excluding = new Array<number>();
          let i = measureIndex;
          while (i > startMeasureIndex && measures[i].jumps.some((jump) => jump.type === 'repeatending')) {
            excluding.push(i);
            i--;
          }

          result.push(
            new Repeat({
              id: nextId++,
              times: 1,
              from: startMeasureIndex,
              to: measureIndex,
              excluding,
            })
          );
        }
      }
    }

    return result;
  }

  matches(repeat: Repeat | undefined): boolean {
    return this.id === repeat?.id;
  }

  isMeasureExcluded(measureIndex: number): boolean {
    return this.excluding.includes(measureIndex);
  }

  isFinished(): boolean {
    return this.times === 0;
  }

  decrement() {
    if (this.times === 0) {
      throw new Error('Cannot decrement a repeat that has already been exhausted.');
    }
    this.times--;
  }

  clone() {
    return new Repeat({
      id: this.id,
      times: this.times,
      from: this.from,
      to: this.to,
      excluding: [...this.excluding],
    });
  }
}
