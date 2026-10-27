import { describe, expect, it } from 'bun:test';
import { join } from 'node:path';
import { formatScore, LintCorpus } from './lint-corpus';

const integration = join(import.meta.dir, '..', 'integration');

describe('LintCorpus', () => {
	// The lint's regression check: a defect it found where it is stays found, and a clean
	// render gains no finding. Read the score table for how good it is.
	it('finds every defect it has found and no new false positive', () => {
		const score = new LintCorpus({
			corpus: join(integration, '__lint__'),
			fixtures: join(integration, '__data__'),
			screenshots: join(integration, '__screenshots__'),
		}).score();
		const failures = { misses: score.misses, surprises: score.surprises };
		expect(failures, formatScore(score).join('\n')).toEqual({
			misses: [],
			surprises: [],
		});
		// Scoring every fixture takes ~5s alone, the default timeout, and longer under load.
	}, 60_000);
});
