import type { Score } from '@stringsync/vexml';

/** The built timeline, rounded to whole ms: every step's start plus the total. */
export function swingSteps(score: Score) {
	return {
		steps: score
			.getSequence()
			.getSteps()
			.map((step) => Math.round(step.startMs)),
		durationMs: Math.round(score.getDurationMs()),
	};
}
