import * as path from 'node:path';
import { dimensions, type Renderer, renderers } from '@vexml/renderer';
import type { Logger } from 'webappwiz/log';
import type { Fs } from 'webappwiz/system';

const DATA_DIR = path.resolve(import.meta.dir, '../integration/__data__');

/**
 * The engines the corpus is rendered through. MuseScore sits this out: it renders in
 * Docker and takes seconds per score, so its numbers wouldn't share a scale with these.
 */
const ENGINES = ['vexml', 'osmd', 'alphatab'] as const;

type Engine = (typeof ENGINES)[number];

/** What one render produced, or why it produced nothing. */
export type Cell = { ms: number; size: string } | { error: string };

/** A fixture's cells, positionally matched to the engine columns. */
export interface Row {
	name: string;
	cells: Cell[];
}

export interface PerfOptions {
	/** Substring of the fixture filename; every fixture when absent. */
	pattern?: string;
	log: Logger;
	fs: Fs;
}

/**
 * Renders the corpus through every engine and tabulates how long each took and how big
 * the result was. Size is half the measurement: vexml engraves more than the reference
 * renderers do, so a time column on its own would read as a loss it isn't.
 */
export async function perf(opts: PerfOptions) {
	const files = (await opts.fs.readdir(DATA_DIR))
		.filter((file) => file.endsWith('.musicxml'))
		.filter((file) => !opts.pattern || file.includes(opts.pattern))
		.sort();
	if (files.length === 0) {
		throw new Error(`no fixtures matching '${opts.pattern}'`);
	}

	const total = files.length * ENGINES.length;
	const counter = String(total).length;
	const label = Math.max(...files.map((file) => name(file).length));

	// Said up front because the table says nothing about how it was measured: one
	// sample per cell carries the usual few percent of jitter.
	opts.log.info(
		`${files.length} ${files.length === 1 ? 'fixture' : 'fixtures'}, ${ENGINES.length} engines, one render each`,
	);

	const rows: Row[] = [];
	let done = 0;
	try {
		for (const file of files) {
			const musicXML = await opts.fs.read(path.join(DATA_DIR, file));
			const cells: Cell[] = [];
			for (const engine of ENGINES) {
				const cell = await measure(build(engine, musicXML));
				cells.push(cell);
				done++;
				// The whole progress indicator: a line per render, as it lands. It doubles
				// as the data if someone kills a long run part way through.
				opts.log.info(
					`[${String(done).padStart(counter)}/${total}] ${name(file).padEnd(label)}  ${engine.padEnd(8)}  ${format(cell)}`,
				);
			}
			rows.push({ name: name(file), cells });
		}
	} finally {
		// One browser serves every render; nothing else here holds a resource.
		await renderers.disposeAsync();
	}

	opts.log.info(`\n${table(rows)}`);
	const failed = rows.flatMap((row) => row.cells).filter(isError).length;
	if (failed > 0) {
		opts.log.error(`${failed} of ${total} renders failed`);
	}
}

function build(engine: Engine, musicXML: string): Renderer {
	switch (engine) {
		case 'vexml':
			return renderers.vexml({ musicXML });
		case 'osmd':
			return renderers.osmd({ musicXML });
		case 'alphatab':
			return renderers.alphatab({ musicXML });
	}
}

/** Times render() alone: no file read, no PNG write, no process startup. */
async function measure(renderer: Renderer): Promise<Cell> {
	const started = Date.now();
	try {
		const image = await renderer.render();
		return { ms: Date.now() - started, size: dimensions(image) };
	} catch (e) {
		// A fixture no engine but vexml can parse shouldn't cost the other 500 renders.
		return { error: e instanceof Error ? e.message : String(e) };
	}
}

/** The run's results as a markdown table, padded to line up in a terminal too. */
export function table(rows: Row[]): string {
	const header = ['fixture', ...ENGINES];
	const body = rows.map((row) => [row.name, ...row.cells.map(format)]);
	const footer = ['mean', ...ENGINES.map((_, i) => mean(rows, i))];

	const all = [header, ...body, footer];
	const widths = header.map((_, i) =>
		Math.max(...all.map((cells) => (cells[i] ?? '').length)),
	);
	const line = (cells: string[]) =>
		`| ${cells.map((cell, i) => cell.padEnd(widths[i] ?? 0)).join(' | ')} |`;

	return [
		line(header),
		`|${widths.map((width) => '-'.repeat(width + 2)).join('|')}|`,
		...body.map(line),
		line(footer),
	].join('\n');
}

/** An engine's mean over the fixtures it managed to render. */
function mean(rows: Row[], engine: number): string {
	const times = rows.flatMap((row) => {
		const cell = row.cells[engine];
		return cell && !isError(cell) ? [cell.ms] : [];
	});
	if (times.length === 0) {
		return '-';
	}
	const total = times.reduce((sum, ms) => sum + ms, 0);
	return `${Math.round(total / times.length)}ms`;
}

function format(cell: Cell): string {
	// Only the first line: an engine's error can run to a stack trace.
	return isError(cell)
		? `error: ${cell.error.split('\n')[0]}`
		: `${cell.ms}ms ${cell.size}`;
}

function isError(cell: Cell): cell is { error: string } {
	return 'error' in cell;
}

function name(file: string): string {
	return file.replace(/\.musicxml$/, '');
}
