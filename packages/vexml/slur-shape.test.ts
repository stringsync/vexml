import { beforeEach, describe, expect, it } from 'bun:test';
import {
	CanvasContext,
	Formatter,
	Modifier,
	Stave,
	StaveNote,
	Voice,
} from 'vexflow/core';
import { SLUR_FERMATA_GAP } from './constants';
import { FakePaintProbe } from './fake-paint-probe';
import { PaintContext } from './paint-context';
import { PaintList } from './paint-list';
import { ProbeTextCanvas } from './probe-text-canvas';
import { SlurBow } from './slur-bow';
import { SlurObstacles } from './slur-obstacles';
import { SlurShape } from './slur-shape';
import { StaveArticulation } from './stave-articulation';

describe('SlurShape interior fermata clearance', () => {
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

	it('arches cleanly above an interior upright fermata even on a compact slur', () => {
		const stave = new Stave(10, 40, 120);
		stave.setContext(ctx).draw();
		const n1 = new StaveNote({
			keys: ['d/5'],
			duration: 'q',
			stemDirection: -1,
		});
		const n2 = new StaveNote({
			keys: ['f/5'],
			duration: 'h',
			stemDirection: -1,
		});
		const n3 = new StaveNote({
			keys: ['e/5'],
			duration: 'q',
			stemDirection: -1,
		});
		const fermata = new StaveArticulation('a@a')
			.markFermata()
			.setPosition(Modifier.Position.ABOVE);
		n2.addModifier(fermata);
		const voice = new Voice({ numBeats: 4, beatValue: 4 }).addTickables([
			n1,
			n2,
			n3,
		]);
		new Formatter().joinVoices([voice]).format([voice], 90);
		voice.draw(ctx, stave);

		const obstacles = new SlurObstacles();
		const bow = new SlurBow(obstacles, {
			from: n1,
			to: n3,
			isGrace: false,
			crossStave: false,
			mayGhost: false,
			bulgeUp: true,
			ghost: false,
			tiedFrom: false,
			tiedTo: false,
		});
		const chord = {
			xL: n1.getAbsoluteX(),
			xR: n3.getAbsoluteX(),
			yL: bow.endpointY(n1),
			yR: bow.endpointY(n3),
		};
		const shape = new SlurShape(bow, [n1, n2, n3], chord);
		const box = fermata.getBoundingBox();
		const minClearance = Math.min(
			...[0.25, 0.5, 0.75].map((f) => {
				const x = box.getX() + f * box.getW();
				const s = (x - chord.xL) / (chord.xR - chord.xL);
				const chordY = chord.yL + s * (chord.yR - chord.yL);
				return box.getY() - (chordY - shape.riseAt(s));
			}),
		);
		expect(minClearance).toBeGreaterThanOrEqual(SLUR_FERMATA_GAP - 0.1);
		expect(shape.blocked).toBe(false);
	});

	it('arches cleanly below an interior inverted fermata on a below-stave slur', () => {
		const stave = new Stave(10, 40, 120);
		stave.setContext(ctx).draw();
		const n1 = new StaveNote({
			keys: ['f/4'],
			duration: 'q',
			stemDirection: 1,
		});
		const n2 = new StaveNote({
			keys: ['d/4'],
			duration: 'h',
			stemDirection: 1,
		});
		const n3 = new StaveNote({
			keys: ['e/4'],
			duration: 'q',
			stemDirection: 1,
		});
		const fermata = new StaveArticulation('a@u')
			.markFermata()
			.setPosition(Modifier.Position.BELOW);
		n2.addModifier(fermata);
		const voice = new Voice({ numBeats: 4, beatValue: 4 }).addTickables([
			n1,
			n2,
			n3,
		]);
		new Formatter().joinVoices([voice]).format([voice], 90);
		voice.draw(ctx, stave);

		const obstacles = new SlurObstacles();
		const bow = new SlurBow(obstacles, {
			from: n1,
			to: n3,
			isGrace: false,
			crossStave: false,
			mayGhost: false,
			bulgeUp: false,
			ghost: false,
			tiedFrom: false,
			tiedTo: false,
		});
		const chord = {
			xL: n1.getAbsoluteX(),
			xR: n3.getAbsoluteX(),
			yL: bow.endpointY(n1),
			yR: bow.endpointY(n3),
		};
		const shape = new SlurShape(bow, [n1, n2, n3], chord);
		const box = fermata.getBoundingBox();
		const fermataBottom = box.getY() + box.getH();
		const minClearance = Math.min(
			...[0.25, 0.5, 0.75].map((f) => {
				const x = box.getX() + f * box.getW();
				const s = (x - chord.xL) / (chord.xR - chord.xL);
				const chordY = chord.yL + s * (chord.yR - chord.yL);
				return chordY + shape.riseAt(s) - fermataBottom;
			}),
		);
		expect(minClearance).toBeGreaterThanOrEqual(SLUR_FERMATA_GAP - 0.1);
		expect(shape.blocked).toBe(false);
	});
});
