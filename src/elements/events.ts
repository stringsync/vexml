import * as events from '@/events';
import { EventListener } from '@/events';
import { EventMap } from './types';

export class Events {
  private vexmlEventTopic = new events.Topic<EventMap>();
  private nativeEventTopic = new events.Topic<HTMLElementEventMap>();

  addEventListener<N extends keyof EventMap>(type: N, listener: EventListener<EventMap[N]>): number {
    throw new Error('not implemented');
  }

  removeEventListener<N extends keyof EventMap>(type: N, listener: EventListener<EventMap[N]>): void {
    throw new Error('not implemented');
  }

  removeAllEventListeners(): void {
    throw new Error('not implemented');
  }

  dispatchNativeEvent(event: Event): void {
    throw new Error('not implemented');
  }
}
