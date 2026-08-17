import type { ScrollHost } from './scroll-host';

/* Fake fulfilling the ScrollHost seam (preferred over mocks); records every scrollTo. Score space
 * maps 1:1 onto the scroll content (scale 1, base at the origin) and the visible box is 100x100,
 * so a test's rects read directly as scroll-content target boxes. Test-only — excluded from the
 * published package via package.json "files". */
export class FakeScrollHost implements ScrollHost {
	readonly calls: ScrollToOptions[] = [];
	scroll = { left: 0, top: 0 };

	frame(): { sx: number; sy: number } {
		return { sx: 1, sy: 1 };
	}

	baseOffset(): { left: number; top: number } {
		return { left: 0, top: 0 };
	}

	clientSize(): { width: number; height: number } {
		return { width: 100, height: 100 };
	}

	scrollTo(options: ScrollToOptions): void {
		this.calls.push(options);
	}

	/* The most recent scroll, or undefined before anything scrolled. */
	last(): ScrollToOptions | undefined {
		return this.calls.at(-1);
	}
}
