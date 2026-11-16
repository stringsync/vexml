import type { Decoratable, Decoration } from './decoration.js';
export declare class Toggle {
    private readonly target;
    private readonly decoration;
    constructor(target: Decoratable, decoration: Decoration);
    on(color: string): void;
    off(): void;
    get active(): boolean;
}
