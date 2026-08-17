type Fill = { x: number; y: number; w: number; h: number; style: string };
type Clear = { x: number; y: number; w: number; h: number };

/* Fake fulfilling the 2D context a Layer hands out (preferred over mocks). bun's runtime has no
 * canvas, so this stands in for one and logs what was painted: `ops` in call order for tests that
 * care about sequence, `fills`/`clears` with their rects for tests that care about geometry. Only
 * the members vexml's own drawing touches are implemented, so it is cast to
 * CanvasRenderingContext2D at the seam. Test-only — excluded from the published package via
 * package.json "files". */
export class RecordingContext {
	fillStyle: string | CanvasGradient | CanvasPattern = '#000000';
	font = '';
	textAlign = 'left';
	textBaseline = 'alphabetic';
	readonly canvas = { width: 800, height: 600 } as HTMLCanvasElement;

	/* In call order: 'clear', 'fill:<shape>:<style>', or 'text:<text>:<style>:<font>'. */
	readonly ops: string[] = [];
	readonly fills: Fill[] = [];
	readonly clears: Clear[] = [];

	private shape = '';

	/* The context a seam expecting the real DOM type takes. */
	get ctx(): CanvasRenderingContext2D {
		return this as unknown as CanvasRenderingContext2D;
	}

	save(): void {}
	restore(): void {}
	setTransform(): void {}
	rect(): void {}
	clip(): void {}
	beginPath(): void {}

	clearRect(x = 0, y = 0, w = 0, h = 0): void {
		this.ops.push('clear');
		this.clears.push({ x, y, w, h });
	}

	fillRect(x: number, y: number, w: number, h: number): void {
		this.fills.push({ x, y, w, h, style: String(this.fillStyle) });
	}

	ellipse(): void {
		this.shape = 'ellipse';
	}

	arc(): void {
		this.shape = 'arc';
	}

	fill(): void {
		this.ops.push(`fill:${this.shape}:${String(this.fillStyle)}`);
	}

	fillText(text: string): void {
		this.ops.push(`text:${text}:${String(this.fillStyle)}:${this.font}`);
	}
}
