export type StemDirection = 'up' | 'down';
export declare function stemFromKeyLines(lines: readonly number[]): StemDirection;
export interface StemEntry<T> {
    readonly key: T;
    readonly onset: number;
    /** Known stem direction from an explicit `<stem>`, beam, or non-middle-line pitch. */
    readonly direction?: StemDirection;
    /** True for an unbeamed single note on the middle line whose stem is open. */
    readonly onMiddleLine: boolean;
}
export interface MeterGrouping {
    /** Quarter-note beats per beat (1 in 4/4, 1.5 in 6/8). */
    readonly beat: number;
    /** Quarter-note beats in the bar (0 when unmetered). */
    readonly bar: number;
}
export declare function resolveMiddleLineStems<T>(entries: readonly StemEntry<T>[], meter: MeterGrouping): Map<T, StemDirection>;
