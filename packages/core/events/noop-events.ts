import type { Events, Unlisten } from "./events";

/** For when something needs an `Events` but nothing will ever be raised. */
export class NoopEvents<T extends Record<string, unknown>>
	implements Events<T>
{
	on(): Unlisten {
		return () => {};
	}

	all(): Unlisten {
		return () => {};
	}
}
