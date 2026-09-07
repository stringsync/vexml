import { CircleXIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Segmented, type SegmentedOption } from './segmented';

export function EditingToolbar({
	title,
	renderMs,
	error,
	voices,
	activeVoice,
	onVoiceChange,
	selection,
}: {
	title: string;
	renderMs: number | null;
	error: string | null;
	voices: readonly SegmentedOption<string>[];
	activeVoice: string;
	onVoiceChange: (value: string) => void;
	selection: string;
}) {
	const [pitch, ...details] = selection.split(' · ');
	const selected = details.length > 0;
	return (
		<Card
			size="sm"
			className="gap-4 shadow-sm ring-border"
			role="region"
			aria-label="Score details"
		>
			<CardHeader className="flex min-w-0 flex-col gap-1 px-4 md:flex-row md:items-center md:justify-between md:gap-4 md:px-5">
				<CardTitle className="min-w-0 truncate" title={title}>
					{title}
				</CardTitle>
				{renderMs !== null && !error && (
					<p className="shrink-0 text-xs text-muted-foreground">
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
						<div className="min-w-0 overflow-x-auto">
							<Segmented
								label="Editing voice"
								value={activeVoice}
								onChange={onVoiceChange}
								options={voices}
								className="w-max bg-muted"
							/>
						</div>
						<p className="flex items-center gap-1.5 text-2xs text-muted-foreground">
							<kbd className="inline-flex size-4.5 items-center justify-center rounded border border-border bg-card font-mono text-[10px] shadow-xs">
								V
							</kbd>
							<span>Cycle voices</span>
						</p>
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
						<div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-brand-wash font-mono text-lg font-medium text-brand-ink">
							{selected ? pitch : '—'}
						</div>
						<div className="flex min-w-0 flex-col gap-1">
							<span className="truncate text-sm font-medium text-foreground">
								{selected ? details[0] : 'No note selected'}
							</span>
							<span className="truncate text-xs text-muted-foreground">
								{selected ? details.slice(1).join(' · ') : '\u00a0'}
							</span>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
