import { describe, expect, it } from 'bun:test';
import {
	Barline,
	GraceNoteGroup,
	Modifier,
	type RenderContext,
	type Stave,
	type StaveNote,
	TimeSignature,
	type Voice,
} from 'vexflow';
import { Rect } from 'webappwiz/geometry';
import type { ChordTranslator } from './chord-translator';
import { CollisionResolver } from './collision-resolver';
import type { ConnectorDrawer } from './connector-drawer';
import type { LyricPlacer } from './lyric-placer';
import type { NoteTranslator } from './note-translator';
import type { SpannerBuilder } from './spanner-builder';
import { SpillTracker } from './spill-tracker';
import { SystemFormatter } from './system-formatter';
import { FakeTechnicalMark } from './technical-mark/fake-technical-mark';

describe('SystemFormatter', () => {
	const makeFormatter = () =>
		new SystemFormatter(
			{} as unknown as RenderContext,
			{ noteheadHalfWidth: () => 5 } as unknown as NoteTranslator,
			{} as unknown as ChordTranslator,
			{} as unknown as SpannerBuilder,
			{} as unknown as ConnectorDrawer,
			{} as unknown as LyricPlacer,
			new CollisionResolver(new Rect(0, 0, 2000, 2000)),
			new SpillTracker(),
			{ systemOf: () => 0 },
			{
				softmaxFactor: 100,
				notationColor: '#000000',
				byLead: new Map(),
				crossStaveNotes: new Set(),
			},
		);

	// The note surface noteRect reads: notehead bounds, stem extents, and modifiers.
	const note = (
		opts: {
			x?: number;
			stem?: { topY: number; baseY: number };
			modifiers?: unknown[];
		} = {},
	) =>
		({
			getAbsoluteX: () => opts.x ?? 100,
			getNoteHeadBounds: () => ({ yTop: 50, yBottom: 70 }),
			getStem: () => opts.stem ?? null,
			getStemExtents: () => opts.stem,
			getModifiers: () => opts.modifiers ?? [],
		}) as unknown as StaveNote;

	const articulation = (position: number, y: number) => ({
		getCategory: () => 'Articulation',
		getPosition: () => position,
		getBoundingBox: () => ({ getY: () => y }),
	});

	it('boxes a stemless note one notehead wide from head top to head bottom', () => {
		expect(makeFormatter().noteRect(note())).toMatchObject({
			x: 95,
			y: 50,
			w: 10,
			h: 20,
		});
	});

	it('reaches the stem tip past the noteheads on both sides', () => {
		const rect = makeFormatter().noteRect(
			note({ stem: { topY: 30, baseY: 80 } }),
		);
		expect(rect).toMatchObject({ y: 30, h: 50 });
	});

	it('lifts the top to above-side articulations and technical marks', () => {
		const rect = makeFormatter().noteRect(
			note({
				modifiers: [
					articulation(Modifier.Position.ABOVE, 25),
					new FakeTechnicalMark({ top: 15 }),
				],
			}),
		);
		expect(rect).toMatchObject({ y: 15, h: 55 });
	});

	it('ignores below-side marks and non-above articulations', () => {
		const rect = makeFormatter().noteRect(
			note({
				modifiers: [
					articulation(Modifier.Position.BELOW, 10),
					new FakeTechnicalMark({ below: true, top: 90 }),
				],
			}),
		);
		expect(rect).toMatchObject({ y: 50, h: 20 });
	});

	it('reports no extent for a column with no pending staves', () => {
		const extent = makeFormatter().formatAndDraw([], {
			systemIndex: 0,
			measureLeadingPad: 0,
			measureTrailingPad: 0,
		});
		expect(extent).toEqual({ top: Infinity, bottom: 0 });
	});

	// A grace cluster the way closeGraceGaps sees one: position plus mutable spacing.
	const graceGroup = (position: number, spacing: number) => {
		const group = {
			spacing,
			getCategory: () => GraceNoteGroup.CATEGORY,
			getPosition: () => position,
			getSpacingFromNextModifier: () => group.spacing,
			setSpacingFromNextModifier: (next: number) => {
				group.spacing = next;
			},
		};
		return group;
	};

	// closeGraceGaps runs inside formatAndDraw right after the vexflow format pass; reach
	// past the private marker to exercise its arithmetic without a full render.
	const closeGraceGaps = (voices: unknown[]) =>
		(
			makeFormatter() as unknown as {
				closeGraceGaps(voices: Voice[]): void;
			}
		).closeGraceGaps(voices as Voice[]);

	it('hands a double-graced note reserved right shift back to its leading cluster', () => {
		const leading = graceGroup(Modifier.Position.LEFT, 4);
		const trailing = graceGroup(Modifier.Position.RIGHT, 9);
		const tickable = {
			getModifiers: () => [leading, trailing],
			checkTickContext: () => ({ getMetrics: () => ({ modRightPx: 30 }) }),
		};
		closeGraceGaps([{ getTickables: () => [tickable] }]);
		expect(leading.spacing).toBe(34);
		expect(trailing.spacing).toBe(9);
	});

	it('leaves a lone grace cluster where the formatter put it', () => {
		const leading = graceGroup(Modifier.Position.LEFT, 4);
		const tickable = {
			getModifiers: () => [leading],
			checkTickContext: () => {
				throw new Error('single-cluster notes never read the tick context');
			},
		};
		closeGraceGaps([{ getTickables: () => [tickable] }]);
		expect(leading.spacing).toBe(4);
	});

	// A real begin modifier: alignBegModifiers groups repeats by instanceof, and the time
	// signature beside them by category alone (so that one stays a plain object).
	const _repeat = (x: number, type = Barline.type.REPEAT_BEGIN) => {
		const barline = new Barline(type);
		barline.setX(x);
		return barline;
	};

	const timeSig = (x: number) => {
		const sig = {
			x,
			moved: false,
			getCategory: () => TimeSignature.CATEGORY,
			getX: () => sig.x,
			setX: (next: number) => {
				sig.x = next;
				sig.moved = true;
			},
		};
		return sig;
	};

	const fakeStave = (modifiers: unknown[]) =>
		({
			format: () => {},
			getModifiers: () => modifiers,
		}) as unknown as Stave;

	it('squares repeats and time signatures to their own widest x and returns the repeat x', () => {
		const repeats = [_repeat(10), _repeat(25)];
		const sigs = [timeSig(30), timeSig(22)];
		const x = makeFormatter().alignBegModifiers([
			fakeStave([repeats[0], sigs[0]]),
			fakeStave([repeats[1], sigs[1]]),
		]);
		expect(x).toBe(25);
		expect(repeats.map((r) => r.getX())).toEqual([25, 25]);
		expect(sigs.map((s) => s.x)).toEqual([30, 30]);
	});

	it('returns null and leaves a lone time signature alone without an opening repeat', () => {
		const sig = timeSig(30);
		// A plain barline is not an opening repeat, so it grouped nothing.
		const x = makeFormatter().alignBegModifiers([
			fakeStave([_repeat(10, Barline.type.SINGLE), sig]),
		]);
		expect(x).toBeNull();
		expect(sig.moved).toBe(false);
	});
});
