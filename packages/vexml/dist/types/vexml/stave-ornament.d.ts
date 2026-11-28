import { Ornament } from 'vexflow/core';
export declare class StaveOrnament extends Ornament {
    readonly explicitPlacement: boolean;
    constructor(type: string, placement?: 'above' | 'below' | null);
    get isTrill(): boolean;
    getLine(): number;
}
