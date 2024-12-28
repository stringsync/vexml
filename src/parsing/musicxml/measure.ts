import * as util from '@/util';
import { Fragment } from './fragment';
import { MeasureEvent, StaveEvent } from './types';
import { Fraction } from '@/util';
import { Signature } from './signature';

type SignatureRange = {
  signature: Signature;
  start: Fraction;
  end: Fraction;
};

export class Measure {
  constructor(
    private initialSignature: Signature,
    private index: number,
    private label: string,
    private events: MeasureEvent[],
    private partIds: string[]
  ) {
    util.assert(
      events.every((e) => e.measureIndex === index),
      'Expected all events to belong to the current measure'
    );
  }

  getLabel(): string {
    return this.label;
  }

  @util.memoize()
  getFragments(): Fragment[] {
    return this.createFragments();
  }

  getLastSignature(): Signature {
    return this.getFragments().at(-1)?.getSignature() ?? this.initialSignature;
  }

  private createFragments(): Fragment[] {
    const ranges = this.getSignatureRanges();

    const fragments = new Array<Fragment>();

    let index = 0;
    const events = this.events.filter((e): e is StaveEvent => e.type === 'note');

    for (const range of ranges) {
      const fragmentEvents = new Array<StaveEvent>();
      while (events.at(index)?.measureBeat.isLessThanOrEqualTo(range.end)) {
        fragmentEvents.push(events[index]);
        index++;
      }
      fragments.push(new Fragment(range.signature, fragmentEvents, this.partIds));
    }

    // Ensure that we always have at least one fragment.
    if (fragments.length === 0) {
      return [new Fragment(this.initialSignature, [], this.partIds)];
    }

    return fragments;
  }

  private getUniqueMeasureBeats(): Fraction[] {
    const measureBeats = new Array<Fraction>();

    // Let N be the number of events. This is O(N^2) but N should be small.
    for (const event of this.events) {
      const hasEquivalent = measureBeats.some((m) => m.isEquivalent(event.measureBeat));
      if (!hasEquivalent) {
        measureBeats.push(event.measureBeat);
      }
    }

    return measureBeats;
  }

  private getSignatureRanges(): Array<SignatureRange> {
    const ranges = new Array<SignatureRange>();

    let start = new Fraction(0);
    let signature = this.initialSignature;
    const measureBeats = this.getUniqueMeasureBeats();

    for (let index = 0; index < measureBeats.length; index++) {
      const measureBeat = measureBeats[index];

      const builder = Signature.builder().setPreviousSignature(signature);

      // Process all the events that occur at this measure beat.
      const events = this.events.filter((e) => e.measureBeat.isEquivalent(measureBeat));
      for (const event of events) {
        switch (event.type) {
          case 'metronome':
            builder.setMetronome(event.metronome);
            break;
          case 'stavecount':
            builder.addStaveCount(event.staveCount);
            break;
          case 'stavelinecount':
            builder.addStaveLineCount(event.staveLineCount);
            break;
          case 'clef':
            builder.addClef(event.clef);
            break;
          case 'key':
            builder.addKey(event.key);
            break;
          case 'time':
            builder.addTime(event.time);
            break;
        }
      }

      // Build the signature and create a range if it changed.
      const nextSignature = builder.build();
      if (nextSignature.hasChanges()) {
        const end = measureBeat;
        if (!start.isEquivalent(end)) {
          ranges.push({ signature, start, end });
        }
        signature = nextSignature;
        start = end;
      }
    }

    // Ensure that the last range includes the last measure beat to cover everything.
    const lastRange = ranges.at(-1);
    const lastMeasureBeat = measureBeats.at(-1);
    if (lastRange && lastMeasureBeat) {
      lastRange.end = lastMeasureBeat;
    }

    // If there are no ranges, add a single range that covers the entire measure.
    if (ranges.length === 0 && lastMeasureBeat) {
      ranges.push({ signature, start, end: lastMeasureBeat });
    }

    return ranges;
  }
}
