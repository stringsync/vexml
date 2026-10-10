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
	renders: number;
	done: boolean;
	/** The latest event's `at`, and when the page heard it, for ticking the elapsed time. */
	at: number;
	heardAt: number;
}

export const EMPTY: RunState = {
	fixtures: [],
	cells: new Map(),
	renders: 0,
	done: false,
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
			cells.set(event.fixture, {
				...cells.get(event.fixture),
				[event.engine]: event.cell,
			});
			return {
				...state,
				cells,
				renders: state.renders + 1,
				at: event.at,
				heardAt,
			};
		}
		case 'done':
			return { ...state, done: true, at: event.at, heardAt };
	}
}

export function total(state: RunState): number {
	return state.fixtures.length * ENGINES.length;
}

/** The render under way: perf goes fixture by fixture, each through ENGINES in order. */
export function current(
	state: RunState,
): { fixture: string; engine: Engine } | undefined {
	if (state.done) {
		return undefined;
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
