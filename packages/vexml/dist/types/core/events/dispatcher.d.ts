import type { Resource } from "../disposable/index.js";
import type { AnyListener, Events, Listener, ListenerOptions, Unlisten } from "./events.js";
/**
 * Raises typed events. The owner keeps the dispatcher and calls `dispatch`;
 * everyone else gets `events` and can only listen.
 */
export declare class Dispatcher<T extends Record<string, unknown>> implements Events<T>, Resource {
    readonly events: Events<T>;
    private scopedEntries;
    private universalEntries;
    private nextId;
    private nextOrder;
    on<K extends keyof T>(type: K, listener: Listener<T[K]>, opts?: ListenerOptions): Unlisten;
    all<K extends keyof T>(typeListener: AnyListener<K, T[K]>, opts?: ListenerOptions): Unlisten;
    dispatch<K extends keyof T>(type: K, ...args: T[K] extends undefined ? [] : [event: T[K]]): void;
    dispose(): void;
    private off;
}
