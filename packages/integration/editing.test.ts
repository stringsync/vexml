import { describe, expect, it } from 'bun:test';
import type { Note, System, TabPosition } from '@stringsync/vexml';
import { testing } from './setup';

describe('editing', () => {
	// The note fixture after repitching its first whole note from C5 to F5. The
	// selected whole note is blue; later measures retain their original pitches.
	it.concurrent('keeps mouse selection through pitch editing, re-render and undo', async () => {
		const xml = await testing.fixture('note.musicxml');
		const { image, result } = await testing.eval(
			'note.musicxml',
			{},
			async (context, xml) => {
				const { MDOMParser, EditingSession, render, container } = context;
				const document = new MDOMParser().parseFromString(xml);
				const session = new EditingSession(document);
				const config = {
					fonts: {
						notation: { family: 'Bravura' },
						text: { family: 'Source Sans 3' },
					},
				};
				context.score.dispose();
				let score = await render(document, container, config);
				const original = container.querySelector('canvas')?.toDataURL();
				const first = score.getElements().notes()[0] as Note;
				const hit = score.getElements().at({
					x: first.rect.x + first.rect.w / 2,
					y: first.rect.y + first.rect.h / 2,
				});
				session.selectElements([hit] as Parameters<
					typeof session.selectElements
				>[0]);
				const focused = session.getFocus();
				const selectedByMouse = focused === first.getSources()[0];
				const measureCount = score.getMeasureCount();
				session.setPitch({ step: 'F', octave: 5 });
				score.dispose();
				score = await render(document, container, config);
				const edited = session.getSelectedElements(score.getElements())[0];
				const changedPixels =
					container.querySelector('canvas')?.toDataURL() !== original;
				const freshElement = edited !== first;
				const sameSource = edited?.getSources()[0] === focused;
				const raised = edited !== undefined && edited.rect.y < first.rect.y;
				const changedPitch = edited?.getPitch();
				session.undo();
				score.dispose();
				score = await render(document, container, config);
				const restoredPixels =
					container.querySelector('canvas')?.toDataURL() === original;
				const restoredPitch = session
					.getSelectedElements(score.getElements())[0]
					?.getPitch();
				const sameFocus = session.getFocus() === focused;
				const sameMeasures = score.getMeasureCount() === measureCount;
				session.redo();
				score.dispose();
				score = await render(document, container, config);
				session.getSelectedElements(score.getElements()).forEach((note) => {
					note.color.on('#155dfc');
				});
				context.score = score;
				return {
					selectedByMouse,
					changedPixels,
					freshElement,
					sameSource,
					raised,
					changedPitch,
					restoredPixels,
					restoredPitch,
					sameFocus,
					sameMeasures,
				};
			},
			xml,
		);
		expect(result).toEqual({
			selectedByMouse: true,
			changedPixels: true,
			freshElement: true,
			sameSource: true,
			raised: true,
			changedPitch: 'F/5',
			restoredPixels: true,
			restoredPitch: 'C/5',
			sameFocus: true,
			sameMeasures: true,
		});
		expect(image).toMatchScreenshot('editing_pitch.png');
	});

	// The selection overlay stamps the focused glyph in color without clipping and clears the
	// stamp's bounds when focus moves on. Focus the quarter rest in M2, then step to the eighth
	// rest beside it: the quarter rest must come back fully black. With a notehead-sized rect,
	// its top and bottom stayed blue after the middle band was cleared.
	it.concurrent('leaves no color behind when focus moves off a rest', async () => {
		const xml = await testing.fixture('rest.musicxml');
		const { image, result } = await testing.eval(
			'rest.musicxml',
			{},
			async (context, xml) => {
				const document = new context.MDOMParser().parseFromString(xml);
				const session = new context.EditingSession(document);
				context.score.dispose();
				const score = await context.render(document, context.container, {
					fonts: {
						notation: { family: 'Bravura' },
						text: { family: 'Source Sans 3' },
					},
				});
				context.score = score;
				score.createEditingController(session);
				const notes = score.getElements().notes();
				const quarter = notes.findIndex(
					(note) => note.getPitch() === null && note.getDurationBeats() === 1,
				);
				const rest = notes[quarter] as Note;
				const next = notes[quarter + 1] as Note;
				session.selectElements([rest]);
				session.selectElements([next]);
				return { focusMoved: session.getFocus() === next.getSources()[0] };
			},
			xml,
		);
		expect(result.focusMoved).toBe(true);
		expect(image).toMatchScreenshot('editing_focus_off_rest.png');
	});

	it.concurrent('deduplicates notehead and fret selection from a marquee', async () => {
		const xml = await testing.fixture('tab_notation_durations.musicxml');
		const { result } = await testing.eval(
			'tab_notation_durations.musicxml',
			{},
			async (context, xml) => {
				const document = new context.MDOMParser().parseFromString(xml);
				const session = new context.EditingSession(document);
				context.score.dispose();
				const score = await context.render(document, context.container, {
					layout: { type: 'panoramic' },
					fonts: {
						notation: { family: 'Bravura' },
						text: { family: 'Source Sans 3' },
					},
				});
				context.score = score;
				const index = score.getElements();
				const system = index.systems()[0] as System;
				const hits = index.within(system.rect);
				const fret = index.tabPositions()[0] as TabPosition;
				session.selectElements([...hits, fret, fret.getNote()]);
				return {
					hasNotes: hits.some((element) => element.type === 'note'),
					hasFrets: hits.some((element) => element.type === 'tab-position'),
					selected: session.getSelection().length,
					// The fixture's silent tab rest and suppressed tied fret have no rendered targets.
					expected: index.notes().length,
					resolved: session.getSelectedElements(index).length,
				};
			},
			xml,
		);
		expect(result.hasNotes).toBe(true);
		expect(result.hasFrets).toBe(true);
		expect(result.expected).toBeGreaterThan(0);
		expect(result.selected).toBe(result.expected);
		expect(result.resolved).toBe(result.expected);
	});

	// sound2score's flow: gaps inserted into the session's own document as an undoable edit,
	// placed in playback order, then rendered by naming those measures. repeats.musicxml plays
	// 1 2 1 2 3 4 5 3 ..., so bar 4 is the first pass of measure 3, after the opening repeat.
	it.concurrent('edits a document whose gap measures were inserted into it', async () => {
		const xml = await testing.fixture('repeats.musicxml');
		const { result } = await testing.eval(
			'repeats.musicxml',
			{},
			async (context, xml) => {
				const { MDOMParser, EditingSession, render, insertGaps, container } =
					context;
				const document = new MDOMParser().parseFromString(xml);
				const session = new EditingSession(document);
				const measureCount = () => document.score.parts[0]?.measures.length;
				const before = measureCount();
				let insideRepeat = '';
				try {
					insertGaps(document, [{ beforeBarIndex: 2 }]);
				} catch (error) {
					insideRepeat = error instanceof Error ? error.message : String(error);
				}
				const inserted = session.history.edit('Insert gaps', () =>
					insertGaps(document, [{ beforeBarIndex: 0 }, { beforeBarIndex: 4 }]),
				);
				const intro = inserted[0] as (typeof inserted)[number];
				const solo = inserted[1] as (typeof inserted)[number];
				const config = {
					gaps: [
						{ measure: intro, durationMs: 1000 },
						{ measure: solo, durationMs: 500, label: 'Solo break' },
					],
				};
				context.score.dispose();
				let score = await render(document, container, config);
				const gaps = score.getGaps().map((gap) => ({
					measureIndex: gap.measureIndex,
					label: gap.label,
					durationMs: Math.round(gap.endMs - gap.startMs),
				}));
				const first = score
					.getElements()
					.notes()
					.find((note) => note.getPitch() !== null) as Note;
				session.selectElements([first]);
				const selected = session.getFocus() === first.getSources()[0];
				session.setPitch({ step: 'F', octave: 5 });
				score.dispose();
				score = await render(document, container, config);
				const edited = session
					.getSelectedElements(score.getElements())[0]
					?.getPitch();
				session.undo();
				session.undo();
				score.dispose();
				score = await render(document, container, {});
				context.score = score;
				return {
					insideRepeat,
					gaps,
					selected,
					edited,
					restored: measureCount() === before,
					gapsDetached: intro.index === -1 && solo.index === -1,
				};
			},
			xml,
		);
		expect(result).toEqual({
			insideRepeat:
				'insertGaps: beforeBarIndex 2 falls inside a repeat (measures 0-1)',
			gaps: [
				{ measureIndex: 0, label: null, durationMs: 1000 },
				{ measureIndex: 3, label: 'Solo break', durationMs: 500 },
			],
			selected: true,
			edited: 'F/5',
			restored: true,
			gapsDetached: true,
		});
	});

	it.concurrent('rejects positioned gaps for a document before touching it or its container', async () => {
		const xml = await testing.fixture('note.musicxml');
		const { result } = await testing.eval(
			'note.musicxml',
			{},
			async (context, xml) => {
				const document = new context.MDOMParser().parseFromString(xml);
				const before = document.score.parts[0]?.measures.length;
				const markup = context.container.innerHTML;
				const messageOf = async (run: () => Promise<unknown>) => {
					try {
						await run();
						return '';
					} catch (error) {
						return error instanceof Error ? error.message : String(error);
					}
				};
				const positioned = await messageOf(() =>
					context.render(document, context.container, {
						gaps: [{ beforeMeasureIndex: 0, durationMs: 1000 }],
					}),
				);
				const measures = document.score.parts[0]?.measures ?? [];
				const measure = measures[0] as (typeof measures)[number];
				const named = await messageOf(() =>
					context.render(xml, context.container, {
						gaps: [{ measure, durationMs: 1000 }],
					}),
				);
				return {
					positioned,
					named,
					sameMeasures: document.score.parts[0]?.measures.length === before,
					sameContainer: context.container.innerHTML === markup,
				};
			},
			xml,
		);
		expect(result).toEqual({
			positioned:
				'render: gaps for an MDocument must name measures in it (see insertGaps)',
			named: 'render: a gap naming a measure needs its MDocument as input',
			sameMeasures: true,
			sameContainer: true,
		});
	});
});
