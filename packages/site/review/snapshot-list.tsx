import {
	isNewEntry,
	type Review,
	type ReviewData,
	type ReviewEntry,
	snapshotStatus,
} from '@vexml/vex/review-data';
import {
	CheckIcon,
	MessageSquarePlusIcon,
	SearchIcon,
	XIcon,
} from 'lucide-react';
import { type RefObject, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { percent } from './format';
import { Kbd } from './kbd';

type Status = ReturnType<typeof snapshotStatus>;
type Filter = 'all' | Status;

const FILTERS: [Filter, string][] = [
	['all', 'All'],
	['open', 'Open'],
	['changes', 'Changes'],
	['approved', 'Done'],
];

/** Every snapshot by test file with its status: filter it and pick one to review it. */
export function SnapshotList({
	data,
	review,
	current,
	filterRef,
	onPick,
	onClose,
}: {
	data: ReviewData;
	review: Review;
	current: string | null;
	filterRef: RefObject<HTMLInputElement | null>;
	onPick: (name: string) => void;
	onClose: () => void;
}) {
	const [query, setQuery] = useState('');
	const [filter, setFilter] = useState<Filter>('all');
	const status = (name: string) => snapshotStatus(data, review, name);
	const counts = useMemo(() => {
		const counts: Record<Filter, number> = {
			all: data.entries.length,
			open: 0,
			changes: 0,
			approved: 0,
		};
		for (const entry of data.entries) {
			counts[snapshotStatus(data, review, entry.name)] += 1;
		}
		return counts;
	}, [data, review]);
	const words = query.trim().toLowerCase();
	const shown = data.entries.filter(
		(entry) =>
			(filter === 'all' || status(entry.name) === filter) &&
			(!words || entry.name.toLowerCase().includes(words)),
	);
	// A column beside the snapshot, not over it, so it can stay open while reviewing.
	return (
		<nav className="flex w-[280px] shrink-0 flex-col border-r bg-muted/40">
			<div className="flex items-center gap-2 border-b px-3 py-2">
				<SearchIcon className="size-4 shrink-0 text-muted-foreground" />
				<input
					ref={filterRef}
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Escape') {
							e.currentTarget.blur();
						}
						if (e.key === 'Enter' && shown[0]) {
							onPick(shown[0].name);
							e.currentTarget.blur();
						}
					}}
					placeholder="Filter snapshots"
					className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
				/>
				<Kbd>/</Kbd>
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label="close the list"
					onClick={onClose}
				>
					<XIcon />
				</Button>
			</div>
			<div className="flex gap-0.5 px-2 py-2">
				{FILTERS.map(([value, label]) => (
					<Button
						key={value}
						variant={filter === value ? 'secondary' : 'ghost'}
						size="xs"
						className="px-1.5"
						onClick={() => setFilter(value)}
					>
						{label} <span className="tabular-nums">{counts[value]}</span>
					</Button>
				))}
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
				{byTest(shown).map(([test, entries]) => (
					<div key={test}>
						<div className="truncate px-2 pt-2 pb-1 font-mono text-2xs text-muted-foreground">
							{test}
						</div>
						{entries.map((entry) => (
							<Row
								key={entry.name}
								entry={entry}
								status={status(entry.name)}
								current={entry.name === current}
								onPick={() => onPick(entry.name)}
							/>
						))}
					</div>
				))}
				{shown.length === 0 && (
					<p className="px-2 py-3 text-xs text-muted-foreground">
						No snapshot matches.
					</p>
				)}
			</div>
		</nav>
	);
}

function Row({
	entry,
	status,
	current,
	onPick,
}: {
	entry: ReviewEntry;
	status: Status;
	current: boolean;
	onPick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onPick}
			aria-current={current ? 'true' : undefined}
			className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted ${current ? 'bg-brand-wash font-semibold hover:bg-brand-wash' : ''}`}
		>
			<StatusIcon status={status} current={current} />
			<span
				className={`min-w-0 flex-1 truncate font-mono text-xs ${status === 'approved' && !current ? 'text-muted-foreground' : ''}`}
				title={entry.name}
			>
				{entry.name.replace(/\.png$/, '')}
			</span>
			<span className="text-2xs text-muted-foreground tabular-nums">
				{isNewEntry(entry) ? 'New' : percent(entry.share)}
			</span>
		</button>
	);
}

function StatusIcon({ status, current }: { status: Status; current: boolean }) {
	if (status === 'approved') {
		return <CheckIcon className="size-3.5 shrink-0 text-success" />;
	}
	if (status === 'changes') {
		return (
			<MessageSquarePlusIcon className="size-3.5 shrink-0 text-destructive" />
		);
	}
	return (
		<span
			className={`mx-[3px] size-2 shrink-0 rounded-full ${current ? 'bg-brand' : 'bg-border'}`}
		/>
	);
}

/** Entries grouped by test file, each group placed by its largest change; entries keep
 * their order, largest first. */
function byTest(entries: ReviewEntry[]): [string, ReviewEntry[]][] {
	const groups = new Map<string, ReviewEntry[]>();
	for (const entry of entries) {
		const test = entry.test ?? 'other tests';
		groups.set(test, [...(groups.get(test) ?? []), entry]);
	}
	return [...groups];
}
