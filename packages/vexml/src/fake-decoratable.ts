import type { Rect } from 'webappwiz/geometry';
import type { Decoratable } from './decoration';
import type { NoteGlyph } from './geometry-collector';

// A quarter notehead in the engraving font: what a real Note carries, and enough for a test to
// tell a stamped glyph apart from the fallback.
const NOTEHEAD: NoteGlyph = { text: 'q', font: '30px Bravura', x: 12, y: 20 };

/* Fake fulfilling the Decoratable seam (preferred over mocks): a box that stamps itself the way
 * the real elements do — the glyph in the given color, or a filled ellipse over the box when
 * there's none, which is what a rest gets. Pass `null` for the glyph to take that fallback.
 * Test-only — excluded from the published package via package.json "files". */
export class FakeDecoratable implements Decoratable {
	constructor(
		readonly rect: Rect,
		private readonly glyph: NoteGlyph | null = NOTEHEAD,
	) {}

	getBoundingClientRect(): DOMRect {
		return {} as DOMRect;
	}

	drawColor(ctx: CanvasRenderingContext2D, color: string): void {
		ctx.fillStyle = color;
		if (this.glyph) {
			ctx.font = this.glyph.font;
			ctx.fillText(this.glyph.text, this.glyph.x, this.glyph.y);
			return;
		}
		ctx.beginPath();
		ctx.ellipse(
			this.rect.x + this.rect.w / 2,
			this.rect.y + this.rect.h / 2,
			this.rect.w / 2,
			this.rect.h / 2,
			0,
			0,
			2 * Math.PI,
		);
		ctx.fill();
	}
}
