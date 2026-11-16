import { Rect } from '../core/geometry/index.js';
import { Bend } from 'vexflow/core';
import type { TabBendMark } from './score-reader.js';
export declare class TabBend extends Bend {
    readonly mark: TabBendMark;
    private readonly glyph;
    private readonly down;
    constructor(label: string, mark: TabBendMark);
    private travels;
    stretch(width: number): void;
    inkRect(): Rect;
    draw(): void;
    private leg;
    private legStartX;
    private legsWidth;
    private glyphWidth;
    private glyphInk;
    private heights;
}
