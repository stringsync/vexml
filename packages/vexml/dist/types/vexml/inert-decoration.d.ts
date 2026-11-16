import type { Decoratable, Decoration } from './decoration.js';
export declare class InertDecoration implements Decoration {
    set(_target: Decoratable, _color: string | null): void;
    has(_target: Decoratable): boolean;
}
