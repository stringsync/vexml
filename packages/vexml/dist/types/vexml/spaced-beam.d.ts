import { Beam, type RenderContext } from 'vexflow/core';
export declare class SpacedBeam extends Beam {
    private distance;
    setDistance(distance: number | null): this;
    levelDistance(): number;
    protected levelOffset(level: number, _x: number): number;
    calculateSlope(): void;
    private engraveSlope;
    private engraveKneed;
    private slightlySlanted;
    calculateFlatSlope(): void;
    private gouldFlatBeamOffset;
    private beamDepth;
    private noteBeamTipY;
    private tremoloOutwardShift;
    private extendFlatOffsetForTremolos;
    applyStemExtensions(): void;
    protected drawBeamLines(ctx: RenderContext): void;
}
