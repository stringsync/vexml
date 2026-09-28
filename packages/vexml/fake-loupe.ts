import { type Loupe, type LoupeOptions, resolveLoupeOptions } from './loupe';
import type { MarkerRect } from './marker';

/* Fake fulfilling the Loupe seam (preferred over mocks); records its options, where it is shown
 * (null while hidden) and its disposal. Test-only — excluded from the published package via
 * package.json "files". */
export class FakeLoupe implements Loupe {
	shown: {
		anchor: MarkerRect;
		at: { x: number; y: number } | undefined;
	} | null = null;
	disposed = false;

	constructor(public options: Required<LoupeOptions>) {}

	show(anchor: MarkerRect, at?: { x: number; y: number }): void {
		this.shown = { anchor, at };
	}

	hide(): void {
		this.shown = null;
	}

	configure(options: LoupeOptions): void {
		this.options = resolveLoupeOptions(this.options, options);
	}

	dispose(): void {
		this.disposed = true;
	}
}
