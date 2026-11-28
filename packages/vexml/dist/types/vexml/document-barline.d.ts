import { Barline, type Stave, type StaveModifier, StaveModifierPosition } from 'vexflow/core';
export declare class DocumentBarline extends Barline {
    private connectedSpacing;
    connectTo(top: Stave): void;
    drawVerticalBar(stave: Stave, x: number, double?: boolean): void;
    drawVerticalEndBar(stave: Stave, x: number): void;
    drawRepeatBar(stave: Stave, x: number, begin: boolean): void;
}
export declare function useDocumentBarlines(stave: Stave, modifiers: StaveModifier[]): void;
export declare function alignBarline(stave: Stave, top: Stave, position?: StaveModifierPosition): void;
