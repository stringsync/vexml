import type { Rect } from '../core/geometry/index.js';
import type { Element } from './element.js';
export interface HitTester {
    hitTest(point: {
        x: number;
        y: number;
    }): Element | null;
    hitTestAll(point: {
        x: number;
        y: number;
    }): Element[];
    hitTestWithin(rect: Rect): Element[];
}
