import type { Marker, MarkerOptions, MarkerRect } from './marker';

/* Fake fulfilling the Marker seam (preferred over mocks); records where it is shown (null while
 * hidden), the z-index it was made at and its disposal. Test-only, excluded from the published
 * package via package.json "files". */
export class FakeMarker implements Marker {
	shown: { rect: MarkerRect; color: string; radius?: number } | null = null;
	shows = 0;
	disposed = false;

	constructor(readonly zIndex?: number) {}

	show(rect: MarkerRect, color: string, opts?: MarkerOptions): void {
		this.shown = { rect, color, radius: opts?.radius };
		this.shows++;
	}

	hide(): void {
		this.shown = null;
	}

	dispose(): void {
		this.disposed = true;
	}
}
