import { Disposer, type Resource } from 'webappwiz/disposable';

/* What the fit reports its measurement to. RenderConfig implements it. */
export interface HeightSink {
	setHeight(height: number): void;
}

/* Leaves a little air above the floating controls. */
const AIR_PX = 16;

/*
 * Sizes the score's scroll box to the gap between the top of the canvas and the top of the player
 * controls, so the music fills the space above them and page-turns within it.
 *
 * Re-measures on any container dimension change (width resize, editor toggle, its own height
 * update) and on a window resize, which moves the player without resizing the container. The
 * mobile sheet moves the player without firing either, so the component calls `remeasure` when the
 * sheet's transition ends.
 */
export class ScoreFit implements Resource {
	private readonly disposer = new Disposer();

	constructor(
		private readonly container: HTMLDivElement,
		private readonly player: HTMLDivElement,
		private readonly sink: HeightSink,
	) {
		const observer = new ResizeObserver(() => this.remeasure());
		observer.observe(container);
		this.disposer.defer(() => observer.disconnect());
		const onResize = () => this.remeasure();
		window.addEventListener('resize', onResize);
		this.disposer.defer(() => window.removeEventListener('resize', onResize));
		this.remeasure();
	}

	remeasure(): void {
		const c = this.container.getBoundingClientRect();
		const p = this.player.getBoundingClientRect();
		// On mobile the player rides up with the open bottom sheet, so a gap measured against it
		// would collapse the scroll box to ~0 and stick, since closing the sheet fires no event
		// here. Skip those readings; the sheet's transition end re-measures once it is back at rest.
		if (p.top < c.top) {
			return;
		}
		this.sink.setHeight(Math.max(0, Math.round(p.top - c.top - AIR_PX)));
	}

	dispose(): void {
		this.disposer.dispose();
	}
}
