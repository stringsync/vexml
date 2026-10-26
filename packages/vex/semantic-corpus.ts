import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { Rect } from 'webappwiz/geometry';
import { JEV_MODEL, JEV_QUESTIONS, type JevClient } from './jev-client';
import { prepareJevImage } from './jev-image';
import type { CorpusPaths, DefectLabel } from './lint-corpus';
import { SAME_MUSIC, SEMANTIC_THRESHOLDS } from './semantic-lint';
import { VisibleThings } from './visible-things';

export interface SemanticObservation {
	id: string;
	check: 'same' | 'presence';
	/** Unlabelled history pairs describe collisions, not necessarily missing music. */
	expected?: boolean;
	probability: number;
	question: string;
}

/** Reproducible probes on saved corpus pixels; no browser or fresh baselines needed. */
export class SemanticCorpus {
	constructor(
		private readonly client: JevClient,
		private readonly paths: CorpusPaths,
	) {}

	async score() {
		const observations: SemanticObservation[] = [];
		const labels = JSON.parse(
			readFileSync(join(this.paths.corpus, 'defects.json'), 'utf8'),
		) as DefectLabel[];
		for (const label of labels) {
			const box = new Rect(
				Math.max(0, label.box.x - 100),
				Math.max(0, label.box.y - 100),
				label.box.w + 200,
				label.box.h + 200,
			);
			const before = prepareJevImage(
				readFileSync(
					join(this.paths.corpus, 'defects', `${label.id}.before.png`),
				),
				box,
			);
			const after = prepareJevImage(
				readFileSync(
					join(this.paths.corpus, 'defects', `${label.id}.after.png`),
				),
				box,
			);
			const blank = whiteLike(after);
			for (const probe of [
				{ suffix: 'history', png: before, expected: undefined },
				{ suffix: 'clean', png: after, expected: true },
				{ suffix: 'blank', png: blank, expected: false },
			]) {
				const answer = await this.client.ask({
					images: { candidate: probe.png, reference: after },
					questions: { same: SAME_MUSIC },
				});
				observations.push({
					id: `${label.id}:${probe.suffix}`,
					check: 'same',
					expected: probe.expected,
					probability: answer.same ?? NaN,
					question: SAME_MUSIC,
				});
			}
		}
		// Fixed fixtures exercise lyrics, accidentals, fermatas and a typeless rest.
		for (const fixture of [
			'fermata',
			'lyrics_elision',
			'accidentals',
			'rest_measure_typeless',
		]) {
			const xml = readFileSync(
				join(this.paths.fixtures, `${fixture}.musicxml`),
				'utf8',
			);
			const png = prepareJevImage(
				readFileSync(join(this.paths.screenshots, `${fixture}.png`)),
			);
			const questions = new VisibleThings().questions(xml).slice(0, 24);
			for (const probe of [
				{ suffix: 'clean', png, expected: true },
				{ suffix: 'blank', png: whiteLike(png), expected: false },
			]) {
				const answer = await this.client.ask({
					images: { candidate: probe.png },
					questions: Object.fromEntries(
						questions.map((q, i) => [
							`q${i}`,
							`In the notation image \`candidate\`: ${q}`,
						]),
					),
				});
				for (const [i, question] of questions.entries()) {
					observations.push({
						id: `${fixture}:${probe.suffix}:q${i}`,
						check: 'presence',
						expected: probe.expected,
						probability: answer[`q${i}`] ?? NaN,
						question,
					});
				}
			}
		}
		return {
			model: JEV_MODEL,
			questions: JEV_QUESTIONS,
			thresholds: SEMANTIC_THRESHOLDS,
			// Sweep saved answers without spending more API calls. History pairs remain
			// unlabelled until someone supplies semantic ground truth for them.
			calibration: [0.03, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5].map((threshold) => ({
				threshold,
				differs: metrics(observations, 'same', threshold),
				missing: metrics(observations, 'presence', threshold),
			})),
			observations,
		};
	}
}

function whiteLike(png: Buffer): Buffer {
	const source = PNG.sync.read(png);
	source.data.fill(255);
	return PNG.sync.write(source);
}

function metrics(
	observations: SemanticObservation[],
	check: SemanticObservation['check'],
	threshold: number,
) {
	const labelled = observations.filter(
		(o) => o.check === check && o.expected !== undefined,
	);
	const truePositives = labelled.filter(
		(o) => o.expected === false && o.probability <= threshold,
	).length;
	const falsePositives = labelled.filter(
		(o) => o.expected === true && o.probability <= threshold,
	).length;
	const defects = labelled.filter((o) => o.expected === false).length;
	return {
		truePositives,
		falsePositives,
		defects,
		precision:
			truePositives + falsePositives
				? truePositives / (truePositives + falsePositives)
				: null,
		recall: defects ? truePositives / defects : null,
	};
}
