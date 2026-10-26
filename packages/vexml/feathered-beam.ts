import type { Beam } from 'vexflow/core';
import { SpacedBeam } from './spaced-beam';

export type BeamFan = 'accel' | 'rit';

/*
 * A feathered beam (<beam fan="accel|rit">): the secondary beams start at the primary and
 * spread apart across the group (accel), or start spread and close onto the primary (rit),
 * so the group speeds up or slows down. vexflow only draws parallel beams, so this keeps the
 * primary beam where vexflow puts it and slides every other level's offset along the run
 * instead, off the same slope and stem math the plain Beam uses.
 */
export class FeatheredBeam extends SpacedBeam {
	constructor(
		notes: ConstructorParameters<typeof Beam>[0],
		autoStem: boolean,
		private readonly fan: BeamFan,
	) {
		super(notes, autoStem);
	}

	/* A level's full offset where the beams are a level apart, none where they meet. */
	protected override levelOffset(level: number, x: number): number {
		const first = this.notes[0];
		const last = this.notes[this.notes.length - 1];
		const firstX = first?.getStemX() ?? x;
		const span = (last?.getStemX() ?? x) - firstX;
		const t = span > 0 ? Math.min(Math.max((x - firstX) / span, 0), 1) : 1;
		return super.levelOffset(level, x) * (this.fan === 'accel' ? t : 1 - t);
	}
}
