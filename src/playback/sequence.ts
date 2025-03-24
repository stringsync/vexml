import * as elements from '@/elements';
import { Duration } from './duration';
import { SequenceEvent } from './types';
import { Logger } from '@/debug';

export class Sequence {
  constructor(private partIndex: number, private events: SequenceEvent[]) {}

  static create(logger: Logger, score: elements.Score): Sequence[] {
    return [new Sequence(0, [])];
  }

  getPartIndex(): number {
    return this.partIndex;
  }

  getEvent(index: number): SequenceEvent | null {
    return this.events.at(index) ?? null;
  }

  getEvents(): SequenceEvent[] {
    return this.events;
  }

  getCount(): number {
    return this.events.length;
  }

  getDuration(): Duration {
    return this.events.at(-1)?.time ?? Duration.zero();
  }
}
