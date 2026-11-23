import {
	type RuleInboxEntry,
	type RuleInboxState,
	ruleBucket,
	ruleDoneVerdict,
} from '@vexml/vex/rule-inbox-data';
import {
	BanIcon,
	CheckIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	SearchIcon,
} from 'lucide-react';
import { type RefObject, useState } from 'react';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetTitle,
} from '@/components/ui/sheet';
import { percent } from './format';
import { RuleKbd } from './rule-card';

/**
 * Slide-over jump drawer (Variant A1): plain `Review` list, `Done` list with
 * Check/Ban icons only, and a collapsed `Auto-passed` disclosure at the bottom.
 */
export function RuleDrawer({
	open,
	onOpenChange,
	entries,
	state,
	currentId,
	filterRef,
	onSelect,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	entries: RuleInboxEntry[];
	state: RuleInboxState;
	currentId: string | null;
	filterRef: RefObject<HTMLInputElement | null>;
	onSelect: (id: string) => void;
}) {
	const [query, setQuery] = useState('');
	const [autoOpen, setAutoOpen] = useState(false);

	const needle = query.trim().toLowerCase();
	const filtered = needle
		? entries.filter(
				(entry) =>
					entry.id.toLowerCase().includes(needle) ||
					entry.rule.toLowerCase().includes(needle),
			)
		: entries;

	const reviewItems = filtered.filter(
		(entry) => ruleBucket(entry, state) === 'review',
	);
	const doneItems = filtered.filter(
		(entry) => ruleBucket(entry, state) === 'done',
	);
	const autoItems = filtered.filter(
		(entry) => ruleBucket(entry, state) === 'auto',
	);

	const closeDrawer = () => {
		filterRef.current?.blur();
		onOpenChange(false);
	};

	const pick = (id: string) => {
		onSelect(id);
		closeDrawer();
	};

	const showAutoList = autoOpen || (needle.length > 0 && autoItems.length > 0);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="left"
				showCloseButton={false}
				className="w-[290px] gap-0 bg-card p-0 sm:max-w-[290px]"
			>
				<SheetTitle className="sr-only">Jump to rule</SheetTitle>
				<SheetDescription className="sr-only">
					Filter and select a Behind Bars rule to review.
				</SheetDescription>

				<div className="flex items-center gap-2 border-b px-3.5 py-2.5">
					<SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
					<input
						ref={filterRef}
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Escape') {
								e.preventDefault();
								if (query) {
									setQuery('');
								} else {
									closeDrawer();
								}
							} else if (e.key === 'Enter') {
								const first = reviewItems[0] ?? doneItems[0] ?? autoItems[0];
								if (first) {
									e.preventDefault();
									pick(first.id);
								}
							}
						}}
						placeholder="Filter rules..."
						className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
					/>
					<RuleKbd>/</RuleKbd>
				</div>

				<nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
					<SectionHeader label="Review" count={reviewItems.length} />
					{reviewItems.length === 0 ? (
						<div className="px-2.5 py-1.5 text-xs text-muted-foreground">
							{needle ? 'No matching rules' : 'Nothing left to review'}
						</div>
					) : (
						<ul className="space-y-0.5">
							{reviewItems.map((entry) => {
								const active = entry.id === currentId;
								return (
									<li key={entry.id}>
										<button
											type="button"
											onClick={() => pick(entry.id)}
											className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
												active
													? 'bg-[var(--brand-wash)] font-medium text-foreground'
													: 'text-foreground/85 hover:bg-muted'
											}`}
										>
											<span className="min-w-0 truncate font-mono text-xs">
												{entry.id}
											</span>
											{entry.pixelShare > 0 && (
												<span className="shrink-0 text-xs font-medium text-destructive tabular-nums">
													{percent(entry.pixelShare)}
												</span>
											)}
										</button>
									</li>
								);
							})}
						</ul>
					)}

					{doneItems.length > 0 && (
						<div className="mt-5">
							<SectionHeader label="Done" count={doneItems.length} />
							<ul className="space-y-0.5">
								{doneItems.map((entry) => {
									const active = entry.id === currentId;
									const verdict = ruleDoneVerdict(entry, state);
									return (
										<li key={entry.id}>
											<button
												type="button"
												onClick={() => pick(entry.id)}
												className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
													active
														? 'bg-[var(--brand-wash)] font-medium text-foreground'
														: 'text-muted-foreground hover:bg-muted hover:text-foreground'
												}`}
											>
												<span className="min-w-0 truncate font-mono text-xs">
													{entry.id}
												</span>
												{verdict === 'approved' && (
													<CheckIcon
														className="size-3.5 shrink-0 text-success"
														aria-label="Approved"
													/>
												)}
												{verdict === 'rejected' && (
													<BanIcon
														className="size-3.5 shrink-0 text-destructive"
														aria-label="Rejected"
													/>
												)}
											</button>
										</li>
									);
								})}
							</ul>
						</div>
					)}

					{autoItems.length > 0 && (
						<div className="mt-5 border-t pt-3">
							<button
								type="button"
								onClick={() => setAutoOpen((v) => !v)}
								className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
							>
								<span className="inline-flex items-center gap-1.5">
									{showAutoList ? (
										<ChevronDownIcon className="size-3.5" />
									) : (
										<ChevronRightIcon className="size-3.5" />
									)}
									<span>Auto-passed</span>
								</span>
								<span className="tabular-nums">{autoItems.length}</span>
							</button>
							{showAutoList && (
								<ul className="mt-1 space-y-0.5">
									{autoItems.map((entry) => {
										const active = entry.id === currentId;
										return (
											<li key={entry.id}>
												<button
													type="button"
													onClick={() => pick(entry.id)}
													className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
														active
															? 'bg-[var(--brand-wash)] font-medium text-foreground'
															: 'text-muted-foreground hover:bg-muted hover:text-foreground'
													}`}
												>
													<span className="min-w-0 truncate font-mono text-xs">
														{entry.id}
													</span>
												</button>
											</li>
										);
									})}
								</ul>
							)}
						</div>
					)}
				</nav>
			</SheetContent>
		</Sheet>
	);
}

function SectionHeader({ label, count }: { label: string; count: number }) {
	return (
		<div className="flex items-center justify-between px-2.5 pb-1.5 text-xs font-medium text-muted-foreground">
			<span>{label}</span>
			<span className="tabular-nums">{count}</span>
		</div>
	);
}
