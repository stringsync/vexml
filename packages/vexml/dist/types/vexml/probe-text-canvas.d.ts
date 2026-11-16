import type { PaintProbe } from './paint-probe.js';
export declare class ProbeTextCanvas {
    private readonly probe;
    private state;
    constructor(probe: PaintProbe);
    /** Make this the canvas vexflow measures text on, from now until the next install. */
    install(): void;
    getContext(_kind: '2d'): this;
    get font(): string;
    set font(font: string);
    measureText(text: string): TextMetrics;
}
