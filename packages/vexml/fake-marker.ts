import type { Marker, MarkerHost, MarkerOptions, MarkerRect } from './marker';

/* Fake fulfilling the Marker seam (preferred over mocks); records where it is shown (null while
 * hidden), the z-index it was made at and its disposal. Test-only — excluded from the published
 * package via package.json "files". */
export class FakeMarker implements Marker {
	shown: { rect: MarkerRect; color: string; radius?: number } | null = null;
	shows = 0;
	disposed = false;

	constructor(readonly zIndex?: number) {}

	show(rect: MarkerRect, color: string, options?: MarkerOptions): void {
		this.shown = { rect, color, radius: options?.radius };
		this.shows++;
	}

	hide(): void {
		this.shown = null;
	}

	dispose(): void {
		this.disposed = true;
	}
}

/* Fake fulfilling the MarkerHost seam; keeps every marker it made. */
export class FakeMarkerHost implements MarkerHost {
	readonly created: FakeMarker[] = [];

	createMarker(zIndex?: number): FakeMarker {
		const marker = new FakeMarker(zIndex);
		this.created.push(marker);
		return marker;
	}
}
