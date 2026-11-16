import type { Part as MPart } from '@stringsync/mdom';
import type { Decorations } from './decoration.js';
import { ElementIndex } from './element-index.js';
import type { ElementModel } from './element-model.js';
import { ElementPlacer } from './element-placer.js';
import type { RawGeometry } from './score-drawer.js';
import type { Viewport } from './viewport.js';
export declare class ElementFactory {
    model(geometry: RawGeometry, parts: MPart[]): ElementModel;
    build(model: ElementModel, viewport: Viewport, decorations: Decorations): ElementIndex;
    buildPlaceable(model: ElementModel, viewport: Viewport, decorations: Decorations): {
        elements: ElementIndex;
        placer: ElementPlacer;
    };
    private link;
}
