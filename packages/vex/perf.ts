import type { Image } from '@vexml/renderer';
import type { Logger } from 'core/log';
import type { Fs } from 'core/system';
import { type Bench, DATA_DIR } from './perf-bench';
import { type Cell, ENGINES, type Engine } from './perf-events';

/** A fixture's cells, positionally matched to the engine columns. */
export interface Row {
	name: string;
	cells: Cell[];
}

/**
 * Hears the run as it goes, beside the terminal: `vex perf --ui` streams it to a page.
 * Called inline between renders, never inside the timed span.
 */
export interface PerfListener {
	start(fixtures: string[]): void;
	/** image is absent exactly when the cell is an error. */
	render(fixture: string, engine: Engine, cell: Cell, image?: Image): void;
	done(): void;
}

export interface PerfOptions {
	/** Optional opt-in corpus; never adds files to the default integration suite. */
	dataDir?: string;
	/** Substring of the fixture filename; every fixture when absent. */
	pattern?: string;
	bench: Bench;
	log: Logger;
	fs: Fs;
	// vet-ignore noop-objects-over-null: an absent value is part of this public shape, and a Noop stand-in would change what callers and tests see
	listener?: PerfListener;
}

/**
 * Renders the corpus through every engine and tabulates how long each took and how big
 * the result was. Size is half the measurement: vexml engraves more than the reference
 * renderers do, so a time column on its own would read as a loss it isn't.
 */
export async function perf(opts: PerfOptions) {
	const files = (await opts.fs.readdir(opts.dataDir ?? DATA_DIR))
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

	opts.listener?.start(files.map(name));

	const rows: Row[] = [];
	let done = 0;
	try {
		for (const file of files) {
			const cells: Cell[] = [];
			for (const engine of ENGINES) {
				const { cell, image } = await opts.bench.measure(name(file), engine);
				cells.push(cell);
				done++;
				opts.listener?.render(name(file), engine, cell, image);
				// The whole progress indicator: a line per render, as it lands. It doubles
				// as the data if someone kills a long run part way through.
				opts.log.info(
					`[${String(done).padStart(counter)}/${total}] ${name(file).padEnd(label)}  ${engine.padEnd(8)}  ${format(cell)}`,
				);
			}
			rows.push({ name: name(file), cells });
		}
	} finally {
		opts.listener?.done();
	}

	opts.log.info(`\n${table(rows)}`);
	const failed = rows.flatMap((row) => row.cells).filter(isError).length;
	if (failed > 0) {
		opts.log.error(`${failed} of ${total} renders failed`);
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

export function format(cell: Cell): string {
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
