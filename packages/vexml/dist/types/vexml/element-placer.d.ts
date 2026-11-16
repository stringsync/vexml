import { type QuadTree } from '../core/geometry/index.js';
import { Barline } from './barline.js';
import { ChordDiagram } from './chord-diagram.js';
import type { Decorations } from './decoration.js';
import type { Element } from './element.js';
import type { RawChordDiagram, RawMeasure, RawNote } from './geometry-collector.js';
import type { MeasureBox } from './measure-box.js';
import type { Note, NoteKey } from './note.js';
import { System } from './system.js';
import type { TabPosition } from './tab-position.js';
import type { Viewport } from './viewport.js';
export interface DrawnSystem {
    measures: readonly RawMeasure[];
    notes: readonly RawNote[];
    chordDiagrams: readonly RawChordDiagram[];
}
export declare class ElementPlacer {
    private readonly tree;
    private readonly noteByKey;
    private readonly tabByKey;
    private readonly boxByIndex;
    private readonly systemByIndex;
    private readonly boxesOfSystem;
    private readonly diagrams;
    private readonly barlines;
    private readonly viewport;
    private readonly decorations;
    private readonly placed;
    constructor(tree: QuadTree<Element>, noteByKey: ReadonlyMap<NoteKey, Note>, tabByKey: ReadonlyMap<NoteKey, TabPosition>, boxByIndex: ReadonlyMap<number, MeasureBox>, systemByIndex: Map<number, System>, boxesOfSystem: Map<number, MeasureBox[]>, diagrams: ChordDiagram[], barlines: Barline[], viewport: Viewport, decorations: Decorations);
    place(system: number, drawn: DrawnSystem): void;
    forecast(forecast: Omit<DrawnSystem, 'chordDiagrams'>, systemCount: number): void;
    private systemAt;
    private insert;
}
