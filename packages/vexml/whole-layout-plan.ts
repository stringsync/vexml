import type { LayoutForecast, LayoutPlan } from './layout-plan';
import type { ScoreLayout } from './layout-planner';

/* A layout planned whole: complete from the start, so there is nothing left to place. */
export class WholeLayoutPlan implements LayoutPlan {
	private readonly systemCount: number;

	constructor(readonly layout: ScoreLayout) {
		this.systemCount =
			layout.boxes.reduce(
				(n, b) => (b ? Math.max(n, b.systemIndex + 1) : n),
				0,
			) || 1;
	}

	placedSystems(): number {
		return this.systemCount;
	}

	isComplete(): boolean {
		return true;
	}

	placeThrough(): void {}

	complete(): ScoreLayout {
		return this.layout;
	}

	forecast(): LayoutForecast {
		return {
			boxes: this.layout.boxes,
			systemCount: this.systemCount,
			version: 0,
		};
	}

	systemOfMeasure(m: number): number {
		const { boxes } = this.layout;
		for (let i = Math.min(m, boxes.length - 1); i >= 0; i--) {
			const box = boxes[i];
			if (box) {
				return box.systemIndex;
			}
		}
		return 0;
	}
}
