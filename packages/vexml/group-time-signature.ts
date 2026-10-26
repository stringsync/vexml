import type { RenderContext, Stave } from 'vexflow/core';
import { TimeSignature } from 'vexflow/core';

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
		private readonly make: () => TimeSignature,
		/** How much larger than a single stave's signature the group's draws. */
		readonly scale: number,
	) {}

	/** The scale for a group spanning this many staves: taller groups get larger digits, up to a cap. */
	static scaleFor(staveCount: number): number {
		return Math.min(2.5, 1 + 0.5 * staveCount);
	}

	placeholder(): TimeSignature {
		return new GroupTimePlaceholder(this, this.make().getWidth() * this.scale);
	}

	draw(ctx: RenderContext, top: Stave, bottom: Stave): void {
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
		this.make().drawAt(ctx, frame, this.x / k);
		ctx.restore();
	}
}

class GroupTimePlaceholder extends TimeSignature {
	constructor(
		private readonly group: GroupTimeSignature,
		width: number,
	) {
		super('4/4');
		this.width = width;
	}

	override setTimeSig(timeSpec: string): this {
		// The base constructor lays out '4/4' before the group is assigned; that layout is moot.
		return this.group ? this : super.setTimeSig(timeSpec);
	}

	override drawAt(_ctx: RenderContext, _stave: Stave, x: number): void {
		this.setRendered();
		this.group.x = x;
	}
}
