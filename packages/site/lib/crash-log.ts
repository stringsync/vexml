const KEY = 'vexml:breadcrumb';

/* What the page looked like at its last sample: enough to tell an out-of-memory kill apart from
 * anything else, and to point at what drove it. */
export interface Breadcrumb {
	at: string;
	fixture: string;
	/* Bitmap memory of the canvases in the DOM (4 bytes a pixel). Detached ones awaiting GC are
	 * invisible here, which is why `renders` rides along. */
	canvasMb: number;
	canvases: number;
	renders: number;
	lastInput: string;
	/* Pointer and key events in the last second: how hard the user was driving it. */
	inputsPerSecond: number;
	userAgent: string;
}

type Stored = Breadcrumb & { clean: boolean };

/*
 * A breadcrumb that outlives the page. iOS kills a tab that runs out of memory without an error
 * or an unload anyone can hook, then reloads it. So the page keeps writing its latest state and
 * marks it clean on the way out (pagehide); a breadcrumb still unclean on the next load is the
 * last thing the page did before it died.
 */
export class CrashLog {
	/* The previous page's last breadcrumb, if that page never exited cleanly. */
	readonly previous: Breadcrumb | null;

	constructor(
		private readonly storage: Pick<
			Storage,
			'getItem' | 'setItem' | 'removeItem'
		>,
	) {
		this.previous = this.readUnclean();
		this.storage.removeItem(KEY);
	}

	record(crumb: Breadcrumb): void {
		this.write({ ...crumb, clean: false });
	}

	exitCleanly(): void {
		const raw = this.storage.getItem(KEY);
		if (raw) {
			this.write({ ...(JSON.parse(raw) as Stored), clean: true });
		}
	}

	private write(stored: Stored): void {
		try {
			this.storage.setItem(KEY, JSON.stringify(stored));
		} catch {
			// A full or blocked storage only loses the breadcrumb.
		}
	}

	private readUnclean(): Breadcrumb | null {
		const raw = this.storage.getItem(KEY);
		if (!raw) {
			return null;
		}
		try {
			const { clean, ...crumb } = JSON.parse(raw) as Stored;
			return clean ? null : crumb;
		} catch {
			return null;
		}
	}
}
