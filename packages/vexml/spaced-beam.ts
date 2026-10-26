import { Beam, type RenderContext } from 'vexflow/core';

/*
 * A beam whose levels sit a set distance apart (`<distance type="beam">`), top to top.
 * vexflow spaces them at 1.5 beam widths, hardcoded into its drawBeamLines, so this draws the
 * lines itself off the same slope and stem math, with `levelOffset` the one place a level's
 * offset from the primary beam is decided (FeatheredBeam fans it). A null distance keeps
 * vexflow's 1.5 widths.
 * Stem reach and the flat-beam floor use that same distance.
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

	override calculateFlatSlope(): void {
		// VexFlow uses beamWidth only as a level spacing in this calculation. Supply
		// our distance in its units, restoring the actual ink thickness before drawing.
		const width = this.renderOptions.beamWidth;
		this.renderOptions.beamWidth = this.levelDistance() / 1.5;
		try {
			super.calculateFlatSlope();
		} finally {
			this.renderOptions.beamWidth = width;
		}
	}

	override applyStemExtensions(): void {
		super.applyStemExtensions();
		if (this.distance === null) {
			return;
		}
		const { beamWidth, showStemlets, stemletExtension } = this.renderOptions;
		for (const note of this.notes) {
			const stem = note.getStem();
			if (!stem) {
				continue;
			}
			const x = note.getStemX();
			if (note.getStemDirection() !== this.getStemDirection()) {
				const level = note.getGlyphProps().beamCount - 1;
				const reach = Math.abs(this.levelOffset(level, x));
				stem.setExtension(
					stem.getExtension() + reach - level * beamWidth * 1.5,
				);
			}
			if (note.isRest() && showStemlets) {
				const reach = Math.abs(this.levelOffset(this.getBeamCount() - 1, x));
				stem.setStemlet(true, reach + beamWidth + stemletExtension);
			}
		}
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
