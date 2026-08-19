/* Re-exported so a caller can name what sync()/follow()/observe*() hand back, and the
 * boxes every element reports, without depending on webappwiz directly. */
export type { Resource } from 'webappwiz/disposable';
export { Rect } from 'webappwiz/geometry';
export { ChordDiagram } from './chord-diagram';
export type {
	Config,
	ConfigInput,
	FontConfig,
	FontOverride,
	Gap,
	GapStyle,
	Layout,
	LayoutInput,
	MeasureNumbering,
	PanoramicLayout,
	StandardLayout,
	SystemOverflow,
} from './config';
export { CursorController } from './cursor-controller';
export type { CursorView } from './cursor-view';
export type { Bounded } from './decoration';
export {
	Element,
	type Highlightable,
	isHighlightable,
	isPlayable,
	type Playable,
	type Toggle,
} from './element';
export type { ElementIndex } from './element-index';
export type {
	CursorChangeEvent,
	CursorEventMap,
	CursorVisibilityEvent,
	HoverEvent,
	PointerTargetEvent,
	ScoreEventMap,
	ScoreResizeEvent,
	ScoreScrollEvent,
} from './events';
export type { NoteGlyph } from './geometry-collector';
export type { Layer, LayerKind } from './layer';
export { Measure } from './measure';
export { MeasureBox } from './measure-box';
export { Note } from './note';
export { Part } from './part';
export {
	Playhead,
	type PlayheadOptions,
} from './playhead';
export { render } from './render';
export { type GapInfo, Score } from './score';
export type { Scroller, ScrollerOptions } from './scroller';
export { Sequence, type Step } from './sequence';
export { System } from './system';
export { TabPosition } from './tab-position';
export { Voice } from './voice';
