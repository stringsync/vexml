import { resolve } from 'node:path';
import { dimensions, renderers } from '@vexml/renderer';
import { cli } from 'webappwiz/cmd';
import { NodeFs, NodePs } from 'webappwiz/system';
import { Stopwatch, SystemClock } from 'webappwiz/time';
import { z } from 'zod';
import { markFindings } from '../../packages/vex/finding-markup';
import { InkMap } from '../../packages/vex/ink-map';
import { locate } from '../../packages/vex/measure-locator';
import { MeasureMap } from '../../packages/vex/measure-map';
import { MeasureSlicer } from '../../packages/vex/measure-slicer';
import { RenderLint } from '../../packages/vex/render-lint';

const fs = new NodeFs();
const ps = new NodePs();
const base = import.meta.dir;
const engines = ['vexml', 'osmd', 'alphatab'] as const;
const engineSchema = z.enum(engines);
const app = cli('complete-scores');

interface Entry {
	id: string;
	title: string;
	file: string;
}

// A process per score/engine bounds retained browser state and isolates failures.
app
	.command('run')
	.option('score', z.string(), { default: 'all' })
	.option('measures', z.string().regex(/^[0-9,-]*$/), { default: '' })
	.option('renderer', z.enum(['all', ...engines]), { default: 'all' })
	.option('output', z.string(), { default: '/tmp/vexml-complete-scores' })
	.action(async (opts, { log }) => {
		const entries: Entry[] = JSON.parse(
			await fs.read(resolve(base, 'manifest.json')),
		);
		const selected = entries.filter(
			(entry) => opts.score === 'all' || entry.id === opts.score,
		);
		if (selected.length === 0) {
			throw new Error(`unknown score: ${opts.score}`);
		}
		const output = resolve(opts.output);
		await fs.mkdir(output);
		for (const entry of selected) {
			for (const engine of engines.filter(
				(value) => opts.renderer === 'all' || value === opts.renderer,
			)) {
				const stem = resolve(
					output,
					`${entry.id}-${engine}${opts.measures ? `-m${opts.measures}` : ''}`,
				);
				log.info(`${entry.id}: ${engine}`);
				if (await fs.exists(`${stem}-failure.json`)) {
					await fs.rm(`${stem}-failure.json`);
				}
				const result = await ps.spawnCapture(
					[
						'bun',
						resolve(base, 'run.ts'),
						'cell',
						'--score',
						entry.id,
						'--renderer',
						engine,
						...(opts.measures ? ['--measures', opts.measures] : []),
						'--output',
						output,
					],
					{ timeoutMs: 180_000 },
				);
				await fs.write(`${stem}.log`, result.stdout + result.stderr);
				if (result.exitCode !== 0) {
					await fs.write(
						`${stem}-failure.json`,
						`${JSON.stringify({ exitCode: result.exitCode, log: `${stem}.log` }, null, '\t')}\n`,
					);
				}
				log.info(`  exit ${result.exitCode}; ${stem}.json`);
			}
		}
	});

app
	.command('cell')
	.option('score', z.string())
	.option('measures', z.string().regex(/^[0-9,-]*$/), { default: '' })
	.option('renderer', engineSchema)
	.option('output', z.string())
	.action(async (opts, { log }) => {
		const entries: Entry[] = JSON.parse(
			await fs.read(resolve(base, 'manifest.json')),
		);
		const entry = entries.find((value) => value.id === opts.score);
		if (!entry) {
			throw new Error(`unknown score: ${opts.score}`);
		}
		await fs.mkdir(opts.output);
		const stem = resolve(
			opts.output,
			`${entry.id}-${opts.renderer}${opts.measures ? `-m${opts.measures}` : ''}`,
		);
		const timer = new Stopwatch(new SystemClock());
		const report: Record<string, unknown> = {
			score: entry.id,
			engine: opts.renderer,
			measures: opts.measures || 'all',
			stage: 'warmup',
		};
		const save = () =>
			fs.write(`${stem}.json`, `${JSON.stringify(report, null, '\t')}\n`);
		await save();
		// Let Chromium close even if the parent reaches this cell's time limit.
		const termination = ps.on('SIGTERM', () => {
			void renderers.disposeAsync().finally(() => ps.exit(124));
		});
		try {
			const source = await fs.read(resolve(base, entry.file));
			const musicXML = opts.measures
				? new MeasureSlicer(opts.measures).slice(source)
				: source;
			const warmup = await fs.read(
				resolve(base, '../../packages/integration/__data__/note.musicxml'),
			);
			await renderers[opts.renderer]({ musicXML: warmup }).render();
			report.stage = 'render';
			await save();
			timer.start();
			const png = await renderers[opts.renderer]({ musicXML }).render();
			report.renderCaptureMs = Math.round(timer.elapsed().ms);
			report.dimensions = dimensions(png);
			await fs.writeBytes(`${stem}.png`, png);
			await save();
			log.info(`render + PNG: ${report.renderCaptureMs}ms`);
			report.stage = 'attributed capture';
			report.lintCoverage = 'structural and element collisions';
			await save();
			timer.start();
			const located = await locate(opts.renderer, musicXML);
			report.attributedCaptureMs = Math.round(timer.elapsed().ms);
			report.maskCount = located.masks?.length ?? 0;
			report.maskRuns =
				located.masks?.reduce((sum, mask) => sum + mask.runs.length / 2, 0) ??
				0;
			const measures = new MeasureMap(located.measures);
			report.stage = 'lint';
			timer.start();
			const lint = new RenderLint(
				InkMap.fromPng(located.png),
				located.masks,
			).lint();
			report.lintMs = Math.round(timer.elapsed().ms);
			report.lint = {
				...lint,
				findings: lint.findings.map((finding) => ({
					...finding,
					measures: measures.numbersAt(finding.box),
				})),
			};
			report.stage = 'complete';
			await fs.writeBytes(
				`${stem}-lint.png`,
				markFindings(located.png, lint.findings),
			);
			await save();
			log.info(`${lint.score}/100; ${lint.findings.length} findings`);
		} catch (error) {
			report.error = error instanceof Error ? error.stack : String(error);
			await save();
			log.error(report.error);
			throw error;
		} finally {
			timer.dispose();
			termination.dispose();
			await renderers.disposeAsync();
		}
	});

await app.run({ ps });
