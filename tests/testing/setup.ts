import { afterAll, beforeAll, expect } from 'bun:test';
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import * as path from 'node:path';
import { createCanvas, createImageData } from 'canvas';
import chalk from 'chalk';
import pixelmatch from 'pixelmatch';
import { type Browser, chromium, type Page } from 'playwright';
import { PNG } from 'pngjs';
import { serve } from './serve';

// Guard: tests must go through `vex test`, which renders in the pinned Docker
// image. Bare `bun test` on the host compares against the committed Docker
// baselines and silently "fails" on font/anti-aliasing differences. vex sets
// this sentinel; nothing else does.
if (process.env.I_AM_RUNNING_TESTS_USING_VEX_TEST !== '1') {
	// process.exit, not throw: bun catches a preload throw and runs tests anyway.
	console.error(
		'\nRun tests with `vex test`, not `bun test` directly.\n' +
			'Bare bun test diffs host pixels against the Docker baselines. See cli/test.ts.\n',
	);
	process.exit(1);
}

// One browser and one page server for the whole `bun test` run. Launching a second Chromium in
// the same run is flaky in Docker — its teardown hangs past the hook timeout — so every browser
// test (the screenshot harness and the events smoke test) reuses these. Preloaded, so the
// lifecycle scopes to the run, not one file. Eager (beforeAll) to keep the launch out of the
// first test's own timeout; lazy getters so a unit-only run still pays for them only if used.
const TEST_PORT = 3100;
export const TEST_URL = `http://localhost:${TEST_PORT}/`;
let sharedServer: ReturnType<typeof serve> | null = null;
let sharedBrowser: Promise<Browser> | null = null;

export function testServer(): ReturnType<typeof serve> {
	sharedServer ??= serve(TEST_PORT);
	return sharedServer;
}

export function testBrowser(): Promise<Browser> {
	testServer();
	sharedBrowser ??= chromium.launch();
	return sharedBrowser;
}

// A pool of pages, each navigated (bundle loaded/parsed) exactly once and reused across
// tests. Screenshot tests are stateless — they clear the container and re-render — so a
// test borrows an idle page instead of paying newPage() (new context) + goto() (bundle
// reload) itself. Pooling (vs. one shared page) lets `test.concurrent` renders run on
// separate pages/renderer processes in parallel; the pool caps how many Chromiums churn
// at once. ponytail: fixed size, ~= perf-core count; bump POOL_SIZE if renders starve.
const POOL_SIZE = 8;
const pool: Page[] = []; // every page created, for teardown
const idle: Page[] = [];
const waiters: Array<(page: Page) => void> = [];
let created = 0;

async function acquirePage(): Promise<Page> {
	const free = idle.pop();
	if (free) {
		return free;
	}
	if (created < POOL_SIZE) {
		created++; // reserve the slot synchronously, before the awaits below yield
		const browser = await testBrowser();
		const page = await browser.newPage({
			viewport: { width: 964, height: 600 },
		});
		await page.goto(TEST_URL);
		await warmFonts(page);
		pool.push(page);
		return page;
	}
	return new Promise((resolve) => waiters.push(resolve));
}

// Make the render fonts resident in the context's font cache before any real render.
// Chromium loads even a system font lazily on first use, and VexFlow positions tab fret
// digits by measuring them — so the first render on a cold page measures glyphs before the
// font is resident and places them bistably. A reused single page self-warms after its first
// test; a pool starts every page cold, so under parallel load many renders measure cold and
// flake. Rendering the warm-up fixture once paints every font/weight a real render uses (see
// font_warmup.musicxml), forcing the load up front. Same system families the tests use.
async function warmFonts(page: Page): Promise<void> {
	await page.evaluate(async () => {
		const container = document.getElementById('screenshot');
		if (!(container instanceof HTMLDivElement)) {
			throw new Error('container not found');
		}
		const res = await fetch('/data/font_warmup.musicxml');
		await window.render(await res.text(), container, {
			showPartLabels: true, // paints the part names in Source Sans 3 regular
			fonts: {
				notation: { family: 'Bravura' },
				text: { family: 'Source Sans 3' },
			},
		});
		await document.fonts.ready;
		container.replaceChildren();
	});
}

function releasePage(page: Page): void {
	const waiter = waiters.shift();
	if (waiter) {
		waiter(page);
	} else {
		idle.push(page);
	}
}

/** Borrow a pooled page for one render, returning it to the pool afterwards. */
export async function withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
	const page = await acquirePage();
	try {
		return await fn(page);
	} finally {
		releasePage(page);
	}
}

beforeAll(async () => {
	await testBrowser();
});

afterAll(async () => {
	await Promise.all(pool.map((page) => page.close()));
	if (sharedBrowser) {
		await (await sharedBrowser).close();
	}
	sharedServer?.stop(true);
});

// [old][diff][new] stacked vertically, each captioned, returned as a PNG buffer.
function composite(
	expected: PNG,
	diff: PNG,
	got: PNG,
	w: number,
	h: number,
): Buffer {
	const header = 32;
	const cell = h + header;
	const canvas = createCanvas(w, cell * 3);
	const ctx = canvas.getContext('2d');
	ctx.font = '24px sans-serif';
	const panels: [string, PNG][] = [
		['old', expected],
		['diff', diff],
		['new', got],
	];
	panels.forEach(([label, png], i) => {
		ctx.fillStyle = '#fff';
		ctx.fillRect(0, i * cell, w, header);
		ctx.fillStyle = '#000';
		ctx.fillText(label, 4, i * cell + 24);
		const img = createImageData(w, h);
		img.data.set(png.data);
		ctx.putImageData(img, 0, i * cell + header);
	});
	return canvas.toBuffer('image/png');
}

const SCREENSHOTS_DIR = path.resolve(
	import.meta.dir,
	'../integration/__screenshots__',
);
const DIFF_DIR = path.resolve(import.meta.dir, '../integration/__diffs__');
const ROOT = path.resolve(import.meta.dir, '../..');
const UPDATE = process.env.UPDATE_SCREENSHOTS === '1';

// Every diff written this run; stale ones are whatever's left over in DIFF_DIR.
const seenDiffs = new Set<string>();
afterAll(() => {
	if (!existsSync(DIFF_DIR)) {
		return;
	}
	for (const f of readdirSync(DIFF_DIR)) {
		if (f.endsWith('.png') && !seenDiffs.has(f)) {
			rmSync(path.join(DIFF_DIR, f));
			console.log(`removed stale diff ${f}`);
		}
	}
	if (readdirSync(DIFF_DIR).length === 0) {
		rmSync(DIFF_DIR, { recursive: true });
	}
});

// Every baseline touched this run; orphans are whatever's left over in SNAP_DIR.
const seen = new Set<string>();

// Baseline changes this run, for the end-of-run report.
const added = new Set<string>();
const updated = new Set<string>();
const deleted = new Set<string>();

if (process.env.CLEANUP_ORPHANED_SCREENSHOTS === '1') {
	afterAll(() => {
		if (existsSync(SCREENSHOTS_DIR)) {
			for (const f of readdirSync(SCREENSHOTS_DIR)) {
				if (f.endsWith('.png') && !seen.has(f)) {
					rmSync(path.join(SCREENSHOTS_DIR, f));
					deleted.add(f);
				}
			}
		}
	});
}

// Report registered last so it runs after the cleanup afterAll above.
afterAll(() => {
	let first = true;
	const report = (
		icon: string,
		label: string,
		set: Set<string>,
		dir: string,
	) => {
		if (set.size === 0) {
			return;
		}
		if (!first) {
			console.log();
		}
		first = false;
		console.log(`${icon} ${label} ${set.size} screenshot(s):`);
		for (const f of [...set].sort()) {
			console.log(`    ${path.relative(ROOT, path.join(dir, f))}`);
		}
	};
	console.log(chalk.bold('\nScreenshot report'));
	report(chalk.green('✓'), 'added', added, SCREENSHOTS_DIR);
	report(chalk.yellow('↻'), 'updated', updated, SCREENSHOTS_DIR);
	report(chalk.red('✗'), 'deleted', deleted, SCREENSHOTS_DIR);
	report(chalk.magenta('Δ'), 'diffed', seenDiffs, DIFF_DIR);
	if (added.size + updated.size + deleted.size === 0) {
		console.log(`${chalk.green('✓')} no screenshot changes`);
	}
});

expect.extend({
	/** Diff a screenshot against its baseline; record when missing or UPDATE_SCREENSHOTS=1. */
	toMatchScreenshot(received: unknown, filename: string) {
		const buf = received as Buffer;
		seen.add(filename);
		const baseline = path.join(SCREENSHOTS_DIR, filename);

		if (UPDATE || !existsSync(baseline)) {
			if (!existsSync(baseline)) {
				added.add(filename);
			} else if (!buf.equals(readFileSync(baseline))) {
				updated.add(filename);
			}
			mkdirSync(SCREENSHOTS_DIR, { recursive: true });
			writeFileSync(baseline, buf);
			return { pass: true, message: () => `wrote baseline ${filename}` };
		}

		const expected = PNG.sync.read(readFileSync(baseline));
		const got = PNG.sync.read(buf);

		if (got.width !== expected.width || got.height !== expected.height) {
			return {
				pass: false,
				message: () =>
					`${filename}: size ${got.width}x${got.height} != baseline ${expected.width}x${expected.height}`,
			};
		}

		const diff = new PNG({ width: expected.width, height: expected.height });
		const mismatch = pixelmatch(
			expected.data,
			got.data,
			diff.data,
			expected.width,
			expected.height,
			{ threshold: 0.01 },
		);

		if (mismatch > 0) {
			seenDiffs.add(filename);
			mkdirSync(DIFF_DIR, { recursive: true });
			writeFileSync(
				path.join(DIFF_DIR, filename),
				composite(expected, diff, got, expected.width, expected.height),
			);
			return {
				pass: false,
				message: () =>
					`${filename}: ${mismatch} pixels differ. Read this image to inspect: ${path.relative(ROOT, path.join(DIFF_DIR, filename))} (3 panels top-to-bottom: old, diff, new)`,
			};
		}

		return { pass: true, message: () => `${filename} matches baseline` };
	},
});

declare module 'bun:test' {
	interface Matchers {
		toMatchScreenshot(filename: string): void;
	}
}
