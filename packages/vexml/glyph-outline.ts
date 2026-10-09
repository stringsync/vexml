/* A glyph's outline as SVG path data, made a Path2D when first filled. */
export class GlyphOutline {
	private made: Path2D | null = null;
	private commands: Array<[string, number[]]> | null = null;

	constructor(private readonly data: string) {}

	path(): Path2D {
		this.made ??= new Path2D(this.data);
		return this.made;
	}

	/* Add the outline to the context's current path, under its current transform: what a
	 * recording context can bound, which a Path2D it can't see into is not. */
	trace(ctx: CanvasRenderingContext2D): void {
		this.commands ??= parse(this.data);
		for (const [command, args] of this.commands) {
			const [a = 0, b = 0, c = 0, d = 0, e = 0, f = 0] = args;
			switch (command) {
				case 'M':
					ctx.moveTo(a, b);
					break;
				case 'L':
					ctx.lineTo(a, b);
					break;
				case 'Q':
					ctx.quadraticCurveTo(a, b, c, d);
					break;
				case 'C':
					ctx.bezierCurveTo(a, b, c, d, e, f);
					break;
				case 'Z':
					ctx.closePath();
					break;
			}
		}
	}
}

// The path data TextOutliner writes: absolute M, L, Q, C and Z, numbers apart by spaces.
function parse(data: string): Array<[string, number[]]> {
	const commands: Array<[string, number[]]> = [];
	for (const token of data.match(/[MLQCZ]|-?[\d.]+(?:e-?\d+)?/g) ?? []) {
		const last = commands[commands.length - 1];
		if (/[MLQCZ]/.test(token)) {
			commands.push([token, []]);
		} else {
			last?.[1].push(Number(token));
		}
	}
	return commands;
}
