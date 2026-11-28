import { z } from 'zod';

/** The pinned model and question revision make corpus measurements comparable. */
export const JEV_MODEL = 'jev-1.14.0';
export const JEV_QUESTIONS = 'musicxml-v1';

/** Evaluates image questions against System One; unavailable credentials skip optional stages. */
export interface JevClient {
	available(): Promise<boolean>;
	ask(request: JevRequest): Promise<Record<string, number>>;
	query<Q extends Record<string, JevQuestion>>(
		request: JevQueryRequest<Q>,
	): Promise<JevAnswers<Q>>;
}

/** Yes/no shorthand request used by semantic lint and corpus checks. */
export interface JevRequest {
	images: Record<string, Buffer>;
	questions: Record<string, string>;
}

/** A yes/no question answered with the probability of yes. */
export interface JevNoulQuestion {
	type: 'noul';
	instructions: string;
	criteria?: { true: string; false: string };
}

/** A multiple-choice question selecting one key from `criteria`. */
export interface JevChoiceQuestion {
	type: 'choice';
	instructions: string;
	criteria: Record<string, string | null>;
}

/** A spatial detection question returning fractional edges in the image. */
export interface JevBoxQuestion {
	type: 'box';
	instructions: string;
}

export type JevQuestion = JevNoulQuestion | JevChoiceQuestion | JevBoxQuestion;

/** Fractional bounding box edges in 0..1 from the image's top-left corner. */
export interface JevBox {
	top: number;
	left: number;
	right: number;
	bottom: number;
}

export interface JevNoulAnswer {
	type: 'noul';
	noul: number;
}

export interface JevChoiceAnswer {
	type: 'choice';
	choice: string;
	confidence: number;
	probabilities: Record<string, number>;
}

export interface JevBoxAnswer {
	type: 'box';
	box: JevBox;
	confidence: number;
}

export type JevAnswer = JevNoulAnswer | JevChoiceAnswer | JevBoxAnswer;

export type JevAnswerFor<Q extends JevQuestion> = Q extends JevNoulQuestion
	? JevNoulAnswer
	: Q extends JevChoiceQuestion
		? JevChoiceAnswer
		: Q extends JevBoxQuestion
			? JevBoxAnswer
			: JevAnswer;

export type JevAnswers<Q extends Record<string, JevQuestion>> = {
	[K in keyof Q]: JevAnswerFor<Q[K]>;
};

/** A mixed-primitive request evaluated against one set of images and optional state fields. */
export interface JevQueryRequest<
	Q extends Record<string, JevQuestion> = Record<string, JevQuestion>,
> {
	images: Record<string, Buffer>;
	state?: Record<string, unknown>;
	questions: Q;
}

const UnitNumber = z.number().min(0).max(1);

export const JevNoulAnswerSchema = z.object({
	type: z.literal('noul'),
	noul: UnitNumber,
});

export const JevChoiceAnswerSchema = z.object({
	type: z.literal('choice'),
	choice: z.string(),
	confidence: UnitNumber,
	probabilities: z.record(z.string(), UnitNumber),
});

export const JevBoxAnswerSchema = z.object({
	type: z.literal('box'),
	box: z
		.object({
			top: UnitNumber,
			left: UnitNumber,
			right: UnitNumber,
			bottom: UnitNumber,
		})
		.refine((box) => box.left <= box.right && box.top <= box.bottom, {
			message: 'box edges must satisfy left <= right and top <= bottom',
		}),
	confidence: UnitNumber,
});

export const JevAnswerSchema = z.discriminatedUnion('type', [
	JevNoulAnswerSchema,
	JevChoiceAnswerSchema,
	JevBoxAnswerSchema,
]);

/** Converts a noul-only `JevRequest` into a typed `JevQueryRequest`. */
export function toNoulQuery(
	request: JevRequest,
): JevQueryRequest<Record<string, JevNoulQuestion>> {
	return {
		images: request.images,
		questions: Object.fromEntries(
			Object.entries(request.questions).map(([id, instructions]) => [
				id,
				{ type: 'noul', instructions },
			]),
		),
	};
}

/** Validates that every requested question received a matching, well-formed answer. */
export function parseJevAnswers<Q extends Record<string, JevQuestion>>(
	questions: Q,
	rawAnswers: Record<string, unknown>,
): JevAnswers<Q> {
	const parsed: Record<string, JevAnswer> = {};
	for (const [id, question] of Object.entries(questions)) {
		const raw = rawAnswers[id];
		if (raw === undefined) {
			throw new Error(`TypeSafe omitted question ${id}`);
		}
		const answer = JevAnswerSchema.parse(raw);
		if (answer.type !== question.type) {
			throw new Error(
				`TypeSafe answered question ${id} with ${answer.type}, expected ${question.type}`,
			);
		}
		if (
			question.type === 'choice' &&
			answer.type === 'choice' &&
			!(answer.choice in question.criteria)
		) {
			throw new Error(
				`TypeSafe chose unknown option ${JSON.stringify(answer.choice)} for question ${id}`,
			);
		}
		parsed[id] = answer;
	}
	return parsed as JevAnswers<Q>;
}
