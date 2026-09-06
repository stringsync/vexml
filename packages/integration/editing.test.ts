import { describe, expect, it } from 'bun:test';
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
				const first = score.getElements().notes()[0];
				if (!first) {
					throw new Error('missing rendered note');
				}
				const hit = score.getElements().at({
					x: first.rect.x + first.rect.w / 2,
					y: first.rect.y + first.rect.h / 2,
				});
				if (!hit) {
					throw new Error('missing note hit');
				}
				session.selectElements([hit]);
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
				for (const note of session.getSelectedElements(score.getElements())) {
					note.color.on('#155dfc');
				}
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
				const system = index.systems()[0];
				if (!system) {
					throw new Error('missing system');
				}
				const hits = index.within(system.rect);
				const fret = index.tabPositions()[0];
				if (!fret) {
					throw new Error('missing fret');
				}
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

	it.concurrent('rejects playback gaps before modifying an editor document or its container', async () => {
		const xml = await testing.fixture('note.musicxml');
		const { result } = await testing.eval(
			'note.musicxml',
			{},
			async (context, xml) => {
				const document = new context.MDOMParser().parseFromString(xml);
				const before = document.score.parts[0]?.measures.length;
				const markup = context.container.innerHTML;
				let message = '';
				try {
					await context.render(document, context.container, {
						gaps: [{ beforeMeasureIndex: 0, durationMs: 1000 }],
					});
				} catch (error) {
					message = error instanceof Error ? error.message : String(error);
				}
				return {
					message,
					sameMeasures: document.score.parts[0]?.measures.length === before,
					sameContainer: context.container.innerHTML === markup,
				};
			},
			xml,
		);
		expect(result).toEqual({
			message: 'render: configured gaps require string or Blob input',
			sameMeasures: true,
			sameContainer: true,
		});
	});
});
