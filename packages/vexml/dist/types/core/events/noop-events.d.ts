import type { Events, Unlisten } from "./events.js";
/** For when something needs an `Events` but nothing will ever be raised. */
export declare class NoopEvents<T extends Record<string, unknown>> implements Events<T> {
    on(): Unlisten;
    all(): Unlisten;
}
