import { describe, expect, it } from 'bun:test';
import { Credentials } from 'core/creds';
import { FakeSecretStore } from 'core/creds/testing';
import { JEV_MODEL } from './jev-client';
import {
	type JevHttpPost,
	type JevHttpResponse,
	TypesafeJev,
} from './typesafe-jev';

describe('TypesafeJev', () => {
	it('allows semantic checks to be skipped when the credential source has no key', async () => {
		const client = new TypesafeJev(makeCredentials());
		expect(await client.available()).toBe(false);
	});

	it('sends mixed noul, choice, and box questions with image assets and parses typed answers', async () => {
		const { post, calls } = makeFakePost({
			ok: true,
			status: 200,
			json: async () => ({
				model: JEV_MODEL,
				answers: {
					present: { type: 'noul', noul: 0.94 },
					verdict: {
						type: 'choice',
						choice: 'spacing_shift',
						confidence: 0.82,
						probabilities: {
							clearly_matches: 0.08,
							spacing_shift: 0.82,
							regression: 0.1,
						},
					},
					example: {
						type: 'box',
						box: { top: 0.2, left: 0.1, right: 0.9, bottom: 0.45 },
						confidence: 0.91,
					},
				},
			}),
		});
		const client = new TypesafeJev(makeCredentials('secret-token'), { post });
		const png = Buffer.from([137, 80, 78, 71]);

		const answers = await client.query({
			images: { page: png },
			state: { caption: 'Example 1' },
			questions: {
				present: {
					type: 'noul',
					instructions: 'Is there a five-line stave in `page`?',
				},
				verdict: {
					type: 'choice',
					instructions: 'Classify the change in `page`',
					criteria: {
						clearly_matches: 'Identical musical engraving',
						spacing_shift: 'Minor horizontal or vertical spacing change only',
						regression: 'Visible defect or collision',
					},
				},
				example: {
					type: 'box',
					instructions: 'the music example in `page`',
				},
			},
		});

		expect(calls).toHaveLength(1);
		expect(calls[0]).toEqual({
			url: 'https://api.typesafe.ai/v1/systemone',
			headers: {
				Authorization: 'Bearer secret-token',
				'Content-Type': 'application/json',
				'TypeSafe-Danger-Zone-Images': 'true',
			},
			body: {
				model: JEV_MODEL,
				state: {
					caption: 'Example 1',
					page: '__vex_image_page__',
				},
				assets: {
					__vex_image_page__: {
						type: 'image',
						format: 'png',
						data_base64: png.toString('base64'),
					},
				},
				questions: {
					present: {
						type: 'noul',
						instructions: 'Is there a five-line stave in `page`?',
					},
					verdict: {
						type: 'choice',
						instructions: 'Classify the change in `page`',
						criteria: {
							clearly_matches: 'Identical musical engraving',
							spacing_shift: 'Minor horizontal or vertical spacing change only',
							regression: 'Visible defect or collision',
						},
					},
					example: {
						type: 'box',
						instructions: 'the music example in `page`',
					},
				},
			},
		});
		expect(answers).toEqual({
			present: { type: 'noul', noul: 0.94 },
			verdict: {
				type: 'choice',
				choice: 'spacing_shift',
				confidence: 0.82,
				probabilities: {
					clearly_matches: 0.08,
					spacing_shift: 0.82,
					regression: 0.1,
				},
			},
			example: {
				type: 'box',
				box: { top: 0.2, left: 0.1, right: 0.9, bottom: 0.45 },
				confidence: 0.91,
			},
		});
	});

	it('keeps ask() working for noul-only requests', async () => {
		const { post } = makeFakePost({
			ok: true,
			status: 200,
			json: async () => ({
				model: JEV_MODEL,
				answers: { same: { type: 'noul', noul: 0.88 } },
			}),
		});
		const client = new TypesafeJev(makeCredentials('secret-token'), { post });
		const result = await client.ask({
			images: { candidate: Buffer.from('a'), reference: Buffer.from('b') },
			questions: { same: 'Do they match?' },
		});
		expect(result).toEqual({ same: 0.88 });
	});

	it('rejects HTTP errors without echoing upstream response bodies', () => {
		const { post } = makeFakePost({
			ok: false,
			status: 429,
			json: async () => ({ error: 'leaked-secret-value' }),
		});
		const client = new TypesafeJev(makeCredentials('secret-token'), { post });
		expect(
			client.ask({
				images: { page: Buffer.from('x') },
				questions: { q: 'Check?' },
			}),
		).rejects.toThrow(/^TypeSafe System One returned HTTP 429$/);
	});

	it('rejects unexpected models, mismatched answer types, unknown choices, and inverted boxes', () => {
		const wrongModel = new TypesafeJev(makeCredentials('k'), {
			post: makeFakePost({
				ok: true,
				status: 200,
				json: async () => ({
					model: 'jev-0.0.1',
					answers: { q: { type: 'noul', noul: 0.5 } },
				}),
			}).post,
		});
		expect(
			wrongModel.ask({ images: {}, questions: { q: 'ok?' } }),
		).rejects.toThrow('unexpected model');

		const wrongType = new TypesafeJev(makeCredentials('k'), {
			post: makeFakePost({
				ok: true,
				status: 200,
				json: async () => ({
					model: JEV_MODEL,
					answers: { q: { type: 'noul', noul: 0.5 } },
				}),
			}).post,
		});
		expect(
			wrongType.query({
				images: {},
				questions: { q: { type: 'box', instructions: 'find it' } },
			}),
		).rejects.toThrow('expected box');

		const unknownChoice = new TypesafeJev(makeCredentials('k'), {
			post: makeFakePost({
				ok: true,
				status: 200,
				json: async () => ({
					model: JEV_MODEL,
					answers: {
						q: {
							type: 'choice',
							choice: 'other',
							confidence: 0.9,
							probabilities: { a: 0.1, b: 0.9 },
						},
					},
				}),
			}).post,
		});
		expect(
			unknownChoice.query({
				images: {},
				questions: {
					q: {
						type: 'choice',
						instructions: 'pick one',
						criteria: { a: 'first', b: 'second' },
					},
				},
			}),
		).rejects.toThrow('unknown option');

		const invertedBox = new TypesafeJev(makeCredentials('k'), {
			post: makeFakePost({
				ok: true,
				status: 200,
				json: async () => ({
					model: JEV_MODEL,
					answers: {
						q: {
							type: 'box',
							box: { top: 0.6, left: 0.8, right: 0.2, bottom: 0.4 },
							confidence: 0.9,
						},
					},
				}),
			}).post,
		});
		expect(
			invertedBox.query({
				images: {},
				questions: { q: { type: 'box', instructions: 'find it' } },
			}),
		).rejects.toThrow('left <= right');
	});

	it('rejects colliding image and state keys before sending', () => {
		const { post, calls } = makeFakePost({
			ok: true,
			status: 200,
			json: async () => ({ model: JEV_MODEL, answers: {} }),
		});
		const client = new TypesafeJev(makeCredentials('k'), { post });
		expect(
			client.query({
				images: { page: Buffer.from('a') },
				state: { page: 'conflict' },
				questions: { q: { type: 'box', instructions: 'find' } },
			}),
		).rejects.toThrow('collides with state key');
		expect(calls).toHaveLength(0);
	});
});

interface RecordedPost {
	url: string;
	headers: Record<string, string>;
	body: Record<string, unknown>;
}

function makeFakePost(response: JevHttpResponse): {
	post: JevHttpPost;
	calls: RecordedPost[];
} {
	const calls: RecordedPost[] = [];
	const post: JevHttpPost = async (url, init) => {
		calls.push({
			url,
			headers: init.headers,
			body: JSON.parse(init.body) as Record<string, unknown>,
		});
		return response;
	};
	return { post, calls };
}

function makeCredentials(key?: string): Credentials {
	const store = new FakeSecretStore();
	if (key !== undefined) {
		store.set('TYPESAFE_API_KEY', key);
	}
	return new Credentials([store]);
}
