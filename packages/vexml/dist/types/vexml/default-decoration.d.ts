import type { Resource } from '../core/disposable/index.js';
import type { Decoratable, Decoration } from './decoration.js';
import type { DecorationStyle } from './decoration-style.js';
import type { LayerHost } from './layer-host.js';
export declare class DefaultDecoration implements Decoration, Resource {
    private readonly host;
    private readonly style;
    private readonly active;
    private layer;
    constructor(host: LayerHost, style: DecorationStyle);
    set(target: Decoratable, color: string | null): void;
    has(target: Decoratable): boolean;
    dispose(): void;
    private repaint;
}
