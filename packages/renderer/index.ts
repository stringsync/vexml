/*
 * Repo-private rendering: MusicXML in, pixels out, through any of four engines —
 * without callers knowing what runs underneath (a browser for vexml/OSMD/alphaTab,
 * Docker for MuseScore). `renderers` is the surface; everything else here is types.
 */
export type {
	AlphatabApi,
	AlphatabContext,
	AlphatabInput,
} from './alphatab-renderer';
export type { MusescoreInput } from './musescore-renderer';
export type { OsmdApi, OsmdContext, OsmdInput } from './osmd-renderer';
export type {
	EvalRenderer,
	Image,
	Renderer,
	RenderResult,
} from './renderer';
export { dimensions } from './renderer';
export { renderers } from './renderers';
export type { VexmlContext, VexmlInput } from './vexml-renderer';
