import * as playback from '@/playback';
import * as events from '@/events';
import * as util from '@/util';
import * as spatial from '@/spatial';

const CURSOR_HEIGHT_PADDING_PX = 12;
const CURSOR_WIDTH_PX = 1.5;

type EventMap = {
  change: CursorState;
};

type CursorState = {
  index: number;
  length: number;
  rect: spatial.Rect | null;
};

type CursorVerticalBoundary = {
  minY: number;
  maxY: number;
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
    const interaction = this.sequence.getInteraction(this.index);
    if (!interaction) {
      return {
        index: this.index,
        length: this.sequence.getLength(),
        rect: null,
      };
    }

    const systemIndex = interaction.voiceEntry.value.address.getSystemIndex();
    if (typeof systemIndex !== 'number') {
      return {
        index: this.index,
        length: this.sequence.getLength(),
        rect: null,
      };
    }

    const cursorVerticalBoundary = this.getCursorVerticalBoundary(systemIndex);
    if (!cursorVerticalBoundary) {
      return {
        index: this.index,
        length: this.sequence.getLength(),
        rect: null,
      };
    }

    const box = interaction.voiceEntry.getBoundingBox();
    const leftX = box.getMinX();
    const rightX = box.getMaxX();

    const x = (leftX + rightX) / 2;
    const y = cursorVerticalBoundary.minY;
    const w = CURSOR_WIDTH_PX;
    const h = cursorVerticalBoundary.maxY - cursorVerticalBoundary.minY;

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

  /** Returns the cursor vertical boundaries for each system index. */
  @util.memoize()
  private getCursorVerticalBoundaries(): CursorVerticalBoundary[] {
    const systemCount = util.max([
      0,
      ...this.sequence
        .getVoiceEntryInteractions()
        .map((interaction) => interaction.value.address.getSystemIndex() ?? 0),
    ]);

    const bounds = new Array<CursorVerticalBoundary>(systemCount);

    for (let systemIndex = 0; systemIndex < systemCount; systemIndex++) {
      const interactions = [
        ...this.sequence.getVoiceEntryInteractions(),
        ...this.sequence.getMeasureInteractions(),
      ].filter((interaction) => interaction.value.address.getSystemIndex() === systemIndex);

      if (interactions.length === 0) {
        bounds[systemIndex] = { minY: 0, maxY: 0 };
        continue;
      }

      const minY = util.min(
        interactions.map((interaction) => interaction.getBoundingBox().getMinY()),
        Number.POSITIVE_INFINITY
      );
      const maxY = util.max(
        interactions.map((interaction) => interaction.getBoundingBox().getMaxY()),
        Number.NEGATIVE_INFINITY
      );

      bounds[systemIndex] = { minY: minY - CURSOR_HEIGHT_PADDING_PX, maxY: maxY + CURSOR_HEIGHT_PADDING_PX };
    }

    return bounds;
  }

  private getCursorVerticalBoundary(systemIndex: number): CursorVerticalBoundary | null {
    return this.getCursorVerticalBoundaries().at(systemIndex) ?? null;
  }

  private update(index: number) {
    if (this.index !== index) {
      this.index = index;
      this.topic.publish('change', this.getCurrent());
    }
  }
}
