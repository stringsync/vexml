import type { Events } from "./events";

/** Something that raises events, exposing only the read side. */
export interface Eventful<EventMap extends Record<string, unknown>> {
	readonly events: Events<EventMap>;
}

/** The event map of an `Eventful`, for constraining event names to its own. */
export type EventMapOf<T extends Eventful<Record<string, unknown>>> =
	T extends Eventful<infer E> ? E : never;
