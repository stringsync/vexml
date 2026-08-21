import type { SystemOverflow } from '@stringsync/vexml';
import { useDisposerEffect, useReactive, useResource } from '@webappwiz/react';
import { useEffect, useRef, useState } from 'react';
import { ConfigSlider } from './config-slider';
import {
	DEFAULT_FIXTURE,
	DEFAULT_MAX_SYSTEM_FILL,
	DEFAULT_NOTE_SPACING,
	DEFAULT_SOFTMAX_FACTOR,
	DEFAULT_SYSTEM_SPACING,
	DEFAULT_WIDTH,
	FAST_RENDER_MS,
} from './constants';
import { Header } from './header';
import { INSTRUMENTS } from './instruments';
import { Player } from './player';
import { ScoreFit } from './score-fit';
import { Or, Section } from './section';
import { SiteModel } from './site-model';

// Vite reads the fixtures straight from packages/integration at build time (fs.allow:
// ['../..'] in vite.config permits it) and hands us the file list — no symlink or manifest.
// Keyed by basename, each value lazily loads the file's raw text.
const loaders: Record<string, () => Promise<string>> = {};
for (const [path, load] of Object.entries(
	import.meta.glob<string>('../integration/__data__/*.musicxml', {
		query: '?raw',
		import: 'default',
	}),
)) {
	loaders[path.slice(path.lastIndexOf('/') + 1).replace('.musicxml', '')] =
		load;
}
const fixtureNames = Object.keys(loaders).sort();
const fixtures = {
	names: () => fixtureNames,
	load: (name: string) => loaders[name]?.(),
};

// Hoisted, not inline: useResource rebuilds when the factory's identity changes, so an arrow
// written at the call site would build (and dispose) a fresh model on every render.
// Render-pure, as useResource requires: SiteModel's constructor wires in-memory state and its own
// dispatchers, and acquires nothing that needs cleanup (the AudioContext is built lazily).
const buildModel = () => new SiteModel(fixtures, localStorage);

// What the component reads off the model. Every field is a primitive or a stable reference, so
// useReactive's shallow comparison decides re-renders.
const projection = (model: SiteModel) => ({
	text: model.document.text,
	input: model.document.input,
	fixture: model.document.fixture,
	error: model.error,
	initialized: model.initialized,
	session: model.session,
	applied: model.config.applied,
	renderMs: model.config.renderMs,
	debouncing: model.config.debouncing || model.document.debouncing,
	config: model.config.live,
	canReset: model.config.canReset(),
	instrumentName: model.instrument.name,
	muted: model.instrument.muted,
	playing: model.session?.playing ?? false,
	timeMs: model.session?.timeMs ?? 0,
	durationMs: model.session?.durationMs ?? 0,
	tooltip: model.session?.tooltip ?? null,
});

export default function App() {
	const containerRef = useRef<HTMLDivElement>(null);
	const playerRef = useRef<HTMLDivElement>(null);
	const fitRef = useRef<ScoreFit | null>(null);
	const model = useResource(buildModel);
	const {
		text,
		input,
		fixture,
		error,
		initialized,
		session,
		applied,
		renderMs,
		debouncing,
		config,
		canReset,
		instrumentName,
		muted,
		playing,
		timeMs,
		durationMs,
		tooltip,
	} = useReactive(model, projection, ['changed']);

	// Purely local view state: nothing outside the component reads any of it.
	const [dragging, setDragging] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);
	// The sheet opens collapsed with no animation: the grid-rows transition is only enabled once
	// the user first taps it, so the initial (and any HMR/remount) render can't slide it down.
	const [sheetToggled, setSheetToggled] = useState(false);
	const [scrolled, setScrolled] = useState(false);

	const layout = config.layout?.type === 'standard' ? config.layout : undefined;
	const noteSpacing = config.noteSpacing ?? DEFAULT_NOTE_SPACING;
	const softmaxFactor = config.softmaxFactor ?? DEFAULT_SOFTMAX_FACTOR;
	const systemSpacing = config.systemSpacing ?? DEFAULT_SYSTEM_SPACING;
	const maxSystemFill = config.maxSystemFill ?? DEFAULT_MAX_SYSTEM_FILL;
	const notationFont = config.fonts?.notation?.family ?? 'Bravura';
	const width = layout?.referenceWidth ?? DEFAULT_WIDTH;

	useEffect(() => {
		model.document.restore();
		model.instrument.preload();
	}, [model]);

	// Re-render the score whenever what to draw, or how to draw it, changes.
	useEffect(() => {
		const container = containerRef.current;
		if (container) {
			model.renderInto(container, { input, config: applied });
		}
	}, [model, input, applied]);

	// Size the score's scroll box to the gap above the player controls, once both exist.
	// A disposer effect, not useResource: this really does acquire a ResizeObserver and a window
	// listener, which must not happen during render.
	useDisposerEffect(
		(disposer) => {
			const container = containerRef.current;
			const player = playerRef.current;
			if (!initialized || !container || !player) {
				return;
			}
			fitRef.current = disposer.use(
				new ScoreFit(container, player, model.config),
			);
			disposer.defer(() => {
				fitRef.current = null;
			});
		},
		[model, initialized],
	);

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
			model.session?.togglePlay();
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [model]);

	function onFile(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (file) {
			model.document.loadFile(file);
		}
	}

	function onTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
		// Only the component knows how long the last render took, so it decides whether this
		// keystroke can skip the debounce.
		model.document.edit(e.target.value, {
			immediate: renderMs != null && renderMs <= FAST_RENDER_MS,
		});
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
			model.document.loadFile(file);
		}
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
							session={session}
							instrument={model.instrument}
							muted={muted}
							playing={playing}
							timeMs={timeMs}
							durationMs={durationMs}
						/>
					)}
					{/* top part: always visible, taps toggle the panel */}
					<button
						type="button"
						onClick={() => {
							setSheetToggled(true);
							setMobileOpen((o) => !o);
						}}
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

					{/* grid-rows 0fr↔1fr animates the height open/closed (only once tapped, so the
					    default collapsed state never slides in); its end re-fits the score box */}
					<div
						onTransitionEnd={() => fitRef.current?.remeasure()}
						className={`grid md:grid-rows-[1fr] ${sheetToggled ? 'transition-[grid-template-rows] duration-300' : ''} ${mobileOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
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
											onChange={(e) =>
												model.document.loadFixture(e.target.value)
											}
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

								<Section
									title="Config"
									action={
										<button
											type="button"
											onClick={() => model.config.resetAll()}
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
											onChange={(e) => model.instrument.setName(e.target.value)}
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
											onChange={(e) => {
												if (e.target.value === 'Bravura') {
													model.config.clear('fonts');
												} else {
													model.config.patch({
														fonts: {
															...config.fonts,
															notation: { family: e.target.value },
														},
													});
												}
											}}
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
											model.config.patch({
												noteSpacing: e.target.valueAsNumber,
											})
										}
										onReset={() => model.config.clear('noteSpacing')}
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
											model.config.patch({
												softmaxFactor: e.target.valueAsNumber,
											})
										}
										onReset={() => model.config.clear('softmaxFactor')}
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
											model.config.patch({
												systemSpacing: e.target.valueAsNumber,
											})
										}
										onReset={() => model.config.clear('systemSpacing')}
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
											model.config.patch({
												maxSystemFill: e.target.valueAsNumber,
											})
										}
										onReset={() => model.config.clear('maxSystemFill')}
										canReset={config.maxSystemFill !== undefined}
										description="How full a system gets before the next measure wraps to a new line. Lower leaves more air; 1 packs each line to the edge."
									/>

									<div className="flex flex-col gap-1.5">
										<label
											htmlFor="honorSystemBreaks"
											className="flex items-center gap-2 text-xs font-medium text-zinc-500"
										>
											<input
												id="honorSystemBreaks"
												type="checkbox"
												checked={layout?.honorSystemBreaks ?? true}
												onChange={(e) =>
													model.config.patchLayout({
														honorSystemBreaks: e.target.checked,
													})
												}
											/>
											Honor system breaks
										</label>
										<p className="text-xs text-zinc-400">
											Whether a <code>&lt;print new-system="yes"&gt;</code> in
											the document forces a line break. Off wraps purely on
											width.
										</p>
									</div>

									<ConfigSlider
										id="width"
										label="Reference width"
										display={width}
										value={width}
										min={400}
										max={2000}
										step={50}
										onChange={(e) =>
											model.config.patchLayout({
												referenceWidth: e.target.valueAsNumber,
											})
										}
										onReset={() => model.config.clearLayout('referenceWidth')}
										canReset={layout?.referenceWidth !== undefined}
										description="The width the score is engraved to; the rendering then scales up or down to fit its container. Wider fits more measures per system before wrapping."
									/>

									<div className="flex flex-col gap-1.5">
										<label
											htmlFor="overflow"
											className="text-xs font-medium text-zinc-500"
										>
											Overflow
										</label>
										<select
											id="overflow"
											value={layout?.overflow ?? 'wrap'}
											onChange={(e) =>
												model.config.patchLayout({
													overflow: e.target.value as SystemOverflow,
												})
											}
											className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-700"
										>
											<option value="wrap">wrap</option>
											<option value="allow">allow</option>
											<option value="widen">widen</option>
										</select>
										<p className="text-xs text-zinc-400">
											What gives when a document's engraved line can't fit the
											reference width: <code>wrap</code> breaks the line anyway,{' '}
											<code>allow</code> lets it stick out past the width, and{' '}
											<code>widen</code> grows the width until it fits. The
											notes are never squeezed together far enough to collide.
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
						<div className="mx-auto mb-6 flex w-fit items-center gap-2">
							{error ? (
								<pre className="w-fit whitespace-pre-wrap rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
									{error}
								</pre>
							) : (
								renderMs != null && (
									<p className="w-fit rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
										Rendered in {renderMs.toFixed(1)} ms
									</p>
								)
							)}
							{/* Nothing to clear once the default example is what's showing. */}
							{fixture !== DEFAULT_FIXTURE && (
								<button
									type="button"
									onClick={() => model.document.clear()}
									title="Clear the saved score and reload the default example"
									className="flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
								>
									Clear ✕
								</button>
							)}
						</div>
						{input != null && (
							// vexml appends its managed canvas here; React manages only this div's
							// attributes, never its children. vexml sizes the score to fit this container
							// (scaling down when narrow, never past its engraved width) and centers it — no
							// CSS needed here.
							<div
								ref={containerRef}
								// invisible (not hidden) until initialized so the container keeps its
								// width — the canvas fits against it and would fit against 0 if removed.
								className={`relative mx-auto w-full max-w-237.5 bg-white py-8 px-4 shadow-md ring-1 ring-zinc-200 sm:py-16 ${initialized ? '' : 'invisible'}`}
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
