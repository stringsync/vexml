import { cn } from 'cn';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { type Cell, ENGINES, type Engine } from '../../vex/perf-events';
import { ENGINE_LABELS, EngineDot } from './engines';
import { current, isError, ms, type RunState } from './run';

type SortKey = 'run' | 'fixture' | Engine;

export interface Sort {
	key: SortKey;
	dir: 1 | -1;
}

export const RUN_ORDER: Sort = { key: 'run', dir: 1 };

/** A header's click: flips the column it is on, or starts a new one at its likeliest end. */
export function nextSort(sort: Sort, key: SortKey): Sort {
	if (sort.key === key) {
		return { key, dir: sort.dir === 1 ? -1 : 1 };
	}
	return { key, dir: key === 'fixture' ? 1 : -1 };
}

/**
 * Every fixture, in run order until a header says otherwise. The app owns the filter and
 * sort, since stepping through fixtures in the comparison follows this table's order.
 */
export function FixtureTable({
	state,
	fixtures,
	query,
	onQuery,
	sort,
	onSort,
	selected,
	onSelect,
}: {
	state: RunState;
	fixtures: string[];
	query: string;
	onQuery: (query: string) => void;
	sort: Sort;
	onSort: (sort: Sort) => void;
	selected: string | undefined;
	onSelect: (fixture: string) => void;
}) {
	const now = current(state);
	const toggle = (key: SortKey) => onSort(nextSort(sort, key));

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="flex items-center gap-2 border-b px-3 py-2.5">
				<Input
					value={query}
					onChange={(e) => onQuery(e.target.value)}
					placeholder="Filter fixtures"
					className="h-8"
				/>
				<span className="shrink-0 font-mono text-2xs text-muted-foreground tabular-nums">
					{fixtures.length}/{state.fixtures.length}
				</span>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto">
				<Table className="font-mono text-xs tabular-nums">
					<TableHeader className="sticky top-0 z-10 bg-card">
						<TableRow>
							<SortHead
								label="fixture"
								sortKey="fixture"
								sort={sort}
								onSort={toggle}
							/>
							{ENGINES.map((engine) => (
								<SortHead
									key={engine}
									label={<EngineDot engine={engine} />}
									title={ENGINE_LABELS[engine]}
									sortKey={engine}
									sort={sort}
									onSort={toggle}
									numeric
								/>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{fixtures.map((fixture) => (
							<TableRow
								key={fixture}
								data-state={fixture === selected ? 'selected' : undefined}
								ref={
									fixture === selected
										? (row) => row?.scrollIntoView({ block: 'nearest' })
										: undefined
								}
								onClick={() => onSelect(fixture)}
								className="cursor-pointer data-[state=selected]:bg-brand-wash"
							>
								<TableCell className="max-w-0 truncate" title={fixture}>
									{fixture}
								</TableCell>
								{ENGINES.map((engine) => (
									<TimeCell
										key={engine}
										cell={state.cells.get(fixture)?.[engine]}
										busy={now?.fixture === fixture && now.engine === engine}
									/>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

function SortHead({
	label,
	title,
	sortKey,
	sort,
	onSort,
	numeric,
}: {
	label: React.ReactNode;
	title?: string;
	sortKey: SortKey;
	sort: Sort;
	onSort: (key: SortKey) => void;
	numeric?: boolean;
}) {
	const Arrow = sort.dir === 1 ? ArrowUpIcon : ArrowDownIcon;
	return (
		<TableHead className={cn(numeric && 'w-16 text-right')}>
			<button
				type="button"
				title={title}
				onClick={() => onSort(sortKey)}
				className={cn(
					'inline-flex items-center gap-1 font-sans text-2xs text-muted-foreground hover:text-foreground',
					numeric && 'flex-row-reverse',
				)}
			>
				{label}
				{sort.key === sortKey && <Arrow className="size-3" />}
			</button>
		</TableHead>
	);
}

function TimeCell({ cell, busy }: { cell: Cell | undefined; busy: boolean }) {
	if (isError(cell)) {
		return (
			<TableCell className="text-right">
				<Tooltip>
					<TooltipTrigger className="text-destructive">failed</TooltipTrigger>
					<TooltipContent className="max-w-sm font-mono">
						{cell.error.split('\n')[0]}
					</TooltipContent>
				</Tooltip>
			</TableCell>
		);
	}
	if (cell) {
		return <TableCell className="text-right">{cell.ms}</TableCell>;
	}
	return (
		<TableCell className="text-right">
			{busy ? (
				<Spinner className="ml-auto size-3 text-muted-foreground" />
			) : (
				<span className="text-faded">·</span>
			)}
		</TableCell>
	);
}

/** Failed renders sort last whichever way an engine column runs, and pending ones after them. */
export function visibleFixtures(
	state: RunState,
	query: string,
	sort: Sort,
): string[] {
	const q = query.trim().toLowerCase();
	const fixtures = state.fixtures.filter((f) => f.toLowerCase().includes(q));
	if (sort.key === 'run') {
		return fixtures;
	}
	if (sort.key === 'fixture') {
		return fixtures.sort((a, b) => a.localeCompare(b) * sort.dir);
	}
	const engine = sort.key;
	// Rendered first in the chosen direction, then failed, then pending.
	const rank = (f: string) => {
		const cell = state.cells.get(f)?.[engine];
		if (!cell) {
			return 2;
		}
		return isError(cell) ? 1 : 0;
	};
	return fixtures.sort((a, b) => {
		const byRank = rank(a) - rank(b);
		if (byRank !== 0) {
			return byRank;
		}
		const ta = ms(state.cells.get(a)?.[engine]) ?? 0;
		const tb = ms(state.cells.get(b)?.[engine]) ?? 0;
		return (ta - tb) * sort.dir;
	});
}
