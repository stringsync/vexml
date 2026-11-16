import type { Rect } from '../core/geometry/index.js';
import type { Barline } from './barline.js';
import type { ChordDiagram } from './chord-diagram.js';
import type { Element } from './element.js';
import type { HitTester } from './hit-tester.js';
import type { Measure } from './measure.js';
import type { MeasureBox } from './measure-box.js';
import type { Note, NoteKey } from './note.js';
import type { Part } from './part.js';
import type { System } from './system.js';
import type { TabPosition } from './tab-position.js';
export declare class ElementIndex {
    private readonly hitTester;
    private readonly noteByKey;
    private readonly boxByIndex;
    private readonly tabByKey;
    private readonly diagramList;
    private readonly barlineList;
    private readonly partList;
    private readonly systemByIndex;
    constructor(hitTester: HitTester, noteByKey: ReadonlyMap<NoteKey, Note>, boxByIndex: ReadonlyMap<number, MeasureBox>, tabByKey: ReadonlyMap<NoteKey, TabPosition>, diagramList: readonly ChordDiagram[], barlineList: readonly Barline[], partList: readonly Part[], systemByIndex: ReadonlyMap<number, System>);
    all(): Element[];
    notes(): Note[];
    measures(): Measure[];
    measureBoxes(): MeasureBox[];
    barlines(): Barline[];
    tabPositions(): TabPosition[];
    chordDiagrams(): ChordDiagram[];
    parts(): Part[];
    systems(): System[];
    at(point: {
        x: number;
        y: number;
    }): Element | null;
    allAt(point: {
        x: number;
        y: number;
    }): Element[];
    within(rect: Rect): Element[];
    get noteLookup(): ReadonlyMap<NoteKey, Note>;
}
