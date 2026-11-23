import {
	type Review,
	type ReviewData,
	snapshotStatus,
} from '@vexml/vex/review-data';
import {
	ArrowLeftIcon,
	CheckIcon,
	CopyIcon,
	ScaleIcon,
	SendIcon,
	UndoIcon,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SettledCard } from './comments';
import type { SaveState } from './use-review';

/** The end of the walk: the counts, the review as the agent will read it, and the way to
 * hand it over: submitting it to vex, or, in a static page, copying it into the
 * conversation. Snapshots that no longer move show their settled comments under it. */
export function Finish({
	data,
	review,
	message,
	save,
	onBack,
	onSubmit,
}: {
	data: ReviewData;
	review: Review;
	message: string;
	save: SaveState;
	onBack: (() => void) | null;
	onSubmit: (submitted: boolean) => void;
}) {
	const text = useRef<HTMLTextAreaElement>(null);
	const [copied, setCopied] = useState(false);
	const served = data.mode === 'served';
	const statuses = data.entries.map((e) =>
		snapshotStatus(data, review, e.name),
	);
	const count = (status: string) => statuses.filter((s) => s === status).length;
	const open = count('open');
	const comments = Object.values(review.marks).reduce(
		(sum, marks) => sum + marks.length,
		0,
	);
	const stats: [number, string][] = [
		[count('approved'), 'approved'],
		[count('changes'), 'need changes'],
		[comments, comments === 1 ? 'comment' : 'comments'],
		...(open > 0 ? ([[open, 'not reviewed']] as [number, string][]) : []),
	];
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(message);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			// A sandboxed frame may refuse the clipboard: select it for a manual copy.
			text.current?.select();
		}
	};
	return (
		<main className="flex min-w-0 flex-1 justify-center overflow-y-auto p-10">
			<div className="flex w-[680px] flex-col gap-4">
				<Card className="gap-4 px-6 py-5">
					<div className="flex items-center gap-2">
						{open === 0 && <CheckIcon className="size-5 text-success" />}
						<span className="text-base font-semibold">
							{headline(data.entries.length, open)}
						</span>
						{served && (
							<span className="ml-auto">
								<SaveBadge save={save} submitted={review.submitted} />
							</span>
						)}
					</div>
					<div className="flex flex-wrap gap-3">
						{stats.map(([value, label]) => (
							<div key={label} className="rounded-lg border px-3.5 py-2">
								<div className="text-lg font-semibold tabular-nums">
									{value}
								</div>
								<div className="text-2xs text-muted-foreground">{label}</div>
							</div>
						))}
					</div>
					{data.tradeoffs && <Tradeoffs html={data.tradeoffs} />}
					<p className="text-xs text-muted-foreground">
						{served
							? 'The agent reads this as it stands, measures, staves and notes included.'
							: 'Copy it into the conversation. It names every mark precisely, so the agent can act without asking.'}
					</p>
					<textarea
						ref={text}
						readOnly
						value={message}
						className="h-56 resize-y rounded-lg border bg-muted/40 p-2.5 font-mono text-[11.5px] leading-relaxed"
					/>
					<div className="flex gap-2">
						{onBack && (
							<Button variant="outline" onClick={onBack}>
								<ArrowLeftIcon /> Back to snapshots
							</Button>
						)}
						{served ? (
							<>
								<Button
									variant="outline"
									className="ml-auto"
									onClick={copy}
									aria-label="copy review"
								>
									<CopyIcon />
								</Button>
								{review.submitted ? (
									<Button variant="outline" onClick={() => onSubmit(false)}>
										<UndoIcon /> Reopen
									</Button>
								) : (
									<Button onClick={() => onSubmit(true)}>
										<SendIcon /> Submit review
									</Button>
								)}
							</>
						) : (
							<Button className="ml-auto" onClick={copy}>
								<CopyIcon /> {copied ? 'Copied' : 'Copy review'}
							</Button>
						)}
					</div>
				</Card>
				{(data.settled ?? []).map(({ name, threads }) => (
					<SettledCard key={name} name={name} threads={threads} />
				))}
			</div>
		</main>
	);
}

function headline(total: number, open: number): string {
	if (total === 0) {
		return 'No snapshot moved';
	}
	if (open === 0) {
		return `All ${total} snapshots reviewed`;
	}
	return `${open} of ${total} snapshots not reviewed yet`;
}

/** The agent's trade-offs: what the change gave up, to weigh before approving. */
export function Tradeoffs({ html }: { html: string }) {
	return (
		<div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-950">
			<div className="mb-1 flex items-center gap-1.5 font-semibold">
				<ScaleIcon className="size-4 text-amber-600" /> Trade-offs
			</div>
			<div
				className="flex flex-col gap-2 [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc"
				// The agent's own markdown, rendered by vex.
				dangerouslySetInnerHTML={{ __html: html }}
			/>
		</div>
	);
}

export function SaveBadge({
	save,
	submitted,
}: {
	save: SaveState;
	submitted: boolean;
}) {
	if (save === 'failed') {
		return <Badge variant="destructive">Not saved</Badge>;
	}
	if (save === 'saving') {
		return <Badge variant="outline">Saving…</Badge>;
	}
	return submitted ? (
		<Badge variant="success">Submitted</Badge>
	) : (
		<Badge variant="outline">Draft saved</Badge>
	);
}
