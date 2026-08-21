/**
 * One open tab. The page's document lives in the browser process, not this one, so the
 * only bridge is by name and by value: scripts loaded at open() register functions on
 * globalThis, call() invokes one, and everything crossing either way must be
 * structured-cloneable (a string, a plain object — not a DOM node, not a closure).
 */
export interface Tab {
	/** Invoke `globalThis[name](arg)` inside the page and return its awaited result.
	 * Throws if no script registered `name`. */
	call<T = void>(name: string, arg?: unknown): Promise<T>;
	/** Screenshot the element `selector` matches, as a PNG. */
	screenshot(selector: string): Promise<Buffer>;
	/** Resize the tab's viewport. */
	resize(width: number, height: number): Promise<void>;
	close(): Promise<void>;
}
