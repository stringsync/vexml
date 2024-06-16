import { EventListener, AnyEventMap } from './types';

export type Subscription<T extends AnyEventMap, N extends keyof T> = {
  id: number;
  name: N;
  listener: EventListener<T[N]>;
};

/** Class that tracks pubsub subscribers. */
export class Topic<T extends AnyEventMap> {
  private id = 0;
  private subscriptions = new Array<Subscription<T, keyof T>>();

  hasSubscribers<N extends keyof T>(name: N): boolean {
    return this.subscriptions.some((s) => s.name === name);
  }

  publish<N extends keyof T>(name: N, payload: T[N]): void {
    this.subscriptions.filter((s) => s.name === name).forEach((s) => s.listener(payload));
  }

  subscribe<N extends keyof T>(name: N, listener: EventListener<T[N]>): number {
    const id = this.id++;
    this.subscriptions.push({ id, name, listener: listener as EventListener<T[keyof T]> });
    return id;
  }

  unsubscribe(id: number): Subscription<T, keyof T> | null {
    const subscription = this.subscriptions.find((s) => s.id === id) ?? null;
    this.subscriptions = this.subscriptions.filter((s) => s.id !== id);
    return subscription;
  }

  unsubscribeAll(): void {
    this.subscriptions = [];
  }
}
