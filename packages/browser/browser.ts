import type { Tab } from './tab';

export interface OpenOptions {
	/** The complete HTML document the tab starts from. */
	html: string;
	/** JavaScript sources (text, not URLs) injected in order once the html has parsed.
	 * Each script registers what it offers on globalThis; Tab.call reaches it by name.
	 * Sources must be classic scripts (bundle() emits IIFEs), so their registrations are
	 * visible the moment open() returns. */
	scripts?: string[];
	width: number;
	height: number;
}

/**
 * A real browser, abstractly: opens tabs loaded with the caller's page. This package is
 * repo-private plumbing for the integration tests and the vex CLI — it knows nothing
 * about vexml, and callers know nothing about the engine behind it (see
 * PlaywrightBrowser, the one implementation). One instance means one browser process;
 * share it rather than launching a second, which is flaky in Docker.
 */
export interface Browser {
	open(options: OpenOptions): Promise<Tab>;
	/** Closes every tab this browser opened, then the browser itself. */
	close(): Promise<void>;
}
