import * as playback from '@/playback';
import * as events from '@/events';
type EventMap = {
  change: {
    index: number;
    length: number;
    step: playback.Step | null;
  };
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

  getLength(): number {
    return this.sequence.getLength();
  }

  getCurrentStep(): playback.Step | null {
    return this.sequence.at(this.index);
  }

  getCurrentIndex(): number {
    return this.index;
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
      this.topic.publish('change', {
        index: this.index,
        length: this.getLength(),
        step: this.sequence.at(index) ?? null,
      });
    }
  }
}
