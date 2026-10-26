import { writeFileSync } from 'node:fs';
import { basename, extname, isAbsolute, resolve } from 'node:path';
import { type Renderer, renderers } from '@vexml/renderer';
import type { Logger } from 'webappwiz/log';
import type { Fs } from 'webappwiz/system';
import { markFindings } from './finding-markup';
import { InkMap } from './ink-map';
import { type LintReport, RenderLint } from './render-lint';

export const ENGINES = ['vexml', 'osmd', 'alphatab', 'musescore'] as const;
export type Engine = (typeof ENGINES)[number];

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
	const reports: Partial<Record<Engine, LintReport>> = {};
	try {
		for (const engine of engines) {
			const png = await rendererFor(engine, musicXML).render();
			const report = new RenderLint(InkMap.fromPng(png)).lint();
			reports[engine] = report;

			const marked = resolve(outDir, `${stem} ${engine} lint.png`);
			// Fs is text-only, so the PNG goes out through node:fs.
			writeFileSync(marked, markFindings(png, report.findings));

			opts.log.info(
				`${engine.padEnd(9)} ${String(report.score).padStart(3)}/100  ${report.findings.length} ${report.findings.length === 1 ? 'finding' : 'findings'}  ${marked}`,
			);
			for (const finding of report.findings) {
				const { x, y, w, h } = finding.box;
				opts.log.info(
					`  - ${finding.kind}: ${finding.message} at x ${x}..${x + w}, y ${y}..${y + h}`,
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

function rendererFor(engine: Engine, musicXML: string): Renderer {
	switch (engine) {
		case 'vexml':
			return renderers.vexml({ musicXML });
		case 'osmd':
			return renderers.osmd({ musicXML });
		case 'alphatab':
			return renderers.alphatab({ musicXML });
		case 'musescore':
			return renderers.musescore({ musicXML });
	}
}
