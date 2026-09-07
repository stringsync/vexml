export interface FollowCursor {
	isFullyVisible(): boolean;
	scrollIntoView(opts: { behavior: 'smooth' }): void;
}

/** Manual scrolling while paused never pulls the reader back to the playhead. */
export class PlayheadFollow {
	constructor(private readonly cursor: FollowCursor) {}

	update(playing: boolean): void {
		if (playing && !this.cursor.isFullyVisible()) {
			this.cursor.scrollIntoView({ behavior: 'smooth' });
		}
	}
}
