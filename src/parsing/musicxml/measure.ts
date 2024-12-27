import * as util from '@/util';
import { Fragment } from './fragment';
import { MeasureEvent, StaveEvent } from './types';
import { Fraction } from '@/util';
import { Signature } from './signature';

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
    return new FragmentFactory(this.initialSignature, this.events, this.partIds).create();
  }

  getLastSignature(): Signature {
    return this.getFragments().at(-1)?.getSignature() ?? this.initialSignature;
  }
}

class FragmentFactory {
  private fragments = new Array<Fragment>();

  constructor(private initialSignature: Signature, private events: MeasureEvent[], private partIds: string[]) {}

  create(): Fragment[] {
    this.fragments = [];

    const eventsByBeat = this.getEventsByBeat();
    const beats = [...eventsByBeat.keys()].sort((a, b) => a.toDecimal() - b.toDecimal());

    let signature = this.initialSignature;
    let buffer = new Array<StaveEvent>();

    for (const beat of beats) {
      const events = eventsByBeat.get(beat);
      util.assertDefined(events);

      const builder = Signature.builder();

      for (const e of events) {
        switch (e.type) {
          case 'note':
            buffer.push(e);
            break;
          case 'measurestyle':
            // We'll handle the measure style more precisely downstream.
            buffer.push(e);
            break;
          case 'attributes':
            builder.addAttributes(e.partId, e.musicXML);
            break;
          case 'metronome':
            builder.addMetronome(e.musicXML);
            break;
        }
      }

      const nextSignature = builder.build();
      if (nextSignature.hasChanges()) {
        this.fragments.push(new Fragment(signature, buffer, this.partIds));
        buffer = [];
        signature = nextSignature;
      }
    }

    if (buffer.length > 0) {
      this.fragments.push(new Fragment(signature, buffer, this.partIds));
    }

    return this.fragments;
  }

  private getEventsByBeat(): Map<Fraction, MeasureEvent[]> {
    const result = new Map<Fraction, MeasureEvent[]>();

    const seen = new Set<MeasureEvent>();

    for (const event of this.events) {
      const beat = event.measureBeat;
      if (!result.has(beat)) {
        result.set(beat, []);
      }

      const events = this.events.filter((e) => e.measureBeat.isEquivalent(beat));
      for (const e of events) {
        seen.add(e);
      }

      result.set(beat, events);
    }

    return result;
  }
}
