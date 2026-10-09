import type { ScoreBox } from './score-box';
import type { TiledSurface } from './tiled-surface';

/**
 * A snapshot `paint` drew. `render` of the same snapshot into the same container takes it over,
 * tiles and all; dispose it instead to clear the container, as when falling back to drawing the
 * score from its file.
 */
export class PaintedScore {
	private disposed = false;

	constructor(
		private readonly box: ScoreBox,
		private readonly surface: TiledSurface | null,
	) {}

	/** Remove what `paint` drew and put back the container's styles. Does nothing once a
	 * render has taken the container over, since what was painted is then the Score's. */
	dispose(): void {
		if (this.disposed) {
			return;
		}
		this.disposed = true;
		if (!this.box.isPainted) {
			return;
		}
		this.surface?.dispose();
		this.box.dispose();
	}
}
