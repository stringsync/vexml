import {
	effectiveDecision,
	type RuleInboxDecision,
	type RuleInboxEntry,
	type RuleInboxState,
	ruleBucket,
	ruleDoneVerdict,
} from '@vexml/vex/rule-inbox-data';
import {
	BanIcon,
	CheckCircle2Icon,
	CheckIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	ListIcon,
	PencilIcon,
	SendIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { INK } from './mark-canvas';
import { RuleKbd } from './rule-card';

interface RecapItem {
	entry: RuleInboxEntry;
	decision: RuleInboxDecision | null;
}

/**
 * The end-of-pass recap for the rule review inbox. It shows every rule the
 * reviewer judged, so they can jump back to change any decision with `onSelect`
 * before sending the pass with `onSubmit`, or keep browsing with `onBrowse`.
 * Rejected rules come first with their notes, then approved rules, then a
 * collapsed disclosure of auto-passed rules.
 */
export function RuleRecapCard({
	entries,
	state,
	pendingCount,
	autoPassedCount,
	justSubmitted,
	submitting,
	onSelect,
	onSubmit,
	onBrowse,
}: {
	entries: RuleInboxEntry[];
	state: RuleInboxState;
	pendingCount: number;
	autoPassedCount: number;
	justSubmitted: boolean;
	submitting: boolean;
	onSelect: (id: string) => void;
	onSubmit: () => void;
	onBrowse: () => void;
}) {
	const [autoOpen, setAutoOpen] = useState(false);

	const rejected: RecapItem[] = [];
	const approved: RecapItem[] = [];
	const autoPassed: RuleInboxEntry[] = [];

	for (const entry of entries) {
		const bucket = ruleBucket(entry, state);
		if (bucket === 'auto') {
			autoPassed.push(entry);
			continue;
		}
		const verdict = ruleDoneVerdict(entry, state);
		const decision = effectiveDecision(entry, state);
		if (verdict === 'rejected') {
			rejected.push({ entry, decision });
		} else if (verdict === 'approved') {
			approved.push({ entry, decision });
		}
	}

	const reviewedCount = rejected.length + approved.length;

	if (reviewedCount === 0) {
		return (
			<EmptyAllCaughtUpCard
				autoPassed={autoPassed}
				autoPassedCount={autoPassedCount}
				totalCount={entries.length}
				autoOpen={autoOpen}
				onToggleAuto={() => setAutoOpen((v) => !v)}
				onSelect={onSelect}
				onBrowse={onBrowse}
			/>
		);
	}

	const heading = justSubmitted
		? 'Pass sent'
		: `All ${reviewedCount} rule${reviewedCount === 1 ? '' : 's'} reviewed`;
	const countsSummary = [
		`${approved.length} approved`,
		`${rejected.length} rejected`,
		`${autoPassedCount} auto-passed`,
	].join(' · ');
	const subtitle = justSubmitted
		? `${countsSummary}. You can still open any rule below if something needs another look.`
		: `${countsSummary}. Click any rule to inspect or fix before sending.`;

	let sendLabel = `Send pass (${pendingCount})`;
	if (submitting) {
		sendLabel = 'Sending…';
	} else if (justSubmitted) {
		sendLabel = 'Sent';
	}

	return (
		<article className="mx-auto w-full max-w-[780px] overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-score)]">
			<header className="flex items-start gap-3.5 border-b px-7 pt-6 pb-5">
				<div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-success/12 text-success">
					<CheckCircle2Icon className="size-5" />
				</div>
				<div className="min-w-0">
					<h1 className="text-[16.5px] leading-snug font-semibold text-foreground">
						{heading}
					</h1>
					<p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
				</div>
			</header>

			<div className="px-7 py-5">
				{rejected.length > 0 && (
					<RecapGroup
						title="Rejected"
						count={rejected.length}
						icon={<BanIcon className="size-3.5 text-destructive" />}
						items={rejected}
						onSelect={onSelect}
					/>
				)}

				{approved.length > 0 && (
					<div className={rejected.length > 0 ? 'mt-5' : ''}>
						<RecapGroup
							title="Approved"
							count={approved.length}
							icon={<CheckIcon className="size-3.5 text-success" />}
							items={approved}
							onSelect={onSelect}
						/>
					</div>
				)}

				{autoPassed.length > 0 && (
					<div className="mt-4 pt-1">
						<button
							type="button"
							onClick={() => setAutoOpen((v) => !v)}
							className="flex w-full items-center justify-between rounded-lg px-1.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
						>
							<span className="inline-flex items-center gap-1.5">
								{autoOpen ? (
									<ChevronDownIcon className="size-3.5" />
								) : (
									<ChevronRightIcon className="size-3.5" />
								)}
								<span>Auto-passed mechanical checks</span>
							</span>
							<span className="tabular-nums">{autoPassed.length}</span>
						</button>
						{autoOpen && (
							<div className="mt-2 divide-y overflow-hidden rounded-xl border">
								{autoPassed.map((entry) => (
									<RecapRow
										key={entry.id}
										id={entry.id}
										summary={entry.rule}
										onSelect={() => onSelect(entry.id)}
									/>
								))}
							</div>
						)}
					</div>
				)}
			</div>

			<footer className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/25 px-7 py-3">
				<div className="flex items-center gap-3.5 text-xs text-muted-foreground">
					<span className="inline-flex items-center gap-1">
						<RuleKbd>/</RuleKbd>
						<span>browse</span>
					</span>
					<span className="inline-flex items-center gap-1">
						<RuleKbd>Z</RuleKbd>
						<span>undo</span>
					</span>
				</div>
				<Button
					size="sm"
					disabled={pendingCount === 0 || submitting}
					onClick={onSubmit}
					className="bg-success text-white hover:bg-success/90"
				>
					<SendIcon />
					{sendLabel}
				</Button>
			</footer>
		</article>
	);
}

function RecapGroup({
	title,
	count,
	icon,
	items,
	onSelect,
}: {
	title: string;
	count: number;
	icon: React.ReactNode;
	items: RecapItem[];
	onSelect: (id: string) => void;
}) {
	return (
		<section>
			<div className="flex items-center justify-between px-1.5 pb-2 text-xs font-semibold text-muted-foreground">
				<span className="inline-flex items-center gap-1.5">
					{icon}
					<span>{title}</span>
				</span>
				<span className="tabular-nums">{count}</span>
			</div>
			<div className="divide-y overflow-hidden rounded-xl border">
				{items.map(({ entry, decision }) => (
					<RecapRow
						key={entry.id}
						id={entry.id}
						summary={
							decision?.verdict === 'rejected' && decision.note
								? decision.note
								: entry.rule
						}
						marks={decision?.marks?.length ?? 0}
						onSelect={() => onSelect(entry.id)}
					/>
				))}
			</div>
		</section>
	);
}

function RecapRow({
	id,
	summary,
	marks = 0,
	onSelect,
}: {
	id: string;
	summary: string;
	/** Arrows and boxes drawn on the rule's score with its rejection. */
	marks?: number;
	onSelect: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onSelect}
			className="group flex w-full items-center gap-3 bg-card px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--brand-wash)]/40"
		>
			<span className="shrink-0 font-mono text-xs font-medium text-foreground">
				{id}
			</span>
			<span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
				{summary}
			</span>
			{marks > 0 && (
				<span
					className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-px text-[11px] font-semibold"
					style={{ color: INK, background: `${INK}14` }}
				>
					<PencilIcon className="size-3" />
					{marks} {marks === 1 ? 'mark' : 'marks'}
				</span>
			)}
			<span className="shrink-0 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
				Review
			</span>
		</button>
	);
}

function EmptyAllCaughtUpCard({
	autoPassed,
	autoPassedCount,
	totalCount,
	autoOpen,
	onToggleAuto,
	onSelect,
	onBrowse,
}: {
	autoPassed: RuleInboxEntry[];
	autoPassedCount: number;
	totalCount: number;
	autoOpen: boolean;
	onToggleAuto: () => void;
	onSelect: (id: string) => void;
	onBrowse: () => void;
}) {
	const autoLabel = `${autoPassedCount} mechanical check${autoPassedCount === 1 ? '' : 's'} auto-passed.`;
	const description =
		totalCount > 0
			? `No rules need a look right now. ${autoLabel}`
			: 'No Behind Bars rules are registered yet.';

	return (
		<div className="mx-auto w-full max-w-[540px] rounded-2xl border bg-card px-8 py-9 text-center shadow-[var(--shadow-score)]">
			<CheckCircle2Icon className="mx-auto size-8 text-success" />
			<h1 className="mt-3 text-base font-semibold text-foreground">
				All caught up
			</h1>
			<p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
			{totalCount > 0 && (
				<div className="mt-5 flex items-center justify-center">
					<Button variant="outline" size="sm" onClick={onBrowse}>
						<ListIcon />
						Browse rules
					</Button>
				</div>
			)}
			{autoPassed.length > 0 && (
				<div className="mt-5 border-t pt-3 text-left">
					<button
						type="button"
						onClick={onToggleAuto}
						className="flex w-full items-center justify-between rounded-lg px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
					>
						<span className="inline-flex items-center gap-1.5">
							{autoOpen ? (
								<ChevronDownIcon className="size-3.5" />
							) : (
								<ChevronRightIcon className="size-3.5" />
							)}
							<span>Auto-passed mechanical checks</span>
						</span>
						<span className="tabular-nums">{autoPassed.length}</span>
					</button>
					{autoOpen && (
						<div className="mt-2 divide-y overflow-hidden rounded-xl border">
							{autoPassed.map((entry) => (
								<RecapRow
									key={entry.id}
									id={entry.id}
									summary={entry.rule}
									onSelect={() => onSelect(entry.id)}
								/>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
