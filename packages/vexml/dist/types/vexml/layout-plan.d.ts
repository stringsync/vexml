import type { MeasureBox, ScoreLayout } from './layout-planner.js';
export interface LayoutPlan {
    readonly layout: ScoreLayout;
    placedSystems(): number;
    isComplete(): boolean;
    placeThrough(system: number): void;
    complete(): ScoreLayout;
    forecast(): LayoutForecast;
    systemOfMeasure(m: number): number;
}
export interface LayoutForecast {
    readonly boxes: readonly (MeasureBox | undefined)[];
    readonly systemCount: number;
    readonly version: number;
}
