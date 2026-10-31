import { disposables, type Resource } from 'core/disposable';
import type { IdleScheduler, IdleSlice } from './idle-scheduler';

/* Fake fulfilling the IdleScheduler seam (preferred over mocks): a test runs the slices itself,
 * each with the budget it names. Test-only, excluded from the published package via package.json
 * "files". */
export class FakeIdleScheduler implements IdleScheduler {
	private readonly slices: Array<(budget: IdleSlice) => void> = [];

	get pending(): number {
		return this.slices.length;
	}

	request(slice: (budget: IdleSlice) => void): Resource {
		this.slices.push(slice);
		return disposables.callback(() => {
			const at = this.slices.indexOf(slice);
			if (at >= 0) {
				this.slices.splice(at, 1);
			}
		});
	}

	/* Run the next slice with `budgetMs` to spend: 0 does the least a slice does, Infinity
	 * everything it can. False when none is waiting. */
	run(budgetMs: number): boolean {
		const slice = this.slices.shift();
		if (!slice) {
			return false;
		}
		slice({ timeRemaining: () => budgetMs });
		return true;
	}

	/* Run slices until none is waiting. */
	runAll(budgetMs = Number.POSITIVE_INFINITY): void {
		while (this.run(budgetMs)) {
			// Each slice asks for the next; the loop ends when one does not.
		}
	}
}
