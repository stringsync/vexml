import { Credentials, SystemSecretStore } from 'core/creds';
import { z } from 'zod';
import {
	JEV_MODEL,
	type JevAnswers,
	type JevClient,
	type JevQueryRequest,
	type JevQuestion,
	type JevRequest,
	parseJevAnswers,
	toNoulQuery,
} from './jev-client';

const DEFAULT_SYSTEMONE_URL = 'https://api.typesafe.ai/v1/systemone';

/** Minimal HTTP response surface consumed by `TypesafeJev`. */
export interface JevHttpResponse {
	ok: boolean;
	status: number;
	json(): Promise<unknown>;
}

/** Focused POST transport used by `TypesafeJev`, replaceable in offline tests. */
export type JevHttpPost = (
	url: string,
	init: {
		method: 'POST';
		redirect: 'error';
		headers: Record<string, string>;
		body: string;
	},
) => Promise<JevHttpResponse>;

/** Transport and endpoint configuration for `TypesafeJev`. */
export interface TypesafeJevOptions {
	/** System One endpoint URL; defaults to `https://api.typesafe.ai/v1/systemone`. */
	url?: string;
	/** HTTP transport used for requests; defaults to `globalThis.fetch`. */
	post?: JevHttpPost;
	/** Pinned model name sent on each request; defaults to `JEV_MODEL`. */
	model?: string;
}

/** System One over HTTP; reads the key in process from the system secret store. */
export class TypesafeJev implements JevClient {
	readonly model: string;
	private readonly url: string;
	private readonly post: JevHttpPost;

	constructor(
		private readonly credentials: Credentials,
		opts: TypesafeJevOptions = {},
	) {
		this.model = opts.model ?? JEV_MODEL;
		this.url = opts.url ?? DEFAULT_SYSTEMONE_URL;
		this.post = opts.post ?? globalThis.fetch;
	}

	static async create(opts: TypesafeJevOptions = {}): Promise<TypesafeJev> {
		return new TypesafeJev(
			new Credentials([
				await SystemSecretStore.forProject(),
				SystemSecretStore.device(),
			]),
			opts,
		);
	}

	async available(): Promise<boolean> {
		return Boolean(await this.credentials.get('TYPESAFE_API_KEY'));
	}

	async ask(request: JevRequest): Promise<Record<string, number>> {
		const answers = await this.query(toNoulQuery(request));
		return Object.fromEntries(
			Object.entries(answers).map(([id, answer]) => [id, answer.noul]),
		);
	}

	async query<Q extends Record<string, JevQuestion>>(
		request: JevQueryRequest<Q>,
	): Promise<JevAnswers<Q>> {
		const assets: Record<
			string,
			{ type: 'image'; format: 'png'; data_base64: string }
		> = {};
		const state: Record<string, unknown> = { ...(request.state ?? {}) };
		for (const [name, png] of Object.entries(request.images)) {
			if (name in state) {
				throw new Error(
					`Jev image name ${JSON.stringify(name)} collides with state key`,
				);
			}
			const reference = `__vex_image_${name}__`;
			state[name] = reference;
			assets[reference] = {
				type: 'image',
				format: 'png',
				data_base64: png.toString('base64'),
			};
		}
		const questions = Object.fromEntries(
			Object.entries(request.questions).map(([id, question]) => [
				id,
				serializeQuestion(question),
			]),
		);
		const response = await this.post(this.url, {
			method: 'POST',
			redirect: 'error',
			headers: {
				Authorization: `Bearer ${await this.credentials.require('TYPESAFE_API_KEY')}`,
				'Content-Type': 'application/json',
				'TypeSafe-Danger-Zone-Images': 'true',
			},
			body: JSON.stringify({
				model: this.model,
				state,
				assets,
				questions,
			}),
		});
		// Never echo an upstream body: errors can include request data or credentials.
		if (!response.ok) {
			throw new Error(`TypeSafe System One returned HTTP ${response.status}`);
		}
		const result = RawResponse.parse(await response.json());
		if (result.model !== this.model) {
			throw new Error('TypeSafe answered with an unexpected model');
		}
		return parseJevAnswers(request.questions, result.answers);
	}
}

const RawResponse = z.object({
	model: z.string(),
	answers: z.record(z.string(), z.unknown()),
});

function serializeQuestion(question: JevQuestion): Record<string, unknown> {
	if (question.type === 'noul') {
		return question.criteria
			? {
					type: 'noul',
					instructions: question.instructions,
					criteria: question.criteria,
				}
			: { type: 'noul', instructions: question.instructions };
	}
	if (question.type === 'choice') {
		if (Object.keys(question.criteria).length === 0) {
			throw new Error('Jev choice question requires at least one criterion');
		}
		return {
			type: 'choice',
			instructions: question.instructions,
			criteria: question.criteria,
		};
	}
	return {
		type: 'box',
		instructions: question.instructions,
	};
}
