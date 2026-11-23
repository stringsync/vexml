import {
	describeTarget,
	type Mark,
	type ReviewEntry,
	resolve,
	type Thread,
	type ThreadMessage,
	type ThreadState,
} from '@vexml/vex/review-data';
import { CheckIcon, RotateCcwIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

// The snapshot's marks as comments in a margin, as in a shared document: each a card
// with who said what in each version, resolved with its check or kept open by a reply.

/** The margin: each carried thread, the resolved hidden behind a line, then the marks
 * drawn this version. Numbers run threads first, as the review message counts them. */
export function CommentMargin({
	entry,
	version,
	threads,
	states,
	marks,
	selected,
	showResolved,
	onShowResolved,
	onSelect,
	onThread,
	onMark,
}: {
	entry: ReviewEntry;
	version: number;
	threads: Thread[];
	states: Record<string, ThreadState>;
	marks: Mark[];
	selected: number | null;
	showResolved: boolean;
	onShowResolved: (show: boolean) => void;
	onSelect: (at: number | null) => void;
	onThread: (id: string, state: ThreadState) => void;
	onMark: (at: number, mark: Mark | null) => void;
}) {
	const resolved = threads.filter((t) => states[t.id]?.resolved).length;
	if (threads.length === 0 && marks.length === 0) {
		return (
			<p className="px-1 text-xs text-muted-foreground">
				Draw on the image to comment on what is under it.
			</p>
		);
	}
	return (
		<div className="flex flex-col gap-2">
			{threads.map((thread, at) => {
				const state = states[thread.id] ?? { resolved: false, reply: '' };
				if (state.resolved && !showResolved) {
					return null;
				}
				return (
					<ThreadCard
						key={thread.id}
						number={at + 1}
						thread={thread}
						state={state}
						version={version}
						active={selected === at}
						onSelect={() => onSelect(at)}
						onChange={(next) => onThread(thread.id, next)}
					/>
				);
			})}
			{resolved > 0 && (
				<button
					type="button"
					className="self-start px-1 text-xs text-muted-foreground"
					onClick={() => onShowResolved(!showResolved)}
				>
					{resolved === 1
						? '1 resolved comment'
						: `${resolved} resolved comments`}{' '}
					{showResolved ? 'shown' : 'hidden'} ·{' '}
					<span className="underline">{showResolved ? 'Hide' : 'Show'}</span>
				</button>
			)}
			{marks.map((mark, i) => {
				const at = threads.length + i;
				return (
					<MarkCard
						key={at}
						number={at + 1}
						entry={entry}
						mark={mark}
						version={version}
						active={selected === at}
						onSelect={() => onSelect(at)}
						onChange={(next) => onMark(i, next)}
						onClose={() => onSelect(null)}
					/>
				);
			})}
		</div>
	);
}

/** A thread from an earlier version: its messages, a reply box and the resolve check. */
export function ThreadCard({
	number,
	thread,
	state,
	version,
	active,
	onSelect,
	onChange,
}: {
	number: number;
	thread: Thread;
	/** Absent for a settled thread, which is read only. */
	state?: ThreadState;
	version: number;
	active?: boolean;
	onSelect?: () => void;
	onChange?: (state: ThreadState) => void;
}) {
	const [first, ...rest] = thread.messages;
	const where = thread.target ? describeTarget(thread.target) : '';
	return (
		<CommentCard active={active} muted={state?.resolved} onSelect={onSelect}>
			<Byline
				author="reviewer"
				number={number}
				meta={[`v${first?.version ?? '?'}`, where].filter(Boolean).join(' · ')}
				action={
					state &&
					onChange && (
						<Button
							variant="ghost"
							size="icon"
							className="size-7 rounded-full"
							title={state.resolved ? 'Reopen' : 'Resolve'}
							aria-label={state.resolved ? 'reopen comment' : 'resolve comment'}
							onClick={(event) => {
								event.stopPropagation();
								onChange({ ...state, resolved: !state.resolved });
							}}
						>
							{state.resolved ? <RotateCcwIcon /> : <CheckIcon />}
						</Button>
					)
				}
			/>
			{first && <Body message={first} />}
			{rest.map((message, i) => (
				<div key={i} className="mt-3">
					<Byline author={message.author} meta={`v${message.version}`} />
					<Body message={message} />
				</div>
			))}
			{state?.resolved && (
				<div className="mt-2 text-xs text-muted-foreground">
					Resolved in v{version}
				</div>
			)}
			{state && onChange && !state.resolved && (
				<Textarea
					value={state.reply}
					placeholder="Reply…"
					onClick={(event) => event.stopPropagation()}
					onFocus={onSelect}
					onChange={(event) =>
						onChange({ ...state, reply: event.target.value })
					}
					className="mt-3 min-h-9 rounded-2xl px-3 py-1.5 text-sm"
				/>
			)}
		</CommentCard>
	);
}

/** A mark drawn this version: its note, edited in place while it is selected. */
function MarkCard({
	number,
	entry,
	mark,
	version,
	active,
	onSelect,
	onChange,
	onClose,
}: {
	number: number;
	entry: ReviewEntry;
	mark: Mark;
	version: number;
	active: boolean;
	onSelect: () => void;
	onChange: (mark: Mark | null) => void;
	onClose: () => void;
}) {
	const where = entry.layout ? describeTarget(resolve(mark, entry.layout)) : '';
	return (
		<CommentCard active={active} onSelect={onSelect}>
			<Byline
				author="reviewer"
				number={number}
				meta={[`v${version}`, where].filter(Boolean).join(' · ')}
				action={
					<Button
						variant="ghost"
						size="icon"
						className="size-7 rounded-full"
						title="Delete"
						aria-label="delete comment"
						onClick={(event) => {
							event.stopPropagation();
							onChange(null);
						}}
					>
						<Trash2Icon />
					</Button>
				}
			/>
			{active ? (
				<Textarea
					autoFocus
					value={mark.note}
					placeholder="What should change here?"
					onClick={(event) => event.stopPropagation()}
					onChange={(event) => onChange({ ...mark, note: event.target.value })}
					onKeyDown={(event) => {
						if (event.key === 'Escape') {
							onClose();
						}
					}}
					className="mt-2 min-h-16 text-sm"
				/>
			) : (
				<p className="mt-1.5 text-sm whitespace-pre-wrap">
					{mark.note || (
						<span className="text-muted-foreground italic">no note</span>
					)}
				</p>
			)}
		</CommentCard>
	);
}

function CommentCard({
	active,
	muted,
	onSelect,
	children,
}: {
	active?: boolean;
	muted?: boolean;
	onSelect?: () => void;
	children: React.ReactNode;
}) {
	return (
		// biome-ignore lint/a11y/useSemanticElements: a card holding buttons and a textarea cannot be a button.
		<div
			role="button"
			tabIndex={0}
			onClick={onSelect}
			onKeyDown={(event) => {
				if (event.key === 'Enter' && event.target === event.currentTarget) {
					onSelect?.();
				}
			}}
			className={`rounded-xl border bg-card px-3 py-2.5 text-left transition-[margin,box-shadow] ${
				active ? '-ml-2.5 shadow-lg' : 'shadow-xs'
			} ${muted ? 'text-muted-foreground' : ''}`}
		>
			{children}
		</div>
	);
}

/** Who wrote it, beside their initial: the person, with the mark's number on their
 * first message, or the agent. */
function Byline({
	author,
	number,
	meta,
	action,
}: {
	author: ThreadMessage['author'];
	number?: number;
	meta: string;
	action?: React.ReactNode;
}) {
	return (
		<div className="flex items-center gap-2">
			<span className="inline-grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
				{author === 'agent' ? 'A' : 'Y'}
			</span>
			<div className="min-w-0 flex-1 leading-tight">
				<div className="flex items-center gap-1 text-sm font-semibold">
					{number !== undefined && (
						<span className="inline-grid size-4 place-items-center rounded-full bg-[#ff1f8f] text-[10px] font-bold text-white">
							{number}
						</span>
					)}
					{author === 'agent' ? 'Agent' : 'You'}
				</div>
				<div className="truncate text-xs text-muted-foreground" title={meta}>
					{meta}
				</div>
			</div>
			{action}
		</div>
	);
}

function Body({ message }: { message: ThreadMessage }) {
	if (message.html) {
		return (
			<div
				className="mt-1.5 text-sm [&_p+p]:mt-1 [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc"
				// The agent's own markdown, rendered by vex.
				dangerouslySetInnerHTML={{ __html: message.html }}
			/>
		);
	}
	return (
		<p className="mt-1.5 text-sm whitespace-pre-wrap">
			{message.text || (
				<span className="text-muted-foreground italic">no note</span>
			)}
		</p>
	);
}

/** A snapshot that no longer moves, so the change settled its open comments. */
export function SettledCard({
	name,
	threads,
}: {
	name: string;
	threads: Thread[];
}) {
	const [open, setOpen] = useState(false);
	return (
		<div className="rounded-xl border bg-card shadow-xs">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left"
			>
				<span className="font-mono text-sm">{name}</span>
				<span className="text-xs text-muted-foreground">
					no longer moves, so{' '}
					{threads.length === 1
						? 'its comment is'
						: `its ${threads.length} comments are`}{' '}
					settled
				</span>
				<span className="ml-auto text-xs text-muted-foreground">
					{open ? 'Hide ▾' : 'Show ▸'}
				</span>
			</button>
			{open && (
				<div className="flex max-w-md flex-col gap-2 px-4 pb-3">
					{threads.map((thread, at) => (
						<ThreadCard
							key={thread.id}
							number={at + 1}
							thread={thread}
							version={0}
						/>
					))}
				</div>
			)}
		</div>
	);
}
