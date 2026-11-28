import { describe, expect, it } from 'bun:test';
import { FakeJev } from './fake-jev';

describe('FakeJev', () => {
	it('supplies sensible typed defaults for noul, choice, and box questions', async () => {
		const fake = new FakeJev();
		const answers = await fake.query({
			images: { page: Buffer.from('img') },
			questions: {
				visible: { type: 'noul', instructions: 'visible?' },
				kind: {
					type: 'choice',
					instructions: 'which?',
					criteria: { match: 'same', shift: 'moved' },
				},
				region: { type: 'box', instructions: 'where?' },
			},
		});

		expect(answers).toEqual({
			visible: { type: 'noul', noul: 0.99 },
			kind: {
				type: 'choice',
				choice: 'match',
				confidence: 1,
				probabilities: { match: 1, shift: 0 },
			},
			region: {
				type: 'box',
				box: { top: 0.1, left: 0.1, right: 0.9, bottom: 0.9 },
				confidence: 0.95,
			},
		});
		expect(fake.queries).toHaveLength(1);
	});

	it('supports scripted mixed answers and responder callbacks', async () => {
		const scripted = new FakeJev([
			{
				ok: 0.25,
				verdict: {
					type: 'choice',
					choice: 'regression',
					confidence: 0.78,
					probabilities: { spacing_shift: 0.22, regression: 0.78 },
				},
				loc: {
					type: 'box',
					box: { top: 0.2, left: 0.3, right: 0.7, bottom: 0.5 },
					confidence: 0.87,
				},
			},
		]);

		const result = await scripted.query({
			images: { page: Buffer.from('p1') },
			questions: {
				ok: { type: 'noul', instructions: 'ok?' },
				verdict: {
					type: 'choice',
					instructions: 'verdict?',
					criteria: { spacing_shift: 'shift', regression: 'bug' },
				},
				loc: { type: 'box', instructions: 'where?' },
			},
		});
		expect(result.ok).toEqual({ type: 'noul', noul: 0.25 });
		expect(result.verdict.choice).toBe('regression');
		expect(result.loc.box).toEqual({
			top: 0.2,
			left: 0.3,
			right: 0.7,
			bottom: 0.5,
		});

		const dynamic = new FakeJev((request) => ({
			loc: {
				type: 'box',
				box: {
					top: 0.1,
					left: 0.1,
					right: 0.1 + Object.keys(request.images).length * 0.2,
					bottom: 0.5,
				},
				confidence: 0.9,
			},
		}));
		const dynResult = await dynamic.query({
			images: { a: Buffer.from('a'), b: Buffer.from('b') },
			questions: { loc: { type: 'box', instructions: 'find' } },
		});
		expect(dynResult.loc.box.right).toBeCloseTo(0.5, 6);
	});
});
