import { beforeEach, describe, expect, it } from 'bun:test';
import {
	Beam,
	CanvasContext,
	Stave,
	StaveNote,
	Stem,
	TickContext,
} from 'vexflow/core';
import { FakePaintProbe } from './fake-paint-probe';
import { PaintContext } from './paint-context';
import { PaintList } from './paint-list';
import { ProbeTextCanvas } from './probe-text-canvas';
import { SpacedBeam } from './spaced-beam';

// Explicit tick positions keep these geometry checks independent of text metrics.
function notesFor(direction: number, rest = false): StaveNote[] {
	return [0, 1, 2].map((index) => {
		const note = new StaveNote({
			keys: ['c/5'],
			duration: rest && index === 1 ? '32r' : '32',
			stemDirection: rest || index !== 1 ? direction : -direction,
		});
		note.setStave(new Stave(0, index === 1 && !rest ? 140 : 40, 300));
		new TickContext()
			.addTickable(note)
			.preFormat()
			.setX(50 + index * 60);
		return note;
	});
}

describe('SpacedBeam', () => {
	let list: PaintList;
	let ctx: CanvasContext;
	let upNotes: StaveNote[];
	let downNotes: StaveNote[];
	let upBeam: SpacedBeam;
	let downBeam: SpacedBeam;

	beforeEach(() => {
		new ProbeTextCanvas(new FakePaintProbe()).install();
		list = new PaintList();
		ctx = new CanvasContext(
			new PaintContext(
				list,
				new FakePaintProbe(),
				null,
			) as unknown as CanvasRenderingContext2D,
		);
		upNotes = notesFor(Stem.UP, true);
		downNotes = notesFor(Stem.DOWN, true);
		upBeam = new SpacedBeam(upNotes, false).setDistance(15);
		downBeam = new SpacedBeam(downNotes, false).setDistance(15);
	});

	it('extends an opposing stem through all three widely spaced levels (1)', () => {
		const plainNotes = notesFor(Stem.UP);
		new Beam(plainNotes, false).postFormat();
		const wideNotes = notesFor(Stem.UP);
		new SpacedBeam(wideNotes, false).setDistance(15).postFormat();
		expect(
			(wideNotes[1]?.getStem()?.getExtension() ?? Number.NaN) -
				(plainNotes[1]?.getStem()?.getExtension() ?? Number.NaN),
		).toBeCloseTo(15);
	});

	it('draws a rest stemlet through the full beam stack (1)', () => {
		const notes = upNotes;
		const beam = upBeam;
		beam.renderOptions.showStemlets = true;
		beam.postFormat();
		notes[1]?.getStem()?.setContext(ctx).draw();
		const path = list.ops[0]?.path;
		const startY = Number(path?.[0]?.args[1]);
		const endY = Number(path?.[1]?.args[1]);
		expect(Math.abs(endY - startY)).toBeCloseTo(
			2 * 15 + 5 + 7 - Stem.WIDTH / 2,
		);
	});

	it('keeps a standard stem below the innermost flat beam (1)', () => {
		const notes = upNotes;
		const beam = upBeam;
		beam.renderOptions.flatBeams = true;
		beam.renderOptions.minFlatBeamOffset = Stem.HEIGHT - beam.levelDistance();
		beam.postFormat();
		const tip = beam.renderOptions.flatBeamOffset ?? Number.NaN;
		const head = notes[0]?.getYs()[0] ?? Number.NaN;
		expect((head - tip) * Stem.UP - 2 * 15).toBeGreaterThanOrEqual(Stem.HEIGHT);
		expect(beam.renderOptions.beamWidth).toBe(5);
	});

	it('extends an opposing stem through all three widely spaced levels (-1)', () => {
		const plainNotes = notesFor(Stem.DOWN);
		new Beam(plainNotes, false).postFormat();
		const wideNotes = notesFor(Stem.DOWN);
		new SpacedBeam(wideNotes, false).setDistance(15).postFormat();
		expect(
			(wideNotes[1]?.getStem()?.getExtension() ?? Number.NaN) -
				(plainNotes[1]?.getStem()?.getExtension() ?? Number.NaN),
		).toBeCloseTo(15);
	});

	it('draws a rest stemlet through the full beam stack (-1)', () => {
		const notes = downNotes;
		const beam = downBeam;
		beam.renderOptions.showStemlets = true;
		beam.postFormat();
		notes[1]?.getStem()?.setContext(ctx).draw();
		const path = list.ops[0]?.path;
		const startY = Number(path?.[0]?.args[1]);
		const endY = Number(path?.[1]?.args[1]);
		expect(Math.abs(endY - startY)).toBeCloseTo(
			2 * 15 + 5 + 7 - Stem.WIDTH / 2,
		);
	});

	it('keeps a standard stem below the innermost flat beam (-1)', () => {
		const notes = downNotes;
		const beam = downBeam;
		beam.renderOptions.flatBeams = true;
		beam.renderOptions.minFlatBeamOffset = Stem.HEIGHT - beam.levelDistance();
		beam.postFormat();
		const tip = beam.renderOptions.flatBeamOffset ?? Number.NaN;
		const head = notes[0]?.getYs()[0] ?? Number.NaN;
		expect((head - tip) * Stem.DOWN - 2 * 15).toBeGreaterThanOrEqual(
			Stem.HEIGHT,
		);
		expect(beam.renderOptions.beamWidth).toBe(5);
	});
});
