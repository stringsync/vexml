import { writeFileSync } from 'node:fs';
import { basename, extname, isAbsolute, resolve } from 'node:path';
import { renderers } from '@vexml/renderer';
import { PNG } from 'pngjs';
import { Rect } from 'webappwiz/geometry';
import type { Logger } from 'webappwiz/log';
import type { Fs } from 'webappwiz/system';
import { markFindings } from './finding-markup';
import { InkMap } from './ink-map';
import type { JevClient } from './jev-client';
import { JEV_MODEL, JEV_QUESTIONS } from './jev-client';
import {
	addDefect,
	type DefectKind,
	formatScore,
	LintCorpus,
} from './lint-corpus';
import type { LocatedRender } from './measure-locator';
import { locate } from './measure-locator';
import { describeMeasures, MeasureMap } from './measure-map';
import { FINDING_KINDS, type Finding, RenderLint } from './render-lint';
import { SemanticCorpus } from './semantic-corpus';
import {
	SEMANTIC_THRESHOLDS,
	SemanticLint,
	type SemanticResult,
} from './semantic-lint';
import { SemanticMeasures } from './semantic-measures';
import { TypesafeJev } from './typesafe-jev';

export const ENGINES = ['vexml', 'osmd', 'alphatab', 'musescore'] as const;
export type Engine = (typeof ENGINES)[number];

/** A finding with the measures it is in, which an agent fixing it slices down to. */
export interface LocatedFinding extends Finding {
	/** MusicXML measure numbers in score order; empty when the engine can't say. */
	measures: string[];
}

/** What `vex lint` reports for one engine. */
export interface LocatedReport {
	score: number;
	findings: LocatedFinding[];
	semantic?:
		| {
				model: string;
				questions: string;
				thresholds: typeof SEMANTIC_THRESHOLDS;
				measures: Array<{
					index: number;
					number: string;
					votes: SemanticResult['votes'];
					presence: Array<{ question: string; probability: number }>;
				}>;
		  }
		| { skipped: string };
}

export interface LintOptions {
	input: string;
	/* Comma-separated engines, or `all`. */
	renderer: string;
	/* The directory the reports and marked PNGs go in; the invocation directory by default. */
	output?: string;
	/* Where the user ran `vex`; index.ts chdir'd to the repo root, so relative
	 * paths resolve against this. */
	cwd: string;
	log: Logger;
	fs: Fs;
	semantic?: boolean;
	jev?: JevClient;
}

// MusicXML in, a verdict out, per engine: how correct the render looks, 0..100, and the
// pixels that cost it points. The checks are pixel-only on purpose: an agent reading a
// screenshot misses a clipped glyph or a staff drawn into its neighbor, and asking the
// renderer where it put things trusts the thing under test.
export async function lint(opts: LintOptions) {
	// index.ts chdir'd to the repo root, so resolve user paths against their cwd.
	const at = (p: string) => (isAbsolute(p) ? p : resolve(opts.cwd, p));
	const input = at(opts.input);
	const stem = basename(input, extname(input));
	const outDir = at(opts.output ?? '.');
	const musicXML = await opts.fs.read(input);

	const engines = parseEngines(opts.renderer);
	const reports: Partial<Record<Engine, LocatedReport>> = {};
	const renders = new Map<Engine, LocatedRender>();
	try {
		for (const engine of engines) {
			const { png, measures, masks } = await locate(engine, musicXML);
			renders.set(engine, { png, measures });
			const map = new MeasureMap(measures);
			const lint = new RenderLint(InkMap.fromPng(png), masks).lint();
			const report = {
				score: lint.score,
				findings: lint.findings.map((finding) => ({
					...finding,
					measures: map.numbersAt(finding.box),
				})),
			};
			reports[engine] = report;
		}
		if (opts.semantic) {
			const client = opts.jev ?? (await TypesafeJev.create());
			if (await client.available()) {
				const semantic = new SemanticLint(client);
				for (const report of Object.values(reports)) {
					report.semantic = {
						model: JEV_MODEL,
						questions: JEV_QUESTIONS,
						thresholds: SEMANTIC_THRESHOLDS,
						measures: [],
					};
				}
				for (const measure of new SemanticMeasures(musicXML).all()) {
					// Render the isolated measure to retain lyrics, directions and spanners
					// outside renderer staff boxes, including MuseScore's unlocated output.
					const slices = [];
					for (const engine of engines) {
						const slice = await locate(engine, measure.xml);
						const original = renders.get(engine);
						if (!original) {
							continue;
						}
						const boxes = original.measures
							.filter((m) => m.number === measure.number)
							.map((m) => m.box);
						const size = PNG.sync.read(original.png);
						const box = boxes.reduce(
							(a, b) => a.union(b),
							boxes[0] ?? new Rect(0, 0, size.width, size.height),
						);
						slices.push({ engine, png: slice.png, box });
					}
					const result = await semantic.measure(
						measure.number,
						measure.xml,
						slices,
					);
					for (const engine of engines) {
						const report = reports[engine];
						if (!report?.semantic || !('measures' in report.semantic)) {
							continue;
						}
						const findings = result.findings[engine] ?? [];
						report.findings.push(...findings);
						report.score = Math.max(
							0,
							report.score -
								findings.reduce(
									(n, f) => n + (f.kind === 'differs' ? 20 : 10),
									0,
								),
						);
						report.semantic.measures.push({
							index: measure.index,
							number: measure.number,
							votes: result.votes,
							presence: result.presence[engine] ?? [],
						});
					}
				}
			} else {
				opts.log.info('semantic lint skipped: TYPESAFE_API_KEY is unavailable');
				for (const report of Object.values(reports)) {
					report.semantic = { skipped: 'TYPESAFE_API_KEY is unavailable' };
				}
			}
		}
		for (const engine of engines) {
			const report = reports[engine];
			const png = renders.get(engine)?.png;
			if (!report || !png) {
				continue;
			}

			const marked = resolve(outDir, `${stem} ${engine} lint.png`);
			// Fs is text-only, so the PNG goes out through node:fs.
			writeFileSync(marked, markFindings(png, report.findings));

			opts.log.info(
				`${engine.padEnd(9)} ${String(report.score).padStart(3)}/100  ${report.findings.length} ${report.findings.length === 1 ? 'finding' : 'findings'}  ${marked}`,
			);
			for (const finding of report.findings) {
				const { x, y, w, h } = finding.box;
				const where = describeMeasures(finding.measures);
				opts.log.info(
					`  - ${finding.kind}: ${finding.message}${where ? ` in ${where}` : ''} at x ${x}..${x + w}, y ${y}..${y + h}`,
				);
			}
		}
	} finally {
		await renderers.disposeAsync();
	}

	const json = resolve(outDir, `${stem} lint.json`);
	await opts.fs.write(json, `${JSON.stringify(reports, null, '\t')}\n`);
	opts.log.info(`wrote ${json}`);
}

export interface LintCorpusOptions {
	/* `<commit>:<screenshot>`: add the defect that commit fixed instead of scoring. */
	add?: string;
	kind: string;
	log: Logger;
	semantic?: boolean;
	fs?: Fs;
	output?: string;
	cwd?: string;
}

// The corpus paths are the repo's own; index.ts chdir'd to the repo root.
const CORPUS = {
	corpus: 'packages/integration/__lint__',
	fixtures: 'packages/integration/__data__',
	screenshots: 'packages/integration/__screenshots__',
};

/** Scores the lint against its corpus, or grows the corpus by one defect from history. */
export async function lintCorpus(opts: LintCorpusOptions) {
	if (opts.semantic) {
		if (opts.add) {
			throw new Error('--semantic and --add are incompatible');
		}
		const client = await TypesafeJev.create();
		if (!(await client.available())) {
			opts.log.info('semantic corpus skipped: TYPESAFE_API_KEY is unavailable');
			return;
		}
		const score = await new SemanticCorpus(client, CORPUS).score();
		const json = `${JSON.stringify(score, null, '\t')}\n`;
		if (opts.output && opts.fs) {
			const path = resolve(
				opts.cwd ?? '.',
				opts.output,
				'semantic-corpus.json',
			);
			await opts.fs.write(path, json);
			opts.log.info(`wrote ${path}`);
		} else {
			opts.log.info(json);
		}
		return;
	}
	if (opts.add) {
		const [commit, screenshot] = opts.add.split(':');
		if (!commit || !screenshot) {
			throw new Error(`--add takes <commit>:<screenshot>, not '${opts.add}'`);
		}
		const kinds: readonly string[] = ['collision', ...FINDING_KINDS];
		if (!kinds.includes(opts.kind)) {
			throw new Error(
				`unknown kind '${opts.kind}'; expected one of ${kinds.join(', ')}`,
			);
		}
		const label = addDefect({
			corpus: CORPUS.corpus,
			commit,
			screenshot,
			kind: opts.kind as DefectKind,
		});
		const { x, y, w, h } = label.box;
		opts.log.info(
			`added ${label.id} (${label.kind}) at x ${x}..${x + w}, y ${y}..${y + h}: ${label.note}`,
		);
		return;
	}
	const score = new LintCorpus(CORPUS).score();
	for (const line of formatScore(score)) {
		opts.log.info(line);
	}
	if (score.misses.length > 0 || score.surprises.length > 0) {
		throw new Error('the lint lost a defect or gained a false positive');
	}
}

function parseEngines(spec: string): Engine[] {
	if (spec === 'all') {
		return [...ENGINES];
	}
	return [
		...new Set(
			spec.split(',').map((name) => {
				const engine = ENGINES.find((e) => e === name.trim());
				if (!engine) {
					throw new Error(
						`unknown renderer '${name}'; expected one of ${ENGINES.join(', ')} or all`,
					);
				}
				return engine;
			}),
		),
	];
}
