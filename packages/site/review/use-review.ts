import {
	CLIENT_HEADER,
	DATA_PATH,
	emptyReview,
	type Mark,
	type Review,
	type ReviewData,
	SEQ_HEADER,
	STATE_PATH,
	type ThreadState,
	type Verdict,
} from '@vexml/vex/review-data';
import {
	type ReviewSaveRequest,
	ReviewSaver,
	type ReviewTransport,
	type SaveState,
} from '@vexml/vex/review-saver';
import { Duration, SystemTimer } from 'core/time';
import { useCallback, useEffect, useRef, useState } from 'react';

export type { SaveState };

/** Loads the active review and returns actions to approve snapshots, edit comments, and submit. */
export function useReview() {
	const [data, setData] = useState<ReviewData | null>(null);
	const [review, setReview] = useState<Review | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [save, setSave] = useState<SaveState>('saved');

	const dataRef = useRef<ReviewData | null>(null);
	const reviewRef = useRef<Review | null>(null);
	const saverRef = useRef<ReviewSaver | null>(null);

	useEffect(() => {
		let cancelled = false;
		const saver = new ReviewSaver({
			transport: new FetchReviewTransport(),
			timer: new SystemTimer(),
			delay: Duration.ms(400),
			clientId: createClientId(),
		});
		const unsubscribe = saver.events.on('change', (next) => {
			if (!cancelled) {
				setSave(next);
			}
		});
		saverRef.current = saver;

		const onUnload = () => {
			if (dataRef.current?.mode === 'served') {
				saver.flushKeepalive();
			}
		};
		window.addEventListener('pagehide', onUnload);
		window.addEventListener('beforeunload', onUnload);

		load().then(
			({ data: loadedData, review: loadedReview }) => {
				if (cancelled) {
					return;
				}
				dataRef.current = loadedData;
				reviewRef.current = loadedReview;
				setData(loadedData);
				setReview(loadedReview);
			},
			(e: unknown) => {
				if (!cancelled) {
					setError(e instanceof Error ? e.message : String(e));
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

	const update = useCallback(
		(change: (current: Review) => Review, immediate = false) => {
			const current = reviewRef.current;
			if (!current) {
				return;
			}
			const next = change(current);
			reviewRef.current = next;
			setReview(next);
			if (dataRef.current?.mode !== 'served') {
				return;
			}
			if (immediate) {
				void saverRef.current?.flush(next);
			} else {
				saverRef.current?.schedule(next);
			}
		},
		[],
	);

	const submit = useCallback(async (submitted: boolean) => {
		const current = reviewRef.current;
		if (!current) {
			return;
		}
		const next = { ...current, submitted };
		reviewRef.current = next;
		setReview(next);
		if (dataRef.current?.mode !== 'served' || !saverRef.current) {
			return;
		}
		const ok = await saverRef.current.flush(next);
		// If the submit PUT failed and no newer edit superseded it, revert `submitted`
		// so the Submit button stays available beside the Not saved badge.
		if (!ok && reviewRef.current === next) {
			const reverted = { ...next, submitted: current.submitted };
			reviewRef.current = reverted;
			setReview(reverted);
		}
	}, []);

	return {
		data,
		review,
		error,
		save,
		setVerdict: (name: string, verdict: Verdict | null) =>
			update((r) => {
				const verdicts = { ...r.verdicts };
				if (verdict) {
					verdicts[name] = verdict;
				} else {
					delete verdicts[name];
				}
				return { ...r, verdicts };
			}, true),
		setMarks: (name: string, marks: Mark[]) =>
			update((r) => ({ ...r, marks: { ...r.marks, [name]: marks } })),
		setThread: (id: string, state: ThreadState) =>
			update((r) => ({ ...r, threads: { ...r.threads, [id]: state } })),
		submit,
	};
}

class FetchReviewTransport implements ReviewTransport {
	async put(request: ReviewSaveRequest): Promise<boolean> {
		try {
			const res = await fetch(STATE_PATH, {
				method: 'PUT',
				headers: {
					'content-type': 'application/json',
					[CLIENT_HEADER]: request.clientId,
					[SEQ_HEADER]: String(request.seq),
				},
				body: JSON.stringify(request.review),
				keepalive: request.keepalive,
			});
			return res.ok;
		} catch {
			return false;
		}
	}
}

function createClientId(): string {
	return typeof crypto !== 'undefined' &&
		typeof crypto.randomUUID === 'function'
		? crypto.randomUUID()
		: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

async function load(): Promise<{ data: ReviewData; review: Review }> {
	const embedded = document.getElementById('review-data');
	if (embedded?.textContent) {
		const data = JSON.parse(embedded.textContent) as ReviewData;
		return { data, review: emptyReview(data) };
	}
	const [data, review] = await Promise.all([
		fetchJson<ReviewData>(DATA_PATH),
		fetchJson<Review>(STATE_PATH),
	]);
	return { data, review };
}

async function fetchJson<T>(path: string): Promise<T> {
	const res = await fetch(path);
	if (!res.ok) {
		throw new Error(`${path}: ${res.status}`);
	}
	return (await res.json()) as T;
}
