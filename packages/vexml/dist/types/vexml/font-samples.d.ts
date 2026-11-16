import type { FontSample } from './font-loader.js';
export declare class FontSamples {
    private readonly chars;
    add(font: string, text: string): void;
    list(): FontSample[];
}
