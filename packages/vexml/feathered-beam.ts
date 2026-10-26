import { Beam, type RenderContext } from 'vexflow/core';

export type BeamFan = 'accel' | 'rit';

/*
 * A feathered beam (<beam fan="accel|rit">): the secondary beams start at the primary and
 * spread apart across the group (accel), or start spread and close onto the primary (rit),
 * so the group speeds up or slows down. vexflow only draws parallel beams, so this keeps the
 * primary beam where vexflow puts it and slides every other level's offset along the run
 * instead, off the same slope and stem math the plain Beam uses.
 */
export class FeatheredBeam extends Beam {
	constructor(
		notes: ConstructorParameters<typeof Beam>[0],
		autoStem: boolean,
		private readonly fan: BeamFan,
	) {
		super(notes, autoStem);
	}

	protected override drawBeamLines(ctx: RenderContext): void {
		const first = this.notes[0];
		const last = this.notes[this.notes.length - 1];
		if (!first || !last) {
			return;
		}
		const firstX = first.getStemX();
		const span = last.getStemX() - firstX;
		const baseY = this.getBeamYToDraw();
		const stem = first.getStemDirection();
		const thickness = this.renderOptions.beamWidth * stem;
		// 0 where the beams meet, 1 where they are a full level apart.
		const spread = (x: number) => {
			const t = span > 0 ? Math.min(Math.max((x - firstX) / span, 0), 1) : 1;
			return this.fan === 'accel' ? t : 1 - t;
		};
		const levels = ['4', '8', '16', '32', '64'];
		levels.forEach((duration, level) => {
			for (const line of this.getBeamLines(duration)) {
				const end = line.end ?? line.start;
				const topAt = (x: number) =>
					this.getSlopeY(x, firstX, baseY, this.slope) +
					level * thickness * 1.5 * spread(x);
				ctx.beginPath();
				ctx.moveTo(line.start, topAt(line.start));
				ctx.lineTo(line.start, topAt(line.start) + thickness);
				ctx.lineTo(end + 1, topAt(end) + thickness);
				ctx.lineTo(end + 1, topAt(end));
				ctx.closePath();
				ctx.fill();
			}
		});
	}
}
