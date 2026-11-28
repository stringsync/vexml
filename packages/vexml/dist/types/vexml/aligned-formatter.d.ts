import { type AlignmentTickContexts, Formatter, type Voice } from 'vexflow/core';
export declare class AlignedFormatter extends Formatter {
    createModifierContexts(voices: Voice[]): void;
    createTickContexts(voices: Voice[]): AlignmentTickContexts;
}
