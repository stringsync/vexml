import { type Tickable } from 'vexflow/core';
export declare class VoiceArticulationPlacer {
    place(voices: ReadonlyArray<{
        getTickables(): Tickable[];
    }>): void;
    private crowded;
    private onsets;
}
