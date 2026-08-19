/* Re-exported so a caller can name what sync()/follow()/observe*() hand back without
 * depending on webappwiz directly. */
export type { Resource } from 'webappwiz/disposable';
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
export type { CursorView } from './cursor-view/cursor-view';
export {
	Playhead,
	type PlayheadOptions,
} from './cursor-view/playhead';
export type { Bounded } from './decoration/decoration';
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
export { Rect } from './geometry';
export type { NoteGlyph } from './geometry-collector';
export type { Layer, LayerKind } from './layer/layer';
export { Measure } from './measure';
export { MeasureBox } from './measure-box';
export { Note } from './note';
export { Part } from './part';
export { render } from './render';
export { type GapInfo, Score } from './score';
export type { Scroller, ScrollerOptions } from './scroller/scroller';
export { Sequence, type Step } from './sequence';
export { System } from './system';
export { TabPosition } from './tab-position';
export { Voice } from './voice';
