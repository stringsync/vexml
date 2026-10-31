import type { AsyncResource } from "./async-resource";

/** A stack of async resources, released in reverse order of registration. */
export class AsyncDisposer implements AsyncResource {
	private resources = [] as AsyncResource[];
	private _disposed = false;
	private disposing: Promise<void> | undefined;

	get disposed(): boolean {
		return this._disposed;
	}

	use<T extends AsyncResource>(resource: T): T {
		this.assertOpen();
		this.resources.push(resource);
		return resource;
	}

	adopt<T>(value: T, disposeAsync: (value: T) => Promise<void>): T {
		this.assertOpen();
		this.resources.push({ disposeAsync: () => disposeAsync(value) });
		return value;
	}

	defer(onDispose: () => Promise<void>): void {
		this.assertOpen();
		this.resources.push({ disposeAsync: onDispose });
	}

	/** Safe to call twice: a second call waits for the first to finish. */
	disposeAsync = (): Promise<void> => {
		// An arrow so it survives being passed as a callback: this is usually
		// handed straight to a shutdown hook.
		this._disposed = true;
		this.disposing ??= this.release();
		return this.disposing;
	};

	private async release(): Promise<void> {
		let resource = this.resources.pop();
		while (resource) {
			await resource.disposeAsync();
			resource = this.resources.pop();
		}
	}

	private assertOpen(): void {
		if (this._disposed) {
			throw new Error("cannot register a resource on a disposed AsyncDisposer");
		}
	}
}
