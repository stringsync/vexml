import { type ReactNode, useEffect, useRef, useState } from 'react';
import type {
	Config,
	Cursor,
	HoverEvent,
	Note,
	PointerTarget,
	PointerTargetEvent,
} from '../../src';
import { render, type Score } from '../../src';

// One-line summary of the hovered target for the tooltip.
function describe(target: PointerTarget): string {
	if (target.type === 'note') {
		const beats = target.getBeats();
		const parts = [
			target.getPitch() ?? 'rest',
			`${beats} beat${beats === 1 ? '' : 's'}`,
		];
		if (target.isGrace()) {
			parts.push('grace');
		}
		if (target.isChordMember()) {
			parts.push('chord');
		}
		return `${parts.join(' · ')}\nmeasure ${target.getMeasure().getNumber()}`;
	}
	if (target.type === 'tab-position') {
		return `string ${target.getString()} · fret ${target.getFret()} · ${target.getNote().getPitch() ?? 'rest'}`;
	}
	return '';
}

// Vite reads the test fixtures straight from ../tests at build time (fs.allow: ['..'] in
// vite.config permits it) and hands us the file list — no symlink or hand-written manifest.
// Keyed by basename, each value lazily loads the file's raw text.
const fixtures: Record<string, () => Promise<string>> = {};
for (const [path, load] of Object.entries(
	import.meta.glob<string>('../../tests/integration/__data__/*.musicxml', {
		query: '?raw',
		import: 'default',
	}),
)) {
	fixtures[path.slice(path.lastIndexOf('/') + 1).replace('.musicxml', '')] =
		load;
}
const fixtureNames = Object.keys(fixtures).sort();

const STORAGE_KEY = 'vexml:musicxml';

function ResetIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 16 16"
			fill="currentColor"
			className="size-4"
			aria-hidden="true"
		>
			<path
				fillRule="evenodd"
				d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.025-.273Z"
				clipRule="evenodd"
			/>
		</svg>
	);
}

function CheckIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={1.5}
			stroke="currentColor"
			className="size-4 text-green-600"
			aria-hidden="true"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="m4.5 12.75 6 6 9-13.5"
			/>
		</svg>
	);
}

// Heroicons (outline). Each value is the icon's path list — circle play/pause have two paths.
const ICON = {
	play: [
		'M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z',
	],
	pause: ['M15.75 5.25v13.5m-7.5-13.5v13.5'],
	prev: ['M15.75 19.5 8.25 12l7.5-7.5'],
	next: ['m8.25 4.5 7.5 7.5-7.5 7.5'],
} as const;

function PlayerIcon({
	d,
	className = 'size-6',
}: {
	d: readonly string[];
	className?: string;
}) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth={1.5}
			stroke="currentColor"
			className={className}
			aria-hidden="true"
		>
			{d.map((p) => (
				<path key={p} strokeLinecap="round" strokeLinejoin="round" d={p} />
			))}
		</svg>
	);
}

// ms → m:ss
function fmtTime(ms: number): string {
	const s = Math.floor(ms / 1000);
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function Section({
	title,
	action,
	children,
}: {
	title: string;
	action?: ReactNode;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
			<div className="flex items-center justify-between">
				<span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
					{title}
				</span>
				{action}
			</div>
			{children}
		</div>
	);
}

function Or() {
	return (
		<div className="flex items-center gap-2 text-xs text-zinc-400">
			<span className="h-px flex-1 bg-zinc-200" />
			or
			<span className="h-px flex-1 bg-zinc-200" />
		</div>
	);
}

export default function App() {
	const containerRef = useRef<HTMLDivElement>(null);
	const scoreRef = useRef<Score | null>(null);
	const [text, setText] = useState('');
	const [input, setInput] = useState<string | Blob | null>(null);
	const [fixture, setFixture] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [renderMs, setRenderMs] = useState<number | null>(null);
	// Mirror of renderMs the debounce effect reads without depending on it — otherwise a
	// render-time report would re-fire the effect and flash a phantom debounce.
	const renderMsRef = useRef<number | null>(null);
	const [dragging, setDragging] = useState(false);
	const [debouncing, setDebouncing] = useState(false);
	// Loading overlay until the first render settles; the app always renders on mount.
	const [initialized, setInitialized] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);
	const [dark, setDark] = useState(false);
	const [stored, setStored] = useState(
		() => localStorage.getItem(STORAGE_KEY) !== null,
	);
	const [cleared, setCleared] = useState(false);
	const [restored, setRestored] = useState(false);
	const [scrolled, setScrolled] = useState(false);
	const [tooltip, setTooltip] = useState<{
		x: number;
		y: number;
		text: string;
	} | null>(null);
	// The note whose halo is currently lit, so the next move can turn it back off.
	const haloRef = useRef<Note | null>(null);
	// Playback cursor: owned by the current Score (disposed with it). `change` keeps timeMs in sync,
	// whether movement came from the play loop, next/previous, or seek.
	const cursorRef = useRef<Cursor | null>(null);
	const [playing, setPlaying] = useState(false);
	const [timeMs, setTimeMs] = useState(0);
	const [durationMs, setDurationMs] = useState(0);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);
	// The effect below re-renders the last input whenever config changes.
	const [config, setConfig] = useState<Partial<Config>>({});
	const noteSpacing = config.noteSpacing ?? 36;
	const softmaxFactor = config.softmaxFactor ?? 10;
	const systemSpacing = config.systemSpacing ?? 30;
	const maxSystemFill = config.maxSystemFill ?? 0.9;
	const width =
		config.layout?.type === 'standard' ? (config.layout.width ?? 900) : 900;
	const notationFont = config.fonts?.notation?.family ?? 'Bravura';
	const resetKeys = [
		'noteSpacing',
		'softmaxFactor',
		'systemSpacing',
		'maxSystemFill',
	] as const;
	const reset = (key: (typeof resetKeys)[number]) =>
		setConfig(({ [key]: _, ...rest }) => rest);
	const canReset = resetKeys.some((k) => config[k] !== undefined);
	const resetAll = () =>
		setConfig((c) => {
			const next = { ...c };
			for (const k of resetKeys) {
				delete next[k];
			}
			return next;
		});

	// `config` stays live so the sliders/reset respond instantly; `renderConfig` lags
	// behind it by the debounce so dragging a slider re-renders once it settles, not on
	// every step. The loading overlay shows while waiting (shared `debouncing` flag).
	// Seed from `config` (same reference) so the first render uses the real config, not {}.
	// Otherwise the first setRenderMs flips renderConfig {} -> config and double-renders on mount.
	const [renderConfig, setRenderConfig] = useState<Partial<Config>>(config);
	const skipConfigDebounce = useRef(true);
	useEffect(() => {
		if (skipConfigDebounce.current) {
			skipConfigDebounce.current = false;
			return;
		}
		// If the last render was fast, apply config changes immediately; only debounce
		// once renders get slow enough to lag the sliders.
		if (renderMsRef.current != null && renderMsRef.current <= 50) {
			setRenderConfig(config);
			setDebouncing(false);
			return;
		}
		setDebouncing(true);
		const t = setTimeout(() => {
			setRenderConfig(config);
			setDebouncing(false);
		}, 500);
		return () => clearTimeout(t);
	}, [config]);

	useEffect(() => {
		const container = containerRef.current;
		if (!container || input == null) {
			return;
		}
		// Replace the previous render before starting a new one: render() appends a fresh
		// managed canvas, so the old Score must be disposed or canvases would stack.
		scoreRef.current?.dispose();
		scoreRef.current = null;
		setError(null);
		const start = performance.now();
		// Engrave once at the configured reference width; CSS then scales the canvas to fit
		// its container — down when narrow, never past 100% when wide — so resizing the
		// window re-scales instantly without re-rendering.
		const layoutWidth =
			renderConfig.layout?.type === 'standard'
				? renderConfig.layout.width
				: undefined;
		let cancelled = false;
		// Turn off the lit halo and hide the tooltip; used to reset on teardown/re-render.
		const clearHalo = () => {
			haloRef.current?.halo.off();
			haloRef.current?.color.off();
			haloRef.current = null;
			container.style.cursor = '';
			setTooltip(null);
		};
		let detach: (() => void) | undefined;
		render(input, container, {
			...renderConfig,
			layout: { type: 'standard', width: layoutWidth },
		})
			.then((score) => {
				// The effect can re-run before this resolves; drop the late score so it
				// doesn't leak a canvas into a container a newer render already owns.
				if (cancelled) {
					score.dispose();
					return;
				}
				scoreRef.current = score;
				renderMsRef.current = performance.now() - start;
				setRenderMs(renderMsRef.current);
				setInitialized(true);

				// Headless cursor + the built-in bar view; follow() scrolls it into view as it moves.
				const cursor = score.addCursor();
				cursor.attach(score.createCursorView());
				cursor.follow();
				// The notes (and their tab frets) currently under the cursor. Cursor coloring and the
				// hover halo share one color channel, so recolor() resolves both: hover wins while a
				// note is hovered, otherwise the active color shows, otherwise it clears. Rests never
				// enter `lit` (no pitch), so only sounding notes get the active color.
				const lit = new Set<Note>();
				const recolor = (n: Note) => {
					if (n === haloRef.current) {
						n.color.on('#f4f800');
					} else if (lit.has(n)) {
						n.color.on('#155dfc');
					} else {
						n.color.off();
					}
				};
				const paint = (active: readonly Note[]) => {
					const sounding = active.filter((n) => n.getPitch() !== null);
					for (const n of [...lit]) {
						if (!sounding.includes(n)) {
							lit.delete(n);
							recolor(n);
						}
					}
					for (const n of sounding) {
						if (!lit.has(n)) {
							lit.add(n);
							recolor(n);
						}
					}
				};
				cursor.addEventListener('change', (e) => {
					setTimeMs(e.timeMs);
					paint(e.active);
				});
				paint(cursor.getActiveNotes());
				cursorRef.current = cursor;
				setDurationMs(score.getDurationMs());
				setTimeMs(0);
				setPlaying(false);

				// A click/tap pins a target (toggle); hover is transient. The pinned one wins, so
				// hovering elsewhere — or scrolling it out from under the pointer — never clears the
				// pin. Clicking it again, or clicking empty space, unpins.
				let pinned: PointerTarget | null = null;
				let hovered: PointerTarget | null = null;
				const apply = () => {
					const target = pinned ?? hovered;
					const note =
						target?.type === 'note'
							? target
							: target?.type === 'tab-position'
								? target.getNote()
								: null;
					if (note !== haloRef.current) {
						const prev = haloRef.current;
						haloRef.current = note;
						prev?.halo.off();
						// recolor reads haloRef.current, so update it first: prev falls back to its
						// active color (or clears), note picks up the hover color.
						if (prev) {
							recolor(prev);
						}
						note?.halo.on('rgba(255, 0, 105, 0.9)');
						if (note) {
							recolor(note);
						}
					}
					container.style.cursor = note ? 'pointer' : '';
					// Only note-bearing targets get a tooltip; describe() is empty for a measure.
					if (note && target) {
						const r = target.getBoundingClientRect();
						setTooltip({
							x: r.left + r.width / 2,
							y: r.top,
							text: describe(target),
						});
					} else {
						setTooltip(null);
					}
				};
				// hover fires once per target change — on move, and (unlike pointermove) when a scroll
				// slides a different target under the pointer, so it tracks what's actually hovered.
				const onHover = (e: HoverEvent) => {
					hovered = e.target;
					apply();
				};
				const onClick = (e: PointerTargetEvent) => {
					// Only notes/frets are pinnable; clicking a measure or empty space unpins.
					const t =
						e.target?.type === 'note' || e.target?.type === 'tab-position'
							? e.target
							: null;
					pinned = pinned === t ? null : t;
					apply();
				};
				// Click or drag anywhere on the score scrubs the cursor to that position's time.
				const seekTo = (point: { x: number; y: number }) => {
					const t = score.getTimeAt(point);
					if (t) {
						setPlaying(false);
						cursor.seekMs(t.ms);
					}
				};
				const onPointerDown = (e: PointerTargetEvent) => seekTo(e.point);
				// buttons === 1 means the primary button is held, so this continues the scrub
				// during a drag and ignores a plain hover (no manual drag-state flag needed).
				const onPointerMove = (e: PointerTargetEvent) => {
					if (e.native.buttons === 1) {
						seekTo(e.point);
					}
				};
				score.addEventListener('hover', onHover);
				score.addEventListener('click', onClick);
				score.addEventListener('pointerdown', onPointerDown);
				score.addEventListener('pointermove', onPointerMove);
				detach = clearHalo;
			})
			.catch((e: unknown) => {
				renderMsRef.current = null;
				setRenderMs(null);
				setError(e instanceof Error ? e.message : String(e));
				setInitialized(true);
			});
		return () => {
			cancelled = true;
			// score.dispose() drops its own listeners (and disposes the cursor); this only unbinds
			// the DOM-level leave handler and stops the play loop.
			detach?.();
			scoreRef.current?.dispose();
			scoreRef.current = null;
			cursorRef.current = null;
			setPlaying(false);
		};
	}, [input, renderConfig]);

	// Advance the cursor in real time while playing. seekMs drives the bar (and any future audio);
	// stops itself at the end. ponytail: wall-clock RAF, no audio yet — swap in an audio clock when sound lands.
	useEffect(() => {
		const cursor = cursorRef.current;
		if (!playing || !cursor) {
			return;
		}
		let raf = 0;
		let last = performance.now();
		const tick = (now: number) => {
			const next = cursor.getTimeMs() + (now - last);
			last = now;
			if (next >= durationMs) {
				cursor.seekMs(durationMs);
				setPlaying(false);
				return;
			}
			cursor.seekMs(next);
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [playing, durationMs]);

	const togglePlay = () => {
		const cursor = cursorRef.current;
		if (!cursor) {
			return;
		}
		// Restart from the top if we're parked at the end.
		if (!playing && cursor.isDone()) {
			cursor.seekMs(0);
		}
		setPlaying((p) => !p);
	};
	const stepPrev = () => {
		setPlaying(false);
		cursorRef.current?.previous();
	};
	const stepNext = () => {
		setPlaying(false);
		cursorRef.current?.next();
	};

	// Restore the last-edited MusicXML, or open with a random example.
	useEffect(() => {
		const saved = localStorage.getItem(STORAGE_KEY);
		// ponytail: .mxl saves a `[mxl] name` placeholder, not the file — can't restore it, so fall through to a random example.
		if (saved != null && !saved.startsWith('[mxl] ')) {
			setText(saved);
			setInput(saved);
			setRestored(true);
			setTimeout(() => setRestored(false), 1500);
			return;
		}
		const name = fixtureNames[Math.floor(Math.random() * fixtureNames.length)];
		if (!name) {
			return;
		}
		setFixture(name);
		fixtures[name]?.().then((xml) => {
			setText(xml);
			setInput(xml);
		});
	}, []);

	function save(value: string) {
		localStorage.setItem(STORAGE_KEY, value);
		setStored(true);
	}

	function clearStorage() {
		localStorage.removeItem(STORAGE_KEY);
		setStored(false);
		setCleared(true);
		setTimeout(() => setCleared(false), 1500);
	}

	function loadFile(file: File) {
		clearTimeout(debounceRef.current);
		setDebouncing(false);
		setFixture('');
		// .mxl is a zip; render() detects MXL from a Blob. MusicXML is plain text we also
		// drop into the textarea so it can be tweaked.
		if (file.name.toLowerCase().endsWith('.mxl')) {
			setText('');
			setInput(file);
			save(`[mxl] ${file.name}`);
		} else {
			file.text().then((t) => {
				setText(t);
				setInput(t);
				save(t);
			});
		}
	}

	function onFile(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (file) {
			loadFile(file);
		}
	}

	function onTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
		const value = e.target.value;
		setText(value);
		save(value);
		setFixture('');
		clearTimeout(debounceRef.current);
		if (!value.trim()) {
			setDebouncing(false);
			return;
		}
		// If the last render was fast, just render on every keystroke; only debounce
		// once renders get slow enough to lag typing.
		if (renderMs != null && renderMs <= 50) {
			setDebouncing(false);
			setInput(value);
			return;
		}
		// Spinner shows while we wait out the typing, then render the settled text.
		setDebouncing(true);
		debounceRef.current = setTimeout(() => {
			setDebouncing(false);
			setInput(value);
		}, 500);
	}

	function onDragOver(e: React.DragEvent) {
		e.preventDefault();
		setDragging(true);
	}

	function onDragLeave(e: React.DragEvent) {
		// Leaving into a child still counts as inside; only clear when truly exiting.
		if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
			setDragging(false);
		}
	}

	function onDrop(e: React.DragEvent) {
		e.preventDefault();
		setDragging(false);
		const file = e.dataTransfer.files[0];
		if (file) {
			loadFile(file);
		}
	}

	async function onPickFixture(e: React.ChangeEvent<HTMLSelectElement>) {
		const name = e.target.value;
		setFixture(name);
		clearTimeout(debounceRef.current);
		setDebouncing(false);
		const load = fixtures[name];
		if (!load) {
			return;
		}
		const xml = await load();
		setText(xml);
		setInput(xml);
		save(xml);
	}

	return (
		<div className="flex h-screen flex-col bg-zinc-50 text-zinc-900">
			<header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-6 py-2">
				<h1 className="font-mono text-xl font-bold tracking-tight">vexml</h1>
				<a
					href="https://github.com/stringsync/vexml"
					target="_blank"
					rel="noreferrer"
				>
					<img
						src="https://img.shields.io/github/stars/stringsync/vexml?style=social"
						alt="GitHub stars"
					/>
				</a>
			</header>

			<main className="flex min-h-0 flex-1">
				{/* underlay: tap-to-close backdrop behind the panel (mobile only) */}
				<div
					onClick={() => setMobileOpen(false)}
					aria-hidden="true"
					className={`fixed inset-0 z-10 bg-black/40 transition-opacity duration-300 md:hidden ${mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
				/>

				<aside className="fixed inset-x-0 bottom-0 z-20 flex flex-col rounded-t-xl border-t border-zinc-200 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.1)] md:static md:max-h-none md:w-80 md:shrink-0 md:overflow-y-auto md:rounded-none md:border-t-0 md:border-r md:shadow-none">
					{/* Player: on mobile, anchored to the top edge of this bottom sheet (bottom-full) so it
					    rides up as the sheet expands; on desktop it floats fixed, centered in the content
					    pane (viewport center shifted right by half the 20rem sidebar). */}
					{input != null && initialized && (
						<div
							// Width tracks the sheet-music card (max-w-237.5, centered): full content-pane span
							// on desktop (left-80 clears the 20rem sidebar), full width minus inset-x-4 padding
							// on mobile. Rides up with the bottom sheet (bottom-full) on mobile, fixed on desktop.
							className={`absolute inset-x-4 bottom-full z-30 mx-auto mb-4 flex max-w-237.5 flex-col gap-2 rounded-2xl border px-4 py-2.5 shadow-lg backdrop-blur md:fixed md:inset-x-auto md:bottom-4 md:left-80 md:right-0 md:mb-0 ${dark ? 'border-zinc-700 bg-zinc-800/95' : 'border-zinc-200 bg-white/95'}`}
						>
							{/* Spotify layout: controls centered on top, progress bar flanked by times below. */}
							<div className="flex items-center justify-center gap-5">
								<button
									type="button"
									onClick={stepPrev}
									aria-label="Previous note"
									className={`flex size-9 items-center justify-center rounded-md ${dark ? 'text-zinc-400 hover:bg-zinc-700' : 'text-zinc-500 hover:bg-zinc-100'}`}
								>
									<PlayerIcon d={ICON.prev} />
								</button>
								<button
									type="button"
									onClick={togglePlay}
									aria-label={playing ? 'Pause' : 'Play'}
									className={`flex size-9 items-center justify-center rounded-md ${dark ? 'text-zinc-400 hover:bg-zinc-700' : 'text-zinc-500 hover:bg-zinc-100'}`}
								>
									<PlayerIcon
										d={playing ? ICON.pause : ICON.play}
										className="size-7"
									/>
								</button>
								<button
									type="button"
									onClick={stepNext}
									aria-label="Next note"
									className={`flex size-9 items-center justify-center rounded-md ${dark ? 'text-zinc-400 hover:bg-zinc-700' : 'text-zinc-500 hover:bg-zinc-100'}`}
								>
									<PlayerIcon d={ICON.next} />
								</button>
							</div>
							<div className="flex items-center gap-2">
								<span
									className={`font-mono text-xs tabular-nums ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}
								>
									{fmtTime(timeMs)}
								</span>
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
									aria-label="Seek"
									className="flex-1 accent-blue-600"
								/>
								<span
									className={`font-mono text-xs tabular-nums ${dark ? 'text-zinc-400' : 'text-zinc-500'}`}
								>
									{fmtTime(durationMs)}
								</span>
							</div>
						</div>
					)}
					{/* top part: always visible, taps toggle the panel */}
					<button
						type="button"
						onClick={() => setMobileOpen((o) => !o)}
						aria-expanded={mobileOpen}
						aria-label={mobileOpen ? 'Hide controls' : 'Show controls'}
						className={`flex w-full items-center justify-center rounded-t-xl py-3 text-zinc-600 transition-shadow hover:bg-zinc-100 active:bg-zinc-200 md:hidden ${scrolled ? 'shadow-[0_4px_8px_rgba(0,0,0,0.08)]' : ''}`}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth={1.5}
							stroke="currentColor"
							aria-hidden="true"
							className={`size-6 transition-transform duration-300 ${mobileOpen ? 'rotate-180' : ''}`}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="m4.5 15.75 7.5-7.5 7.5 7.5"
							/>
						</svg>
					</button>

					{/* grid-rows 0fr↔1fr animates the height open/closed */}
					<div
						className={`grid transition-[grid-template-rows] duration-300 md:grid-rows-[1fr] ${mobileOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
					>
						<div className="min-h-0 overflow-hidden">
							<div
								onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}
								className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto p-4 md:max-h-none md:overflow-visible"
							>
								<Section title="MusicXML">
									<div className="flex flex-col gap-1.5">
										<label className="cursor-pointer rounded-md bg-zinc-900 px-3 py-2 text-center text-sm font-medium text-white hover:bg-zinc-700">
											Choose File
											<input
												type="file"
												accept=".xml,.musicxml,.mxl"
												className="hidden"
												onChange={onFile}
											/>
										</label>
									</div>

									<Or />

									<div className="flex flex-col gap-1.5">
										<label
											htmlFor="example"
											className="text-xs font-medium text-zinc-500"
										>
											Select an Example
										</label>
										<select
											id="example"
											value={fixture}
											onChange={onPickFixture}
											className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700"
										>
											<option value="">Load an example…</option>
											{fixtureNames.map((name) => (
												<option key={name} value={name}>
													{name}
												</option>
											))}
										</select>
									</div>

									<Or />

									<details className="flex flex-col gap-1.5">
										<summary className="cursor-pointer text-xs font-medium text-zinc-500">
											Edit MusicXML
										</summary>
										<textarea
											id="musicxml"
											value={text}
											onChange={onTextChange}
											placeholder="Paste MusicXML here"
											spellCheck={false}
											className="h-48 w-full resize-y rounded-md border border-zinc-300 bg-white p-2 font-mono text-xs text-zinc-700"
										/>
									</details>
								</Section>

								<Section title="Local storage">
									<p className="flex items-center gap-1 text-xs text-zinc-400">
										{cleared ? (
											<>
												Cleared
												<CheckIcon />
											</>
										) : restored ? (
											<>
												Retrieved from local storage
												<CheckIcon />
											</>
										) : stored ? (
											<>
												Score saved
												<CheckIcon />
											</>
										) : (
											'Nothing saved'
										)}
									</p>
									<button
										type="button"
										onClick={clearStorage}
										disabled={!stored || cleared || restored}
										className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
									>
										Clear local storage
									</button>
								</Section>

								<Section
									title="Config"
									action={
										<button
											type="button"
											onClick={resetAll}
											disabled={!canReset}
											className="text-xs font-medium text-zinc-400 hover:text-zinc-600 disabled:cursor-default disabled:text-zinc-300 disabled:hover:text-zinc-300"
										>
											Reset all
										</button>
									}
								>
									<p className="text-xs text-zinc-400">
										With only a single system, some controls (e.g. system
										spacing and max system fill) won't have a visible effect.
									</p>
									<label
										htmlFor="darkMode"
										className="flex items-center gap-2 text-xs font-medium text-zinc-500"
									>
										<input
											id="darkMode"
											type="checkbox"
											checked={dark}
											onChange={(e) => setDark(e.target.checked)}
										/>
										Dark mode
									</label>
									<div className="flex flex-col gap-1.5">
										<label
											htmlFor="notationFont"
											className="text-xs font-medium text-zinc-500"
										>
											Notation font
										</label>
										<select
											id="notationFont"
											value={notationFont}
											onChange={(e) =>
												setConfig((c) =>
													e.target.value === 'Bravura'
														? (({ fonts: _, ...rest }) => rest)(c)
														: {
																...c,
																fonts: {
																	...c.fonts,
																	notation: { family: e.target.value },
																},
															},
												)
											}
											className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-700"
										>
											<option value="Bravura">Bravura</option>
											<option value="Petaluma">Petaluma</option>
											<option value="Gonville">Gonville</option>
										</select>
										<p className="text-xs text-zinc-400">
											The engraving font for noteheads, clefs, accidentals, and
											rests. Bravura is the default.
										</p>
									</div>

									<div className="flex flex-col gap-1.5">
										<label
											htmlFor="noteSpacing"
											className="flex items-center justify-between text-xs font-medium text-zinc-500"
										>
											Note spacing
											<span className="flex items-center gap-1.5">
												<span className="font-mono text-zinc-400">
													{noteSpacing}
												</span>
												<button
													type="button"
													onClick={() => reset('noteSpacing')}
													disabled={config.noteSpacing === undefined}
													aria-label="Reset note spacing"
													className="text-zinc-400 hover:text-zinc-600 disabled:cursor-default disabled:text-zinc-300 disabled:hover:text-zinc-300"
												>
													<ResetIcon />
												</button>
											</span>
										</label>
										<input
											id="noteSpacing"
											type="range"
											min={12}
											max={120}
											step={1}
											value={noteSpacing}
											onChange={(e) =>
												setConfig((c) => ({
													...c,
													noteSpacing: e.target.valueAsNumber,
												}))
											}
										/>
										<p className="text-xs text-zinc-400">
											How much horizontal space notes get: the px a quarter note
											is allotted. Higher spreads every measure wider.
										</p>
									</div>

									<div className="flex flex-col gap-1.5">
										<label
											htmlFor="softmaxFactor"
											className="flex items-center justify-between text-xs font-medium text-zinc-500"
										>
											Softmax factor
											<span className="flex items-center gap-1.5">
												<span className="font-mono text-zinc-400">
													{softmaxFactor}
												</span>
												<button
													type="button"
													onClick={() => reset('softmaxFactor')}
													disabled={config.softmaxFactor === undefined}
													aria-label="Reset softmax factor"
													className="text-zinc-400 hover:text-zinc-600 disabled:cursor-default disabled:text-zinc-300 disabled:hover:text-zinc-300"
												>
													<ResetIcon />
												</button>
											</span>
										</label>
										<input
											id="softmaxFactor"
											type="range"
											min={1}
											max={30}
											step={1}
											value={softmaxFactor}
											onChange={(e) =>
												setConfig((c) => ({
													...c,
													softmaxFactor: e.target.valueAsNumber,
												}))
											}
										/>
										<p className="text-xs text-zinc-400">
											How that space is divided among notes. Higher exaggerates
											the width difference between long and short notes.
										</p>
									</div>

									<div className="flex flex-col gap-1.5">
										<label
											htmlFor="systemSpacing"
											className="flex items-center justify-between text-xs font-medium text-zinc-500"
										>
											System spacing
											<span className="flex items-center gap-1.5">
												<span className="font-mono text-zinc-400">
													{systemSpacing}
												</span>
												<button
													type="button"
													onClick={() => reset('systemSpacing')}
													disabled={config.systemSpacing === undefined}
													aria-label="Reset system spacing"
													className="text-zinc-400 hover:text-zinc-600 disabled:cursor-default disabled:text-zinc-300 disabled:hover:text-zinc-300"
												>
													<ResetIcon />
												</button>
											</span>
										</label>
										<input
											id="systemSpacing"
											type="range"
											min={10}
											max={50}
											step={1}
											value={systemSpacing}
											onChange={(e) =>
												setConfig((c) => ({
													...c,
													systemSpacing: e.target.valueAsNumber,
												}))
											}
										/>
										<p className="text-xs text-zinc-400">
											Vertical gap between stacked systems. Lower packs systems
											closer together down the page.
										</p>
									</div>

									<div className="flex flex-col gap-1.5">
										<label
											htmlFor="maxSystemFill"
											className="flex items-center justify-between text-xs font-medium text-zinc-500"
										>
											Max system fill
											<span className="flex items-center gap-1.5">
												<span className="font-mono text-zinc-400">
													{maxSystemFill.toFixed(2)}
												</span>
												<button
													type="button"
													onClick={() => reset('maxSystemFill')}
													disabled={config.maxSystemFill === undefined}
													aria-label="Reset max system fill"
													className="text-zinc-400 hover:text-zinc-600 disabled:cursor-default disabled:text-zinc-300 disabled:hover:text-zinc-300"
												>
													<ResetIcon />
												</button>
											</span>
										</label>
										<input
											id="maxSystemFill"
											type="range"
											min={0.1}
											max={1}
											step={0.05}
											value={maxSystemFill}
											onChange={(e) =>
												setConfig((c) => ({
													...c,
													maxSystemFill: e.target.valueAsNumber,
												}))
											}
										/>
										<p className="text-xs text-zinc-400">
											How full a system gets before the next measure wraps to a
											new line. Lower leaves more air; 1 packs each line to the
											edge.
										</p>
									</div>

									<div className="flex flex-col gap-1.5">
										<label
											htmlFor="width"
											className="flex items-center justify-between text-xs font-medium text-zinc-500"
										>
											Reference width
											<span className="flex items-center gap-1.5">
												<span className="font-mono text-zinc-400">{width}</span>
												<button
													type="button"
													onClick={() =>
														setConfig(({ layout: _, ...rest }) => rest)
													}
													disabled={config.layout === undefined}
													aria-label="Reset width"
													className="text-zinc-400 hover:text-zinc-600 disabled:cursor-default disabled:text-zinc-300 disabled:hover:text-zinc-300"
												>
													<ResetIcon />
												</button>
											</span>
										</label>
										<input
											id="width"
											type="range"
											min={400}
											max={2000}
											step={50}
											value={width}
											onChange={(e) =>
												setConfig((c) => ({
													...c,
													layout: {
														type: 'standard',
														width: e.target.valueAsNumber,
													},
												}))
											}
										/>
										<p className="text-xs text-zinc-400">
											The width the score is engraved to; the rendering then
											scales up or down to fit its container. Wider fits more
											measures per system before wrapping.
										</p>
									</div>
								</Section>
							</div>
						</div>
					</div>
				</aside>

				{/* biome-ignore lint/a11y/noStaticElementInteractions: drag-drop zone; Choose File is the keyboard-accessible path */}
				<section
					onDragOver={onDragOver}
					onDragLeave={onDragLeave}
					onDrop={onDrop}
					className={`min-w-0 flex-1 overflow-auto border-2 border-dashed ${dragging ? 'border-blue-400 bg-blue-50/40' : 'border-transparent'}`}
				>
					{/* relative + min-h-full so the loading overlay covers the full scroll content, not just the visible area. Padding lives here (not on section) so inset-0 covers it too. */}
					<div className="relative min-h-full py-6 pb-20 sm:px-6 md:pb-6">
						{error ? (
							<pre className="mx-auto mb-4 w-fit whitespace-pre-wrap rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
								{error}
							</pre>
						) : (
							renderMs != null && (
								<p className="mx-auto mb-6 w-fit rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
									Rendered in {renderMs.toFixed(1)} ms
								</p>
							)
						)}
						{input != null && (
							// vexml appends its managed canvas here; React manages only this div's
							// attributes, never its children. The canvas is engraved at the reference
							// width and CSS-scaled to fit (down when narrow, never past 100%); the
							// `.vexml-canvas` child-selector targets only the score canvas (not vexml's
							// overlay layers) so the dark-mode invert and scaling react without
							// re-rendering. ponytail: invert the black glyphs to light rather than
							// re-engraving in a light color.
							<div
								ref={containerRef}
								// invisible (not hidden) until initialized so the container keeps its
								// width — the canvas is CSS-scaled to w-full and would scale against 0.
								className={`relative mx-auto w-full max-w-237.5 py-8 px-4 shadow-md ring-1 sm:py-16 [&_.vexml-canvas]:block [&_.vexml-canvas]:h-auto! [&_.vexml-canvas]:w-full! ${initialized ? '' : 'invisible'} ${dark ? 'bg-zinc-900 ring-zinc-700 [&_.vexml-canvas]:invert' : 'bg-white ring-zinc-200'}`}
							/>
						)}
						{(!initialized || debouncing) && (
							<div className="pointer-events-none absolute inset-0 bg-black/40">
								{/* sticky so the badge stays centered in the viewport even when the backdrop is taller than the screen */}
								<div className="sticky top-0 flex h-screen items-center justify-center">
									<div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-white px-6 py-5 shadow-lg">
										<span className="size-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-600" />
										<span className="text-sm font-medium text-zinc-600">
											Loading…
										</span>
									</div>
								</div>
							</div>
						)}
					</div>
				</section>
			</main>

			{tooltip && (
				<div
					className="pointer-events-none fixed z-30 -translate-x-1/2 -translate-y-full whitespace-pre-line rounded text-center bg-zinc-900/90 px-2 py-1 font-mono text-xs text-white shadow-lg"
					style={{ left: tooltip.x, top: tooltip.y - 16 }}
				>
					{tooltip.text}
				</div>
			)}
		</div>
	);
}
