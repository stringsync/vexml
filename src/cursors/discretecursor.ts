import * as events from '@/events';
import * as playback from '@/playback';
import * as spatial from '@/spatial';
import * as rendering from '@/rendering';
import * as util from '@/util';

const CURSOR_WIDTH_PX = 1.5;

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

type EventMap = {
  change: CursorState;
};

type CursorState = {
  index: number;
  length: number;
  rect: spatial.Rect | null;
};

export class DiscreteCursor {
  private score: rendering.ScoreRendering;
  private span: rendering.CursorVerticalSpan;
  private sequence: playback.Sequence;
  private index = 0;
  private topic = new events.Topic<EventMap>();

  constructor(score: rendering.ScoreRendering, sequence: playback.Sequence, span: rendering.CursorVerticalSpan) {
    this.score = score;
    this.sequence = sequence;
    this.span = span;
  }

  getPartId(): string {
    return this.sequence.getPartId();
  }

  getCurrent(): CursorState {
    const entry = this.sequence.getEntry(this.index);
    if (!entry) {
      return {
        index: this.index,
        length: this.sequence.getLength(),
        rect: null,
      };
    }

    if (entry.interactables.length === 0) {
      return {
        index: this.index,
        length: this.sequence.getLength(),
        rect: null,
      };
    }

    const systemIndex = entry.interactables[0].address.getSystemIndex()!;
    const systemRect = this.getVerticalSpanRect(systemIndex);
    const playableRect = rendering.InteractionModel.create(entry.interactables[0]).getBoundingBox();

    const x = playableRect.center().x;
    const y = systemRect.y;
    const w = CURSOR_WIDTH_PX;
    const h = systemRect.h;

    return {
      index: this.index,
      length: this.sequence.getLength(),
      rect: new spatial.Rect(x, y, w, h),
    };
  }

  next(): void {
    if (this.hasNext()) {
      this.update(this.index + 1);
    }
  }

  previous(): void {
    if (this.hasPrevious()) {
      this.update(this.index - 1);
    }
  }

  hasNext(): boolean {
    const length = this.sequence.getLength();
    return length > 1 && this.index < length - 1;
  }

  hasPrevious(): boolean {
    const length = this.sequence.getLength();
    return length > 1 && this.index > 0;
  }

  addEventListener<N extends keyof EventMap>(name: N, listener: events.EventListener<EventMap[N]>): number {
    return this.topic.subscribe(name, listener);
  }

  removeEventListener(...ids: number[]): void {
    for (const id of ids) {
      this.topic.unsubscribe(id);
    }
  }

  @util.memoize()
  private getVerticalSpanRect(systemIndex: number): spatial.Rect {
    const query = rendering.Query.of(this.score)
      .where(rendering.filters.forPart(this.getPartId()))
      .where(rendering.filters.forSystem(systemIndex));

    switch (this.span) {
      case 'part':
        return this.getPartVerticalSpanRect(query);
      case 'system':
        return this.getSystemVerticalSpanRect(query);
    }
  }

  private getPartVerticalSpanRect(query: rendering.Query): spatial.Rect {
    const rects = query
      .select(...PART_VERTICAL_SPAN_RENDERINGS)
      .map(rendering.InteractionModel.create)
      .map((model) => model.getBoundingBox());
    return spatial.Rect.merge(rects);
  }

  private getSystemVerticalSpanRect(query: rendering.Query): spatial.Rect {
    const rects = query
      .select(...SYSTEM_VERTICAL_SPAN_RENDERINGS)
      .map(rendering.InteractionModel.create)
      .map((model) => model.getBoundingBox());
    return spatial.Rect.merge(rects);
  }

  private update(index: number) {
    if (this.index !== index) {
      this.index = index;
      this.topic.publish('change', this.getCurrent());
    }
  }
}
