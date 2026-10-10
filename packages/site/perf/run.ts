import {
	type Cell,
	ENGINES,
	type Engine,
	type PerfEvent,
} from '../../vex/perf-events';

/** The run as the page knows it, folded from the event stream. */
export interface RunState {
	fixtures: string[];
	/** Each fixture's cells so far, by engine. */
	cells: Map<string, Partial<Record<Engine, Cell>>>;
	/** Renders the run itself has made; retries don't count toward its progress. */
	renders: number;
	done: boolean;
	/** Fixtures queued to render again, in the order the server works through them. */
	retrying: string[];
	/** How many times each fixture has been retried, so an image's URL changes with it. */
	versions: Map<string, number>;
	/** The latest event's `at`, and when the page heard it, for ticking the elapsed time. */
	at: number;
	heardAt: number;
}

export const EMPTY: RunState = {
	fixtures: [],
	cells: new Map(),
	renders: 0,
	done: false,
	retrying: [],
	versions: new Map(),
	at: 0,
	heardAt: 0,
};

export function fold(state: RunState, event: PerfEvent): RunState {
	const heardAt = performance.now();
	switch (event.type) {
		case 'start':
			return { ...EMPTY, fixtures: event.fixtures, at: 0, heardAt };
		case 'render': {
			const cells = new Map(state.cells);
			const fixture = {
				...cells.get(event.fixture),
				[event.engine]: event.cell,
			};
			cells.set(event.fixture, fixture);
			if (!state.done) {
				return {
					...state,
					cells,
					renders: state.renders + 1,
					at: event.at,
					heardAt,
				};
			}
			// Retries only render once the run is done, so this is one; it's over once every
			// engine is back.
			const finished = ENGINES.every((engine) => fixture[engine]);
			return {
				...state,
				cells,
				retrying: finished
					? state.retrying.filter((f) => f !== event.fixture)
					: state.retrying,
			};
		}
		case 'done':
			return { ...state, done: true, at: event.at, heardAt };
		case 'retry': {
			const cells = new Map(state.cells);
			cells.delete(event.fixture);
			const versions = new Map(state.versions);
			versions.set(event.fixture, (versions.get(event.fixture) ?? 0) + 1);
			return {
				...state,
				cells,
				versions,
				retrying: [...state.retrying, event.fixture],
			};
		}
	}
}

export function total(state: RunState): number {
	return state.fixtures.length * ENGINES.length;
}

/**
 * The render under way. The run goes fixture by fixture, each through ENGINES in order;
 * after it, the retry at the head of the queue, at its first engine not yet back.
 */
export function current(
	state: RunState,
): { fixture: string; engine: Engine } | undefined {
	if (state.done) {
		const fixture = state.retrying[0];
		const cells = fixture ? state.cells.get(fixture) : undefined;
		const engine = ENGINES.find((e) => !cells?.[e]);
		return fixture && engine ? { fixture, engine } : undefined;
	}
	const fixture = state.fixtures[Math.floor(state.renders / ENGINES.length)];
	const engine = ENGINES[state.renders % ENGINES.length];
	return fixture && engine ? { fixture, engine } : undefined;
}

export function isError(cell: Cell | undefined): cell is { error: string } {
	return cell !== undefined && 'error' in cell;
}

export function ms(cell: Cell | undefined): number | undefined {
	return cell && !isError(cell) ? cell.ms : undefined;
}

export interface EngineStats {
	rendered: number;
	failed: number;
	median?: number;
	mean?: number;
	max?: number;
}

export function stats(state: RunState, engine: Engine): EngineStats {
	const times: number[] = [];
	let failed = 0;
	for (const cells of state.cells.values()) {
		const cell = cells[engine];
		if (isError(cell)) {
			failed++;
		} else if (cell) {
			times.push(cell.ms);
		}
	}
	if (times.length === 0) {
		return { rendered: 0, failed };
	}
	times.sort((a, b) => a - b);
	const mid = Math.floor(times.length / 2);
	return {
		rendered: times.length,
		failed,
		median:
			times.length % 2
				? times[mid]
				: ((times[mid - 1] ?? 0) + (times[mid] ?? 0)) / 2,
		mean: times.reduce((sum, t) => sum + t, 0) / times.length,
		max: times.at(-1),
	};
}

/** The slowest engine's time on a fixture, which is what the chart ranks by. */
export function slowest(cells: Partial<Record<Engine, Cell>>): number {
	return Math.max(0, ...ENGINES.map((engine) => ms(cells[engine]) ?? 0));
}
