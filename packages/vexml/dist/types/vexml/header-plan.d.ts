import type { Config } from './config.js';
import type { ScoreHeader } from './score-reader.js';
export type HeaderLine = {
    text: string;
    size: number;
    weight: 'bold' | 'normal';
    align: 'left' | 'center' | 'right';
    x: number;
    baseline: number;
    glyph?: boolean;
};
export declare class HeaderPlan {
    private readonly header;
    private constructor();
    static of(config: Config, header: ScoreHeader | null): HeaderPlan | null;
    height(width: number): number;
    footer(width: number): {
        lines: HeaderLine[];
        height: number;
    };
    lines(width: number): HeaderLine[];
    private creditWidth;
    private stack;
}
