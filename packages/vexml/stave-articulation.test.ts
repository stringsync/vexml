import { beforeEach, describe, expect, it } from 'bun:test';
import {
	Beam,
	CanvasContext,
	Modifier,
	Stave,
	StaveNote,
	Stem,
	TickContext,
} from 'vexflow/core';
import { BowedTremolo } from './bowed-tremolo';
import { FakePaintProbe } from './fake-paint-probe';
import { NoteheadArticulation } from './notehead-articulation';
import { PaintContext } from './paint-context';
import { PaintList } from './paint-list';
import { ProbeTextCanvas } from './probe-text-canvas';
import { StaveArticulation } from './stave-articulation';

describe('StaveArticulation', () => {
	let ctx: CanvasContext;

	beforeEach(() => {
		new ProbeTextCanvas(new FakePaintProbe()).install();
		ctx = new CanvasContext(
			new PaintContext(
				new PaintList(),
				new FakePaintProbe(),
				null,
			) as unknown as CanvasRenderingContext2D,
		);
	});

	function drawArticulation(
		note: StaveNote,
		mark: StaveArticulation,
	): { y: number } {
		note.addModifier(mark, 0);
		new TickContext().addTickable(note).preFormat().setX(50);
		mark.setContext(ctx);
		mark.draw();
		return { y: mark.getBoundingBox().getY() };
	}

	it('shifts a notehead-side articulation outward by one space when clearing a tie', () => {
		const plain = setup(['a/4'], { stemDirection: Stem.UP });
		const tied = setup(['a/4'], { stemDirection: Stem.UP });
		const plainMark = new NoteheadArticulation('a>').setSide(plain.note);
		const tiedMark = new NoteheadArticulation('a>')
			.setSide(tied.note)
			.clearTie('notehead');
		const plainY = drawArticulation(plain.note, plainMark).y;
		const tiedY = drawArticulation(tied.note, tiedMark).y;
		const space = plain.stave.getSpacingBetweenLines();
		expect(tiedY).toBeGreaterThan(plainY);
		// A second draw pass (spill redraw) does not ratchet the shift.
		tiedMark.draw();
		expect(tiedMark.getBoundingBox().getY()).toBe(tiedY);
		// Outside the staff both share the same origin, so the shift is a full space,
		// and belowBottomY includes it so lyrics drop clear.
		const lowPlain = setup(['e/4'], { stemDirection: Stem.UP });
		const lowTied = setup(['e/4'], { stemDirection: Stem.UP });
		const lowPlainMark = new NoteheadArticulation('a>').setSide(lowPlain.note);
		const lowTiedMark = new NoteheadArticulation('a>')
			.setSide(lowTied.note)
			.clearTie('notehead');
		const lowPlainY = drawArticulation(lowPlain.note, lowPlainMark).y;
		const lowTiedY = drawArticulation(lowTied.note, lowTiedMark).y;
		expect(lowTiedY - lowPlainY).toBe(space);
		expect(lowTiedMark.belowBottomY() - lowPlainMark.belowBottomY()).toBe(
			space,
		);
	});

	it('respects explicit tie orientation and skips stem-side articulations', () => {
		const { note } = setup(['a/4'], { stemDirection: Stem.UP });
		const aboveTie = new NoteheadArticulation('a>')
			.setSide(note)
			.clearTie('above');
		const plain = new NoteheadArticulation('a>').setSide(note);
		const plainY = drawArticulation(note, plain).y;
		const aboveTieY = drawArticulation(note, aboveTie).y;
		expect(aboveTieY).toBe(plainY);

		// A stem-side articulation on a tied note stays at the stem tip.
		const stemSide = new NoteheadArticulation('a>')
			.setSide(note, 'stem')
			.clearTie('both');
		const stemSidePlain = new NoteheadArticulation('a>').setSide(note, 'stem');
		expect(drawArticulation(note, stemSide).y).toBe(
			drawArticulation(note, stemSidePlain).y,
		);
	});

	it('shifts an above-side articulation on a stem-down tied note', () => {
		const plain = setup(['c/5'], { stemDirection: Stem.DOWN });
		const tied = setup(['c/5'], { stemDirection: Stem.DOWN });
		const plainMark = new NoteheadArticulation('a>').setSide(plain.note);
		const tiedMark = new NoteheadArticulation('a>')
			.setSide(tied.note)
			.clearTie('notehead');
		const plainY = drawArticulation(plain.note, plainMark).y;
		const tiedY = drawArticulation(tied.note, tiedMark).y;
		expect(tiedY).toBeLessThan(plainY);
	});

	it('keeps beam clearance on the stem tip', () => {
		const unbeamed = setup(['a/4'], { duration: '8', stemDirection: Stem.UP });
		const beamed = setup(['a/4'], {
			duration: '8',
			stemDirection: Stem.UP,
			beamed: true,
		});
		const m1 = new StaveArticulation('a>').setPosition(Modifier.Position.ABOVE);
		const m2 = new StaveArticulation('a>').setPosition(Modifier.Position.ABOVE);
		const y1 = drawArticulation(unbeamed.note, m1).y;
		const y2 = drawArticulation(beamed.note, m2).y;
		expect(y1 - y2).toBe(beamed.stave.getSpacingBetweenLines());
	});

	it('places ledger-line articulation between the notehead and stave in the outermost stave-space', () => {
		const high = setup(['c/6'], { stemDirection: Stem.UP });
		const highDot = new NoteheadArticulation(['\uE4A2', '\uE4A3'])
			.setSide(high.note)
			.setBetweenLines();
		drawArticulation(high.note, highDot);
		const highBox = highDot.getBoundingBox();
		const highCenter = highBox.getY() + highBox.getH() / 2;
		expect(highCenter).toBeGreaterThan(high.stave.getYForLine(0));
		expect(highCenter).toBeLessThan(high.stave.getYForLine(1));

		const low = setup(['a/3'], { stemDirection: Stem.DOWN });
		const lowDot = new NoteheadArticulation(['\uE4A2', '\uE4A3'])
			.setSide(low.note)
			.setBetweenLines();
		drawArticulation(low.note, lowDot);
		const lowBox = lowDot.getBoundingBox();
		const lowCenter = lowBox.getY() + lowBox.getH() / 2;
		expect(lowCenter).toBeGreaterThan(low.stave.getYForLine(3));
		expect(lowCenter).toBeLessThan(low.stave.getYForLine(4));

		// Away from the stave: stays beside the ledger-line notehead.
		const awayHigh = setup(['c/6'], { stemDirection: Stem.DOWN });
		const awayDot = new NoteheadArticulation(['\uE4A2', '\uE4A3'])
			.setSide(awayHigh.note)
			.setBetweenLines();
		drawArticulation(awayHigh.note, awayDot);
		expect(awayDot.getBoundingBox().getY()).toBeLessThan(
			awayHigh.stave.getYForLine(0),
		);
	});

	it('shifts an accent outward past a slur endpoint on its side and reports sitsOutsideSlur', () => {
		const plain = setup(['f/5'], { stemDirection: Stem.DOWN });
		const slurred = setup(['f/5'], { stemDirection: Stem.DOWN });
		const plainMark = new NoteheadArticulation('a>')
			.setSide(plain.note)
			.setBetweenLines(false);
		const slurredMark = new NoteheadArticulation('a>')
			.setSide(slurred.note)
			.setBetweenLines(false)
			.clearSlur('notehead');
		const plainY = drawArticulation(plain.note, plainMark).y;
		const slurredY = drawArticulation(slurred.note, slurredMark).y;
		expect(slurredMark.sitsOutsideSlur(slurred.note)).toBe(true);
		expect(plainMark.sitsOutsideSlur(plain.note)).toBe(false);
		expect(plainY - slurredY).toBe(1.2 * plain.stave.getSpacingBetweenLines());

		// A slur on the opposite side leaves the accent in place.
		const opposite = setup(['f/5'], { stemDirection: Stem.DOWN });
		const oppositeMark = new NoteheadArticulation('a>')
			.setSide(opposite.note)
			.setBetweenLines(false)
			.clearSlur('below');
		expect(oppositeMark.sitsOutsideSlur(opposite.note)).toBe(false);
		expect(drawArticulation(opposite.note, oppositeMark).y).toBe(plainY);
	});

	it('centres a fermata over a two-note tremolo and clears beams without ratcheting on redraw', () => {
		const stave = new Stave(0, 80, 300);
		const a4 = new StaveNote({
			keys: ['a/4'],
			duration: 'h',
			stemDirection: Stem.DOWN,
		});
		const c5 = new StaveNote({
			keys: ['c/5'],
			duration: 'h',
			stemDirection: Stem.DOWN,
		});
		a4.setStave(stave);
		c5.setStave(stave);
		const fermata = new StaveArticulation('a@a')
			.markFermata()
			.setPosition(Modifier.Position.ABOVE);
		a4.addModifier(fermata, 0);
		new TickContext().addTickable(a4).preFormat().setX(50);
		new TickContext().addTickable(c5).preFormat().setX(130);
		const tremolo = new BowedTremolo(a4, c5, 2);
		tremolo.extendStems();
		tremolo.placeFermatas();
		fermata.setContext(ctx);
		fermata.draw();
		const box = fermata.getBoundingBox();
		const expectedX =
			((a4.getNoteHeadBeginX() + a4.getNoteHeadEndX()) / 2 +
				(c5.getNoteHeadBeginX() + c5.getNoteHeadEndX()) / 2) /
			2;
		expect(fermata.getX() + fermata.getXShift()).toBeCloseTo(expectedX, 1);
		// Redrawing on a spill pass must not ratchet x or y.
		fermata.draw();
		expect(fermata.getBoundingBox().getX()).toBe(box.getX());
		expect(fermata.getBoundingBox().getY()).toBe(box.getY());

		// Stems-up pair with ABOVE fermata centres over the beams and clears the high beam tip.
		const up1 = new StaveNote({
			keys: ['e/5'],
			duration: 'h',
			stemDirection: Stem.UP,
		});
		const up2 = new StaveNote({
			keys: ['a/5'],
			duration: 'h',
			stemDirection: Stem.UP,
		});
		up1.setStave(stave);
		up2.setStave(stave);
		const upFermata = new StaveArticulation('a@a')
			.markFermata()
			.setPosition(Modifier.Position.ABOVE);
		up1.addModifier(upFermata, 0);
		new TickContext().addTickable(up1).preFormat().setX(50);
		new TickContext().addTickable(up2).preFormat().setX(130);
		const upTremolo = new BowedTremolo(up1, up2, 2);
		upTremolo.extendStems();
		upTremolo.placeFermatas();
		upFermata.setContext(ctx);
		upFermata.draw();
		const upBox = upFermata.getBoundingBox();
		const beamMidX = (up1.getStemX() + up2.getStemX()) / 2;
		expect(upFermata.getX() + upFermata.getXShift()).toBeCloseTo(beamMidX, 1);
		expect(upBox.getY() + upBox.getH()).toBeLessThan(
			Math.min(up1.getStemExtents().topY, up2.getStemExtents().topY),
		);
	});

	it('applies stackShiftY to draw and inkBounds without ratcheting across redraws', () => {
		const { note } = setup(['d/5'], { stemDirection: Stem.DOWN });
		const bow = new StaveArticulation('am')
			.markBowing()
			.setPosition(Modifier.Position.ABOVE);
		expect(bow.bowing).toBe(true);
		note.addModifier(bow, 0);
		new TickContext().addTickable(note).preFormat().setX(50);
		bow.setContext(ctx);
		const baseBounds = bow.inkBounds(false);
		bow.setStackShiftY(-14);
		expect(bow.inkBounds(false).y).toBeCloseTo(baseBounds.y, 4);
		expect(bow.inkBounds(true).y).toBeCloseTo(baseBounds.y - 14, 4);
		bow.draw();
		const firstY = bow.getBoundingBox().getY();
		bow.draw();
		expect(bow.getBoundingBox().getY()).toBe(firstY);
	});

	it('aligns an open-string mark horizontally with its displaced notehead in an adjacent-second chord', () => {
		const up = setup(['g/4', 'a/4'], { duration: 'h', stemDirection: Stem.UP });
		const upperMark = new StaveArticulation('ah')
			.markAlignToNotehead()
			.setPosition(Modifier.Position.ABOVE);
		up.note.addModifier(upperMark, 1);
		new TickContext().addTickable(up.note).preFormat().setX(50);
		upperMark.setContext(ctx);
		const upperHead = up.note.noteHeads[1];
		expect(upperHead?.isDisplaced()).toBe(true);
		const expectedShift = upperHead?.getDisplacementX() ?? 0;
		expect(expectedShift).toBeGreaterThan(0);

		const boundsBefore = upperMark.inkBounds();
		upperMark.draw();
		expect(upperMark.getXShift()).toBeCloseTo(expectedShift, 4);
		const firstX = upperMark.getBoundingBox().getX();
		expect(boundsBefore.x).toBeCloseTo(firstX, 4);
		// Redrawing on a spill pass must not ratchet x.
		upperMark.draw();
		expect(upperMark.getBoundingBox().getX()).toBe(firstX);

		// Non-displaced lower head on a stem-up second stays at xShift 0.
		const lowerUp = setup(['d/4', 'e/4'], {
			duration: 'h',
			stemDirection: Stem.UP,
		});
		const lowerMark = new StaveArticulation('ah')
			.markAlignToNotehead()
			.setPosition(Modifier.Position.BELOW);
		lowerUp.note.addModifier(lowerMark, 0);
		new TickContext().addTickable(lowerUp.note).preFormat().setX(50);
		lowerMark.setContext(ctx);
		lowerMark.draw();
		expect(lowerMark.getXShift()).toBe(0);

		// Stem-down second displaces the lower notehead to the left.
		const down = setup(['d/4', 'e/4'], {
			duration: 'h',
			stemDirection: Stem.DOWN,
		});
		const downMark = new StaveArticulation('ah')
			.markAlignToNotehead()
			.setPosition(Modifier.Position.BELOW);
		down.note.addModifier(downMark, 0);
		new TickContext().addTickable(down.note).preFormat().setX(50);
		downMark.setContext(ctx);
		const downHead = down.note.noteHeads[0];
		expect(downHead?.isDisplaced()).toBe(true);
		expect(downHead?.getDisplacementX()).toBeLessThan(0);
		downMark.draw();
		expect(downMark.getXShift()).toBeCloseTo(
			downHead?.getDisplacementX() ?? 0,
			4,
		);
	});
});

interface SetupOptions {
	duration?: string;
	stemDirection?: number;
	beamed?: boolean;
}

function setup(keys: string[], opts: SetupOptions = {}) {
	const stave = new Stave(0, 0, 200);
	const note = new StaveNote({
		keys,
		duration: opts.duration ?? 'q',
		stemDirection: opts.stemDirection ?? Stem.UP,
	});
	note.setStave(stave);
	new TickContext().addTickable(note).preFormat().setX(50);
	if (opts.beamed) {
		const sibling = new StaveNote({
			keys,
			duration: opts.duration ?? '8',
			stemDirection: opts.stemDirection ?? Stem.UP,
		});
		sibling.setStave(stave);
		new TickContext().addTickable(sibling).preFormat().setX(90);
		new Beam([note, sibling]);
	}
	return { stave, note };
}
