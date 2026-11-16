import { type Config, type PagedLayout, type PanoramicLayout, type StandardLayout } from './config.js';
export declare function snapshotConfig(config: Config): SnapshotConfig;
export type SnapshotConfig = {
    layout: SnapshotLayout;
    noteSpacing: number;
    softmaxFactor: number;
    systemSpacing: number;
    showPartLabels: boolean;
    showHeader: boolean;
    measureNumbering: Config['measureNumbering'];
    showTabSlideText: boolean;
    tabStemPlacement: Config['tabStemPlacement'];
    showTabs: boolean;
    showNotation: boolean;
    minLastSystemFill: number;
    stretchSingleSystem: boolean;
    maxSystemFill: number;
    fonts: {
        notation: SnapshotFont;
        text: SnapshotFont;
    };
    documentFonts: boolean;
    gaps: SnapshotGap[];
};
type SnapshotLayout = DocumentLayoutKnob<StandardLayout> | PanoramicLayout | DocumentLayoutKnob<PagedLayout>;
type DocumentLayoutKnob<T extends StandardLayout | PagedLayout> = Omit<T, 'documentLayout'> & {
    documentLayout?: 'follow' | 'strict';
};
type SnapshotFont = {
    family: string;
    url: string | null;
};
type SnapshotGap = {
    beforeMeasureIndex: number | null;
    beforeBarIndex: number | null;
    measureIndex: number | null;
    durationMs: number;
    label: string | null;
    minWidth: number | null;
    style: {
        fontFamily: string | null;
        fontSize: number | null;
        fontColor: string | null;
        fill: string | null;
        border: string | null;
    } | null;
};
export {};
