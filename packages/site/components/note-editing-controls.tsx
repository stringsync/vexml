import { useReactive } from '@webappwiz/react';
import { DownloadIcon, Redo2Icon, Undo2Icon } from 'lucide-react';
import { download } from 'webappwiz/browser';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { NoteEditing } from '@/lib/note-editing';

/** Choose a note's duration, or the duration of the next note to enter. */
export function NoteEditingControls({
	editing,
	disabled,
	editMode,
	onApplied,
}: {
	editing: NoteEditing;
	disabled: boolean;
	editMode: boolean;
	onApplied: () => void;
}) {
	const state = useReactive(
		editing,
		(model) => ({
			duration: model.duration,
			count: model.editor.getSelection().length,
			undo: model.editor.history.undoLabel,
			redo: model.editor.history.redoLabel,
			preview: !!model.entry.draft,
			tab:
				model.entry.draft?.tab ?? model.editor.getFocus()?.clef?.sign === 'TAB',
			fret: model.entry.draft?.fret,
			step: model.entry.draft?.step,
			octave: model.entry.draft?.octave,
			error: model.error ?? model.entry.error,
		}),
		['changed'],
	);
	let previewLabel = `${state.step}${state.octave}`;
	if (state.tab) {
		previewLabel = state.fret ? `Fret ${state.fret}` : 'Choose a fret';
	}
	const hint = state.preview
		? `${previewLabel} · Enter to commit · Esc to cancel`
		: 'Select a note or use the arrow keys to start.';

	return (
		<>
			<div className="flex flex-wrap items-center gap-2">
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Undo"
						title={state.undo ? `Undo ${state.undo}` : 'Undo'}
						disabled={disabled || !state.undo}
						onClick={() => {
							editing.editor.undo();
							onApplied();
						}}
					>
						<Undo2Icon />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="Redo"
						title={state.redo ? `Redo ${state.redo}` : 'Redo'}
						disabled={disabled || !state.redo}
						onClick={() => {
							editing.editor.redo();
							onApplied();
						}}
					>
						<Redo2Icon />
					</Button>
				</div>
				{editMode && (state.count > 0 || state.preview) && (
					<ToggleGroup
						type="single"
						variant="segment"
						size="sm"
						spacing={0}
						aria-label="Note duration"
						value={state.duration}
						disabled={disabled}
						onValueChange={(value) => {
							if (value) {
								editing.setDuration(
									value as Parameters<NoteEditing['setDuration']>[0],
								);
								onApplied();
							}
						}}
					>
						{[
							{ value: 'whole', label: 'Whole', text: '1' },
							{ value: 'half', label: 'Half', text: '1/2' },
							{ value: 'quarter', label: 'Quarter', text: '1/4' },
							{ value: 'eighth', label: 'Eighth', text: '1/8' },
							{ value: '16th', label: 'Sixteenth', text: '1/16' },
							{ value: '32nd', label: 'Thirty-second', text: '1/32' },
						].map((option) => (
							<ToggleGroupItem
								key={option.value}
								value={option.value}
								aria-label={`${option.label} note`}
								title={`${option.label} note`}
							>
								{option.text}
							</ToggleGroupItem>
						))}
					</ToggleGroup>
				)}
				<Button
					variant="ghost"
					size="icon-sm"
					className="ml-auto"
					aria-label="Download MusicXML"
					title="Download MusicXML"
					onClick={() => {
						const url = URL.createObjectURL(
							new Blob([editing.serialize()], {
								type: 'application/vnd.recordare.musicxml+xml',
							}),
						);
						try {
							download(url, 'edited-score.musicxml');
						} finally {
							URL.revokeObjectURL(url);
						}
					}}
				>
					<DownloadIcon />
				</Button>
			</div>
			{editMode && (
				<p
					className="text-xs text-muted-foreground"
					role="status"
					aria-label="Note entry"
				>
					{state.error ?? hint}
					{!state.error && (
						<span className="hidden sm:inline">
							{' '}
							{state.tab ? '↑↓ string · 0–9 fret' : '↑↓ pitch · A–G note'} · ←→
							position
						</span>
					)}
				</p>
			)}
		</>
	);
}
