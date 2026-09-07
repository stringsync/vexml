import type { EditingLayout } from './editing-layout';
import type { Score } from './score';

export class ScoreEditingLayout implements EditingLayout {
	constructor(private readonly score: Score) {}
	getSystems() {
		return this.score.getSystems().map((system) => system.getSources());
	}
}
