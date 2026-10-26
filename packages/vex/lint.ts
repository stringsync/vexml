import { writeFileSync } from 'node:fs';
import { basename, extname, isAbsolute, resolve } from 'node:path';
import { renderers } from '@vexml/renderer';
import type { Logger } from 'webappwiz/log';
import type { Fs } from 'webappwiz/system';
import { markFindings } from './finding-markup';
import { InkMap } from './ink-map';
import {
	addDefect,
	type DefectKind,
	formatScore,
	LintCorpus,
} from './lint-corpus';
import { locate } from './measure-locator';
import { describeMeasures, MeasureMap } from './measure-map';
import { FINDING_KINDS, type Finding, RenderLint } from './render-lint';

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
	try {
		for (const engine of engines) {
			const { png, measures } = await locate(engine, musicXML);
			const map = new MeasureMap(measures);
			const lint = new RenderLint(InkMap.fromPng(png)).lint();
			const report = {
				score: lint.score,
				findings: lint.findings.map((finding) => ({
					...finding,
					measures: map.numbersAt(finding.box),
				})),
			};
			reports[engine] = report;

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
}

// The corpus paths are the repo's own; index.ts chdir'd to the repo root.
const CORPUS = {
	corpus: 'packages/integration/__lint__',
	fixtures: 'packages/integration/__data__',
	screenshots: 'packages/integration/__screenshots__',
};

/** Scores the lint against its corpus, or grows the corpus by one defect from history. */
export async function lintCorpus(opts: LintCorpusOptions) {
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
	return spec.split(',').map((name) => {
		const engine = ENGINES.find((e) => e === name.trim());
		if (!engine) {
			throw new Error(
				`unknown renderer '${name}'; expected one of ${ENGINES.join(', ')} or all`,
			);
		}
		return engine;
	});
}
