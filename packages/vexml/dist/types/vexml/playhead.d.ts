import type { CursorView } from './cursor-view.js';
import type { CursorChangeEvent } from './events.js';
import type { Marker } from './marker.js';
export interface PlayheadOptions {
    color?: string;
    widthPx?: number;
}
export declare class Playhead implements CursorView {
    private readonly marker;
    private readonly color;
    private widthPx;
    private visible;
    private event;
    constructor(marker: Marker, opts?: PlayheadOptions);
    /** Hide the bar without detaching its cursor or changing playback position. */
    setVisible(visible: boolean): void;
    /** Change the bar's width (score px) and redraw it where it is, e.g. on a 'resize' that
     * rescaled the score, to keep it a constant on-screen width. */
    setWidthPx(widthPx: number): void;
    render(event: CursorChangeEvent): void;
    dispose(): void;
}
