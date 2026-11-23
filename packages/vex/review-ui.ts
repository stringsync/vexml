import type { IncomingMessage, ServerResponse } from 'node:http';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import type { Fs } from 'core/system';
import { PNG } from 'pngjs';
import { build, createServer, type Plugin } from 'vite';
import { z } from 'zod';
import type { MovedSnapshot } from './review';
import {
	CLIENT_HEADER,
	DATA_PATH,
	IMAGE_PATH,
	PANELS,
	type Panel,
	type Review,
	type ReviewData,
	SEQ_HEADER,
	STATE_PATH,
} from './review-data';
import type { ReviewStore } from './review-store';

const SITE_DIR = path.resolve(import.meta.dir, '../site');

const point = z.object({ x: z.number(), y: z.number() });
const reviewSchema = z.object({
	id: z.string(),
	version: z.number(),
	submitted: z.boolean(),
	verdicts: z.record(z.string(), z.enum(['approved', 'changes'])),
	marks: z.record(
		z.string(),
		z.array(
			z.object({
				kind: z.enum(['box', 'arrow', 'pin']),
				panel: z.enum(PANELS),
				from: point,
				to: point,
				note: z.string(),
			}),
		),
	),
	threads: z
		.record(z.string(), z.object({ resolved: z.boolean(), reply: z.string() }))
		.optional(),
});

const IMAGE_ROUTE = new RegExp(
	`^${IMAGE_PATH}/([^/]+)/(${PANELS.join('|')})\\.png$`,
);

/**
 * The review's routes, as connect middleware: the page's data, each snapshot's panels,
 * and the person's review, read on load and saved as they go. Anything else falls
 * through to Vite.
 */
export function reviewMiddleware(opts: ReviewMiddlewareOptions) {
	const images = new Map<string, Buffer>();
	let writeChain: Promise<void> = Promise.resolve();
	const lastSeq = new Map<string, number>();
	const image = (name: string, panel: Panel): Buffer | null => {
		const key = `${name}/${panel}`;
		const cached = images.get(key);
		if (cached) {
			return cached;
		}
		const snapshot = opts.moved.find((moved) => moved.entry.name === name);
		const panelPng = snapshot?.panels[panel];
		if (!panelPng) {
			return null;
		}
		const png = PNG.sync.write(panelPng);
		images.set(key, png);
		return png;
	};
	return async (
		req: IncomingMessage,
		res: ServerResponse,
		next: () => void,
	) => {
		const url = new URL(req.url ?? '/', 'http://localhost');
		if (url.pathname === DATA_PATH) {
			json(res, opts.data);
			return;
		}
		if (url.pathname === STATE_PATH && req.method === 'GET') {
			// Wait for queued PUT writes so a reload reads its own latest save.
			await writeChain;
			json(res, await opts.store.readReview(opts.data));
			return;
		}
		if (url.pathname === STATE_PATH && req.method === 'PUT') {
			const parsed = reviewSchema.safeParse(parseJson(await body(req)));
			if (
				!parsed.success ||
				parsed.data.id !== opts.data.id ||
				parsed.data.version !== opts.data.version
			) {
				// A page left open on an older version must not overwrite this one's review.
				res.writeHead(409).end();
				return;
			}
			const clientId = headerValue(req, CLIENT_HEADER);
			const seq = parsePositiveInt(headerValue(req, SEQ_HEADER));
			const persist = async () => {
				if (clientId && seq !== null) {
					const previous = lastSeq.get(clientId) ?? 0;
					if (seq <= previous) {
						return;
					}
					await opts.store.writeReview(parsed.data as Review);
					lastSeq.set(clientId, seq);
					return;
				}
				await opts.store.writeReview(parsed.data as Review);
			};
			const run = writeChain.then(persist, persist);
			writeChain = run.catch(() => {});
			try {
				await run;
				res.writeHead(204).end();
			} catch {
				res.writeHead(500).end();
			}
			return;
		}
		const match = IMAGE_ROUTE.exec(url.pathname);
		if (match) {
			const png = image(decodeURIComponent(match[1] ?? ''), match[2] as Panel);
			if (!png) {
				res.writeHead(404).end();
				return;
			}
			res
				.writeHead(200, {
					'content-type': 'image/png',
					'cache-control': 'no-store',
				})
				.end(png);
			return;
		}
		next();
	};
}

export interface ReviewMiddlewareOptions {
	data: ReviewData;
	moved: MovedSnapshot[];
	store: ReviewStore;
}

/** Serves the page until the process ends, and resolves to its URL. */
export async function serveReview(opts: ServeReviewOptions): Promise<string> {
	const routes: Plugin = {
		name: 'vex-review',
		configureServer(server) {
			server.middlewares.use(reviewMiddleware(opts));
		},
	};
	const server = await createServer({
		root: SITE_DIR,
		configFile: path.join(SITE_DIR, 'vite.config.ts'),
		plugins: [routes],
		logLevel: 'warn',
		// One address, as perf-ui.ts explains; the agent opens or forwards it.
		server: { host: '127.0.0.1', port: opts.port, open: false },
	});
	await server.listen();
	const base = server.resolvedUrls?.local[0] ?? 'http://127.0.0.1:5173/';
	return new URL('review.html', base).href;
}

export interface ServeReviewOptions {
	data: ReviewData;
	moved: MovedSnapshot[];
	store: ReviewStore;
	port?: number;
}

/**
 * Returns the page as one self-contained HTML file, for `splates artifact add`: nothing
 * outside it is loaded, and its review is copied out rather than saved.
 */
export async function buildStaticReview(
	opts: StaticReviewOptions,
): Promise<string> {
	const outDir = path.join(tmpdir(), `vex-review-${process.pid}-${Date.now()}`);
	try {
		await build({
			root: SITE_DIR,
			configFile: path.join(SITE_DIR, 'vite.config.ts'),
			logLevel: 'warn',
			base: './',
			build: {
				outDir,
				emptyOutDir: true,
				cssCodeSplit: false,
				// Every font and icon as a data URL, so the file needs nothing beside it.
				assetsInlineLimit: () => true,
				modulePreload: false,
				rollupOptions: { input: path.join(SITE_DIR, 'review.html') },
			},
		});
		let html = await opts.fs.read(path.join(outDir, 'review.html'));
		const assets = path.join(outDir, 'assets');
		for (const name of await opts.fs.readdir(assets)) {
			const text = await opts.fs.read(path.join(assets, name));
			if (name.endsWith('.js')) {
				html = html.replace(
					new RegExp(
						`<script[^>]*src="[^"]*${escapeRegExp(name)}"[^>]*></script>`,
					),
					() => `<script type="module">${text}</script>`,
				);
			} else if (name.endsWith('.css')) {
				html = html.replace(
					new RegExp(`<link[^>]*href="[^"]*${escapeRegExp(name)}"[^>]*>`),
					() => `<style>${text}</style>`,
				);
			}
		}
		// `<` escaped, so no string in the data can close the tag.
		const data = JSON.stringify(opts.data).replace(/</g, '\\u003c');
		return html.replace(
			'</head>',
			() =>
				`<script id="review-data" type="application/json">${data}</script></head>`,
		);
	} finally {
		await opts.fs.rm(outDir, { recursive: true, force: true });
	}
}

export interface StaticReviewOptions {
	fs: Fs;
	data: ReviewData;
}

function json(res: ServerResponse, value: unknown): void {
	res
		.writeHead(200, {
			'content-type': 'application/json',
			'cache-control': 'no-store',
		})
		.end(JSON.stringify(value));
}

function body(req: IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		req.on('data', (chunk: Buffer) => chunks.push(chunk));
		req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
		req.on('error', reject);
	});
}

function parseJson(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

function headerValue(req: IncomingMessage, name: string): string | null {
	const raw = req.headers[name];
	if (typeof raw === 'string') {
		return raw.trim() || null;
	}
	if (Array.isArray(raw) && raw[0]) {
		return raw[0].trim() || null;
	}
	return null;
}

function parsePositiveInt(value: string | null): number | null {
	if (!value || !/^\d+$/.test(value)) {
		return null;
	}
	const parsed = Number(value);
	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
