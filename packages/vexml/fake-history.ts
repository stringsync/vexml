import type { Measure, Part } from '@stringsync/mdom';
import { FakeReadCounter } from './fake-read-counter';

/* Fake view of a measure whose part counts reads of its measure history (`part.measures`), so a
 * test can check how often code walks back through the part. The part's history holds this view
 * in the real measure's place, so code finding the measure in it still does. Test-only. */
export class FakeHistory {
	readonly measure: Measure;
	private readonly part: FakeReadCounter<Part>;

	constructor(measure: Measure) {
		const history = measure.part.measures;
		const part = (): Part => this.part.view;
		this.measure = new FakeReadCounter(measure, {
			get part() {
				return part();
			},
		}).view;
		this.part = new FakeReadCounter(measure.part, {
			measures: history.map((m) => (m === measure ? this.measure : m)),
		});
	}

	get reads(): number {
		return this.part.readsOf('measures');
	}
}
