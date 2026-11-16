import type { Note as VexNote } from 'vexflow/core';
import { Stroke } from 'vexflow/core';
export declare class UnbrokenArpeggio extends Stroke {
    private readonly below;
    private drawsLine;
    join(lower: UnbrokenArpeggio, lowerNote: VexNote): void;
    draw(): void;
}
