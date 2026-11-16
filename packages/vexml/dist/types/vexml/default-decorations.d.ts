import { type Resource } from '../core/disposable/index.js';
import type { Decorations } from './decoration.js';
import { DefaultDecoration } from './default-decoration.js';
import type { LayerHost } from './layer-host.js';
export declare class DefaultDecorations implements Decorations, Resource {
    readonly color: DefaultDecoration;
    readonly halo: DefaultDecoration;
    private readonly disposer;
    constructor(host: LayerHost);
    dispose(): void;
}
