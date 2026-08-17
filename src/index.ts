/* Re-exported so a caller can name what sync()/follow()/observe*() hand back without
 * depending on webappwiz directly. */
export type { Resource } from 'webappwiz/disposable';
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
export { ChordDiagram } from './elements/chord-diagram';
export type { Bounded } from './elements/decoration/decoration';
export {
	Element,
	type Highlightable,
	isHighlightable,
	isPlayable,
	type Playable,
	type Toggle,
} from './elements/element';
export type { ElementIndex } from './elements/element-index';
export { Measure } from './elements/measure';
export { MeasureBox } from './elements/measure-box';
export { Note } from './elements/note';
export { Part } from './elements/part';
export { System } from './elements/system';
export { TabPosition } from './elements/tab-position';
export { Voice } from './elements/voice';
export type { NoteGlyph } from './engraving/score-drawer';
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
export type { Layer, LayerKind } from './host/layer/layer';
export type { Scroller, ScrollerOptions } from './host/scroller/scroller';
export type { Listenable } from './listenable/listenable';
export { CursorController } from './playback/cursor-controller';
export type { CursorView } from './playback/cursor-view/cursor-view';
export {
	Playhead,
	type PlayheadOptions,
} from './playback/cursor-view/playhead';
export { Sequence, type Step } from './playback/sequence';
export { render } from './render';
export { type GapInfo, Score } from './score';
