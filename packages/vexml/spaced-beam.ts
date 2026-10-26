import { Beam, type RenderContext } from 'vexflow/core';

/*
 * A beam whose levels sit a set distance apart (`<distance type="beam">`), top to top.
 * vexflow spaces them at 1.5 beam widths, hardcoded into its drawBeamLines, so this draws the
 * lines itself off the same slope and stem math, with `levelOffset` the one place a level's
 * offset from the primary beam is decided (FeatheredBeam fans it). A null distance keeps
 * vexflow's 1.5 widths.
 * ponytail: vexflow's stemlets, cross-stem extensions and flat-beam stem floor still reckon
 * the inner beams at 1.5 widths; only the drawn lines move.
 */
export class SpacedBeam extends Beam {
	private distance: number | null = null;

	setDistance(distance: number | null): this {
		this.distance = distance;
		return this;
	}

	/* The distance from one level's top to the next's, toward the noteheads. */
	levelDistance(): number {
		return this.distance ?? this.renderOptions.beamWidth * 1.5;
	}

	/* How far level `level` (0 for the primary) sits from the primary at `x`, signed with the
	 * stem: the whole distance per level for a plain beam. */
	protected levelOffset(level: number, _x: number): number {
		return (
			level * this.levelDistance() * (this.notes[0]?.getStemDirection() ?? 1)
		);
	}

	protected override drawBeamLines(ctx: RenderContext): void {
		const first = this.notes[0];
		if (!first) {
			return;
		}
		const firstX = first.getStemX();
		const baseY = this.getBeamYToDraw();
		const thickness = this.renderOptions.beamWidth * first.getStemDirection();
		const levels = ['4', '8', '16', '32', '64'];
		levels.forEach((duration, level) => {
			for (const line of this.getBeamLines(duration)) {
				const end = line.end ?? line.start;
				const topAt = (x: number) =>
					this.getSlopeY(x, firstX, baseY, this.slope) +
					this.levelOffset(level, x);
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
