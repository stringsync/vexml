import * as playback from '@/playback';
import * as events from '@/events';
import * as util from '@/util';
import * as spatial from '@/spatial';

type EventMap = {
  change: CursorState;
};

type CursorState = {
  index: number;
  length: number;
  rect: spatial.Rect | null;
  interaction: playback.InteractionModelType | null;
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
    const interaction = this.sequence.at(this.index);
    if (!interaction) {
      return {
        index: this.index,
        length: this.sequence.getLength(),
        rect: null,
        interaction: null,
      };
    }

    const systemIndex = interaction.value.address.getSystemIndex();
    if (typeof systemIndex !== 'number') {
      return {
        index: this.index,
        length: this.sequence.getLength(),
        rect: null,
        interaction: null,
      };
    }

    const box = interaction.getBoundingBox();
    const leftX = box.getMinX();
    const rightX = box.getMaxX();
    const topY = box.getMinY();
    const height = this.getCursorHeight(systemIndex);

    return {
      index: this.index,
      length: this.sequence.getLength(),
      rect: new spatial.Rect(leftX, topY, rightX - leftX, height),
      interaction: this.sequence.at(this.index) ?? null,
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

  /** Returns the cursor height for each system index. */
  @util.memoize()
  private getCursorHeights(): number[] {
    const systemCount = util.max([
      0,
      ...this.sequence.getInteractions().map((interaction) => interaction.value.address.getSystemIndex() ?? 0),
    ]);

    const cursorHeights = new Array<number>(systemCount);

    for (let systemIndex = 0; systemIndex < systemCount; systemIndex++) {
      const interactions = this.sequence
        .getInteractions()
        .filter((interaction) => interaction.value.address.getSystemIndex() === systemIndex);

      const minY = util.min(interactions.map((interaction) => interaction.getBoundingBox().getMinY()));
      const maxY = util.max(interactions.map((interaction) => interaction.getBoundingBox().getMaxY()));

      cursorHeights[systemIndex] = maxY - minY;
    }

    return cursorHeights;
  }

  private getCursorHeight(systemIndex: number): number {
    return this.getCursorHeights()[systemIndex];
  }

  private update(index: number) {
    if (this.index !== index) {
      this.index = index;
      this.topic.publish('change', this.getCurrent());
    }
  }
}
