import { disposables } from "./disposables";
import type { Resource } from "./resource";

/** A stack of resources, released in reverse order of registration. */
export class Disposer implements Resource {
	private resources = [] as Resource[];
	private _disposed = false;

	get disposed(): boolean {
		return this._disposed;
	}

	use<T extends Resource>(resource: T): T {
		this.assertOpen();
		this.resources.push(resource);
		return resource;
	}

	adopt<T>(value: T, dispose: (value: T) => void): T {
		this.assertOpen();
		this.resources.push(disposables.callback(() => dispose(value)));
		return value;
	}

	defer(onDispose: () => void): void {
		this.assertOpen();
		this.resources.push(disposables.callback(onDispose));
	}

	/** Releases in reverse order, so a resource outlives whatever it depends on. */
	dispose(): void {
		if (this._disposed) {
			return;
		}
		this._disposed = true;
		let resource = this.resources.pop();
		while (resource) {
			resource.dispose();
			resource = this.resources.pop();
		}
	}

	private assertOpen(): void {
		if (this._disposed) {
			throw new Error("cannot register a resource on a disposed Disposer");
		}
	}
}
