import { Callback, Events } from './types';

type Subscription<T extends Events, N extends keyof T> = {
  id: number;
  name: N;
  callback: Callback<T[N]>;
};

/** Class that tracks pubsub subscribers. */
export class Topic<T extends Events> {
  private id = 0;
  private subscriptions = new Array<Subscription<T, keyof T>>();

  publish<N extends keyof T>(name: N, payload: T[N]): void {
    this.subscriptions.filter((s) => s.name === name).forEach((s) => s.callback(payload));
  }

  subscribe<N extends keyof T>(name: N, callback: Callback<T[N]>): number {
    const id = this.id++;
    this.subscriptions.push({ id, name, callback: callback as Callback<T[keyof T]> });
    return id;
  }

  unsubscribe(id: number): void {
    this.subscriptions = this.subscriptions.filter((s) => s.id !== id);
  }
}
