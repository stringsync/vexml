import {
	type AgentMark,
	isNewEntry,
	type Mark,
	PANELS,
	type Panel,
	type ReviewEntry,
	type ReviewGuide,
	type Thread,
	type ThreadState,
} from '@vexml/vex/review-data';
import {
	ChevronDownIcon,
	ChevronRightIcon,
	Maximize2Icon,
	MoveUpRightIcon,
	SquareIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CommentMargin } from './comments';
import { percent } from './format';
import { Lightbox } from './lightbox';
import { MarkCanvas, type Placed, type Tool } from './mark-canvas';

/** How the snapshots show: all three panels side by side, or one of them. */
export type View = 'side' | Panel;

const PANEL_LABELS: Record<Panel, string> = {
	before: 'Before',
	diff: 'Diff',
	after: 'After',
};

/**
 * One snapshot, shown in the page's view: a quiet metadata header with a single
 * pass/fail signal, the rule and what to look for, collapsible test case and measured
 * details, the score with toggleable agent marks and a hover readout, and the reviewer's
 * comments beside it. The page holds the view and the verdict, so they carry across
 * snapshots.
 */
export function EntryCard({
	entry,
	version,
	threads,
	states,
	marks,
	view,
	onView,
	onMarks,
	onThread,
}: {
	entry: ReviewEntry;
	version: number;
	threads: Thread[];
	states: Record<string, ThreadState>;
	marks: Mark[];
	view: View;
	onView: (view: View) => void;
	onMarks: (marks: Mark[]) => void;
	onThread: (id: string, state: ThreadState) => void;
}) {
	const isNew = isNewEntry(entry);
	const agentMarks = entry.agentMarks ?? [];
	const hasAgentMarks = agentMarks.length > 0;

	const [tool, setTool] = useState<Tool>('arrow');
	const [selected, setSelected] = useState<number | null>(null);
	const [showResolved, setShowResolved] = useState(false);
	const [showAgentMarks, setShowAgentMarks] = useState(true);
	const [hoveredAgentMark, setHoveredAgentMark] = useState<number | null>(null);
	const [detailsOpen, setDetailsOpen] = useState(false);
	const [zoom, setZoom] = useState<Panel | null>(null);

	const shown = (thread: Thread) =>
		showResolved || !states[thread.id]?.resolved;
	// Every comment's mark with its number: threads first, then this version's marks.
	const all: Placed[] = [
		...threads.flatMap((thread, at) =>
			shown(thread) ? [{ mark: thread.mark, at }] : [],
		),
		...marks.map((mark, i) => ({ mark, at: threads.length + i })),
	];
	const select = (at: number | null) => {
		setSelected(at);
		const mark = at === null ? undefined : all.find((p) => p.at === at)?.mark;
		if (!isNew && mark && view !== 'side' && view !== mark.panel) {
			onView(mark.panel);
		}
	};

	const source = [
		entry.test ? `${entry.test}${entry.line ? `:${entry.line}` : ''}` : null,
		entry.fixture,
	]
		.filter(Boolean)
		.join(' · ');
	let panels: Panel[] = [view === 'side' ? 'after' : view];
	if (isNew) {
		panels = ['after'];
	} else if (view === 'side') {
		panels = [...PANELS];
	}

	// Every panel the snapshot has, for the lightbox to step through.
	const available: Panel[] = isNew ? ['after'] : [...PANELS];
	const canvas = (panel: Panel) => {
		const withOverlay = panel === 'after' && hasAgentMarks;
		return (
			<MarkCanvas
				src={entry.images[panel] ?? ''}
				panel={panel}
				width={entry.width}
				height={entry.height}
				tool={tool}
				selected={selected}
				marks={all.filter(({ mark }) => mark.panel === panel)}
				agentMarks={withOverlay ? agentMarks : undefined}
				showAgentMarks={withOverlay && showAgentMarks}
				hoveredAgentMark={withOverlay ? hoveredAgentMark : null}
				onHoverAgentMark={withOverlay ? setHoveredAgentMark : undefined}
				onDraw={draw}
				onSelect={select}
			/>
		);
	};

	const draw = (mark: Mark) => {
		onMarks([...marks, mark]);
		setSelected(threads.length + marks.length);
	};
	const change = (i: number, mark: Mark | null) => {
		const next = marks.map((m, j) => (j === i ? mark : m));
		onMarks(next.filter((m): m is Mark => m !== null));
		if (!mark) {
			setSelected(null);
		}
	};

	const measures = agentMarks.filter((m) => m.role === 'measure');
	const failedCount = measures.filter((m) => m.pass === false).length;
	const firstFailIndex = agentMarks.findIndex(
		(m) => m.role === 'measure' && m.pass === false,
	);
	let readoutMark: AgentMark | null = null;
	if (hoveredAgentMark !== null) {
		readoutMark = agentMarks[hoveredAgentMark] ?? null;
	} else if (firstFailIndex >= 0) {
		readoutMark = agentMarks[firstFailIndex] ?? null;
	}
	const marksToggleId = `agent-marks-${entry.name}`;

	return (
		<article className="rounded-xl border bg-card">
			<div className="px-5 pt-4 pb-3">
				<header className="flex min-w-0 items-center gap-2">
					<span
						className="truncate font-mono text-xs font-medium text-foreground"
						title={source || entry.name}
					>
						{entry.name}
					</span>
					{isNew ? (
						<span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
							New
						</span>
					) : (
						<ShareBadge share={entry.share} />
					)}
					{measures.length > 0 && (
						<CheckStatusPill total={measures.length} failed={failedCount} />
					)}
					{!isNew && (
						<span
							className={`shrink-0 text-xs text-muted-foreground tabular-nums ${measures.length > 0 ? '' : 'ml-auto'}`}
						>
							{entry.changed.toLocaleString()} pixels changed
						</span>
					)}
				</header>

				{entry.guide ? (
					<GuideBrief
						guide={entry.guide}
						claim={entry.claim}
						source={source}
						open={detailsOpen}
						onToggle={() => setDetailsOpen(!detailsOpen)}
					/>
				) : (
					entry.claim && (
						<div
							className="mt-2.5 text-sm text-foreground/85 [&_p+p]:mt-1.5"
							// The claim is the agent's own markdown, rendered by vex.
							dangerouslySetInnerHTML={{ __html: entry.claim }}
						/>
					)
				)}
			</div>

			<div className="grid grid-cols-[minmax(0,1fr)_272px] items-start gap-5 px-5 pb-4">
				<div className="min-w-0">
					<div className="mb-2.5 flex items-center gap-2.5">
						<ToggleGroup
							type="single"
							variant="outline"
							size="sm"
							spacing={0}
							value={tool}
							onValueChange={(value) => value && setTool(value as Tool)}
						>
							<ToggleGroupItem value="arrow" aria-label="arrow tool">
								<MoveUpRightIcon /> Arrow
							</ToggleGroupItem>
							<ToggleGroupItem value="box" aria-label="box tool">
								<SquareIcon /> Box
							</ToggleGroupItem>
						</ToggleGroup>
						<span className="truncate text-xs text-muted-foreground">
							Drag to mark · click to pin
							{entry.layout ? '' : ' (pixels only)'}
						</span>
						{hasAgentMarks && (
							<label
								htmlFor={marksToggleId}
								className="ml-auto flex shrink-0 cursor-pointer items-center gap-2 rounded-md border bg-card px-2.5 py-1 text-xs font-medium select-none"
							>
								<Switch
									id={marksToggleId}
									size="sm"
									checked={showAgentMarks}
									onCheckedChange={setShowAgentMarks}
									aria-label="Toggle agent marks"
								/>
								<span>Agent marks</span>
							</label>
						)}
					</div>

					<div
						className={`grid gap-2 ${panels.length === 3 ? 'grid-cols-3' : 'grid-cols-1'}`}
					>
						{panels.map((panel) => (
							<div key={panel} className="group relative min-w-0">
								{panels.length > 1 && (
									<div className="mb-1 text-xs text-muted-foreground">
										{PANEL_LABELS[panel]}
									</div>
								)}
								<div className="relative overflow-hidden rounded-lg border bg-white">
									{canvas(panel)}
									<Button
										variant="secondary"
										size="icon-sm"
										aria-label={`Open ${PANEL_LABELS[panel]} larger`}
										title={`Open ${PANEL_LABELS[panel]} larger`}
										className="absolute top-1.5 right-1.5 opacity-0 shadow-sm group-hover:opacity-100 focus-visible:opacity-100"
										onClick={() => setZoom(panel)}
									>
										<Maximize2Icon />
									</Button>
								</div>
							</div>
						))}
					</div>

					{hasAgentMarks && showAgentMarks && (
						<MarkReadoutBar
							mark={readoutMark}
							hovered={hoveredAgentMark !== null}
						/>
					)}
				</div>

				<div className="min-w-0">
					<div className="mb-2 text-xs font-medium text-muted-foreground">
						Comments
					</div>
					<CommentMargin
						entry={entry}
						version={version}
						threads={threads}
						states={states}
						marks={marks}
						selected={selected}
						showResolved={showResolved}
						onShowResolved={setShowResolved}
						onSelect={select}
						onThread={onThread}
						onMark={change}
					/>
				</div>
			</div>
			<Lightbox
				name={entry.name}
				panels={available}
				panel={zoom}
				width={entry.width}
				onPanel={setZoom}
				onClose={() => setZoom(null)}
			>
				{zoom && canvas(zoom)}
			</Lightbox>
		</article>
	);
}

function CheckStatusPill({ total, failed }: { total: number; failed: number }) {
	if (failed > 0) {
		return (
			<span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
				<span className="size-1.5 rounded-full bg-red-600" />
				{failed} of {total} failed
			</span>
		);
	}
	return (
		<span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
			<span className="size-1.5 rounded-full bg-emerald-600" />
			{total}/{total} passed
		</span>
	);
}

function GuideBrief({
	guide,
	claim,
	source,
	open,
	onToggle,
}: {
	guide: ReviewGuide;
	claim: string | null;
	source: string;
	open: boolean;
	onToggle: () => void;
}) {
	const hasDetails = Boolean(guide.testCase || guide.found || claim || source);
	return (
		<div className="mt-2.5">
			{guide.rule && (
				<div
					className="text-[15.5px] leading-snug font-semibold text-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-[13px] [&_code]:font-normal [&_p]:m-0"
					// The agent's own markdown, rendered by vex.
					dangerouslySetInnerHTML={{ __html: guide.rule }}
				/>
			)}
			{guide.lookFor && (
				<div
					className="mt-1.5 text-sm text-foreground/80 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-xs [&_p]:m-0 [&_p+p]:mt-1"
					// The agent's own markdown, rendered by vex.
					dangerouslySetInnerHTML={{ __html: guide.lookFor }}
				/>
			)}
			{hasDetails && (
				<div className="mt-2">
					<button
						type="button"
						onClick={onToggle}
						className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
					>
						{open ? (
							<ChevronDownIcon className="size-3.5" />
						) : (
							<ChevronRightIcon className="size-3.5" />
						)}
						Test case &amp; full check details
					</button>
					{open && (
						<div className="mt-2 flex flex-col gap-2 rounded-lg bg-muted/50 px-3.5 py-2.5 text-xs text-foreground/85">
							{guide.testCase && (
								<div>
									<span className="font-semibold text-muted-foreground">
										Test case:{' '}
									</span>
									<span
										className="[&_code]:rounded [&_code]:bg-background [&_code]:px-1 [&_code]:font-mono [&_p]:inline"
										dangerouslySetInnerHTML={{ __html: guide.testCase }}
									/>
								</div>
							)}
							{guide.found && (
								<div>
									<span className="font-semibold text-muted-foreground">
										What was found:{' '}
									</span>
									<span
										className="[&_code]:rounded [&_code]:bg-background [&_code]:px-1 [&_code]:font-mono [&_p]:inline"
										dangerouslySetInnerHTML={{ __html: guide.found }}
									/>
								</div>
							)}
							{claim && (
								<div
									className="[&_p]:m-0 [&_p+p]:mt-1"
									dangerouslySetInnerHTML={{ __html: claim }}
								/>
							)}
							{source && (
								<div className="font-mono text-[11px] text-muted-foreground">
									{source}
								</div>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function MarkReadoutBar({
	mark,
	hovered,
}: {
	mark: AgentMark | null;
	hovered: boolean;
}) {
	if (!mark) {
		return (
			<div className="mt-2 flex items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
				Hover any mark on the score to inspect its measurement.
			</div>
		);
	}
	const isRef = mark.role === 'reference';
	const failed = !isRef && mark.pass === false;
	let dotClass = 'bg-emerald-700';
	let suffix = ' (passed)';
	if (isRef) {
		dotClass = 'bg-blue-600';
		suffix = ' (reference)';
	} else if (failed) {
		dotClass = 'bg-red-600';
		suffix = ' (failed)';
	}
	return (
		<div
			className={`mt-2 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ${
				failed ? 'bg-red-50 text-red-900' : 'bg-muted/60 text-foreground/85'
			}`}
		>
			<span className={`size-2 shrink-0 rounded-full ${dotClass}`} />
			<span className="min-w-0 flex-1 truncate">
				{mark.note ? (
					mark.note
				) : (
					<>
						<strong className="font-semibold">{mark.label}</strong>
						{suffix}
					</>
				)}
			</span>
			{!hovered && (
				<span className="shrink-0 text-[11px] text-muted-foreground">
					Hover any mark
				</span>
			)}
		</div>
	);
}

export function ShareBadge({ share }: { share: number }) {
	return (
		<Badge
			variant={share >= 0.01 ? 'destructive' : 'outline'}
			className="shrink-0 tabular-nums"
		>
			{percent(share)}
		</Badge>
	);
}
