import { CLIENT_HEADER, type Mark, SEQ_HEADER } from '@vexml/vex/review-data';
import {
	emptyRuleInboxState,
	RULE_INBOX_DATA_PATH,
	RULE_INBOX_STATE_PATH,
	RULE_INBOX_SUBMIT_PATH,
	type RuleInboxData,
	type RuleInboxDecision,
	type RuleInboxEntry,
	type RuleInboxState,
} from '@vexml/vex/rule-inbox-data';
import { Dispatcher, type Events } from 'core/events';
import { useCallback, useEffect, useRef, useState } from 'react';

export type InboxSaveState = 'saved' | 'saving' | 'failed';

interface UndoAction {
	ruleId: string;
	previous: RuleInboxDecision | undefined;
	previousCurrentId: string | null;
}

/**
 * Loads the Behind Bars rule inbox, persists verdicts to the out-of-worktree
 * store as the reviewer moves, maintains a session undo stack, and submits passes.
 */
export function useRuleInbox() {
	const [data, setData] = useState<RuleInboxData | null>(null);
	const [state, setState] = useState<RuleInboxState | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [save, setSave] = useState<InboxSaveState>('saved');
	const [submitting, setSubmitting] = useState(false);
	const [undoCount, setUndoCount] = useState(0);

	const stateRef = useRef<RuleInboxState | null>(null);
	const undoStackRef = useRef<UndoAction[]>([]);
	const saverRef = useRef<RuleInboxSaver | null>(null);

	useEffect(() => {
		let cancelled = false;
		const saver = new RuleInboxSaver(createClientId());
		const unsubscribe = saver.events.on('change', (next) => {
			if (!cancelled) {
				setSave(next);
			}
		});
		saverRef.current = saver;

		const onUnload = () => {
			saver.flushKeepalive();
		};
		window.addEventListener('pagehide', onUnload);
		window.addEventListener('beforeunload', onUnload);

		loadInbox().then(
			({ data: loadedData, state: loadedState }) => {
				if (cancelled) {
					return;
				}
				stateRef.current = loadedState;
				setData(loadedData);
				setState(loadedState);
			},
			(err: unknown) => {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : String(err));
				}
			},
		);

		return () => {
			cancelled = true;
			window.removeEventListener('pagehide', onUnload);
			window.removeEventListener('beforeunload', onUnload);
			unsubscribe();
			saver.dispose();
			if (saverRef.current === saver) {
				saverRef.current = null;
			}
		};
	}, []);

	const applyState = useCallback((next: RuleInboxState) => {
		stateRef.current = next;
		setState(next);
		void saverRef.current?.save(next);
	}, []);

	const decide = useCallback(
		(
			entry: RuleInboxEntry,
			verdict: 'approved' | 'rejected',
			note: string,
			currentId: string | null,
			marks: Mark[] = [],
		) => {
			const current = stateRef.current;
			if (!current) {
				return;
			}
			const previous = current.decisions[entry.id];
			undoStackRef.current.push({
				ruleId: entry.id,
				previous,
				previousCurrentId: currentId,
			});
			setUndoCount(undoStackRef.current.length);

			const decision: RuleInboxDecision = {
				verdict,
				note: note.trim(),
				...(verdict === 'rejected' && marks.length > 0
					? {
							marks: marks.map((mark) => ({ ...mark, note: mark.note.trim() })),
						}
					: {}),
				fingerprint: entry.fingerprint,
				updatedAt: new Date().toISOString(),
			};
			applyState({
				...current,
				decisions: { ...current.decisions, [entry.id]: decision },
			});
		},
		[applyState],
	);

	const undo = useCallback((): string | null => {
		const current = stateRef.current;
		const last = undoStackRef.current.pop();
		setUndoCount(undoStackRef.current.length);
		if (!current || !last) {
			return null;
		}
		const decisions = { ...current.decisions };
		if (last.previous) {
			decisions[last.ruleId] = last.previous;
		} else {
			delete decisions[last.ruleId];
		}
		applyState({ ...current, decisions });
		return last.previousCurrentId ?? last.ruleId;
	}, [applyState]);

	const saveNow = useCallback(async (): Promise<boolean> => {
		const saver = saverRef.current;
		const current = stateRef.current;
		if (!saver || !current) {
			return false;
		}
		return saver.flush(current);
	}, []);

	const submit = useCallback(async (): Promise<boolean> => {
		const saver = saverRef.current;
		const current = stateRef.current;
		if (!saver || !current) {
			return false;
		}
		setSubmitting(true);
		try {
			const savedOk = await saver.flush(current);
			if (!savedOk) {
				return false;
			}
			const res = await fetch(RULE_INBOX_SUBMIT_PATH, { method: 'POST' });
			if (!res.ok) {
				setSave('failed');
				return false;
			}
			const next = (await res.json()) as RuleInboxState;
			stateRef.current = next;
			setState(next);
			setSave('saved');
			return true;
		} catch {
			setSave('failed');
			return false;
		} finally {
			setSubmitting(false);
		}
	}, []);

	return {
		data,
		state,
		error,
		save,
		submitting,
		canUndo: undoCount > 0,
		decide,
		undo,
		saveNow,
		submit,
	};
}

class RuleInboxSaver {
	private readonly dispatcher = new Dispatcher<{ change: InboxSaveState }>();
	readonly events: Events<{ change: InboxSaveState }> = this.dispatcher.events;
	private seq = 0;
	private pending: RuleInboxState | null = null;
	private inflight: Promise<boolean> | null = null;

	constructor(private readonly clientId: string) {}

	dispose(): void {
		this.dispatcher.dispose();
	}

	save(state: RuleInboxState): Promise<boolean> {
		this.pending = state;
		return this.drain();
	}

	flush(state: RuleInboxState): Promise<boolean> {
		this.pending = state;
		return this.drain();
	}

	flushKeepalive(): void {
		if (!this.pending) {
			return;
		}
		const snapshot = this.pending;
		this.pending = null;
		const seq = ++this.seq;
		void putState(snapshot, this.clientId, seq, true);
	}

	private drain(): Promise<boolean> {
		if (this.inflight) {
			return this.inflight;
		}
		this.inflight = this.runLoop().finally(() => {
			this.inflight = null;
		});
		return this.inflight;
	}

	private async runLoop(): Promise<boolean> {
		let ok = true;
		while (this.pending) {
			const snapshot = this.pending;
			this.pending = null;
			const seq = ++this.seq;
			this.dispatcher.dispatch('change', 'saving');
			ok = await putState(snapshot, this.clientId, seq, false);
			if (!ok && !this.pending) {
				this.dispatcher.dispatch('change', 'failed');
				return false;
			}
		}
		this.dispatcher.dispatch('change', ok ? 'saved' : 'failed');
		return ok;
	}
}

async function putState(
	state: RuleInboxState,
	clientId: string,
	seq: number,
	keepalive: boolean,
): Promise<boolean> {
	try {
		const res = await fetch(RULE_INBOX_STATE_PATH, {
			method: 'PUT',
			headers: {
				'content-type': 'application/json',
				[CLIENT_HEADER]: clientId,
				[SEQ_HEADER]: String(seq),
			},
			body: JSON.stringify(state),
			keepalive,
		});
		return res.ok;
	} catch {
		return false;
	}
}

async function loadInbox(): Promise<{
	data: RuleInboxData;
	state: RuleInboxState;
}> {
	const [data, state] = await Promise.all([
		fetchJson<RuleInboxData>(RULE_INBOX_DATA_PATH),
		fetchJson<RuleInboxState>(RULE_INBOX_STATE_PATH),
	]);
	return { data, state: state ?? emptyRuleInboxState(data.sitting) };
}

async function fetchJson<T>(path: string): Promise<T> {
	const res = await fetch(path);
	if (!res.ok) {
		throw new Error(`${path}: ${res.status}`);
	}
	return (await res.json()) as T;
}

function createClientId(): string {
	return typeof crypto !== 'undefined' &&
		typeof crypto.randomUUID === 'function'
		? crypto.randomUUID()
		: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
