import type { StaveSpill } from './spill-tracker.js';
export interface SpillReport {
    observedStaveSpill: ReadonlyMap<number, ReadonlyMap<number, StaveSpill>>;
    observedOverflow: ReadonlyMap<number, number>;
    lyricsStepped: boolean;
    voltasLifted: boolean;
    hairpinsStacked: boolean;
}
export interface PassRevision {
    systemStaveOffsets: Map<number, number[]>;
    needed: boolean;
    grewBy: number;
}
type SpacedOffsetsOptions = {
    plannedBySystem?: ReadonlyMap<number, number[]>;
    fixedBySystem?: ReadonlyMap<number, readonly boolean[]>;
};
export declare class SpillResolver {
    revise(planned: number[], report: SpillReport, systemCount: number, plannedBySystem?: ReadonlyMap<number, number[]>, fixedBySystem?: ReadonlyMap<number, readonly boolean[]>): PassRevision;
    spacedOffsets(planned: number[], spillBySystem: ReadonlyMap<number, ReadonlyMap<number, StaveSpill>>, opts?: SpacedOffsetsOptions): Map<number, number[]>;
    private systemOffsets;
    private worstColumn;
}
export {};
