/*
 * What `vex perf --ui` sends its page. Types and constants only, no imports: the page in
 * packages/site imports this file directly, and a browser bundle can't carry node code.
 */

/**
 * The engines the corpus is rendered through. MuseScore sits this out: it renders in
 * Docker and takes seconds per score, so its numbers wouldn't share a scale with these.
 */
export const ENGINES = ['vexml', 'osmd', 'alphatab'] as const;

export type Engine = (typeof ENGINES)[number];

/** What one render produced, or why it produced nothing. */
export type Cell = { ms: number; size: string } | { error: string };

/** `at` is milliseconds since the run started, so a page loaded late can still show elapsed time. */
export type PerfEvent =
	| { type: 'start'; at: number; fixtures: string[] }
	| { type: 'render'; at: number; fixture: string; engine: Engine; cell: Cell }
	| { type: 'done'; at: number };

/** Where the page finds the PNG a render produced. */
export function imagePath(fixture: string, engine: Engine): string {
	return `/api/perf/image/${encodeURIComponent(fixture)}/${engine}.png`;
}

export const EVENTS_PATH = '/api/perf/events';
