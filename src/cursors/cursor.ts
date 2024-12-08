import * as rendering from '@/rendering';
import * as playback from '@/playback';
import * as util from '@/util';
import * as spatial from '@/spatial';
import * as events from '@/events';
import { CheapLocator } from './cheaplocator';
import { ExpensiveLocator } from './expensivelocator';

const PART_VERTICAL_SPAN_RENDERINGS = [
  'stave',
  'stavenote',
  'stavechord',
  'gracenote',
  'gracechord',
  'tabnote',
  'tabchord',
  'tabgracenote',
  'tabgracechord',
  'rest',
] as const;

const SYSTEM_VERTICAL_SPAN_RENDERINGS = ['measure'] as const;

type CursorState = {
  index: number;
  hasNext: boolean;
  hasPrevious: boolean;
  systemRect: spatial.Rect | null;
  partRect: spatial.Rect | null;
  sequenceEntry: playback.SequenceEntry;
};

type EventMap = {
  change: CursorState;
};

export class Cursor {
  private states: CursorState[];
  private sequence: playback.Sequence;
  private cheapLocator: CheapLocator;
  private expensiveLocator: ExpensiveLocator;

  private topic = new events.Topic<EventMap>();
  private index = 0;

  private constructor(
    states: CursorState[],
    sequence: playback.Sequence,
    cheapLocator: CheapLocator,
    expensiveLocator: ExpensiveLocator
  ) {
    this.states = states;
    this.sequence = sequence;
    this.cheapLocator = cheapLocator;
    this.expensiveLocator = expensiveLocator;
  }

  static create(score: rendering.ScoreRendering, partId: string, sequence: playback.Sequence): Cursor {
    const query = rendering.Query.of(score).where(rendering.filters.forPart(partId));

    const systemIndexes = query.select('system').map((system) => system.index);

    const partRects = systemIndexes.map((systemIndex) => {
      const rects = query
        .where(rendering.filters.forSystem(systemIndex))
        .select(...PART_VERTICAL_SPAN_RENDERINGS)
        .map(rendering.InteractionModel.create)
        .map((model) => model.getBoundingBox());
      return { systemIndex, rect: spatial.Rect.merge(rects) };
    });

    const systemRects = systemIndexes.map((systemIndex) => {
      const rects = query
        .where(rendering.filters.forSystem(systemIndex))
        .select(...SYSTEM_VERTICAL_SPAN_RENDERINGS)
        .map(rendering.InteractionModel.create)
        .map((model) => model.getBoundingBox());
      return { systemIndex, rect: spatial.Rect.merge(rects) };
    });

    const states = new Array<CursorState>(sequence.getLength());
    for (let index = 0; index < sequence.getLength(); index++) {
      const sequenceEntry = sequence.getEntry(index);
      util.assertNotNull(sequenceEntry);

      const hasPrevious = index > 0;
      const hasNext = index < sequence.getLength() - 1;

      const systemIndex = sequenceEntry.interactables.at(0)?.address.getSystemIndex();
      const partRect = partRects.find((rect) => rect.systemIndex === systemIndex)?.rect ?? null;
      const systemRect = systemRects.find((rect) => rect.systemIndex === systemIndex)?.rect ?? null;

      states[index] = { index, hasPrevious, hasNext, systemRect, partRect, sequenceEntry };
    }

    const cheapLocator = new CheapLocator(sequence);
    const expensiveLocator = new ExpensiveLocator(sequence);

    return new Cursor(states, sequence, cheapLocator, expensiveLocator);
  }

  getState(): CursorState {
    return this.states[this.index];
  }

  next(): void {
    this.update(this.index + 1);
  }

  previous(): void {
    this.update(this.index - 1);
  }

  goTo(index: number): void {
    this.update(index);
  }

  seek(timeMs: number): void {
    timeMs = util.clamp(0, this.sequence.getDuration().ms, timeMs);
    const time = playback.Duration.ms(timeMs);
    const index = this.cheapLocator.setStartingIndex(this.index).locate(time) ?? this.expensiveLocator.locate(time);
    if (typeof index !== 'number') {
      throw new Error(`locator coverage is insufficient to locate time ${timeMs}`);
    }
    this.update(index);
  }

  addEventListener<N extends keyof EventMap>(name: N, listener: events.EventListener<EventMap[N]>): number {
    return this.topic.subscribe(name, listener);
  }

  removeEventListener(...ids: number[]): void {
    for (const id of ids) {
      this.topic.unsubscribe(id);
    }
  }

  private update(index: number): void {
    index = util.clamp(0, this.sequence.getLength() - 1, index);
    if (index !== this.index) {
      this.index = index;
      this.topic.publish('change', this.getState());
    }
  }
}
