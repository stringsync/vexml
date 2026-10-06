import { FakeMarker } from './fake-marker';
import type { MarkerHost } from './marker';

/* Fake fulfilling the MarkerHost seam; keeps every marker it made. */
export class FakeMarkerHost implements MarkerHost {
	readonly created: FakeMarker[] = [];

	createMarker(zIndex?: number): FakeMarker {
		const marker = new FakeMarker(zIndex);
		this.created.push(marker);
		return marker;
	}
}
