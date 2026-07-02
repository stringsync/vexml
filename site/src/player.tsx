import type { CursorController, Score } from '@stringsync/vexml';
import { type RefObject, useState } from 'react';
import { fmtTime } from './format';
import { ICON, PlayerIcon } from './icons';

// Floating transport bar: prev / play-pause / next / mute on top, a seek track flanked by the
// elapsed and total times below. Seeking (slider or scrub-drag) drives the cursor directly; the
// "measure i of N" scrub tooltip is local state since nothing outside the bar needs it.
export function Player({
	playerRef,
	dark,
	playing,
	muted,
	timeMs,
	durationMs,
	setPlaying,
	setMuted,
	onPrev,
	onNext,
	onToggle,
	cursorRef,
	scoreRef,
}: {
	playerRef: RefObject<HTMLDivElement | null>;
	dark: boolean;
	playing: boolean;
	muted: boolean;
	timeMs: number;
	durationMs: number;
	setPlaying: (playing: boolean) => void;
	setMuted: (update: (muted: boolean) => boolean) => void;
	onPrev: () => void;
	onNext: () => void;
	onToggle: () => void;
	cursorRef: RefObject<CursorController | null>;
	scoreRef: RefObject<Score | null>;
}) {
	const [scrubTip, setScrubTip] = useState<{ x: number; text: string } | null>(
		null,
	);
	const button = `flex size-9 items-center justify-center rounded-md ${dark ? 'text-zinc-400 hover:bg-zinc-700' : 'text-zinc-500 hover:bg-zinc-100'}`;
	const time = `font-mono text-xs tabular-nums ${dark ? 'text-zinc-400' : 'text-zinc-500'}`;
	return (
		<div
			ref={playerRef}
			// Matches the sheet-music card's slot (max-w-237.5, centered): same sm:px-6
			// gutter so the two align edge-to-edge (left-86 = 20rem sidebar + 1.5rem gutter,
			// right-6 = 1.5rem gutter). Below sm the sheet goes full-width but the player
			// keeps inset-x-4 padding. Rides up with the bottom sheet on mobile, fixed on desktop.
			className={`absolute inset-x-4 bottom-full z-30 mx-auto mb-4 flex max-w-237.5 flex-col gap-2 rounded-2xl border px-4 py-2.5 shadow-lg backdrop-blur sm:inset-x-6 sm:px-6 md:fixed md:inset-x-auto md:bottom-4 md:left-86 md:right-6 md:mb-0 ${dark ? 'border-zinc-700 bg-zinc-800/95' : 'border-zinc-200 bg-white/95'}`}
		>
			{/* Spotify layout: controls centered on top, progress bar flanked by times below. */}
			<div className="relative flex items-center justify-center gap-5">
				<button
					type="button"
					onClick={onPrev}
					aria-label="Previous note"
					className={button}
				>
					<PlayerIcon d={ICON.prev} />
				</button>
				<button
					type="button"
					onClick={onToggle}
					aria-label={playing ? 'Pause' : 'Play'}
					className={button}
				>
					<PlayerIcon d={playing ? ICON.pause : ICON.play} className="size-7" />
				</button>
				<button
					type="button"
					onClick={onNext}
					aria-label="Next note"
					className={button}
				>
					<PlayerIcon d={ICON.next} />
				</button>
				<button
					type="button"
					onClick={() => setMuted((m) => !m)}
					aria-label={muted ? 'Unmute' : 'Mute'}
					aria-pressed={muted}
					className={`absolute right-0 ${button}`}
				>
					<PlayerIcon d={muted ? ICON.muted : ICON.volume} />
				</button>
			</div>
			<div className="flex items-center gap-2">
				<span className={time}>{fmtTime(timeMs)}</span>
				<div className="relative flex-1">
					{scrubTip && (
						<div
							className="pointer-events-none absolute bottom-full mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900/90 px-2 py-1 font-mono text-xs text-white shadow-lg"
							style={{ left: scrubTip.x }}
						>
							{scrubTip.text}
						</div>
					)}
					<input
						type="range"
						min={0}
						max={durationMs}
						step={10}
						value={timeMs}
						onChange={(e) => {
							setPlaying(false);
							cursorRef.current?.seekMs(Number(e.target.value));
						}}
						onPointerMove={(e) => {
							const rect = e.currentTarget.getBoundingClientRect();
							const frac = Math.min(
								1,
								Math.max(0, (e.clientX - rect.left) / rect.width),
							);
							const ms = frac * durationMs;
							const i = (scoreRef.current?.getMeasureIndexAtMs(ms) ?? 0) + 1;
							const n = scoreRef.current?.getMeasureCount() ?? 0;
							setScrubTip({
								x: e.clientX - rect.left,
								text: `measure ${i} of ${n}`,
							});
						}}
						onPointerLeave={() => setScrubTip(null)}
						onPointerUp={() => setScrubTip(null)}
						aria-label="Seek"
						className="w-full accent-blue-600"
					/>
				</div>
				<span className={time}>{fmtTime(durationMs)}</span>
			</div>
		</div>
	);
}
