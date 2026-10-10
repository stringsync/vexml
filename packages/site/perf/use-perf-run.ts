import { useEffect, useReducer, useState } from 'react';
import { EVENTS_PATH, type PerfEvent } from '../../vex/perf-events';
import { EMPTY, fold } from './run';

/**
 * The run, live. The server replays every event so far on connect, so a reload lands
 * where the run is rather than at the start. `connected` goes false when vex exits.
 */
export function usePerfRun() {
	const [state, dispatch] = useReducer(fold, EMPTY);
	const [connected, setConnected] = useState(true);

	useEffect(() => {
		const source = new EventSource(EVENTS_PATH);
		source.onopen = () => setConnected(true);
		source.onmessage = (message) => {
			dispatch(JSON.parse(message.data) as PerfEvent);
		};
		// EventSource retries on its own; a reconnect replays the run from the start event,
		// which resets the fold, so nothing is counted twice.
		source.onerror = () => setConnected(false);
		return () => source.close();
	}, []);

	return { state, connected };
}

/** The run's elapsed milliseconds, ticking between events while it is under way. */
export function useElapsed(at: number, heardAt: number, running: boolean) {
	const [now, setNow] = useState(() => performance.now());

	useEffect(() => {
		if (!running) {
			return;
		}
		const id = window.setInterval(() => setNow(performance.now()), 100);
		return () => window.clearInterval(id);
	}, [running]);

	return running ? at + Math.max(0, now - heardAt) : at;
}
