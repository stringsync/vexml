import type { IncomingMessage, ServerResponse } from 'node:http';
import * as path from 'node:path';
import { createServer, type Plugin } from 'vite';
import { CLIENT_HEADER, SEQ_HEADER } from './review-data';
import type { CollectedRuleInbox } from './rule-inbox';
import {
	RULE_INBOX_DATA_PATH,
	RULE_INBOX_IMAGE_PATH,
	RULE_INBOX_STATE_PATH,
	RULE_INBOX_SUBMIT_PATH,
	type RuleInboxData,
	type RuleInboxPanel,
	type RuleInboxState,
} from './rule-inbox-data';
import { type RuleInboxStore, ruleInboxStateSchema } from './rule-inbox-store';

const SITE_DIR = path.resolve(import.meta.dir, '../site');

const IMAGE_ROUTE = new RegExp(
	`^${RULE_INBOX_IMAGE_PATH}/([^/]+)/(before|diff|after)\\.png$`,
);

/** Data provider and submission hook for the Behind Bars rule review inbox server. */
export interface RuleInboxBackend {
	collect(sitting: number): Promise<CollectedRuleInbox>;
	onSubmit?(data: RuleInboxData, state: RuleInboxState): Promise<void> | void;
}

export interface RuleInboxMiddlewareOptions {
	backend: RuleInboxBackend;
	store: RuleInboxStore;
	/** When true, rewrites `/` to `/review.html` so Rigs page links land directly on the inbox. */
	serveRoot?: boolean;
}

/**
 * Connect middleware for `vex review --rules`: serves fresh rule inbox data, baseline/diff/after
 * PNGs, out-of-worktree state persistence with out-of-order PUT protection, and sitting submission.
 */
export function ruleInboxMiddleware(opts: RuleInboxMiddlewareOptions) {
	let writeChain: Promise<void> = Promise.resolve();
	const lastSeq = new Map<string, number>();
	let latestCollected: CollectedRuleInbox | null = null;

	const refresh = async (): Promise<CollectedRuleInbox> => {
		const state = await opts.store.readState();
		latestCollected = await opts.backend.collect(state.sitting);
		return latestCollected;
	};

	return async (
		req: IncomingMessage,
		res: ServerResponse,
		next: () => void,
	) => {
		const url = new URL(req.url ?? '/', 'http://localhost');

		if (
			opts.serveRoot &&
			(url.pathname === '/' || url.pathname === '/index.html')
		) {
			req.url = '/review.html';
			next();
			return;
		}

		if (url.pathname === RULE_INBOX_DATA_PATH && req.method === 'GET') {
			await writeChain;
			const collected = await refresh();
			json(res, collected.data);
			return;
		}

		if (url.pathname === RULE_INBOX_STATE_PATH && req.method === 'GET') {
			await writeChain;
			json(res, await opts.store.readState());
			return;
		}

		if (url.pathname === RULE_INBOX_STATE_PATH && req.method === 'PUT') {
			const parsed = ruleInboxStateSchema.safeParse(parseJson(await body(req)));
			if (!parsed.success) {
				res.writeHead(400).end();
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
					await opts.store.writeState(parsed.data);
					lastSeq.set(clientId, seq);
					return;
				}
				await opts.store.writeState(parsed.data);
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

		if (url.pathname === RULE_INBOX_SUBMIT_PATH && req.method === 'POST') {
			const submitTask = async (): Promise<RuleInboxState> => {
				const submitted = await opts.store.markSubmitted(
					new Date().toISOString(),
				);
				const collected =
					latestCollected ?? (await opts.backend.collect(submitted.sitting));
				latestCollected = collected;
				await opts.backend.onSubmit?.(collected.data, submitted);
				return submitted;
			};
			const run = writeChain.then(submitTask, submitTask);
			writeChain = run.then(
				() => {},
				() => {},
			);
			try {
				const submitted = await run;
				json(res, submitted);
			} catch {
				res.writeHead(500).end();
			}
			return;
		}

		const match = IMAGE_ROUTE.exec(url.pathname);
		if (match && req.method === 'GET') {
			const id = decodeURIComponent(match[1] ?? '');
			const panel = match[2] as RuleInboxPanel;
			if (!latestCollected) {
				await refresh();
			}
			const png = latestCollected?.panels.get(id)?.[panel];
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

export interface ServeRuleInboxOptions {
	backend: RuleInboxBackend;
	store: RuleInboxStore;
	port?: number;
}

/** Serves the Behind Bars rule review inbox on Vite until stopped, returning its URL. */
export async function serveRuleInbox(
	opts: ServeRuleInboxOptions,
): Promise<string> {
	const routes: Plugin = {
		name: 'vex-rule-inbox',
		configureServer(server) {
			server.middlewares.use(
				ruleInboxMiddleware({
					backend: opts.backend,
					store: opts.store,
					serveRoot: true,
				}),
			);
		},
		transformIndexHtml(html) {
			return html.replace(
				'</head>',
				'<meta name="vex-review-mode" content="rules" /></head>',
			);
		},
	};
	const server = await createServer({
		root: SITE_DIR,
		configFile: path.join(SITE_DIR, 'vite.config.ts'),
		plugins: [routes],
		logLevel: 'warn',
		server: {
			host: '127.0.0.1',
			port: opts.port,
			strictPort: opts.port !== undefined,
			open: false,
		},
	});
	await server.listen();
	return (
		server.resolvedUrls?.local[0] ?? `http://127.0.0.1:${opts.port ?? 5173}/`
	);
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
