import {
	type Review,
	type ReviewData,
	snapshotStatus,
} from '@vexml/vex/review-data';
import { reviewMessage } from '@vexml/vex/review-message';
import {
	ArrowLeftIcon,
	ArrowRightIcon,
	CheckIcon,
	ListIcon,
	MessageSquarePlusIcon,
	ScaleIcon,
	SendIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { EntryCard, type View } from './entry-card';
import { Finish, Tradeoffs } from './finish';
import { Kbd } from './kbd';
import { SnapshotList } from './snapshot-list';
import { useReview } from './use-review';

const VIEWS: { view: View; label: string; hint: string; key: string }[] = [
	{
		view: 'side',
		label: 'All',
		hint: 'Before, diff and after side by side',
		key: '1',
	},
	{ view: 'before', label: 'Before', hint: 'Before only', key: '2' },
	{ view: 'diff', label: 'Diff', hint: 'Diff only', key: '3' },
	{ view: 'after', label: 'After', hint: 'After only', key: '4' },
];

const VIEW_KEY = 'vex-review-view';

export function ReviewApp() {
	const loaded = useReview();
	if (loaded.error) {
		return (
			<div className="p-8 text-sm text-destructive">
				Could not load the review: {loaded.error}
			</div>
		);
	}
	if (!loaded.data || !loaded.review) {
		return (
			<div className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
				<Spinner className="size-4" /> Loading the review…
			</div>
		);
	}
	return <Walk {...loaded} data={loaded.data} review={loaded.review} />;
}

/**
 * The review, one snapshot at a time, largest change first. Approving moves on to the
 * next snapshot not yet reviewed, coming back around to any skipped, and after the last
 * the page shows the finish screen to submit from. One view holds for every snapshot.
 */
function Walk({
	data,
	review,
	save,
	setVerdict,
	setMarks,
	setThread,
	submit,
}: ReturnType<typeof useReview> & { data: ReviewData; review: Review }) {
	const names = data.entries.map((entry) => entry.name);
	const isOpen = (name: string) =>
		snapshotStatus(data, review, name) === 'open';
	// `null` is the finish screen.
	const [current, setCurrent] = useState<string | null>(
		() => names.find(isOpen) ?? null,
	);
	const [view, setView] = useState<View>(readView);
	const [listOpen, setListOpen] = useState(false);
	const filterRef = useRef<HTMLInputElement>(null);
	const at = current === null ? -1 : names.indexOf(current);
	const entry = at < 0 ? undefined : data.entries[at];
	const reviewed = names.filter((name) => !isOpen(name)).length;
	const verdict = entry ? review.verdicts[entry.name] : undefined;

	const changeView = (next: View) => {
		setView(next);
		try {
			localStorage.setItem(VIEW_KEY, next);
		} catch {
			// A sandboxed frame may refuse storage: the view lasts the visit.
		}
	};
	// The next snapshot still to review after this one, wrapping round; none left
	// finishes. The snapshot just judged is passed, as its verdict has yet to land.
	const nextOpen = (judged: string) => {
		for (let i = 1; i <= names.length; i++) {
			const name = names[(at + i) % names.length];
			if (name !== undefined && name !== judged && isOpen(name)) {
				return name;
			}
		}
		return null;
	};
	const approve = () => {
		if (!entry) {
			return;
		}
		setVerdict(entry.name, 'approved');
		setCurrent(nextOpen(entry.name));
	};
	const requestChanges = () => {
		if (entry) {
			setVerdict(entry.name, verdict === 'changes' ? null : 'changes');
		}
	};
	const step = (by: number) => {
		if (current === null) {
			if (by < 0) {
				setCurrent(names.at(-1) ?? null);
			}
			return;
		}
		const next = at + by;
		if (next >= names.length) {
			setCurrent(null);
		} else if (next >= 0) {
			setCurrent(names[next] ?? null);
		}
	};
	const openList = () => {
		setListOpen(true);
		// The list mounts with this render; focus its filter once it has.
		requestAnimationFrame(() => filterRef.current?.focus());
	};

	const keys = useRef<(e: KeyboardEvent) => void>(() => {});
	keys.current = (e: KeyboardEvent) => {
		const target = e.target as HTMLElement | null;
		if (
			e.metaKey ||
			e.ctrlKey ||
			e.altKey ||
			target?.closest('input, textarea, [contenteditable="true"]') ||
			// A lightbox open over the snapshot takes the keys.
			document.querySelector('[role="dialog"]')
		) {
			return;
		}
		const chosen = VIEWS.find((v) => v.key === e.key);
		if (chosen) {
			changeView(chosen.view);
		} else if (e.key === 'a') {
			approve();
		} else if (e.key === 'c') {
			requestChanges();
		} else if (e.key === 'j') {
			step(1);
		} else if (e.key === 'k') {
			step(-1);
		} else if (e.key === '/') {
			openList();
		} else if (e.key === 'Escape' && listOpen) {
			setListOpen(false);
		} else {
			return;
		}
		e.preventDefault();
	};
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => keys.current(e);
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, []);

	return (
		<div className="flex h-screen flex-col bg-background text-foreground">
			<header className="flex items-center gap-4 border-b px-5 py-2.5">
				<Button
					variant={listOpen ? 'secondary' : 'outline'}
					size="sm"
					onClick={() => (listOpen ? setListOpen(false) : openList())}
				>
					<ListIcon /> All {names.length}
				</Button>
				<div className="min-w-0">
					<div className="truncate text-sm font-semibold" title={data.title}>
						{data.title}
					</div>
					<div className="text-2xs text-muted-foreground">
						v{data.version}
						{data.unchanged === null ? '' : ` · ${data.unchanged} unchanged`}
					</div>
				</div>
				<div className="mx-auto flex w-[380px] items-center gap-3">
					<span className="text-sm font-semibold whitespace-nowrap tabular-nums">
						{current === null
							? `${reviewed} of ${names.length}`
							: `${at + 1} of ${names.length}`}
					</span>
					<Progress
						value={names.length ? (100 * reviewed) / names.length : 100}
						className="h-1.5 flex-1 bg-border [&>*]:bg-success"
					/>
					<span className="text-2xs whitespace-nowrap text-muted-foreground">
						{reviewed} reviewed
					</span>
				</div>
				{data.tradeoffs && (
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="ghost" size="sm">
								<ScaleIcon /> Trade-offs
							</Button>
						</PopoverTrigger>
						<PopoverContent align="end" className="w-[420px] p-0">
							<Tradeoffs html={data.tradeoffs} />
						</PopoverContent>
					</Popover>
				)}
				<span className="text-2xs text-muted-foreground">Compare</span>
				<ToggleGroup
					type="single"
					variant="outline"
					size="sm"
					spacing={0}
					value={view}
					onValueChange={(value) => value && changeView(value as View)}
				>
					{VIEWS.map(({ view: value, label, hint, key }) => (
						<Tooltip key={value}>
							<TooltipTrigger asChild>
								<ToggleGroupItem
									value={value}
									className="px-3 whitespace-nowrap aria-checked:bg-foreground aria-checked:text-background aria-pressed:bg-foreground aria-pressed:text-background"
								>
									{label}
								</ToggleGroupItem>
							</TooltipTrigger>
							<TooltipContent>
								{hint} <Kbd inverted>{key}</Kbd>
							</TooltipContent>
						</Tooltip>
					))}
				</ToggleGroup>
				<Button
					variant={current === null ? 'secondary' : 'outline'}
					size="sm"
					onClick={() => setCurrent(null)}
				>
					<SendIcon /> Submit
				</Button>
			</header>

			<div className="flex min-h-0 flex-1">
				{listOpen && (
					<SnapshotList
						data={data}
						review={review}
						current={current}
						filterRef={filterRef}
						onPick={setCurrent}
						onClose={() => setListOpen(false)}
					/>
				)}
				{entry ? (
					<div className="flex min-w-0 flex-1 flex-col">
						<main className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
							<EntryCard
								key={entry.name}
								entry={entry}
								version={data.version}
								threads={data.threads?.[entry.name] ?? []}
								states={review.threads ?? {}}
								marks={review.marks[entry.name] ?? []}
								view={view}
								onView={changeView}
								onMarks={(marks) => setMarks(entry.name, marks)}
								onThread={setThread}
							/>
						</main>
						<footer className="flex items-center gap-2 border-t px-6 py-3">
							<Button
								variant="outline"
								disabled={at === 0}
								onClick={() => step(-1)}
							>
								<ArrowLeftIcon /> Previous <Kbd>K</Kbd>
							</Button>
							<Button variant="ghost" onClick={() => step(1)}>
								Skip <ArrowRightIcon /> <Kbd>J</Kbd>
							</Button>
							<span className="ml-auto truncate text-2xs text-muted-foreground">
								{nextLabel(nextOpen(entry.name))}
							</span>
							<Button
								variant={verdict === 'changes' ? 'destructive' : 'outline'}
								size="lg"
								onClick={requestChanges}
							>
								<MessageSquarePlusIcon />
								{verdict === 'changes'
									? 'Changes requested'
									: 'Request changes'}
								<Kbd inverted={verdict === 'changes'}>C</Kbd>
							</Button>
							<Button
								size="lg"
								className="bg-success text-white hover:bg-success/90"
								onClick={approve}
							>
								<CheckIcon />
								{verdict === 'approved' ? 'Approved · next' : 'Approve & next'}
								<Kbd inverted>A</Kbd>
							</Button>
						</footer>
					</div>
				) : (
					<Finish
						data={data}
						review={review}
						message={reviewMessage(data, review)}
						save={save}
						onBack={
							names.length
								? () => setCurrent(names.find(isOpen) ?? names[0] ?? null)
								: null
						}
						onSubmit={submit}
					/>
				)}
			</div>
		</div>
	);
}

function nextLabel(next: string | null): string {
	return next === null ? 'Next up: finish' : `Next up: ${next}`;
}

function readView(): View {
	try {
		const saved = localStorage.getItem(VIEW_KEY);
		if (VIEWS.some((v) => v.view === saved)) {
			return saved as View;
		}
	} catch {
		// A sandboxed frame may refuse storage.
	}
	return 'side';
}
