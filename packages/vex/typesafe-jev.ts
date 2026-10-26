import { Credentials, SystemSecretStore } from 'webappwiz/creds';
import { z } from 'zod';
import { JEV_MODEL, type JevClient, type JevRequest } from './jev-client';

/** System One over HTTP; reads the key in process from the system secret store. */
export class TypesafeJev implements JevClient {
	constructor(private readonly credentials: Credentials) {}

	static async create(): Promise<TypesafeJev> {
		return new TypesafeJev(
			new Credentials([
				await SystemSecretStore.forProject(),
				SystemSecretStore.device(),
			]),
		);
	}

	async available(): Promise<boolean> {
		return Boolean(await this.credentials.get('TYPESAFE_API_KEY'));
	}

	async ask(request: JevRequest): Promise<Record<string, number>> {
		const assets: Record<
			string,
			{ type: 'image'; format: 'png'; data_base64: string }
		> = {};
		const state: Record<string, string> = {};
		for (const [name, png] of Object.entries(request.images)) {
			const reference = `__vex_image_${name}__`;
			state[name] = reference;
			assets[reference] = {
				type: 'image',
				format: 'png',
				data_base64: png.toString('base64'),
			};
		}
		const response = await fetch('https://api.typesafe.ai/v1/systemone', {
			method: 'POST',
			redirect: 'error',
			headers: {
				Authorization: `Bearer ${await this.credentials.require('TYPESAFE_API_KEY')}`,
				'Content-Type': 'application/json',
				'TypeSafe-Danger-Zone-Images': 'true',
			},
			body: JSON.stringify({
				model: JEV_MODEL,
				state,
				assets,
				questions: Object.fromEntries(
					Object.entries(request.questions).map(([id, instructions]) => [
						id,
						{ type: 'noul', instructions },
					]),
				),
			}),
		});
		// Never echo an upstream body: errors can include request data or credentials.
		if (!response.ok) {
			throw new Error(`TypeSafe System One returned HTTP ${response.status}`);
		}
		const result = Response.parse(await response.json());
		if (result.model !== JEV_MODEL) {
			throw new Error(`TypeSafe answered with an unexpected model`);
		}
		return Object.fromEntries(
			Object.keys(request.questions).map((id) => {
				const answer = result.answers[id];
				if (!answer) {
					throw new Error(`TypeSafe omitted question ${id}`);
				}
				return [id, answer.noul];
			}),
		);
	}
}

const Response = z.object({
	model: z.string(),
	answers: z.record(
		z.string(),
		z.object({ type: z.literal('noul'), noul: z.number().min(0).max(1) }),
	),
});
