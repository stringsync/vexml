import { Beam, type RenderContext } from 'vexflow/core';
export declare class SpacedBeam extends Beam {
    private distance;
    setDistance(distance: number | null): this;
    levelDistance(): number;
    protected levelOffset(level: number, _x: number): number;
    calculateFlatSlope(): void;
    applyStemExtensions(): void;
    protected drawBeamLines(ctx: RenderContext): void;
}
