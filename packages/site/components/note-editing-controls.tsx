import { useReactive } from '@webappwiz/react';
import { DownloadIcon, Redo2Icon, Undo2Icon } from 'lucide-react';
import { download } from 'webappwiz/browser';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type { NoteEditing } from '@/lib/note-editing';

/** Small demo controls; all mutations flow through the editor's mdom document. */
export function NoteEditingControls({
	editing,
	disabled,
	onApplied,
}: {
	editing: NoteEditing;
	disabled: boolean;
	onApplied: () => void;
}) {
	const state = useReactive(
		editing,
		(model) => ({
			step: model.step,
			alter: model.alter,
			octave: model.octave,
			reason: model.pitchReason,
			canApply: model.canApplyPitch,
			staccato: model.staccato,
			count: model.editor.getSelection().length,
			undo: model.editor.history.undoLabel,
			redo: model.editor.history.redoLabel,
			error: model.error,
		}),
		['changed'],
	);
	return (
		<div className="flex flex-col gap-2 px-4 pb-2 md:px-5">
			<FieldGroup className="flex-row flex-wrap items-end gap-3">
				{[
					{
						field: 'step' as const,
						label: 'Pitch',
						options: ['C', 'D', 'E', 'F', 'G', 'A', 'B'].map((value) => ({
							value,
							label: value,
						})),
					},
					{
						field: 'alter' as const,
						label: 'Accidental',
						options: [
							{ value: '-2', label: 'Double flat' },
							{ value: '-1', label: 'Flat' },
							{ value: '0', label: 'Natural' },
							{ value: '1', label: 'Sharp' },
							{ value: '2', label: 'Double sharp' },
						],
					},
					{
						field: 'octave' as const,
						label: 'Octave',
						options: Array.from({ length: 10 }, (_, i) => ({
							value: String(i),
							label: String(i),
						})),
					},
				].map(({ field, label, options }) => (
					<Field
						key={field}
						className="w-auto"
						data-disabled={disabled || !!state.reason}
					>
						<FieldLabel htmlFor={`edit-${field}`}>{label}</FieldLabel>
						<Select
							value={state[field]}
							onValueChange={(value) => editing.setPitchField(field, value)}
							disabled={disabled || !!state.reason}
						>
							<SelectTrigger id={`edit-${field}`} aria-describedby="pitch-hint">
								<SelectValue placeholder={state.count ? 'Mixed' : 'Select'} />
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									{state[field] &&
										!options.some(
											(option) => option.value === state[field],
										) && (
											<SelectItem value={state[field]}>
												{state[field]}
											</SelectItem>
										)}
									{options.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</Field>
				))}
				<Button
					disabled={disabled || !state.canApply}
					onClick={() => {
						editing.applyPitch();
						onApplied();
					}}
				>
					Apply pitch
				</Button>
				<Field orientation="horizontal" className="w-auto self-center">
					<Checkbox
						id="edit-staccato"
						checked={state.staccato}
						disabled={disabled || !state.count}
						onCheckedChange={() => {
							editing.toggleStaccato();
							onApplied();
						}}
					/>
					<FieldLabel htmlFor="edit-staccato">Staccato</FieldLabel>
				</Field>
			</FieldGroup>
			{(state.reason || state.count > 1) && (
				<p id="pitch-hint" className="text-xs text-muted-foreground">
					{state.reason ??
						`Sets all ${state.count} selected notes to this pitch. Choose a value for each mixed field.`}
				</p>
			)}

			<div className="flex flex-wrap items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					disabled={disabled || !state.undo}
					title={
						state.undo ? `Undo ${state.undo} (⌘/Ctrl+Z)` : 'Undo (⌘/Ctrl+Z)'
					}
					onClick={() => {
						editing.editor.undo();
						onApplied();
					}}
				>
					<Undo2Icon data-icon="inline-start" />
					Undo
				</Button>
				<Button
					variant="outline"
					size="sm"
					disabled={disabled || !state.redo}
					title={
						state.redo
							? `Redo ${state.redo} (⌘/Ctrl+Shift+Z)`
							: 'Redo (⌘/Ctrl+Shift+Z)'
					}
					onClick={() => {
						editing.editor.redo();
						onApplied();
					}}
				>
					<Redo2Icon data-icon="inline-start" />
					Redo
				</Button>
				<Button
					variant="outline"
					size="sm"
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
					<DownloadIcon data-icon="inline-start" />
					Download MusicXML
				</Button>
				<span className="text-xs text-muted-foreground" role="status">
					{state.undo ? `Last edit: ${state.undo}` : 'No edits'}
				</span>
			</div>
			{state.error && (
				<Alert variant="destructive">
					<AlertDescription>{state.error}</AlertDescription>
				</Alert>
			)}
		</div>
	);
}
