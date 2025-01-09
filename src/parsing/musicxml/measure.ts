import * as data from '@/data';
import * as util from '@/util';
import { Fragment } from './fragment';
import { MeasureEvent, StaveEvent } from './types';
import { Signature } from './signature';
import { MeasureContext, SystemContext } from './contexts';
import { JumpGroup } from './jumpgroup';

export class Measure {
  constructor(
    private initialSignature: Signature,
    private index: number,
    private label: number | null,
    private events: MeasureEvent[],
    private partIds: string[],
    private jumpGroup: JumpGroup
  ) {
    util.assert(
      events.every((e) => e.measureIndex === index),
      'Expected all events to belong to the current measure'
    );
  }

  getEvents(): MeasureEvent[] {
    return this.events;
  }

  parse(systemCtx: SystemContext): data.Measure {
    const measureCtx = new MeasureContext(systemCtx, this.index);

    return {
      type: 'measure',
      label: this.label,
      fragments: this.getFragments().map((fragment) => fragment.parse(measureCtx)),
      jumpGroup: this.jumpGroup.parse(),
    };
  }

  getLastSignature(): Signature {
    return this.getFragments().at(-1)?.getSignature() ?? this.initialSignature;
  }

  @util.memoize()
  private getFragments(): Fragment[] {
    const fragments = new Array<Fragment>();

    const events = this.events.toSorted((a, b) => a.measureBeat.toDecimal() - b.measureBeat.toDecimal());

    // First, get all the unique measure beats that events happen on. When we come across a measure beat, we have to
    // process all the events that happen on that beat before making a decision.
    const measureBeats = util.uniqueBy(events, (e) => e.measureBeat.toDecimal()).map((e) => e.measureBeat);

    // Next, we calculate the fragment boundaries by maintaining a buffer of the next fragment events. When the
    // signature changes, we'll materialize the buffer into a Fragment, then start a new buffer. We'll also do
    // this if the buffer has items after going over all the measure beats.
    let signature = this.initialSignature;
    let buffer = new Array<StaveEvent>();

    for (const measureBeat of measureBeats) {
      const measureBeatEvents = events.filter((e) => measureBeat.toDecimal() === e.measureBeat.toDecimal());

      const builder = Signature.builder().setPreviousSignature(signature);

      // Apply all the signature-changing events.
      for (const event of measureBeatEvents) {
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

      // If the signature changed and there are events in the buffer, materialize a fragment with the **old** signature.
      const nextSignature = builder.build();
      if (nextSignature.hasChanges() && buffer.length > 0) {
        fragments.push(new Fragment(signature, buffer, this.partIds));
        buffer = [];
      }

      signature = nextSignature;

      // Process all the stave events that happen on this measure beat.
      for (const event of measureBeatEvents) {
        switch (event.type) {
          case 'note':
            buffer.push(event);
            break;
          case 'rest':
            buffer.push(event);
            break;
          case 'chord':
            buffer.push(event);
            break;
        }
      }
    }

    if (buffer.length > 0) {
      fragments.push(new Fragment(signature, buffer, this.partIds));
    }

    return fragments;
  }
}
