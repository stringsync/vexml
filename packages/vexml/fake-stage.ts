import { FakeHost } from './fake-host';
import { FakePaintProbe } from './fake-paint-probe';
import type { Fold } from './fold';
import type { Engraving } from './score-drawer';
import type { RenderStage } from './score-renderer';

/* Fake fulfilling the RenderStage seam: records engravings and folds, paints nothing, and reports
 * a fixed visible bottom so a progressive render knows how much is on screen. */
export class FakeStage extends FakeHost implements RenderStage {
	readonly container = {} as HTMLDivElement;
	readonly base = {} as HTMLElement;
	readonly probe = new FakePaintProbe();
	readonly folds: Fold[] = [];
	readonly engravings: Engraving[] = [];
	readonly pixelRatio = 1;

	constructor(private readonly bottom: number) {
		super();
	}

	engrave(engraving: Engraving): void {
		this.engravings.push(engraving);
	}

	extendEngraving(engraving: Engraving): void {
		this.engravings.push(engraving);
	}

	visibleBottom(): number {
		return this.bottom;
	}

	setFold(fold: Fold): void {
		this.folds.push(fold);
	}

	paperColor(): string {
		return '#ffffff';
	}

	paintEngraving(): void {}
}
