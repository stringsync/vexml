import type { Beam } from 'vexflow/core';
import { SpacedBeam } from './spaced-beam.js';
export type BeamFan = 'accel' | 'rit';
export declare class FeatheredBeam extends SpacedBeam {
    private readonly fan;
    constructor(notes: ConstructorParameters<typeof Beam>[0], autoStem: boolean, fan: BeamFan);
    protected levelOffset(level: number, x: number): number;
}
