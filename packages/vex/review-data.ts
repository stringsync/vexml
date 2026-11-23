import type { PixelBox, ScoreLayout } from '@vexml/renderer';

// What `vex review`'s page and server share: the page's data, the review the person
// writes on it, what a mark covers in the score, and the message that hands the review
// to the agent. Browser-safe: types and pure functions only.

/** Where the page reads its data, and reads and saves the review, when vex serves it. */
export const DATA_PATH = '/api/review/data';
export const STATE_PATH = '/api/review/state';
export const IMAGE_PATH = '/api/review/image';

/** Optional ordering headers on PUT `/api/review/state`, so out-of-order requests never clobber newer state. */
export const CLIENT_HEADER = 'x-review-client';
export const SEQ_HEADER = 'x-review-seq';

/** The three images a moved snapshot has, each the size of the snapshot. */
export const PANELS = ['before', 'diff', 'after'] as const;
export type Panel = (typeof PANELS)[number];

/** The review page's payload: metadata, snapshots, and any threads carried from earlier versions. */
export interface ReviewData {
	/** The review's name, shared by every version. */
	id: string;
	/** Bumped each time `vex review` builds the page again under the same name. */
	version: number;
	title: string;
	/** The trade-offs write-up, as HTML. */
	tradeoffs: string | null;
	/** Snapshots that still match, for the counts. */
	unchanged: number | null;
	/** Snapshots to review, failing marks and largest changes first. */
	entries: ReviewEntry[];
	/** Whether the page saves to a running server (`served`) or copies the review out (`static`). */
	mode: 'served' | 'static';
	/** Open threads carried from earlier versions, keyed by snapshot name. */
	threads?: Record<string, Thread[]>;
	/** Snapshots with open threads that no longer moved, so the change settled them. */
	settled?: { name: string; threads: Thread[] }[];
}

export type SnapshotKind = 'moved' | 'new';

export type AgentMarkKind = 'bracket' | 'line' | 'box';
export type AgentMarkRole = 'measure' | 'reference';

/** One automated visual mark written by an engraving check (`*.marks.json`), in snapshot pixels. */
export interface AgentMark {
	kind: AgentMarkKind;
	role: AgentMarkRole;
	from: Point;
	to: Point;
	label: string;
	note?: string;
	pass?: boolean;
}

/** Four-part engraving review note parsed from `###` headings inside a snapshot's claim section. */
export interface ReviewGuide {
	rule: string | null;
	testCase: string | null;
	lookFor: string | null;
	found: string | null;
}

/** One snapshot in the review: moved against a baseline, or newly added / included on its own. */
export interface ReviewEntry {
	/** The snapshot's file name, `score_amazing_grace.png`. */
	name: string;
	/** `'new'` for a single-panel snapshot with no diff; `'moved'` (default) for a 3-panel diff. */
	kind?: SnapshotKind;
	/** The test file that asked for it and the line, when known. */
	test: string | null;
	line: number | null;
	/** The fixture the test renders, when its source names one. */
	fixture: string | null;
	/** Pixels that differ, and their share of the image, 0..1. Zero for new snapshots. */
	changed: number;
	share: number;
	width: number;
	height: number;
	/** The agent's word on why it moved, as HTML; null when it gave none. */
	claim: string | null;
	/** Structured four-part review brief (rule, test case, what to look for, what was found), as HTML. */
	guide?: ReviewGuide | null;
	/** Automated marks recorded by an engraving check, in the snapshot's own pixels. */
	agentMarks?: AgentMark[];
	/** Where the new render put its notation; null when the test rendered another way. */
	layout: ScoreLayout | null;
	/** Each panel's URL: a route when served, a data URL in a static page. New snapshots have `after` only. */
	images: Partial<Record<Panel, string>> & { after: string };
	/** The size the images were scaled to; marks stay in the snapshot's own pixels. */
	scale: number;
}

/** Whether an entry is a single-panel new snapshot rather than a 3-panel moved diff. */
export function isNewEntry(entry: Pick<ReviewEntry, 'kind'>): boolean {
	return entry.kind === 'new';
}

/** One message in a thread: the reviewer's note or reply, or the agent's answer. */
export interface ThreadMessage {
	author: 'reviewer' | 'agent';
	/** The version it was written in reply to (the reviewer's) or with (the agent's). */
	version: number;
	text: string;
	/** The agent's markdown as HTML; null for the reviewer's plain text. */
	html: string | null;
}

/** A mark carried from an earlier version, with what was said about it since. */
export interface Thread {
	/** Stable across versions: `<snapshot>#v<version drawn in>.<its number there>`. */
	id: string;
	mark: Mark;
	/** The mark in words and what it covered, read off the render it was drawn on. */
	where: string;
	target: Target | null;
	messages: ThreadMessage[];
}

/** What the reviewer did with a carried thread this version. */
export interface ThreadState {
	resolved: boolean;
	/** A reply that keeps it open, for the agent; empty for none. */
	reply: string;
}

export type Verdict = 'approved' | 'changes';

export interface Point {
	x: number;
	y: number;
}

/** What a drag drew, in the snapshot's pixels: a box, an arrow from `from` to `to`, or a
 * pin, a click, at `from`. */
export interface Mark {
	kind: 'box' | 'arrow' | 'pin';
	panel: Panel;
	from: Point;
	to: Point;
	note: string;
}

export interface Review {
	id: string;
	version: number;
	submitted: boolean;
	/** Per-snapshot approval verdicts, keyed by snapshot name. */
	verdicts: Record<string, Verdict>;
	marks: Record<string, Mark[]>;
	/** Resolution and reply state for carried threads, keyed by thread id. */
	threads?: Record<string, ThreadState>;
}

export function emptyReview(data: Pick<ReviewData, 'id' | 'version'>): Review {
	return {
		id: data.id,
		version: data.version,
		submitted: false,
		verdicts: {},
		marks: {},
		threads: {},
	};
}

/** Whether a carried thread is still open: not resolved this version. */
export function isOpen(thread: Thread, review: Review): boolean {
	return review.threads?.[thread.id]?.resolved !== true;
}

/** A snapshot's state: approved when the reviewer said so, needing change while any
 * comment on it is open, and not reviewed otherwise. */
export function snapshotStatus(
	data: ReviewData,
	review: Review,
	name: string,
): 'approved' | 'changes' | 'open' {
	const verdict = review.verdicts[name];
	if (verdict === 'approved') {
		return 'approved';
	}
	const open =
		(review.marks[name]?.length ?? 0) > 0 ||
		(data.threads?.[name] ?? []).some((thread) => isOpen(thread, review));
	return verdict === 'changes' || open ? 'changes' : 'open';
}

/** What a mark covers in the score. */
export interface Target {
	/** Measure numbers with their 1-based system, in score order. */
	measures: { number: string; system: number }[];
	parts: string[];
	staves: number[];
	voices: string[];
	notes: ScoreLayout['notes'];
	/** Whether to treat the target as near rather than exact: true for a mark on the
	 * before panel, read off the new render's layout. */
	approximate: boolean;
}

// How near a point may fall to a note's ink and still name it, in pixels.
const REACH = 4;

/** The notation a mark covers: everything a box overlaps, or what an arrow's tip or a
 * pin sits on. */
export function resolve(mark: Mark, layout: ScoreLayout): Target {
	const area =
		mark.kind === 'box'
			? normalize(mark.from, mark.to)
			: point(mark.kind === 'arrow' ? mark.to : mark.from);
	const near = mark.kind === 'box' ? area : grow(area, REACH);
	let notes = layout.notes.filter((note) => overlaps(note.box, near));
	if (mark.kind !== 'box' && notes.length > 1) {
		// A point names the one note it is nearest, with the frets and chord tones drawn on it.
		const nearest = Math.min(...notes.map((note) => distance(note.box, area)));
		notes = notes.filter((note) => distance(note.box, area) <= nearest);
	}
	const staves = layout.staves.filter((stave) => overlaps(stave.box, area));
	const measures = layout.measures.filter((measure) =>
		overlaps(measure.box, area),
	);
	return {
		measures: measures.map((measure) => ({
			number: measure.number,
			system: measure.system + 1,
		})),
		parts: unique([...staves, ...notes].map((at) => at.part)),
		staves: unique([...staves, ...notes].map((at) => at.stave)).sort(
			(a, b) => a - b,
		),
		voices: unique(notes.map((note) => note.voice)),
		notes,
		approximate: mark.panel === 'before',
	};
}

// The most notes a target lists by name before counting the rest.
const LISTED = 8;

/** "m. 6 (system 2), Guitar, staff 1, voice 1, B4 ♪, A4 ♪": what a mark covers, for a
 * person and an agent alike. Empty when it covers nothing the layout knows. */
export function describeTarget(target: Target): string {
	const parts: string[] = [];
	if (target.measures.length > 0) {
		const numbers = target.measures.map((measure) => measure.number);
		const systems = unique(target.measures.map((measure) => measure.system));
		parts.push(
			`${numbers.length === 1 ? 'm.' : 'mm.'} ${numbers.join(', ')} (${systems.length === 1 ? 'system' : 'systems'} ${systems.join(', ')})`,
		);
	}
	parts.push(...target.parts);
	if (target.staves.length > 0) {
		parts.push(
			`${target.staves.length === 1 ? 'staff' : 'staves'} ${target.staves.join(', ')}`,
		);
	}
	if (target.voices.length > 0) {
		parts.push(
			`${target.voices.length === 1 ? 'voice' : 'voices'} ${target.voices.join(', ')}`,
		);
	}
	const named = target.notes.slice(0, LISTED).map(describeNote);
	if (target.notes.length > LISTED) {
		named.push(`${target.notes.length - LISTED} more`);
	}
	parts.push(...named);
	const text = parts.join(', ');
	return target.approximate && text ? `≈ ${text}` : text;
}

export function describeNote(note: ScoreLayout['notes'][number]): string {
	if (note.tab) {
		return `fret ${note.tab.fret} on string ${note.tab.string}`;
	}
	const pitch = note.pitch ? note.pitch.replace('/', '') : 'rest';
	return `${pitch} ${duration(note.beats)}`;
}

const DURATIONS: Record<string, string> = {
	'4': '𝅝',
	'3': '𝅗𝅥.',
	'2': '𝅗𝅥',
	'1.5': '♩.',
	'1': '♩',
	'0.75': '♪.',
	'0.5': '♪',
	'0.25': '𝅘𝅥𝅯',
	'0.125': '𝅘𝅥𝅰',
};

function duration(beats: number): string {
	return DURATIONS[String(beats)] ?? `${beats} beats`;
}

const PANEL_NAMES: Record<Panel, string> = {
	before: 'Before',
	diff: 'Diff',
	after: 'After',
};

const KIND_NAMES: Record<Mark['kind'], string> = {
	box: 'Box',
	arrow: 'Arrow',
	pin: 'Pin',
};

/** "Box on After: m. 6 (system 2), Guitar, … (412,388 150×92)": a mark as one line. */
export function describeMark(mark: Mark, layout: ScoreLayout | null): string {
	const where = describeTarget(layout ? resolve(mark, layout) : nothing(mark));
	const box = normalize(mark.from, mark.to);
	const pixels = {
		box: `${box.x},${box.y} ${box.w}×${box.h}`,
		arrow: `${mark.from.x},${mark.from.y} → ${mark.to.x},${mark.to.y}`,
		pin: `${mark.from.x},${mark.from.y}`,
	}[mark.kind];
	const head = `${KIND_NAMES[mark.kind]} on ${PANEL_NAMES[mark.panel]}`;
	const verb = mark.kind === 'arrow' ? ', pointing at ' : ': ';
	return where ? `${head}${verb}${where} (${pixels})` : `${head} (${pixels})`;
}

function nothing(mark: Mark): Target {
	return {
		measures: [],
		parts: [],
		staves: [],
		voices: [],
		notes: [],
		approximate: mark.panel === 'before',
	};
}

function normalize(a: Point, b: Point): PixelBox {
	return {
		x: Math.min(a.x, b.x),
		y: Math.min(a.y, b.y),
		w: Math.abs(b.x - a.x),
		h: Math.abs(b.y - a.y),
	};
}

function point(at: Point): PixelBox {
	return { x: at.x, y: at.y, w: 0, h: 0 };
}

function grow(box: PixelBox, by: number): PixelBox {
	return {
		x: box.x - by,
		y: box.y - by,
		w: box.w + by * 2,
		h: box.h + by * 2,
	};
}

/** Whether two boxes share any point, edges included, so a zero-size point counts. */
function overlaps(a: PixelBox, b: PixelBox): boolean {
	return (
		a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h
	);
}

function distance(a: PixelBox, b: PixelBox): number {
	const dx = Math.max(0, a.x - (b.x + b.w), b.x - (a.x + a.w));
	const dy = Math.max(0, a.y - (b.y + b.h), b.y - (a.y + a.h));
	return Math.hypot(dx, dy);
}

function unique<T>(values: T[]): T[] {
	return [...new Set(values)];
}
