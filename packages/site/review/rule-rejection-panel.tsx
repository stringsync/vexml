import type { Mark } from '@vexml/vex/review-data';
import { MoveUpRightIcon, SquareIcon, XIcon } from 'lucide-react';
import type { RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { INK, type Tool } from './mark-canvas';

/** One width for every button on a rule card, so they line up as one set. */
export const BUTTON = 'w-28 justify-center';

/**
 * The rule card's open rejection: the Arrow / Box tool for drawing on the score, a
 * numbered note per mark drawn, and the overall note with Cancel and Save rejection.
 */
export function RuleRejectionPanel({
	tool,
	setTool,
	markDraft,
	selectedMark,
	setSelectedMark,
	markNotesRef,
	focusOnMount,
	setMarkNote,
	removeMark,
	inputRef,
	noteDraft,
	setNoteDraft,
	onSave,
	onCancel,
}: {
	tool: Tool;
	setTool: (tool: Tool) => void;
	markDraft: Mark[];
	selectedMark: number | null;
	setSelectedMark: (at: number | null) => void;
	markNotesRef: RefObject<(HTMLInputElement | null)[]>;
	/** The mark whose note takes focus as it mounts, so typing after a drag lands there. */
	focusOnMount: RefObject<number | null>;
	setMarkNote: (at: number, note: string) => void;
	removeMark: (at: number) => void;
	inputRef: RefObject<HTMLInputElement | null>;
	noteDraft: string;
	setNoteDraft: (note: string) => void;
	onSave: () => void;
	onCancel: () => void;
}) {
	return (
		<div className="mt-4 rounded-xl border border-destructive/25 bg-destructive/[0.03] p-3">
			<div className="flex flex-wrap items-center gap-2">
				<span className="text-xs font-semibold text-destructive">
					Rejection
				</span>
				<span className="text-xs text-muted-foreground">
					Drag on the score to mark what looks wrong
				</span>
				<div className="ml-auto flex gap-2">
					{(
						[
							['arrow', 'Arrow', MoveUpRightIcon],
							['box', 'Box', SquareIcon],
						] as const
					).map(([value, label, Icon]) => (
						<Button
							key={value}
							variant={tool === value ? 'default' : 'outline'}
							size="sm"
							aria-pressed={tool === value}
							onClick={() => setTool(value)}
							className={tool === value ? BUTTON : `${BUTTON} bg-card`}
						>
							<Icon />
							{label}
						</Button>
					))}
				</div>
			</div>
			{markDraft.length > 0 && (
				<ol className="mt-2.5 flex flex-col gap-1.5">
					{markDraft.map((mark, at) => (
						<li
							key={at}
							className={`flex items-center gap-2.5 rounded-lg border bg-card py-1 ps-2.5 pe-1 ${
								at === selectedMark ? 'border-[#ff1f8f]/50' : ''
							}`}
						>
							<span
								className="flex size-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
								style={{ background: INK }}
							>
								{at + 1}
							</span>
							<span className="w-11 shrink-0 text-xs text-muted-foreground">
								{MARK_NAMES[mark.kind]}
							</span>
							<input
								ref={(el) => {
									markNotesRef.current[at] = el;
									if (el && focusOnMount.current === at) {
										focusOnMount.current = null;
										el.focus();
									}
								}}
								value={mark.note}
								onChange={(e) => setMarkNote(at, e.target.value)}
								onFocus={() => setSelectedMark(at)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										inputRef.current?.focus();
									} else if (e.key === 'Escape') {
										e.preventDefault();
										onCancel();
									}
								}}
								placeholder="What is wrong here?"
								aria-label={`Note for mark ${at + 1}`}
								className="h-7 min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
							/>
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label={`Remove mark ${at + 1}`}
								onClick={() => removeMark(at)}
							>
								<XIcon />
							</Button>
						</li>
					))}
				</ol>
			)}
			<div className="mt-2.5 flex items-center gap-2">
				<Input
					ref={inputRef}
					value={noteDraft}
					onChange={(e) => setNoteDraft(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							onSave();
						} else if (e.key === 'Escape') {
							e.preventDefault();
							onCancel();
						}
					}}
					placeholder="What looks wrong overall? (optional, Enter to save)"
					className="h-8 bg-card text-xs"
				/>
				<Button
					variant="outline"
					size="sm"
					onClick={onCancel}
					className={`${BUTTON} bg-card`}
				>
					Cancel
				</Button>
				<Button
					variant="destructive"
					size="sm"
					onClick={onSave}
					className={BUTTON}
				>
					Save rejection
				</Button>
			</div>
		</div>
	);
}

const MARK_NAMES: Record<Mark['kind'], string> = {
	arrow: 'Arrow',
	box: 'Box',
	pin: 'Pin',
};
