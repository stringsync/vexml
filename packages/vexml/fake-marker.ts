import type { Rect } from 'webappwiz/geometry';
import type { Marker, MarkerHost } from './marker';

/* Fake fulfilling the Marker seam (preferred over mocks); records where it is shown (null while
 * hidden) and its disposal. Test-only — excluded from the published package via package.json
 * "files". */
export class FakeMarker implements Marker {
	shown: { rect: Rect; color: string } | null = null;
	shows = 0;
	disposed = false;

	show(rect: Rect, color: string): void {
		this.shown = { rect, color };
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

	createMarker(): FakeMarker {
		const marker = new FakeMarker();
		this.created.push(marker);
		return marker;
	}
}
