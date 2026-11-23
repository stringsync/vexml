import type { Mark } from '@vexml/vex/review-data';
import {
	countPendingDecisions,
	effectiveDecision,
	type RuleInboxData,
	type RuleInboxState,
	ruleBucket,
} from '@vexml/vex/rule-inbox-data';
import { ListIcon, SaveIcon, Undo2Icon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { RuleCard, type RuleInboxView } from './rule-card';
import { RuleDrawer } from './rule-drawer';
import { RuleRecapCard } from './rule-recap-card';
import { type InboxSaveState, useRuleInbox } from './use-rule-inbox';

const VIEW_STORAGE_KEY = 'vex-rule-inbox-view';

export function RuleInboxApp() {
	const inbox = useRuleInbox();
	if (inbox.error) {
		return (
			<div className="p-8 text-sm text-destructive">
				Could not load the Behind Bars review inbox: {inbox.error}
			</div>
		);
	}
	if (!inbox.data || !inbox.state) {
		return (
			<div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
				<Spinner className="size-4" /> Loading Behind Bars review…
			</div>
		);
	}
	return <InboxDeck {...inbox} data={inbox.data} state={inbox.state} />;
}

function InboxDeck({
	data,
	state,
	save,
	submitting,
	canUndo,
	decide,
	undo,
	saveNow,
	submit,
}: ReturnType<typeof useRuleInbox> & {
	data: RuleInboxData;
	state: RuleInboxState;
}) {
	const reviewEntries = data.entries.filter(
		(entry) => ruleBucket(entry, state) === 'review',
	);
	const [currentId, setCurrentId] = useState<string | null>(
		() => reviewEntries[0]?.id ?? null,
	);
	const [view, setView] = useState<RuleInboxView>(readSavedView);
	const [showMarks, setShowMarks] = useState(true);
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [rejectOpen, setRejectOpen] = useState(false);
	const [peekingBefore, setPeekingBefore] = useState(false);
	const [justSubmitted, setJustSubmitted] = useState(false);
	const filterRef = useRef<HTMLInputElement>(null);

	const currentEntry =
		currentId !== null
			? (data.entries.find((entry) => entry.id === currentId) ?? null)
			: null;
	const currentDecision = currentEntry
		? effectiveDecision(currentEntry, state)
		: null;

	const pendingCount = countPendingDecisions(data, state);
	const reviewIndex = currentEntry
		? reviewEntries.findIndex((entry) => entry.id === currentEntry.id)
		: -1;

	const changeView = (next: RuleInboxView) => {
		setView(next);
		try {
			localStorage.setItem(VIEW_STORAGE_KEY, next);
		} catch {
			// Storage may be unavailable; the choice still lasts for this sitting.
		}
	};

	const openDrawer = () => {
		setDrawerOpen(true);
		requestAnimationFrame(() => filterRef.current?.focus());
	};

	const selectRule = (id: string | null) => {
		setCurrentId(id);
		setRejectOpen(false);
		setPeekingBefore(false);
	};

	// Next rule still open for review after judging `judgedId`.
	const nextAfterJudge = (judgedId: string): string | null => {
		const remaining = reviewEntries.filter((entry) => entry.id !== judgedId);
		if (remaining.length === 0) {
			return null;
		}
		if (reviewIndex >= 0) {
			return (
				remaining[Math.min(reviewIndex, remaining.length - 1)]?.id ??
				remaining[0]?.id ??
				null
			);
		}
		return remaining[0]?.id ?? null;
	};

	const handleApprove = () => {
		if (!currentEntry) {
			return;
		}
		setJustSubmitted(false);
		setRejectOpen(false);
		decide(currentEntry, 'approved', '', currentEntry.id);
		selectRule(nextAfterJudge(currentEntry.id));
	};

	const handleReject = (note: string, marks: Mark[]) => {
		if (!currentEntry) {
			return;
		}
		setJustSubmitted(false);
		setRejectOpen(false);
		decide(currentEntry, 'rejected', note, currentEntry.id, marks);
		selectRule(nextAfterJudge(currentEntry.id));
	};

	const handleUndo = () => {
		const restoredId = undo();
		if (restoredId !== null) {
			setJustSubmitted(false);
			selectRule(restoredId);
		}
	};

	const handleStep = (delta: number) => {
		const list = reviewIndex >= 0 ? reviewEntries : data.entries;
		if (list.length === 0) {
			return;
		}
		if (!currentEntry) {
			const target = delta < 0 ? list.at(-1) : list[0];
			if (target) {
				selectRule(target.id);
			}
			return;
		}
		const pos = list.findIndex((entry) => entry.id === currentEntry.id);
		if (pos < 0) {
			return;
		}
		const next = list[pos + delta];
		if (next) {
			selectRule(next.id);
		}
	};

	const handleSubmit = async () => {
		const ok = await submit();
		if (ok) {
			setJustSubmitted(true);
		}
	};

	const keysRef = useRef<(e: KeyboardEvent) => void>(() => {});
	keysRef.current = (e: KeyboardEvent) => {
		const target = e.target as HTMLElement | null;
		const inField = Boolean(
			target?.closest('input, textarea, [contenteditable="true"]'),
		);
		const dialogOpen =
			drawerOpen ||
			Boolean(document.querySelector('[role="dialog"][data-state="open"]'));

		if (
			(e.metaKey || e.ctrlKey) &&
			e.key.toLowerCase() === 'z' &&
			!e.shiftKey &&
			!inField &&
			!dialogOpen
		) {
			if (canUndo) {
				e.preventDefault();
				handleUndo();
			}
			return;
		}
		if (e.metaKey || e.ctrlKey || e.altKey || inField || dialogOpen) {
			return;
		}

		const key = e.key.toLowerCase();
		if (e.key === 'ArrowRight' || key === 'j') {
			handleStep(1);
		} else if (e.key === 'ArrowLeft' || key === 'k') {
			handleStep(-1);
		} else if (key === 'a' && currentEntry) {
			handleApprove();
		} else if (key === 'r' && currentEntry) {
			setRejectOpen(true);
		} else if (key === 'z' && canUndo) {
			handleUndo();
		} else if (key === 'd' && currentEntry?.images.before) {
			changeView(view === 'diff' ? 'stacked' : 'diff');
		} else if (e.key === '1' && currentEntry?.images.before) {
			changeView('stacked');
		} else if (e.key === '2' && currentEntry?.images.before) {
			changeView('diff');
		} else if (e.key === '3' && currentEntry?.images.before) {
			changeView('after');
		} else if (
			e.key === ' ' &&
			currentEntry?.images.before &&
			view === 'diff'
		) {
			setPeekingBefore(true);
		} else if (key === 'm' && currentEntry && currentEntry.agentMarks.length) {
			setShowMarks((v) => !v);
		} else if (e.key === '/') {
			openDrawer();
		} else if (e.key === 'Escape' && rejectOpen) {
			setRejectOpen(false);
		} else {
			return;
		}
		e.preventDefault();
	};

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => keysRef.current(e);
		const onKeyUp = (e: KeyboardEvent) => {
			if (e.key === ' ') {
				setPeekingBefore(false);
			}
		};
		const onBlur = () => setPeekingBefore(false);
		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);
		window.addEventListener('blur', onBlur);
		return () => {
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
			window.removeEventListener('blur', onBlur);
		};
	}, []);

	const counterLabel = formatCounterLabel(
		reviewIndex,
		reviewEntries.length,
		data.entries.length,
	);
	const statusText = formatSaveStatus(save, justSubmitted, state);

	return (
		<div className="flex min-h-screen flex-col bg-background text-foreground">
			<header className="flex items-center justify-between gap-4 px-6 py-3.5">
				<div className="flex min-w-0 items-center gap-3">
					<Button
						variant="outline"
						size="sm"
						onClick={openDrawer}
						className="bg-card"
					>
						<ListIcon />
						<span className="tabular-nums">{counterLabel}</span>
					</Button>
					<span className="truncate text-xs text-muted-foreground">
						<span className="hidden sm:inline">Behind Bars </span>
						{data.fix ? 'Fix review' : 'Review'}
						<span className="hidden sm:inline"> · </span>
						<span
							className={
								save === 'failed'
									? 'block text-destructive sm:inline'
									: 'hidden sm:inline'
							}
						>
							{statusText}
						</span>
					</span>
				</div>

				<div className="flex shrink-0 items-center gap-2">
					{reviewEntries.length === 0 && currentEntry !== null && (
						<Button variant="ghost" size="sm" onClick={() => selectRule(null)}>
							Recap
						</Button>
					)}
					<Button
						variant="ghost"
						size="sm"
						disabled={!canUndo}
						onClick={handleUndo}
					>
						<Undo2Icon />
						Undo
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="bg-card"
						disabled={save === 'saving'}
						onClick={() => void saveNow()}
					>
						<SaveIcon />
						{save === 'saving' ? 'Saving…' : 'Save'}
					</Button>
				</div>
			</header>

			<main className="flex flex-1 flex-col justify-center px-6 pt-4 pb-12">
				{currentEntry ? (
					<RuleCard
						key={currentEntry.id}
						entry={currentEntry}
						fix={data.fix ?? false}
						decision={currentDecision}
						view={view}
						onView={changeView}
						showMarks={showMarks}
						onShowMarks={setShowMarks}
						peekingBefore={peekingBefore}
						rejectOpen={rejectOpen}
						onOpenReject={() => setRejectOpen(true)}
						onCloseReject={() => setRejectOpen(false)}
						onApprove={handleApprove}
						onReject={handleReject}
					/>
				) : (
					<RuleRecapCard
						entries={data.entries}
						state={state}
						pendingCount={pendingCount}
						autoPassedCount={data.autoPassedCount}
						justSubmitted={justSubmitted}
						submitting={submitting}
						onSelect={selectRule}
						onSubmit={() => void handleSubmit()}
						onBrowse={openDrawer}
					/>
				)}
			</main>

			<RuleDrawer
				open={drawerOpen}
				onOpenChange={setDrawerOpen}
				entries={data.entries}
				state={state}
				currentId={currentId}
				filterRef={filterRef}
				onSelect={selectRule}
			/>
		</div>
	);
}

function formatCounterLabel(
	reviewIndex: number,
	reviewCount: number,
	totalCount: number,
): string {
	if (reviewCount > 0 && reviewIndex >= 0) {
		return `${reviewIndex + 1} of ${reviewCount}`;
	}
	if (reviewCount > 0) {
		return `${reviewCount} to review`;
	}
	return `All ${totalCount}`;
}

function formatSaveStatus(
	save: InboxSaveState,
	justSubmitted: boolean,
	state: RuleInboxState,
): string {
	if (save === 'saving') {
		return 'Saving…';
	}
	if (save === 'failed') {
		return 'Not saved';
	}
	if (
		justSubmitted ||
		(state.submittedAt !== null && state.submittedSitting === state.sitting)
	) {
		return 'Sent';
	}
	return 'Saved';
}

function readSavedView(): RuleInboxView {
	try {
		const raw = localStorage.getItem(VIEW_STORAGE_KEY);
		if (raw === 'stacked' || raw === 'diff' || raw === 'after') {
			return raw;
		}
	} catch {
		// Ignore unavailable storage.
	}
	return 'stacked';
}
