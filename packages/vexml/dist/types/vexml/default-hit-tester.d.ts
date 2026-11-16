import type { QuadTree } from '../core/geometry/index.js';
import { Rect } from '../core/geometry/index.js';
import type { Element } from './element.js';
import type { HitTester } from './hit-tester.js';
export declare class DefaultHitTester implements HitTester {
    private readonly tree;
    constructor(tree: QuadTree<Element>);
    hitTest(point: {
        x: number;
        y: number;
    }): Element | null;
    hitTestAll(point: {
        x: number;
        y: number;
    }): Element[];
    hitTestWithin(rect: Rect): Element[];
    private byPriority;
}
