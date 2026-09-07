import {
	ChevronFirstIcon,
	ChevronLastIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	PauseIcon,
	PlayIcon,
	Volume2Icon,
	VolumeXIcon,
} from 'lucide-react';
import { type RefObject, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import { fmtTime } from '@/lib/format';
import type { InstrumentController } from '@/lib/instrument-controller';
import type { ScoreSession } from '@/lib/score-session';

export interface PlayerProps {
	playerRef: RefObject<HTMLDivElement | null>;
	/* What the transport drives. Null before the first render lands, which the caller guards. */
	session: ScoreSession | null;
	instrument: InstrumentController;
	/* Read off the two objects above by the caller's projection, so a change re-renders this. */
	muted: boolean;
	playing: boolean;
	timeMs: number;
	durationMs: number;
}

// The transport buttons, and the play button that sits a size up in the middle of them.
const STEP = 'relative size-8.5 rounded-md';
const PLAY = 'size-10 rounded-lg md:size-9.5';

// Docked transport bar across the foot of the score: the two measure jumps outside the two note
// steps, play-pause between them, the elapsed and total times to the left, and where the cursor
// is, what it is played through, and the mute toggle to the right. The barred chevrons are the
// coarse move, the thinner bare ones the fine step. The seek slider is the progress strip along
// the bar's top edge; seeking (there or by scrub-drag) drives the cursor directly, and the
// "measure i of N" scrub tooltip is local state since nothing outside the bar needs it.
export function Player({
	playerRef,
	session,
	instrument,
	muted,
	playing,
	timeMs,
	durationMs,
}: PlayerProps) {
	const [scrubTip, setScrubTip] = useState<{ x: number; text: string } | null>(
		null,
	);

	const score = session?.score;
	const measureCount = score?.getMeasureCount() ?? 0;
	const measure = (score?.getMeasureIndexAtMs(timeMs) ?? 0) + 1;

	const times = (
		<span className="font-mono text-xs tabular-nums text-muted-foreground md:min-w-[70px]">
			{fmtTime(timeMs)}{' '}
			<span className="text-faded">/ {fmtTime(durationMs)}</span>
		</span>
	);

	const position = (
		<span
			className="inline-block shrink-0 text-right font-mono text-2xs whitespace-nowrap tabular-nums text-muted-foreground"
			style={{ width: `${`bar ${measureCount} of ${measureCount}`.length}ch` }}
		>
			bar {measure} of {measureCount}
		</span>
	);

	const transport = (
		<div className="relative flex items-center justify-center gap-1.5 md:gap-1">
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className={STEP}
						onClick={() => session?.previousMeasure()}
						disabled={session?.mode === 'edit'}
						aria-label="Previous measure"
					>
						<ChevronFirstIcon />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Previous measure</TooltipContent>
			</Tooltip>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className={STEP}
						onClick={() => session?.previous()}
						disabled={session?.mode === 'edit'}
						aria-label="Previous note"
					>
						<ChevronLeftIcon strokeWidth={1.5} />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Previous note</TooltipContent>
			</Tooltip>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						type="button"
						size="icon"
						className={PLAY}
						onClick={() => session?.togglePlay()}
						aria-label={playing ? 'Pause' : 'Play'}
					>
						{playing ? (
							<PauseIcon fill="currentColor" />
						) : (
							<PlayIcon fill="currentColor" />
						)}
					</Button>
				</TooltipTrigger>
				<TooltipContent>{playing ? 'Pause' : 'Play'}</TooltipContent>
			</Tooltip>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className={STEP}
						onClick={() => session?.next()}
						disabled={session?.mode === 'edit'}
						aria-label="Next note"
					>
						<ChevronRightIcon strokeWidth={1.5} />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Next note</TooltipContent>
			</Tooltip>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className={STEP}
						onClick={() => session?.nextMeasure()}
						disabled={session?.mode === 'edit'}
						aria-label="Next measure"
					>
						<ChevronLastIcon />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Next measure</TooltipContent>
			</Tooltip>
			{/* Below md the bar has no right-hand cluster to sit in, so mute parks at the end of
			    the transport row without pushing the five buttons off centre. */}
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className={`${STEP} absolute right-0 md:hidden`}
						onClick={() => instrument.toggleMuted()}
						aria-label={muted ? 'Unmute' : 'Mute'}
						aria-pressed={muted}
					>
						{muted ? <VolumeXIcon /> : <Volume2Icon />}
					</Button>
				</TooltipTrigger>
				<TooltipContent>{muted ? 'Unmute' : 'Mute'}</TooltipContent>
			</Tooltip>
		</div>
	);

	return (
		<div
			ref={playerRef}
			className="relative flex shrink-0 flex-col gap-1.5 border-t bg-card px-4 pt-2.5 pb-3.5 md:h-15 md:flex-row md:items-center md:gap-4 md:px-6 md:py-2.5"
		>
			{/* The seek control is the bar's top edge itself: a hairline of progress that reads
			    from across the room, with the knob overhanging into the score above it. */}
			<div className="absolute inset-x-0 -top-2 h-4">
				{scrubTip && (
					<div
						className="pointer-events-none absolute bottom-full mb-2 -translate-x-1/2 rounded-md bg-foreground px-2 py-1 font-mono text-2xs whitespace-nowrap text-background shadow-lg"
						style={{ left: scrubTip.x }}
					>
						{scrubTip.text}
					</div>
				)}
				<Slider
					variant="seek"
					disabled={session?.mode === 'edit' && !playing}
					className="h-full"
					min={0}
					max={durationMs}
					step={10}
					value={[timeMs]}
					onValueChange={(next) => {
						const ms = next[0];
						if (!session || ms === undefined) {
							return;
						}
						// The session owns the pause-and-resume, so dragging here and dragging
						// the notation behave alike.
						session.beginSeek();
						session.seekMs(ms);
					}}
					onPointerMove={(e) => {
						const rect = e.currentTarget.getBoundingClientRect();
						const frac = Math.min(
							1,
							Math.max(0, (e.clientX - rect.left) / rect.width),
						);
						const ms = frac * durationMs;
						setScrubTip({
							x: e.clientX - rect.left,
							text: `measure ${(score?.getMeasureIndexAtMs(ms) ?? 0) + 1} of ${measureCount}`,
						});
					}}
					onValueCommit={() => session?.endSeek()}
					onPointerLeave={() => setScrubTip(null)}
					onPointerUp={() => setScrubTip(null)}
					aria-label="Seek"
				/>
			</div>

			{/* Below md the readouts share a row above the transport; from md they flank it. */}
			<div className="flex items-center justify-between md:contents">
				{times}
				<span className="md:hidden">{position}</span>
			</div>

			<div className="md:flex-1" />
			{transport}
			<div className="md:flex-1" />

			<div className="hidden items-center gap-3 md:flex">
				{position}
				{/* Mirrors the Playback card, so the voice can be changed without opening the
				    sidebar — or, below md, the sheet. */}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className={STEP}
							onClick={() => instrument.toggleMuted()}
							aria-label={muted ? 'Unmute' : 'Mute'}
							aria-pressed={muted}
						>
							{muted ? <VolumeXIcon /> : <Volume2Icon />}
						</Button>
					</TooltipTrigger>
					<TooltipContent>{muted ? 'Unmute' : 'Mute'}</TooltipContent>
				</Tooltip>
			</div>
		</div>
	);
}
