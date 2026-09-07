/* Re-exported so a caller can name what sync()/follow()/observe*() hand back, and the
 * boxes every element reports, without depending on webappwiz directly. */
export type { Resource } from 'webappwiz/disposable';
export { Rect } from 'webappwiz/geometry';
export { ChordDiagram } from './chord-diagram';
export { ChordNoteOrder } from './chord-note-order';
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
export { DefaultEditingBindings } from './default-editing-bindings';
export type {
	EditingBindings,
	EditingCommand,
	EditingKey,
} from './editing-bindings';
export {
	EditingController,
	type EditingControllerDeps,
	type EditingControllerEvents,
	type EditingControllerOptions,
} from './editing-controller';
export type { EditingLayout } from './editing-layout';
export { type EditingNavigation, EditingNavigator } from './editing-navigator';
export type { EditingSessionEvents, EditingVoice } from './editing-session';
export {
	type EditingMove,
	EditingSession,
	type SelectionOptions,
} from './editing-session';
export type { EditingPresentation, EditingView } from './editing-view';
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
export type { Layer, LayerKind } from './layer';
export { Measure, type StaffGeometry } from './measure';
export { MeasureBox } from './measure-box';
export { Note } from './note';
export { Part } from './part';
export type { PitchInput } from './pitch-edit';
export {
	Playhead,
	type PlayheadOptions,
} from './playhead';
export { render } from './render';
export { type GapInfo, Score } from './score';
export { ScoreEditingLayout } from './score-editing-layout';
export type { Scroller, ScrollerOptions } from './scroller';
export {
	SelectionOverlay,
	type SelectionOverlayOptions,
} from './selection-overlay';
export { Sequence, type Step } from './sequence';
export { System } from './system';
export { TabPosition } from './tab-position';
export { Voice } from './voice';
