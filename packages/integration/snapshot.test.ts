import { describe, expect, it } from 'bun:test';
import type { ConfigInput } from '@stringsync/vexml';
import type { VexmlContext } from '@vexml/renderer';
import { testing } from './setup';

// A snapshot replays a render without parsing, laying out or drawing it. Each case renders the
// fixture in full, snapshots it through JSON, and renders the snapshot into the same container,
// so the screenshot is the replay's: it must match the full render's own baseline.

// The fonts Testing defaults to, stated here because the replay is handed its config directly.
const FONTS: ConfigInput['fonts'] = {
	notation: { family: 'Bravura' },
	text: { family: 'Source Sans 3' },
};

type Replay = { config: ConfigInput; scroll: number };

describe('snapshot', () => {
	it.concurrent('replays score_schubert_gute_nacht.png', async () => {
		const { image, result } = await replay(
			'score_schubert_gute_nacht.musicxml',
		);
		expect(result.replayed).toEqual(result.full);
		expect(image).toMatchScreenshot('score_schubert_gute_nacht.png');
	});

	it.concurrent('replays score_amazing_grace.png', async () => {
		const { image, result } = await replay('score_amazing_grace.musicxml');
		expect(result.replayed).toEqual(result.full);
		expect(image).toMatchScreenshot('score_amazing_grace.png');
	});

	it.concurrent('replays a sticky fold', async () => {
		const { image, result } = await replay(
			'score_amazing_grace.musicxml',
			{
				layout: { type: 'panoramic', stickySignatures: true },
				width: 420,
			},
			0.5,
		);
		expect(result.replayed).toEqual(result.full);
		expect(image).toMatchScreenshot('sticky_signatures_notation_tab.png');
	});

	it.concurrent('replays pages', async () => {
		const { result } = await replay('score_bach_air.musicxml', {
			layout: {
				type: 'paged',
				pageWidth: 816,
				pageHeight: 1056,
				margin: 48,
			},
		});
		expect(result.full.pages.length).toBeGreaterThan(1);
		expect(result.replayed).toEqual(result.full);
	});

	it.concurrent('throws SnapshotMismatchError for another version or config', async () => {
		const { result } = await testing.eval(
			'score_amazing_grace.musicxml',
			{},
			mismatch,
			{ config: { fonts: FONTS }, scroll: 0 } satisfies Replay,
		);
		expect(result).toEqual({
			version: 'version',
			config: 'config',
			format: 'format',
			containerKept: true,
			editing: true,
		});
	});
});

function replay(file: string, config: ConfigInput = {}, scroll = 0) {
	const withFonts = { ...config, fonts: FONTS };
	return testing.eval(file, withFonts, roundTrip, {
		config: withFonts,
		scroll,
	} satisfies Replay);
}

// Runs in the page, so it's self-contained: eval serializes it, and nothing outside it exists there.
async function roundTrip(
	{ score, container, render }: VexmlContext,
	{ config, scroll }: Replay,
) {
	const box = (r: { x: number; y: number; w: number; h: number }) => [
		r.x,
		r.y,
		r.w,
		r.h,
	];
	const summarize = (s: typeof score) => {
		const notes = s.getElements().notes();
		const indexOf = new Map(notes.map((note, i) => [note, i]));
		const sequence = s.getSequence();
		const steps = [];
		for (let i = 0; i < sequence.length; i++) {
			const step = sequence.getStep(i);
			if (step) {
				steps.push({
					...step,
					systemRect: box(step.systemRect),
					active: step.active.map((note) => indexOf.get(note)),
				});
			}
		}
		return {
			notes: notes.map((note) => ({
				rect: box(note.rect),
				ink: box(note.getInkRect()),
				pitch: note.getPitch(),
				beats: note.getDurationBeats(),
				grace: note.isGrace(),
				chord: note
					.getChordSiblings({ includeSelf: true })
					.map((n) => indexOf.get(n)),
				tab: note.getTabPosition()?.getFret() ?? null,
				measure: note.getMeasure().getIndex(),
			})),
			boxes: s
				.getElements()
				.measureBoxes()
				.map((b) => [b.getIndex(), b.getNumber(), ...box(b.rect)]),
			systems: s.getSystems().map((system) => box(system.rect)),
			parts: s.getParts().map((part) => ({
				id: part.getId(),
				label: part.getLabel(),
				voices: part
					.getMeasures()
					.flatMap((m) =>
						m
							.getVoices()
							.map((v) => [
								m.getIndex(),
								v.getId(),
								v.getStave(),
								...v.getNotes().map((n) => indexOf.get(n)),
							]),
					),
			})),
			diagrams: s
				.getElements()
				.chordDiagrams()
				.map((d) => [d.getTitle(), ...box(d.rect)]),
			steps,
			durationMs: s.getDurationMs(),
			gaps: s.getGaps(),
			pages: s.getPages().map((page) => box(page.rect)),
			hit: s
				.getElements()
				.allAt({ x: 200, y: 120 })
				.map((e) => e.type),
		};
	};
	const full = summarize(score);
	const json = JSON.stringify(score.snapshot());
	const replayed = await render(JSON.parse(json), container, config);
	const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
	if (scroll > 0) {
		container.scrollLeft =
			(container.scrollWidth - container.clientWidth) * scroll;
		await frame();
		await frame();
	}
	return { full, replayed: summarize(replayed) };
}

async function mismatch(
	{ score, container, render, SnapshotMismatchError }: VexmlContext,
	{ config }: Replay,
) {
	const snapshot = score.snapshot();
	const reasonOf = async (input: unknown, cfg: ConfigInput) => {
		try {
			await render(input as typeof snapshot, container, cfg);
			return 'rendered';
		} catch (e) {
			return e instanceof SnapshotMismatchError ? e.reason : String(e);
		}
	};
	const canvas = container.querySelector('.vexml-canvas');
	const version = await reasonOf({ ...snapshot, version: -1 }, config);
	const changed = await reasonOf(snapshot, { ...config, noteSpacing: 50 });
	const format = await reasonOf({ format: 'nope' }, config);
	const containerKept = container.querySelector('.vexml-canvas') === canvas;
	const replayed = await render(snapshot, container, config);
	let editing = false;
	try {
		replayed.createEditingController(
			{} as Parameters<typeof replayed.createEditingController>[0],
		);
	} catch {
		editing = true;
	}
	return { version, config: changed, format, containerKept, editing };
}
