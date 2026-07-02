import type {
	Config,
	CursorController,
	Element,
	HoverEvent,
	PointerTargetEvent,
} from '@stringsync/vexml';
import { Note, render, type Score, TabPosition } from '@stringsync/vexml';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ConfigSlider } from './config-slider';
import {
	ACTIVE_COLOR,
	DARK_KEY,
	DEBOUNCE_MS,
	DEFAULT_FIXTURE,
	DEFAULT_MAX_SYSTEM_FILL,
	DEFAULT_NOTE_SPACING,
	DEFAULT_SOFTMAX_FACTOR,
	DEFAULT_SYSTEM_SPACING,
	DEFAULT_WIDTH,
	FAST_RENDER_MS,
	FEEDBACK_MS,
	GRACE_MS,
	HALO_COLOR,
	HOVER_COLOR,
	STORAGE_KEY,
} from './constants';
import { describe } from './format';
import { Header } from './header';
import { useInstrument, useLocalStorage } from './hooks';
import { CheckIcon } from './icons';
import { INSTRUMENTS } from './instrument';
import { Player } from './player';
import { Or, Section } from './section';

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

export default function App() {
	const containerRef = useRef<HTMLDivElement>(null);
	const scoreRef = useRef<Score | null>(null);
	const playerRef = useRef<HTMLDivElement>(null);
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
	const [dark, setDark] = useLocalStorage(DARK_KEY, false);
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
	const cursorRef = useRef<CursorController | null>(null);
	// Attack the notes already under the cursor when play starts. The note at the cursor's position
	// fired its `started` event while paused (during load/seek), so the play loop — which moves
	// *within* that note's duration — never sees it start. Set by the score-load effect, called by
	// the play loop on each start so the first (or resumed) note actually sounds.
	const playStartRef = useRef<(() => void) | null>(null);
	const [playing, setPlaying] = useState(false);
	// Mirror of `playing` the cursor's visibility listener reads live (it's bound once per render).
	const playingRef = useRef(false);
	playingRef.current = playing;
	// Synth voice for playback + note previews. The change/click handlers below drive it via the ref.
	const {
		ref: instrumentRef,
		name: instrumentName,
		setName: setInstrumentName,
		muted,
		setMuted,
	} = useInstrument();
	const [timeMs, setTimeMs] = useState(0);
	const [durationMs, setDurationMs] = useState(0);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);
	// The effect below re-renders the last input whenever config changes.
	const [config, setConfig] = useState<Partial<Config>>({});
	const noteSpacing = config.noteSpacing ?? DEFAULT_NOTE_SPACING;
	const softmaxFactor = config.softmaxFactor ?? DEFAULT_SOFTMAX_FACTOR;
	const systemSpacing = config.systemSpacing ?? DEFAULT_SYSTEM_SPACING;
	const maxSystemFill = config.maxSystemFill ?? DEFAULT_MAX_SYSTEM_FILL;
	const width =
		config.layout?.type === 'standard'
			? (config.layout.referenceWidth ?? DEFAULT_WIDTH)
			: DEFAULT_WIDTH;
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
		if (renderMsRef.current != null && renderMsRef.current <= FAST_RENDER_MS) {
			setRenderConfig(config);
			setDebouncing(false);
			return;
		}
		setDebouncing(true);
		const t = setTimeout(() => {
			setRenderConfig(config);
			setDebouncing(false);
		}, DEBOUNCE_MS);
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
				? renderConfig.layout.referenceWidth
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
			layout: { type: 'standard', referenceWidth: layoutWidth },
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

				// Headless cursor + the built-in bar view. Page-turn scrolling: when the bar crosses
				// out of the scroll box (by moving, or the user scrolling it away), bring it back.
				const cursor = score.createCursor();
				cursor.sync(score.createPlayhead());
				cursor.addEventListener('visibility', (e) => {
					if (!e.fullyVisible && playingRef.current) {
						cursor.scrollIntoView();
					}
				});
				// The notes (and their tab frets) currently under the cursor. Cursor coloring and the
				// hover halo share one color channel, so recolor() resolves both: hover wins while a
				// note is hovered, otherwise the active color shows, otherwise it clears. Rests never
				// enter `lit` (no pitch), so only sounding notes get the active color.
				const lit = new Set<Note>();
				const recolor = (n: Note) => {
					if (n === haloRef.current) {
						n.color.on(HOVER_COLOR);
					} else if (lit.has(n)) {
						n.color.on(ACTIVE_COLOR);
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
				// The synth voice each sounding note owns, so it can be released when the note stops.
				// Keyed by Note (not pitch) so a re-struck pitch — which the transition reports in
				// both `stopped` and `started` — releases the old voice and attacks a fresh one.
				const voices = new Map<Note, () => void>();
				// Attack one sounding note, registering its releaser in `voices`. No-op if already
				// voiced (so a re-attack of a still-sounding note is skipped).
				const attack = (n: Note) => {
					const instrument = instrumentRef.current;
					const pitch = n.getPitch();
					if (!instrument || !pitch || voices.has(n)) {
						return;
					}
					const graces = n.getGraceNotes();
					if (graces.length === 0) {
						voices.set(n, instrument.play(pitch));
						return;
					}
					// Grace notes steal no timeline time, so sound them as quick plucks staggered
					// just before the main note, then attack the main note after the run. The
					// voice releaser cancels a still-pending main attack (clearTimeout) or
					// releases the live voice; pause/teardown stopAll() is the backstop.
					let offset = 0;
					for (const g of graces) {
						const gp = g.getPitch();
						if (gp) {
							const at = offset;
							// Light the grace while it sounds, then clear it as the next one (or
							// the main note) takes over.
							setTimeout(() => {
								instrument.pluck(gp, GRACE_MS);
								g.color.on(ACTIVE_COLOR);
							}, at);
							setTimeout(() => g.color.off(), at + GRACE_MS);
							offset += GRACE_MS;
						}
					}
					let release = () => {};
					const id = setTimeout(() => {
						release = instrument.play(pitch);
					}, offset);
					voices.set(n, () => {
						clearTimeout(id);
						release();
					});
				};
				cursor.addEventListener('change', (e) => {
					setTimeMs(e.timeMs);
					paint(e.active);
					// Release stopped notes; attack started ones (only while playing, so seeking/
					// scrubbing stays silent). Stop before start so a re-strike re-attacks cleanly.
					for (const n of e.stopped) {
						voices.get(n)?.();
						voices.delete(n);
					}
					if (playingRef.current) {
						for (const n of e.started) {
							attack(n);
						}
					}
				});
				// On play start, sound the notes already under the cursor — they started while paused,
				// so the play loop (moving within their duration) never re-fires `started` for them.
				playStartRef.current = () => {
					for (const n of cursor.getActiveElements()) {
						attack(n);
					}
				};
				paint(cursor.getActiveElements());
				cursorRef.current = cursor;
				setDurationMs(score.getDurationMs());
				setTimeMs(0);
				setPlaying(false);

				// A click/tap pins a target (toggle); hover is transient. The pinned one wins, so
				// hovering elsewhere — or scrolling it out from under the pointer — never clears the
				// pin. Clicking it again, or clicking empty space, unpins.
				let pinned: Element | null = null;
				let hovered: Element | null = null;
				const apply = () => {
					const target = pinned ?? hovered;
					const note =
						target instanceof Note
							? target
							: target instanceof TabPosition
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
						note?.halo.on(HALO_COLOR);
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
						e.target instanceof Note || e.target instanceof TabPosition
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
						if (!cursor.isFullyVisible()) {
							cursor.scrollIntoView({ behavior: 'smooth' });
						}
					}
				};
				// Finishing a scrub-drag: if the cursor landed off-screen, bring it into view (the
				// playing-gated visibility listener above stays quiet while paused).
				const onPointerUp = () => {
					if (!cursor.isFullyVisible()) {
						cursor.scrollIntoView({ behavior: 'smooth' });
					}
				};
				score.addEventListener('hover', onHover);
				score.addEventListener('click', onClick);
				score.addEventListener('pointerdown', onPointerDown);
				score.addEventListener('pointermove', onPointerMove);
				score.addEventListener('pointerup', onPointerUp);
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
	}, [input, renderConfig, instrumentRef.current]);

	// Advance the cursor in real time while playing. seekMs drives the bar and the synth (the change
	// handler attacks/releases voices). ponytail: wall-clock RAF, not an audio clock.
	useEffect(() => {
		const cursor = cursorRef.current;
		if (!playing || !cursor) {
			return;
		}
		playStartRef.current?.();
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
		// Cut the sounding voices when playback stops (pause, end, or teardown).
		return () => {
			cancelAnimationFrame(raf);
			instrumentRef.current?.stopAll();
		};
	}, [playing, durationMs, instrumentRef.current?.stopAll]);

	// Fit the score's scroll box to the gap between the canvas top and the player controls so the
	// music fills the space above them and scrolls (page-turns) within it. config.height flows
	// through the config -> renderConfig effect, which conditionally debounces the re-render
	// (immediate when the last render was fast) — so a viewport-height resize is debounced there.
	useEffect(() => {
		if (!initialized) {
			return;
		}
		let lastHeight = -1;
		const measure = () => {
			const c = containerRef.current?.getBoundingClientRect();
			const p = playerRef.current?.getBoundingClientRect();
			if (!c || !p) {
				return;
			}
			// -16 leaves a little air above the floating controls.
			const height = Math.max(0, Math.round(p.top - c.top - 16));
			// Break the feedback loop: applying height resizes the container, re-firing the
			// observer — but the gap (top of card to top of player) is unchanged, so bail.
			// This also no-ops width-only resizes, which leave the gap alone.
			if (height === lastHeight) {
				return;
			}
			lastHeight = height;
			setConfig((cfg) => ({ ...cfg, height }));
		};
		measure();
		// Refit on any container dimension change (width resize, editor toggle, our own height
		// update); the window 'resize' covers viewport-height changes that move the player
		// without resizing the container.
		const container = containerRef.current;
		const ro = new ResizeObserver(measure);
		if (container) {
			ro.observe(container);
		}
		window.addEventListener('resize', measure);
		return () => {
			ro.disconnect();
			window.removeEventListener('resize', measure);
		};
	}, [initialized]);

	const togglePlay = useCallback(() => {
		const cursor = cursorRef.current;
		if (!cursor) {
			return;
		}
		// Restart from the top if we're parked at the end.
		if (!playingRef.current && cursor.isDone()) {
			cursor.seekMs(0);
		}
		// Bring the cursor into view when starting playback (e.g. after scrolling away while paused).
		if (!playingRef.current && !cursor.isFullyVisible()) {
			cursor.scrollIntoView({ behavior: 'smooth' });
		}
		setPlaying((p) => !p);
	}, []);
	// Spacebar toggles playback, except while typing in the editor.
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.code !== 'Space') {
				return;
			}
			const el = e.target as HTMLElement;
			if (
				el.tagName === 'INPUT' ||
				el.tagName === 'TEXTAREA' ||
				el.isContentEditable
			) {
				return;
			}
			e.preventDefault();
			togglePlay();
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [togglePlay]);
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
			setTimeout(() => setRestored(false), FEEDBACK_MS);
			return;
		}
		const name = DEFAULT_FIXTURE;
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
		setTimeout(() => setCleared(false), FEEDBACK_MS);
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
		if (renderMs != null && renderMs <= FAST_RENDER_MS) {
			setDebouncing(false);
			setInput(value);
			return;
		}
		// Spinner shows while we wait out the typing, then render the settled text.
		setDebouncing(true);
		debounceRef.current = setTimeout(() => {
			setDebouncing(false);
			setInput(value);
		}, DEBOUNCE_MS);
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
			<Header />

			<main className="flex min-h-0 flex-1">
				{/* underlay: tap-to-close backdrop behind the panel (mobile only) */}
				<div
					onClick={() => setMobileOpen(false)}
					aria-hidden="true"
					className={`fixed inset-0 z-10 bg-black/40 transition-opacity duration-300 md:hidden ${mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
				/>

				{/* No overflow on the aside: Safari clips position:fixed descendants (the Player)
				    to an overflow ancestor's box. Desktop scrolling lives on the inner config
				    div below instead, which the fixed Player is not a descendant of. */}
				<aside className="fixed inset-x-0 bottom-0 z-20 flex flex-col rounded-t-xl border-t border-zinc-200 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.1)] md:static md:max-h-none md:w-80 md:shrink-0 md:rounded-none md:border-t-0 md:border-r md:shadow-none">
					{input != null && initialized && (
						<Player
							playerRef={playerRef}
							dark={dark}
							playing={playing}
							muted={muted}
							timeMs={timeMs}
							durationMs={durationMs}
							setPlaying={setPlaying}
							setMuted={setMuted}
							onPrev={stepPrev}
							onNext={stepNext}
							onToggle={togglePlay}
							cursorRef={cursorRef}
							scoreRef={scoreRef}
						/>
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
								className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto p-4 md:max-h-[calc(100vh-8rem)]"
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
											htmlFor="instrument"
											className="text-xs font-medium text-zinc-500"
										>
											Instrument
										</label>
										<select
											id="instrument"
											value={instrumentName}
											onChange={(e) => setInstrumentName(e.target.value)}
											className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-700"
										>
											{INSTRUMENTS.map((i) => (
												<option key={i.value} value={i.value}>
													{i.label}
												</option>
											))}
										</select>
										<p className="text-xs text-zinc-400">
											The synth voice used for playback and note previews.
										</p>
									</div>
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

									<ConfigSlider
										id="noteSpacing"
										label="Note spacing"
										display={noteSpacing}
										value={noteSpacing}
										min={12}
										max={120}
										step={1}
										onChange={(e) =>
											setConfig((c) => ({
												...c,
												noteSpacing: e.target.valueAsNumber,
											}))
										}
										onReset={() => reset('noteSpacing')}
										canReset={config.noteSpacing !== undefined}
										description="How much horizontal space notes get: the px a quarter note is allotted. Higher spreads every measure wider."
									/>

									<ConfigSlider
										id="softmaxFactor"
										label="Softmax factor"
										display={softmaxFactor}
										value={softmaxFactor}
										min={1}
										max={30}
										step={1}
										onChange={(e) =>
											setConfig((c) => ({
												...c,
												softmaxFactor: e.target.valueAsNumber,
											}))
										}
										onReset={() => reset('softmaxFactor')}
										canReset={config.softmaxFactor !== undefined}
										description="How that space is divided among notes. Higher exaggerates the width difference between long and short notes."
									/>

									<ConfigSlider
										id="systemSpacing"
										label="System spacing"
										display={systemSpacing}
										value={systemSpacing}
										min={10}
										max={50}
										step={1}
										onChange={(e) =>
											setConfig((c) => ({
												...c,
												systemSpacing: e.target.valueAsNumber,
											}))
										}
										onReset={() => reset('systemSpacing')}
										canReset={config.systemSpacing !== undefined}
										description="Vertical gap between stacked systems. Lower packs systems closer together down the page."
									/>

									<ConfigSlider
										id="maxSystemFill"
										label="Max system fill"
										display={maxSystemFill.toFixed(2)}
										value={maxSystemFill}
										min={0.1}
										max={1}
										step={0.05}
										onChange={(e) =>
											setConfig((c) => ({
												...c,
												maxSystemFill: e.target.valueAsNumber,
											}))
										}
										onReset={() => reset('maxSystemFill')}
										canReset={config.maxSystemFill !== undefined}
										description="How full a system gets before the next measure wraps to a new line. Lower leaves more air; 1 packs each line to the edge."
									/>

									<ConfigSlider
										id="width"
										label="Reference width"
										display={width}
										value={width}
										min={400}
										max={2000}
										step={50}
										onChange={(e) =>
											setConfig((c) => ({
												...c,
												layout: {
													type: 'standard',
													referenceWidth: e.target.valueAsNumber,
												},
											}))
										}
										onReset={() => setConfig(({ layout: _, ...rest }) => rest)}
										canReset={config.layout !== undefined}
										description="The width the score is engraved to; the rendering then scales up or down to fit its container. Wider fits more measures per system before wrapping."
									/>
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
