import { CircleXIcon, EyeIcon, PencilIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type { ScoreMode } from '@/lib/score-session';
import { Segmented } from './segmented';

export function EditingToolbar({
	title,
	renderMs,
	error,
	voices,
	activeVoice,
	onVoiceChange,
	selection,
	mode,
	playing,
	onModeChange,
}: {
	title: string;
	renderMs: number | null;
	error: string | null;
	voices: readonly { value: string; label: string }[];
	activeVoice: string;
	onVoiceChange: (value: string) => void;
	selection: string;
	mode: ScoreMode;
	playing: boolean;
	onModeChange: (mode: ScoreMode) => void;
}) {
	const [pitch, ...details] = selection.split(' · ');
	const selected = mode === 'edit' && !playing && details.length > 0;
	const voiceLabel =
		voices.find((voice) => voice.value === activeVoice)?.label ?? details[2];
	let message = 'No note selected';
	let hint = 'No selectable notes';
	if (mode === 'view') {
		message = 'View mode';
		hint = 'Click or drag to move the playhead';
	} else if (playing) {
		message = 'Playing';
		hint = 'Pause to return to editing';
	} else if (selected) {
		message = voiceLabel ?? '';
		hint = details.slice(0, 2).join(' · ');
	}
	return (
		<Card
			size="sm"
			className="gap-4 shadow-sm ring-border"
			role="region"
			aria-label="Score details"
		>
			<CardHeader className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 px-4 md:gap-4 md:px-5">
				<CardTitle className="min-w-0 truncate pt-2" title={title}>
					{title}
				</CardTitle>
				<div className="flex flex-col items-center gap-1">
					<Segmented<ScoreMode>
						className="shrink-0"
						value={mode}
						onChange={onModeChange}
						label="Interaction mode"
						options={[
							{
								value: 'view',
								label: 'View',
								icon: EyeIcon,
								hint: 'View: move the playback cursor',
							},
							{
								value: 'edit',
								label: 'Edit',
								icon: PencilIcon,
								hint: 'Edit: select and navigate notes',
							},
						]}
					/>
				</div>
				{renderMs !== null && !error && (
					<p className="min-w-0 pt-2 text-right text-xs text-muted-foreground">
						Rendered in{' '}
						<span className="font-mono text-brand-ink">
							{renderMs.toFixed(1)} ms
						</span>
					</p>
				)}
			</CardHeader>
			{error && (
				<div className="px-4 md:px-5">
					<Alert variant="destructive">
						<CircleXIcon />
						<AlertTitle>Could not render this document</AlertTitle>
						<AlertDescription>
							<pre className="font-mono text-2xs whitespace-pre-wrap">
								{error}
							</pre>
						</AlertDescription>
					</Alert>
				</div>
			)}

			<CardContent className="grid min-w-0 grid-cols-1 gap-4 px-4 md:grid-cols-2 md:gap-8 md:px-5">
				{voices.length > 1 && (
					<div className="flex min-w-0 flex-col gap-2">
						<span className="text-2xs font-medium text-muted-foreground">
							Active voice
						</span>
						<Select
							disabled={mode === 'view' || playing}
							value={activeVoice}
							onValueChange={onVoiceChange}
						>
							<SelectTrigger
								aria-label="Editing voice"
								className="w-full min-w-0"
								title={
									voices.find((voice) => voice.value === activeVoice)?.label
								}
							>
								<SelectValue className="min-w-0 truncate" />
							</SelectTrigger>
							<SelectContent
								position="popper"
								className="w-(--radix-select-trigger-width) max-w-[calc(100vw-2rem)]"
							>
								<SelectGroup>
									{voices.map((voice) => (
										<SelectItem
											key={voice.value}
											value={voice.value}
											className="whitespace-normal wrap-anywhere"
										>
											{voice.label}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>
				)}
				<div
					className="flex min-w-0 flex-col gap-2"
					role="status"
					aria-live="polite"
					aria-label="Selection"
				>
					<span className="text-2xs font-medium text-muted-foreground">
						Selection
					</span>
					<div className="flex min-h-14 min-w-0 items-center gap-3">
						<div className="flex h-14 min-w-14 shrink-0 items-center justify-center rounded-lg bg-brand-wash px-2 font-mono text-lg font-medium whitespace-nowrap text-brand-ink">
							{selected ? pitch : '—'}
						</div>
						<div className="flex min-w-0 flex-col gap-1">
							<span
								className="truncate text-sm font-medium text-foreground"
								title={selected ? voiceLabel : undefined}
							>
								{message}
							</span>
							<span className="truncate text-xs text-muted-foreground">
								{hint}
							</span>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
