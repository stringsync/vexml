export declare class CssFont {
    readonly style: 'normal' | 'italic' | 'oblique';
    readonly weightName: string;
    readonly weight: number;
    readonly size: string;
    readonly sizePx: number;
    readonly families: readonly string[];
    private constructor();
    static parse(shorthand: string): CssFont | null;
}
