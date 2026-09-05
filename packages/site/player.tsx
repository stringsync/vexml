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
import { fmtTime } from './format';
import type { InstrumentController } from './instrument-controller';
import type { ScoreSession } from './score-session';

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

const TIME = 'font-mono text-xs tabular-nums text-muted-foreground';

// Floating transport bar: the two measure jumps outside the two note steps, play-pause between
// them, and mute off to the right, over a seek track flanked by the elapsed and total times.
// The barred chevrons are the coarse move, the thinner bare ones the fine step. Seeking (slider or scrub-drag) drives the cursor directly; the
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

	// A measure jump can land outside the scroll box, so every step follows the cursor the way
	// seeking does.
	function step(move: () => void) {
		move();
		if (session && !session.cursor.isFullyVisible()) {
			session.cursor.scrollIntoView({ behavior: 'smooth' });
		}
	}
	return (
		<div
			ref={playerRef}
			// Matches the sheet-music card's slot (max-w-237.5, centered): same sm:px-6
			// gutter so the two align edge-to-edge (left-86 = 20rem sidebar + 1.5rem gutter,
			// right-6 = 1.5rem gutter). Below md there is no sidebar to clear, so it spans the
			// viewport on its own inset-x gutter instead.
			className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-237.5 flex-col gap-2 rounded-2xl border bg-background/95 px-4 py-2.5 shadow-lg backdrop-blur sm:inset-x-6 sm:px-6 md:inset-x-auto md:left-86 md:right-6"
		>
			<div className="relative flex items-center justify-center gap-1">
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							type="button"
							variant="ghost"
							size="icon-lg"
							onClick={() => step(() => session?.previousMeasure())}
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
							size="icon-lg"
							onClick={() => step(() => session?.previous())}
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
							variant="ghost"
							size="icon-lg"
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
							size="icon-lg"
							onClick={() => step(() => session?.next())}
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
							size="icon-lg"
							onClick={() => step(() => session?.nextMeasure())}
							aria-label="Next measure"
						>
							<ChevronLastIcon />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Next measure</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							type="button"
							variant="ghost"
							size="icon-lg"
							onClick={() => instrument.toggleMuted()}
							aria-label={muted ? 'Unmute' : 'Mute'}
							aria-pressed={muted}
							className="absolute right-0"
						>
							{muted ? <VolumeXIcon /> : <Volume2Icon />}
						</Button>
					</TooltipTrigger>
					<TooltipContent>{muted ? 'Unmute' : 'Mute'}</TooltipContent>
				</Tooltip>
			</div>
			<div className="flex items-center gap-2">
				<span className={TIME}>{fmtTime(timeMs)}</span>
				<div className="relative flex-1">
					{scrubTip && (
						<div
							className="pointer-events-none absolute bottom-full mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 font-mono text-xs text-background shadow-lg"
							style={{ left: scrubTip.x }}
						>
							{scrubTip.text}
						</div>
					)}
					<Slider
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
							if (!session.cursor.isFullyVisible()) {
								session.cursor.scrollIntoView({ behavior: 'smooth' });
							}
						}}
						onPointerMove={(e) => {
							const rect = e.currentTarget.getBoundingClientRect();
							const frac = Math.min(
								1,
								Math.max(0, (e.clientX - rect.left) / rect.width),
							);
							const ms = frac * durationMs;
							const score = session?.score;
							setScrubTip({
								x: e.clientX - rect.left,
								text: `measure ${(score?.getMeasureIndexAtMs(ms) ?? 0) + 1} of ${score?.getMeasureCount() ?? 0}`,
							});
						}}
						onValueCommit={() => session?.endSeek()}
						onPointerLeave={() => setScrubTip(null)}
						onPointerUp={() => setScrubTip(null)}
						aria-label="Seek"
					/>
				</div>
				<span className={TIME}>{fmtTime(durationMs)}</span>
			</div>
		</div>
	);
}
