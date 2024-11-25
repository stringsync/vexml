import * as events from '@/events';
import * as playback from '@/playback';
import * as spatial from '@/spatial';

// const CURSOR_WIDTH_PX = 1.5;

type EventMap = {
  change: CursorState;
};

type CursorState = {
  index: number;
  length: number;
  rect: spatial.Rect | null;
};

export class DiscreteCursor {
  private index = 0;
  private sequence: playback.Sequence;
  private topic = new events.Topic<EventMap>();

  constructor(sequence: playback.Sequence) {
    this.sequence = sequence;
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

    if (entry.playables.length === 0) {
      return {
        index: this.index,
        length: this.sequence.getLength(),
        rect: null,
      };
    }

    // TODO: Fix this to adhere to the new model.
    // const systemBoundingBoxes: spatial.Rect[] = [
    //   ...entry.system.staveInteractions.map((staveInteraction) => staveInteraction.getBoundingBox()),
    //   ...entry.system.playableInteractions.map((playableInteraction) => playableInteraction.getBoundingBox()),
    // ];
    // const minY = util.min(
    //   systemBoundingBoxes.map((box) => box.getMinY()),
    //   Number.POSITIVE_INFINITY
    // );
    // const maxY = util.max(
    //   systemBoundingBoxes.map((box) => box.getMaxY()),
    //   Number.NEGATIVE_INFINITY
    // );

    // if (!Number.isFinite(minY) || !Number.isFinite(maxY)) {
    //   return {
    //     index: this.index,
    //     length: this.sequence.getLength(),
    //     rect: null,
    //   };
    // }

    // const playableBoundingBox = entry.playables[0].getBoundingBox();
    // const leftX = playableBoundingBox.getMinX();
    // const rightX = playableBoundingBox.getMaxX();

    // const x = (leftX + rightX) / 2;
    // const y = minY;
    // const w = CURSOR_WIDTH_PX;
    // const h = maxY - minY;

    const x = 0;
    const y = 0;
    const w = 0;
    const h = 0;

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

  private update(index: number) {
    if (this.index !== index) {
      this.index = index;
      this.topic.publish('change', this.getCurrent());
    }
  }
}
