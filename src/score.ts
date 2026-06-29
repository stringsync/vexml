import type { Stage } from './stage';

/*
 * A rendered score: the handle render() returns. Owns the DOM vexml built (the Stage) and is
 * where pointer events, decorations, and custom layers will hang in the phases that follow.
 * dispose() tears the whole thing down — removing the managed canvas and restoring the
 * container — so a caller can re-render or unmount cleanly.
 */
export class Score {
	constructor(private readonly stage: Stage) {}

	dispose(): void {
		this.stage.dispose();
	}
}
