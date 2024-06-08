import { EventCallback, EventMap } from './types';

type Subscription<T extends EventMap, N extends keyof T> = {
  id: number;
  name: N;
  callback: EventCallback<T[N]>;
};

/** Class that tracks pubsub subscribers. */
export class Topic<T extends EventMap> {
  private id = 0;
  private subscriptions = new Array<Subscription<T, keyof T>>();

  publish<N extends keyof T>(name: N, payload: T[N]): void {
    this.subscriptions.filter((s) => s.name === name).forEach((s) => s.callback(payload));
  }

  subscribe<N extends keyof T>(name: N, callback: EventCallback<T[N]>): number {
    const id = this.id++;
    this.subscriptions.push({ id, name, callback: callback as EventCallback<T[keyof T]> });
    return id;
  }

  unsubscribe(id: number): void {
    this.subscriptions = this.subscriptions.filter((s) => s.id !== id);
  }
}
