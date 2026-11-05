import { resolve } from 'node:path';
import { renderers } from '@vexml/renderer';
import { bundle, FILE_ORIGIN } from '@vexml/renderer/bundle';
import { VexmlRenderer } from '@vexml/renderer/vexml-renderer';
import { cli } from 'core/cmd';
import { NodeFs, NodePs } from 'core/system';
import { chromium } from 'playwright';
import { z } from 'zod';
import { selectProfileEntries } from './profile-selection';

// Optional diagnostics only: never imported by tests or the normal audit runner.
// Time to first visible music on a cold load: a fresh browser context per sample (empty
// cache), the page, its script, the score and the fonts all fetched from a local server, and
// the clock running from navigation start to the first canvas holding ink.
const fs = new NodeFs();
const ps = new NodePs();
const app = cli('cold-first-paint');
const paths = ['render', 'progressive', 'paint'] as const;

const HTML =
	'<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0}</style></head><body><div id="score"></div><script src="/page.js"></script></body></html>';

function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.floor(sorted.length / 2)] ?? Number.NaN;
}

app
	.command('run')
	.option('samples', z.coerce.number().int().min(1).max(15), { default: 5 })
	.option('score', z.string(), { default: 'all' })
	.option('path', z.enum(['all', ...paths]), { default: 'all' })
	.option('output', z.string(), { default: '/tmp/vexml-cold-first-paint' })
	.action(async (opts, { log }) => {
		await fs.mkdir(opts.output);
		const entries: { id: string; file: string }[] = JSON.parse(
			await fs.read(resolve(import.meta.dir, 'manifest.json')),
		);
		const selected = selectProfileEntries(entries, opts.score);
		const selectedPaths = paths.filter(
			(p) => opts.path === 'all' || p === opts.path,
		);
		// paint ships only what replays a snapshot, so its page bundles that alone.
		const pageSource = {
			render: await bundle(resolve(import.meta.dir, 'cold-page.ts')),
			progressive: await bundle(resolve(import.meta.dir, 'cold-page.ts')),
			paint: await bundle(resolve(import.meta.dir, 'cold-paint-page.ts')),
		};
		const browser = await chromium.launch();
		const results: unknown[] = [];
		try {
			for (const entry of selected) {
				const musicXML = await fs.read(resolve(import.meta.dir, entry.file));
				// The snapshot a deployment would have stored ahead of time: made warm, once.
				// vet-ignore classes-over-function-exports: VexmlRenderer is the shared renderer adapter, as in profile.ts, not this command's action.
				// profile, not eval: eval screenshots, which a long score's size refuses.
				const { evidence: snapshot } = await new VexmlRenderer({
					musicXML,
					config: { progressive: false },
				}).profile((ctx) => ctx.score.snapshot());
				const snapshotJson = JSON.stringify(snapshot);
				for (const path of selectedPaths) {
					const input = path === 'paint' ? snapshotJson : musicXML;
					const server = Bun.serve({
						port: 0,
						fetch(req) {
							const url = new URL(req.url);
							if (url.pathname === '/page.js') {
								return new Response(pageSource[path], {
									headers: { 'content-type': 'text/javascript' },
								});
							}
							if (url.pathname === '/input') {
								return new Response(input);
							}
							return new Response(HTML, {
								headers: { 'content-type': 'text/html' },
							});
						},
					});
					const firstPaint: number[] = [];
					const fetched: number[] = [];
					try {
						for (let i = 0; i < opts.samples; i++) {
							const context = await browser.newContext({
								viewport: { width: 964, height: 700 },
							});
							try {
								const page = await context.newPage();
								await page.route(`${FILE_ORIGIN}/**`, async (route) => {
									const file = Bun.file(
										decodeURIComponent(new URL(route.request().url()).pathname),
									);
									await route.fulfill({
										status: (await file.exists()) ? 200 : 404,
										headers: { 'access-control-allow-origin': '*' },
										contentType: file.type,
										body: Buffer.from(await file.arrayBuffer()),
									});
								});
								// The text face comes from Google Fonts when online; refused, as in
								// the renderer tabs, so the number never depends on that network.
								await page.route(
									/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
									(route) => route.abort(),
								);
								await page.goto(
									`http://localhost:${server.port}/?path=${path}`,
								);
								const r = await page.evaluate(() => window.coldResult);
								firstPaint.push(r.firstPaintMs);
								fetched.push(r.fetchedMs);
							} finally {
								await context.close();
							}
						}
					} finally {
						await server.stop(true);
					}
					const row = {
						score: entry.id,
						path,
						inputBytes: input.length,
						firstPaintMs: firstPaint,
						fetchedMs: fetched,
						medianFirstPaintMs: median(firstPaint),
					};
					results.push(row);
					await fs.write(
						resolve(opts.output, 'results.json'),
						JSON.stringify(results, null, 2),
					);
					log.info(
						`${entry.id} ${path}: first paint median ${Math.round(row.medianFirstPaintMs)}ms (range ${Math.round(Math.min(...firstPaint))}-${Math.round(Math.max(...firstPaint))}), ${Math.round(input.length / 1024)} KiB input, fetched at ${Math.round(median(fetched))}ms`,
					);
				}
			}
		} finally {
			await browser.close();
			await renderers.disposeAsync();
		}
	});

await app.run({ ps });
