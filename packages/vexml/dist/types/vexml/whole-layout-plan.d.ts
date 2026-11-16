import type { LayoutForecast, LayoutPlan } from './layout-plan.js';
import type { ScoreLayout } from './layout-planner.js';
export declare class WholeLayoutPlan implements LayoutPlan {
    readonly layout: ScoreLayout;
    private readonly systemCount;
    constructor(layout: ScoreLayout);
    placedSystems(): number;
    isComplete(): boolean;
    placeThrough(): void;
    complete(): ScoreLayout;
    forecast(): LayoutForecast;
    systemOfMeasure(m: number): number;
}
