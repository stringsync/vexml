import { createHash, randomUUID } from 'node:crypto';
import * as path from 'node:path';
import { type Fs, NodeFs } from 'core/system';
import { z } from 'zod';
import {
	JEV_MODEL,
	type JevAnswer,
	type JevAnswers,
	type JevQueryRequest,
	type JevQuestion,
	parseJevAnswers,
} from './jev-client';

const CACHE_VERSION = 1;

/** Default gitignored disk cache directory under `vexml/.cache/jev`. */
export const DEFAULT_JEV_CACHE_DIR = path.resolve(
	import.meta.dir,
	'../../.cache/jev',
);

/** Configuration for `JevCache`. */
export interface JevCacheOptions {
	/** Directory where cache JSON files are written; defaults to `DEFAULT_JEV_CACHE_DIR`. */
	dir?: string;
	/** Filesystem seam; defaults to `NodeFs`. */
	fs?: Fs;
	/** Pinned model included in every cache key; defaults to `JEV_MODEL`. */
	model?: string;
}

/** Content-hash disk cache keyed by model, image SHA-256 hashes, state, and questions. */
export class JevCache {
	readonly dir: string;
	readonly model: string;
	private readonly fs: Fs;

	constructor(opts: JevCacheOptions = {}) {
		this.dir = opts.dir ?? DEFAULT_JEV_CACHE_DIR;
		this.fs = opts.fs ?? new NodeFs();
		this.model = opts.model ?? JEV_MODEL;
	}

	/** Computes the deterministic SHA-256 cache key for a request without storing image bytes. */
	keyFor(request: JevQueryRequest): string {
		const imageHashes = hashImages(request.images);
		const material = canonicalJson({
			v: CACHE_VERSION,
			model: this.model,
			images: imageHashes,
			state: request.state ?? null,
			questions: request.questions,
		});
		return sha256Hex(material);
	}

	/** Absolute path of the cache entry file for a cache key. */
	fileFor(key: string): string {
		return path.join(this.dir, `${key}.json`);
	}

	/** Returns true only when a valid, matching cached response already exists on disk. */
	async has(request: JevQueryRequest): Promise<boolean> {
		return (await this.get(request)) !== null;
	}

	/** Reads and validates a cached response, returning null on miss or corrupt data. */
	async get<Q extends Record<string, JevQuestion>>(
		request: JevQueryRequest<Q>,
	): Promise<JevAnswers<Q> | null> {
		const key = this.keyFor(request);
		const file = this.fileFor(key);
		if (!(await this.fs.exists(file))) {
			return null;
		}
		try {
			const raw = JSON.parse(await this.fs.read(file));
			const entry = CacheEnvelope.parse(raw);
			if (entry.model !== this.model || entry.key !== key) {
				return null;
			}
			return parseJevAnswers(request.questions, entry.answers);
		} catch {
			return null;
		}
	}

	/** Atomically writes a validated response to disk without storing raw image bytes. */
	async set(
		request: JevQueryRequest,
		answers: Record<string, JevAnswer>,
	): Promise<void> {
		const key = this.keyFor(request);
		const file = this.fileFor(key);
		await this.fs.mkdir(this.dir, { recursive: true });
		const payload = `${JSON.stringify(
			{
				v: CACHE_VERSION,
				model: this.model,
				key,
				images: hashImages(request.images),
				answers,
			},
			null,
			'\t',
		)}\n`;
		const temp = `${file}.${randomUUID()}.tmp`;
		await this.fs.write(temp, payload);
		await this.fs.rename(temp, file);
	}
}

const CacheEnvelope = z.object({
	v: z.literal(CACHE_VERSION),
	model: z.string(),
	key: z.string(),
	answers: z.record(z.string(), z.unknown()),
});

function hashImages(images: Record<string, Buffer>): Record<string, string> {
	const entries = Object.entries(images)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([name, bytes]) => [name, sha256Hex(bytes)] as const);
	return Object.fromEntries(entries);
}

function sha256Hex(data: Buffer | string): string {
	return createHash('sha256').update(data).digest('hex');
}

function canonicalJson(value: unknown): string {
	if (value === null || typeof value !== 'object') {
		return JSON.stringify(value);
	}
	if (Array.isArray(value)) {
		return `[${value.map((item) => (item === undefined ? 'null' : canonicalJson(item))).join(',')}]`;
	}
	const entries = Object.entries(value as Record<string, unknown>)
		.filter(([, item]) => item !== undefined)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`);
	return `{${entries.join(',')}}`;
}
