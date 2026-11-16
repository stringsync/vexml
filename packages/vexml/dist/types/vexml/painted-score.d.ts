import type { ScoreBox } from './score-box.js';
import type { TiledSurface } from './tiled-surface.js';
/**
 * A snapshot `paint` drew. `render` of the same snapshot into the same container takes it over,
 * tiles and all; dispose it instead to clear the container, as when falling back to drawing the
 * score from its file.
 */
export declare class PaintedScore {
    private readonly box;
    private readonly surface;
    private disposed;
    constructor(box: ScoreBox, surface: TiledSurface | null);
    /** Remove what `paint` drew and put back the container's styles. Does nothing once a
     * render has taken the container over, since what was painted is then the Score's. */
    dispose(): void;
}
