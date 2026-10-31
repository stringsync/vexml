import type { Resource } from "./resource";

/** Ways of getting a `Resource` when you do not have an object to hand. */
export class disposables {
	private constructor() {}

	static noop(): Resource {
		return disposables.callback(() => {});
	}

	static callback(dispose: () => void): Resource {
		return { dispose };
	}

	static nullable(resource: Resource | null): Resource {
		return resource ?? disposables.noop();
	}
}
