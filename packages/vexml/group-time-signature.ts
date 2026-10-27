import type { RenderContext, Stave, TimeSignature } from 'vexflow/core';
import { GroupTimePlaceholder } from './group-time-placeholder';

/*
 * One large time signature across a `<part-group>` that declares `<group-time/>`. Each of the
 * group's staves still reserves the signature's room (a GroupTimePlaceholder, so the system's
 * modifiers square up as ever) but paints nothing; the connector drawer then draws the real one
 * once, scaled to stand across the group's staves, centered on the group.
 */
export class GroupTimeSignature {
	/** Where the placeholders sit; null until a stave of the group has drawn its modifiers. */
	x: number | null = null;

	constructor(
		private readonly source: TimeSignatureSource,
		/** How much larger than a single stave's signature the group's draws. */
		readonly scale: number,
	) {}

	/** The scale for a group spanning this many staves: taller groups get larger digits, up to a cap. */
	static scaleFor(staveCount: number): number {
		return Math.min(2.5, 1 + 0.5 * staveCount);
	}

	placeholder(): TimeSignature {
		return new GroupTimePlaceholder(
			this,
			this.source.make().getWidth() * this.scale,
		);
	}

	draw(ctx: RenderContext, top: Stave, bottom: Stave): void {
		ctx.openGroup('vexml-time-signature');
		try {
			if (this.x === null) {
				return;
			}
			// The signature spans the top stave's middle line on its own; scaling about the
			// group's vertical center keeps it centered however many staves the group has.
			const middle = top.getYForLine(2);
			const center = (middle + bottom.getYForLine(2)) / 2;
			const k = this.scale;
			// The context scales about its origin, so the signature is drawn against a stand-in
			// stave whose lines already sit where the scaling carries them to the group's center.
			const frame = {
				getYForLine: (line: number) =>
					center / k + top.getYForLine(line) - middle,
				getSpacingBetweenLines: () => top.getSpacingBetweenLines(),
			} as unknown as Stave;
			ctx.save();
			ctx.scale(k, k);
			this.source.make().drawAt(ctx, frame, this.x / k);
			ctx.restore();
		} finally {
			ctx.closeGroup();
		}
	}
}

/** Builds a fresh time signature each time it is asked, since a vexflow one draws once. */
export interface TimeSignatureSource {
	make(): TimeSignature;
}
