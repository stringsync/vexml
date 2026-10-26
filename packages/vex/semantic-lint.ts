import type { Rect } from 'webappwiz/geometry';
import type { JevClient } from './jev-client';
import { prepareJevImage } from './jev-image';
import type { Engine, LocatedFinding } from './lint';
import { VisibleThings } from './visible-things';

export const SAME_MUSIC =
	'Does `candidate` show the same notes, rests, accidentals and markings as `reference`? Ignore engraving style, spacing, line breaks, part labels, titles and page layout. Compare musical content only.';
// Presence uses the most sensitive tested threshold with no clean-control findings.
// Pairwise voting retains the Noul docs' three-way split; see semantic-calibration.json.
export const SEMANTIC_THRESHOLDS = { same: 0.7, different: 0.3, missing: 0.1 };

export interface MeasureImage {
	engine: Engine;
	png: Buffer;
	box: Rect;
}

export interface PairVote {
	a: Engine;
	b: Engine;
	probability: number;
}

export interface SemanticResult {
	findings: Partial<Record<Engine, LocatedFinding[]>>;
	votes: PairVote[];
	presence: Partial<
		Record<Engine, Array<{ question: string; probability: number }>>
	>;
}

/** Pairwise consensus has no privileged renderer; XML presence checks stand alone. */
export class SemanticLint {
	constructor(private readonly client: JevClient) {}

	async measure(
		number: string,
		xml: string,
		renders: MeasureImage[],
	): Promise<SemanticResult> {
		const images = renders.map((render) => ({
			...render,
			png: prepareJevImage(render.png),
		}));
		const votes: PairVote[] = [];
		for (let i = 0; i < images.length; i++) {
			const a = images[i];
			if (!a) {
				continue;
			}
			for (const b of images.slice(i + 1)) {
				const answer = await this.client.ask({
					images: { candidate: a.png, reference: b.png },
					questions: { same: SAME_MUSIC },
				});
				votes.push({
					a: a.engine,
					b: b.engine,
					probability: answer.same ?? NaN,
				});
			}
		}
		const findings: SemanticResult['findings'] = {};
		const presence: SemanticResult['presence'] = {};
		const questions = new VisibleThings().questions(xml);
		for (const render of images) {
			const found: LocatedFinding[] = [];
			if (
				isOutlier(
					render.engine,
					images.map((r) => r.engine),
					votes,
				)
			) {
				found.push({
					kind: 'differs',
					message:
						'musical content disagrees with the agreeing majority of renderers',
					box: render.box,
					measures: [number],
				});
			}
			const checks: Array<{ question: string; probability: number }> = [];
			// Keep each request small on dense measures and long orchestral scores.
			for (let start = 0; start < questions.length; start += 32) {
				const batch = questions.slice(start, start + 32);
				const answer = await this.client.ask({
					images: { candidate: render.png },
					questions: Object.fromEntries(
						batch.map((q, i) => [
							`q${i}`,
							`In the notation image \`candidate\`: ${q}`,
						]),
					),
				});
				for (const [i, question] of batch.entries()) {
					const probability = answer[`q${i}`] ?? NaN;
					checks.push({ question, probability });
					if (probability <= SEMANTIC_THRESHOLDS.missing) {
						found.push({
							kind: 'missing',
							message: `${question} (presence probability ${probability.toFixed(3)})`,
							box: render.box,
							measures: [number],
						});
					}
				}
			}
			findings[render.engine] = found;
			presence[render.engine] = checks;
		}
		return { findings, votes, presence };
	}
}

function isOutlier(
	engine: Engine,
	engines: Engine[],
	votes: PairVote[],
): boolean {
	const others = engines.filter((e) => e !== engine);
	// A strict majority must agree with each other and disagree with this renderer.
	// With four engines this admits the coherent three-versus-one case, not a 2:2 tie.
	if (others.length < 2) {
		return false;
	}
	const probability = (a: Engine, b: Engine) =>
		votes.find((v) => (v.a === a && v.b === b) || (v.a === b && v.b === a))
			?.probability ?? NaN;
	return others.every(
		(a, i) =>
			probability(engine, a) <= SEMANTIC_THRESHOLDS.different &&
			others
				.slice(i + 1)
				.every((b) => probability(a, b) >= SEMANTIC_THRESHOLDS.same),
	);
}
