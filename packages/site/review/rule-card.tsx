import type { Mark, Panel } from '@vexml/vex/review-data';
import type {
	RuleInboxDecision,
	RuleInboxEntry,
} from '@vexml/vex/rule-inbox-data';
import { BanIcon, CheckIcon, ChevronRightIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { percent } from './format';
import { Lightbox } from './lightbox';
import { MarkCanvas, type Tool } from './mark-canvas';
import { BUTTON, RuleRejectionPanel } from './rule-rejection-panel';
import {
	RuleMarkReadout,
	RuleScoreCanvas,
	RuleScorePanel,
} from './rule-score-panel';

export type RuleInboxView = 'stacked' | 'diff' | 'after';

/** Borderless muted keyboard hint matching the codebase's plan-card footer convention. */
export function RuleKbd({ children }: { children: string }) {
	return (
		<kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-muted px-1 font-sans text-xs font-medium text-muted-foreground">
			{children}
		</kbd>
	);
}

/**
 * One Behind Bars rule card: rule name and shift readout, equal-width compare
 * toggle when a prior approval exists, plain Marks checkbox, one-sentence rule,
 * score render(s) with zoom, an inline rejection panel where arrows and boxes drawn on
 * the score each take a note, and Approve / Reject footer.
 */
export function RuleCard({
	entry,
	fix,
	decision,
	view,
	onView,
	showMarks,
	onShowMarks,
	peekingBefore,
	rejectOpen,
	onOpenReject,
	onCloseReject,
	onApprove,
	onReject,
}: {
	entry: RuleInboxEntry;
	fix: boolean;
	decision: RuleInboxDecision | null;
	view: RuleInboxView;
	onView: (view: RuleInboxView) => void;
	showMarks: boolean;
	onShowMarks: (show: boolean) => void;
	peekingBefore: boolean;
	rejectOpen: boolean;
	onOpenReject: () => void;
	onCloseReject: () => void;
	onApprove: () => void;
	onReject: (note: string, marks: Mark[]) => void;
}) {
	const [hoveredMark, setHoveredMark] = useState<number | null>(null);
	const [zoom, setZoom] = useState<Panel | null>(null);
	const [noteDraft, setNoteDraft] = useState(
		() => (decision?.verdict === 'rejected' ? decision.note : '') ?? '',
	);
	const [markDraft, setMarkDraft] = useState<Mark[]>([]);
	const [tool, setTool] = useState<Tool>('arrow');
	const [selectedMark, setSelectedMark] = useState<number | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const markNotesRef = useRef<(HTMLInputElement | null)[]>([]);
	// A new mark's note takes focus as it mounts, so typing straight after a drag
	// lands in the note rather than in the inbox's single-key shortcuts.
	const focusOnMount = useRef<number | null>(null);

	useEffect(() => {
		if (rejectOpen) {
			const rejected = decision?.verdict === 'rejected' ? decision : null;
			setNoteDraft(rejected?.note ?? '');
			setMarkDraft(rejected?.marks ?? []);
			setSelectedMark(null);
			requestAnimationFrame(() => inputRef.current?.focus());
		}
	}, [rejectOpen, decision]);

	const savedMarks =
		decision?.verdict === 'rejected' ? (decision.marks ?? []) : [];
	const shownMarks = rejectOpen ? markDraft : savedMarks;

	const focusMarkNote = (at: number) =>
		requestAnimationFrame(() => markNotesRef.current[at]?.focus());

	const addMark = (mark: Mark) => {
		const at = markDraft.length;
		setMarkDraft([...markDraft, mark]);
		setSelectedMark(at);
		focusOnMount.current = at;
	};

	const setMarkNote = (at: number, note: string) =>
		setMarkDraft(
			markDraft.map((mark, i) => (i === at ? { ...mark, note } : mark)),
		);

	const removeMark = (at: number) => {
		setMarkDraft(markDraft.filter((_, i) => i !== at));
		setSelectedMark(null);
	};

	const approvalLabel = entry.approvedDate
		? `Last approved ${formatShortDate(entry.approvedDate)}`
		: 'Last approved';
	const hasBefore = Boolean(entry.images.before);
	const hasMarks = entry.agentMarks.length > 0;
	const marksId = `rule-marks-${entry.id}`;
	const activeView: RuleInboxView = hasBefore ? view : 'after';

	const availablePanels: Panel[] = hasBefore
		? ['before', 'diff', 'after']
		: ['after'];

	const firstFail = entry.agentMarks.find(
		(m) => m.role === 'measure' && m.pass === false,
	);
	const readoutMark =
		hoveredMark !== null
			? (entry.agentMarks[hoveredMark] ?? null)
			: (firstFail ?? null);

	const contextText = buildContextText(entry);

	const submitRejection = () => {
		onReject(noteDraft, markDraft);
	};

	const renderPanel = (panel: Panel, dashed = false) => {
		const src = entry.images[panel] ?? entry.images.after;
		const withMarks = panel === 'after' && hasMarks && showMarks;
		const markUp = rejectOpen || shownMarks.length > 0;
		return (
			<RuleScorePanel
				src={src}
				alt={`${entry.id} ${panel}`}
				width={entry.width}
				height={entry.height}
				dashed={dashed}
				marks={withMarks ? entry.agentMarks : null}
				hoveredMark={withMarks ? hoveredMark : null}
				onHoverMark={withMarks ? setHoveredMark : undefined}
				onZoom={() => setZoom(panel)}
				canvas={
					markUp ? (
						<MarkCanvas
							src={src}
							panel={panel}
							width={entry.width}
							height={entry.height}
							marks={shownMarks
								.map((mark, at) => ({ mark, at }))
								.filter(({ mark }) => mark.panel === panel)}
							agentMarks={withMarks ? entry.agentMarks : undefined}
							showAgentMarks={withMarks}
							hoveredAgentMark={withMarks ? hoveredMark : null}
							onHoverAgentMark={withMarks ? setHoveredMark : undefined}
							drawing={rejectOpen}
							tool={tool}
							selected={selectedMark}
							onDraw={addMark}
							onSelect={(at) => {
								setSelectedMark(at);
								if (at !== null) {
									focusMarkNote(at);
								}
							}}
						/>
					) : undefined
				}
			/>
		);
	};

	return (
		<article className="mx-auto w-full max-w-[820px] overflow-hidden rounded-2xl border bg-card shadow-[var(--shadow-score)]">
			<div className="px-6 pt-5 pb-6">
				<header className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
					<span className="font-mono text-xs font-medium text-foreground">
						{entry.id}
					</span>
					{entry.pixelShare > 0 && (
						<span className="text-xs font-medium text-destructive tabular-nums">
							{percent(entry.pixelShare)} changed
						</span>
					)}
					{contextText && (
						<span
							className="min-w-0 truncate text-xs text-muted-foreground"
							title={contextText}
						>
							{contextText}
						</span>
					)}
					<div className="ml-auto flex shrink-0 items-center gap-3.5">
						{hasMarks && (
							<label
								htmlFor={marksId}
								className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground select-none"
							>
								<Checkbox
									id={marksId}
									checked={showMarks}
									onCheckedChange={(checked) => onShowMarks(checked === true)}
								/>
								<span>Marks</span>
							</label>
						)}
						{hasBefore && (
							<ToggleGroup
								type="single"
								variant="outline"
								size="sm"
								spacing={0}
								value={activeView}
								onValueChange={(value) =>
									value && onView(value as RuleInboxView)
								}
							>
								{(
									[
										['stacked', 'Stacked'],
										['diff', 'Diff'],
										['after', 'After'],
									] as const
								).map(([value, label]) => (
									<ToggleGroupItem
										key={value}
										value={value}
										className="w-[70px] justify-center text-xs font-medium aria-checked:bg-foreground aria-checked:text-background aria-pressed:bg-foreground aria-pressed:text-background data-[state=on]:bg-foreground data-[state=on]:text-background"
									>
										{label}
									</ToggleGroupItem>
								))}
							</ToggleGroup>
						)}
					</div>
				</header>

				<h1 className="mt-2.5 text-[16px] leading-snug font-semibold text-foreground">
					{entry.rule}
				</h1>

				{(entry.ruleHtml || entry.testCaseHtml || entry.lookForHtml) && (
					<Collapsible className="mt-2">
						<CollapsibleTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className="group/rule-notes -ms-2"
							>
								<ChevronRightIcon
									data-icon="inline-start"
									className="transition-transform group-data-[state=open]/rule-notes:rotate-90"
								/>
								Rule notes
							</Button>
						</CollapsibleTrigger>
						<CollapsibleContent className="mt-2 text-sm text-muted-foreground">
							<dl className="flex flex-col gap-2 [&_dd]:mt-0.5 [&_dt]:font-medium [&_dt]:text-foreground">
								{[
									['The rule', entry.ruleHtml],
									['The test case', entry.testCaseHtml],
									['What to look for', entry.lookForHtml],
								].map(
									([label, html]) =>
										html && (
											<div key={label}>
												<dt>{label}</dt>
												{/* Local rule notes, rendered by vex. */}
												<dd dangerouslySetInnerHTML={{ __html: html }} />
											</div>
										),
								)}
							</dl>
						</CollapsibleContent>
					</Collapsible>
				)}

				<div className="mt-4">
					{activeView === 'stacked' && hasBefore && (
						<div className="space-y-4">
							<div>
								<div className="mb-1.5 flex items-baseline gap-2">
									<span className="text-[11px] font-semibold tracking-wider text-foreground uppercase">
										Before
									</span>
									<span className="text-2xs text-muted-foreground">
										{fix ? 'On main' : approvalLabel}
									</span>
								</div>
								{renderPanel('before', true)}
							</div>
							<div>
								<div className="mb-1.5 flex items-baseline gap-2">
									<span className="text-[11px] font-semibold tracking-wider text-foreground uppercase">
										After
									</span>
									<span className="text-2xs text-muted-foreground">
										Current render
									</span>
								</div>
								{renderPanel('after', false)}
							</div>
						</div>
					)}
					{activeView === 'diff' && hasBefore && (
						<div>
							<div className="mb-1.5 flex items-baseline gap-2">
								<span className="text-[11px] font-semibold tracking-wider text-foreground uppercase">
									{peekingBefore ? 'Before' : 'Diff'}
								</span>
								<span className="text-2xs text-muted-foreground">
									{peekingBefore
										? 'Peeking last approved'
										: 'Red added · Blue removed · Hold Space to peek Before'}
								</span>
							</div>
							{renderPanel(peekingBefore ? 'before' : 'diff', peekingBefore)}
						</div>
					)}
					{(activeView === 'after' || !hasBefore) && (
						<div>
							{hasBefore && (
								<div className="mb-1.5 flex items-baseline gap-2">
									<span className="text-[11px] font-semibold tracking-wider text-foreground uppercase">
										After
									</span>
									<span className="text-2xs text-muted-foreground">
										Current render
									</span>
								</div>
							)}
							{renderPanel('after', false)}
						</div>
					)}

					{hasMarks && showMarks && readoutMark && (
						<RuleMarkReadout mark={readoutMark} />
					)}
				</div>

				{rejectOpen ? (
					<RuleRejectionPanel
						tool={tool}
						setTool={setTool}
						markDraft={markDraft}
						selectedMark={selectedMark}
						setSelectedMark={setSelectedMark}
						markNotesRef={markNotesRef}
						focusOnMount={focusOnMount}
						setMarkNote={setMarkNote}
						removeMark={removeMark}
						inputRef={inputRef}
						noteDraft={noteDraft}
						setNoteDraft={setNoteDraft}
						onSave={submitRejection}
						onCancel={onCloseReject}
					/>
				) : (
					decision?.verdict === 'rejected' &&
					(decision.note || savedMarks.length > 0) && (
						<div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-destructive/5 px-3 py-2 text-xs text-destructive">
							<span className="min-w-0 truncate">
								Rejected
								{decision.note ? `: ${decision.note}` : ''}
								{savedMarks.length > 0 &&
									` · ${savedMarks.length} ${savedMarks.length === 1 ? 'mark' : 'marks'}`}
							</span>
							<button
								type="button"
								onClick={onOpenReject}
								className="shrink-0 font-medium underline underline-offset-2"
							>
								Edit rejection
							</button>
						</div>
					)
				)}
			</div>

			<footer className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/25 px-6 py-3">
				<div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-xs text-muted-foreground">
					<span className="inline-flex items-center gap-1">
						<RuleKbd>←</RuleKbd>
						<RuleKbd>→</RuleKbd>
						<span>move</span>
					</span>
					{hasBefore && (
						<span className="inline-flex items-center gap-1">
							<RuleKbd>D</RuleKbd>
							<span>diff</span>
						</span>
					)}
					<span className="inline-flex items-center gap-1">
						<RuleKbd>A</RuleKbd>
						<span>approve</span>
					</span>
					<span className="inline-flex items-center gap-1">
						<RuleKbd>R</RuleKbd>
						<span>reject</span>
					</span>
					<span className="inline-flex items-center gap-1">
						<RuleKbd>Z</RuleKbd>
						<span>undo</span>
					</span>
				</div>

				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={onOpenReject}
						className={
							decision?.verdict === 'rejected'
								? `${BUTTON} border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10`
								: `${BUTTON} bg-card`
						}
					>
						<BanIcon
							className={
								decision?.verdict === 'rejected'
									? 'text-destructive'
									: 'text-muted-foreground'
							}
						/>
						Reject
					</Button>
					<Button
						size="sm"
						onClick={onApprove}
						className={`${BUTTON} bg-success text-white hover:bg-success/90`}
					>
						<CheckIcon />
						Approve
					</Button>
				</div>
			</footer>

			<Lightbox
				name={entry.id}
				panels={availablePanels}
				panel={zoom}
				width={entry.width}
				onPanel={setZoom}
				onClose={() => setZoom(null)}
			>
				{zoom && (
					<div className="p-4">
						<RuleScoreCanvas
							src={entry.images[zoom] ?? entry.images.after}
							alt={`${entry.id} ${zoom}`}
							width={entry.width}
							height={entry.height}
							marks={
								zoom === 'after' && hasMarks && showMarks
									? entry.agentMarks
									: null
							}
							hoveredMark={zoom === 'after' ? hoveredMark : null}
							onHoverMark={zoom === 'after' ? setHoveredMark : undefined}
						/>
					</div>
				)}
			</Lightbox>
		</article>
	);
}

function buildContextText(entry: RuleInboxEntry): string | null {
	if (entry.changeSummary) {
		return entry.changeSummary;
	}
	if (entry.status === 'rejected' && entry.priorNote) {
		return `Rejected: ${entry.priorNote}`;
	}
	if (entry.status === 'auto-passed') {
		return 'Auto-passed';
	}
	return null;
}

const MONTHS = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
];

function formatShortDate(iso: string): string {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
	if (!match) {
		return iso;
	}
	const month = MONTHS[Number(match[2]) - 1];
	const day = Number(match[3]);
	return month ? `${month} ${day}` : iso;
}
