export interface FollowCursor {
	isFullyVisible(): boolean;
	scrollIntoView(opts: { behavior: 'smooth' }): void;
}

/** Brings the playhead into view only while something is following it (playback, a scrub), so
 * manual scrolling while paused never pulls the reader back to the playhead. */
export class PlayheadFollow {
	constructor(private readonly cursor: FollowCursor) {}

	update(following: boolean): void {
		if (following && !this.cursor.isFullyVisible()) {
			this.cursor.scrollIntoView({ behavior: 'smooth' });
		}
	}
}
