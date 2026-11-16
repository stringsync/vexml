import type { RenderContext, Stave } from 'vexflow/core';
import { TimeSignature } from 'vexflow/core';
import type { GroupTimeSignature } from './group-time-signature.js';
export declare class GroupTimePlaceholder extends TimeSignature {
    private readonly group;
    constructor(group: GroupTimeSignature, width: number);
    setTimeSig(timeSpec: string): this;
    drawAt(_ctx: RenderContext, _stave: Stave, x: number): void;
}
