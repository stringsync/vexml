import { RENDERING_KEY } from './constants';

/*
 * Whether the last session left a render unfinished. Rendering runs on the main thread, so a score
 * that takes minutes freezes the tab, and a reload restores and renders it again: the user is
 * locked out. A flag written before each render and cleared after it outlives a tab that was
 * killed or closed mid-render, so the next load knows not to try again on its own.
 */
export class RenderGuard {
	/* Read once, at load: a flag already set was left by an earlier session. */
	readonly tripped: boolean;

	constructor(private readonly storage: Storage) {
		this.tripped = storage.getItem(RENDERING_KEY) != null;
	}

	/* `id` tells overlapping renders apart: one superseded mid-flight finishes after the render
	 * that replaced it started, and must not clear that render's flag. */
	begin(id: number): void {
		this.storage.setItem(RENDERING_KEY, String(id));
	}

	end(id: number): void {
		if (this.storage.getItem(RENDERING_KEY) === String(id)) {
			this.storage.removeItem(RENDERING_KEY);
		}
	}
}
