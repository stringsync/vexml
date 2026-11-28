import {
	type JevAnswer,
	type JevAnswers,
	type JevClient,
	type JevQueryRequest,
	type JevQuestion,
	type JevRequest,
	parseJevAnswers,
	toNoulQuery,
} from './jev-client';

export type FakeJevAnswerEntry = number | JevAnswer;
export type FakeJevAnswerMap = Record<string, FakeJevAnswerEntry>;
export type FakeJevResponder = (request: JevQueryRequest) => FakeJevAnswerMap;

/** Records requests and answers each with scripted or computed typed answers. */
export class FakeJev implements JevClient {
	readonly requests: JevRequest[] = [];
	readonly queries: JevQueryRequest[] = [];

	constructor(
		private readonly answers: FakeJevAnswerMap[] | FakeJevResponder = [],
		private readonly enabled = true,
	) {}

	async available(): Promise<boolean> {
		return this.enabled;
	}

	async ask(request: JevRequest): Promise<Record<string, number>> {
		this.requests.push(request);
		const answers = await this.query(toNoulQuery(request));
		return Object.fromEntries(
			Object.entries(answers).map(([id, answer]) => [id, answer.noul]),
		);
	}

	async query<Q extends Record<string, JevQuestion>>(
		request: JevQueryRequest<Q>,
	): Promise<JevAnswers<Q>> {
		this.queries.push(request);
		const supplied =
			typeof this.answers === 'function'
				? this.answers(request)
				: this.answers[this.queries.length - 1];
		const rawAnswers = Object.fromEntries(
			Object.entries(request.questions).map(([id, question]) => [
				id,
				resolveAnswer(question, supplied?.[id]),
			]),
		);
		return parseJevAnswers(request.questions, rawAnswers);
	}
}

function resolveAnswer(
	question: JevQuestion,
	supplied: FakeJevAnswerEntry | undefined,
): JevAnswer {
	if (typeof supplied === 'number') {
		return { type: 'noul', noul: supplied };
	}
	if (supplied !== undefined) {
		return supplied;
	}
	if (question.type === 'noul') {
		return { type: 'noul', noul: 0.99 };
	}
	if (question.type === 'choice') {
		const keys = Object.keys(question.criteria);
		const first = keys[0];
		if (first === undefined) {
			throw new Error('Jev choice question requires at least one criterion');
		}
		return {
			type: 'choice',
			choice: first,
			confidence: 1,
			probabilities: Object.fromEntries(
				keys.map((key) => [key, key === first ? 1 : 0]),
			),
		};
	}
	return {
		type: 'box',
		box: { top: 0.1, left: 0.1, right: 0.9, bottom: 0.9 },
		confidence: 0.95,
	};
}
