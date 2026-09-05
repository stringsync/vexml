import type { SystemOverflow } from '@stringsync/vexml';
import { useDisposerEffect, useReactive, useResource } from '@webappwiz/react';
import {
	AlertCircleIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	ChevronUpIcon,
	UploadIcon,
	XIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldLabel,
	FieldSeparator,
} from '@/components/ui/field';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
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
import { Section } from './section';
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
	// Both undefined when the document did not come from the picker, which disables both arrows.
	const fixtureIndex = fixtureNames.indexOf(fixture);
	const prevFixture =
		fixtureIndex > 0 ? fixtureNames[fixtureIndex - 1] : undefined;
	const nextFixture =
		fixtureIndex >= 0 ? fixtureNames[fixtureIndex + 1] : undefined;

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
		<div className="flex h-screen flex-col bg-muted/40 text-foreground">
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
				<aside className="fixed inset-x-0 bottom-0 z-20 flex flex-col rounded-t-xl border-t bg-background shadow-[0_-4px_16px_rgba(0,0,0,0.1)] md:static md:max-h-none md:w-80 md:shrink-0 md:rounded-none md:border-t-0 md:border-r md:shadow-none">
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
					<Button
						type="button"
						variant="ghost"
						onClick={() => {
							setSheetToggled(true);
							setMobileOpen((o) => !o);
						}}
						aria-expanded={mobileOpen}
						aria-label={mobileOpen ? 'Hide controls' : 'Show controls'}
						className={`h-auto w-full rounded-t-xl rounded-b-none py-3 text-muted-foreground transition-shadow md:hidden ${scrolled ? 'shadow-[0_4px_8px_rgba(0,0,0,0.08)]' : ''}`}
					>
						<ChevronUpIcon
							className={`size-6 transition-transform duration-300 ${mobileOpen ? 'rotate-180' : ''}`}
						/>
					</Button>

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
									<Button asChild className="w-full cursor-pointer">
										<label>
											<UploadIcon data-icon="inline-start" />
											Choose File
											<input
												type="file"
												accept=".xml,.musicxml,.mxl"
												className="hidden"
												onChange={onFile}
											/>
										</label>
									</Button>

									<FieldSeparator>or</FieldSeparator>

									<Field>
										<FieldLabel htmlFor="example">Select an Example</FieldLabel>
										<div className="flex items-center gap-1.5">
											<Button
												type="button"
												variant="outline"
												size="icon"
												disabled={!prevFixture}
												onClick={() =>
													prevFixture && model.document.loadFixture(prevFixture)
												}
												aria-label="Previous example"
											>
												<ChevronLeftIcon />
											</Button>
											<Select
												value={fixture}
												onValueChange={(name) =>
													model.document.loadFixture(name)
												}
											>
												<SelectTrigger id="example" className="min-w-0 flex-1">
													<SelectValue placeholder="Load an example…" />
												</SelectTrigger>
												<SelectContent>
													<SelectGroup>
														{fixtureNames.map((name) => (
															<SelectItem key={name} value={name}>
																{name}
															</SelectItem>
														))}
													</SelectGroup>
												</SelectContent>
											</Select>
											<Button
												type="button"
												variant="outline"
												size="icon"
												disabled={!nextFixture}
												onClick={() =>
													nextFixture && model.document.loadFixture(nextFixture)
												}
												aria-label="Next example"
											>
												<ChevronRightIcon />
											</Button>
										</div>
									</Field>

									<FieldSeparator>or</FieldSeparator>

									<Collapsible className="flex flex-col gap-2">
										<CollapsibleTrigger asChild>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="w-fit text-muted-foreground"
											>
												Edit MusicXML
											</Button>
										</CollapsibleTrigger>
										<CollapsibleContent>
											<Textarea
												id="musicxml"
												value={text}
												onChange={onTextChange}
												placeholder="Paste MusicXML here"
												spellCheck={false}
												className="h-48 resize-y font-mono text-xs"
											/>
										</CollapsibleContent>
									</Collapsible>
								</Section>

								<Section
									title="Config"
									action={
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => model.config.resetAll()}
											disabled={!canReset}
											className="text-muted-foreground"
										>
											Reset all
										</Button>
									}
								>
									<FieldDescription>
										With only a single system, some controls (e.g. system
										spacing and max system fill) won't have a visible effect.
									</FieldDescription>

									<Field>
										<FieldLabel htmlFor="instrument">Instrument</FieldLabel>
										<Select
											value={instrumentName}
											onValueChange={(name) => model.instrument.setName(name)}
										>
											<SelectTrigger id="instrument">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
													{INSTRUMENTS.map((i) => (
														<SelectItem key={i.value} value={i.value}>
															{i.label}
														</SelectItem>
													))}
												</SelectGroup>
											</SelectContent>
										</Select>
										<FieldDescription>
											The synth voice used for playback and note previews.
										</FieldDescription>
									</Field>

									<Field>
										<FieldLabel htmlFor="notationFont">
											Notation font
										</FieldLabel>
										<Select
											value={notationFont}
											onValueChange={(family) => {
												if (family === 'Bravura') {
													model.config.clear('fonts');
												} else {
													model.config.patch({
														fonts: {
															...config.fonts,
															notation: { family },
														},
													});
												}
											}}
										>
											<SelectTrigger id="notationFont">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
													<SelectItem value="Bravura">Bravura</SelectItem>
													<SelectItem value="Petaluma">Petaluma</SelectItem>
													<SelectItem value="Gonville">Gonville</SelectItem>
												</SelectGroup>
											</SelectContent>
										</Select>
										<FieldDescription>
											The engraving font for noteheads, clefs, accidentals, and
											rests. Bravura is the default.
										</FieldDescription>
									</Field>

									<ConfigSlider
										id="noteSpacing"
										label="Note spacing"
										display={noteSpacing}
										value={noteSpacing}
										min={12}
										max={120}
										step={1}
										onChange={(noteSpacing) =>
											model.config.patch({ noteSpacing })
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
										onChange={(softmaxFactor) =>
											model.config.patch({ softmaxFactor })
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
										onChange={(systemSpacing) =>
											model.config.patch({ systemSpacing })
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
										onChange={(maxSystemFill) =>
											model.config.patch({ maxSystemFill })
										}
										onReset={() => model.config.clear('maxSystemFill')}
										canReset={config.maxSystemFill !== undefined}
										description="How full a system gets before the next measure wraps to a new line. Lower leaves more air; 1 packs each line to the edge."
									/>

									<Field orientation="horizontal">
										<Checkbox
											id="honorSystemBreaks"
											checked={layout?.honorSystemBreaks ?? true}
											onCheckedChange={(checked) =>
												model.config.patchLayout({
													honorSystemBreaks: checked === true,
												})
											}
										/>
										<FieldContent>
											<FieldLabel htmlFor="honorSystemBreaks">
												Honor system breaks
											</FieldLabel>
											<FieldDescription>
												Whether a <code>&lt;print new-system="yes"&gt;</code> in
												the document forces a line break. Off wraps purely on
												width.
											</FieldDescription>
										</FieldContent>
									</Field>

									<ConfigSlider
										id="width"
										label="Reference width"
										display={width}
										value={width}
										min={400}
										max={2000}
										step={50}
										onChange={(referenceWidth) =>
											model.config.patchLayout({ referenceWidth })
										}
										onReset={() => model.config.clearLayout('referenceWidth')}
										canReset={layout?.referenceWidth !== undefined}
										description="The width the score is engraved to; the rendering then scales up or down to fit its container. Wider fits more measures per system before wrapping."
									/>

									<Field>
										<FieldLabel htmlFor="overflow">Overflow</FieldLabel>
										<Select
											value={layout?.overflow ?? 'wrap'}
											onValueChange={(overflow) =>
												model.config.patchLayout({
													overflow: overflow as SystemOverflow,
												})
											}
										>
											<SelectTrigger id="overflow">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
													<SelectItem value="wrap">wrap</SelectItem>
													<SelectItem value="allow">allow</SelectItem>
													<SelectItem value="widen">widen</SelectItem>
												</SelectGroup>
											</SelectContent>
										</Select>
										<FieldDescription>
											What gives when a document's engraved line can't fit the
											reference width: <code>wrap</code> breaks the line anyway,{' '}
											<code>allow</code> lets it stick out past the width, and{' '}
											<code>widen</code> grows the width until it fits. The
											notes are never squeezed together far enough to collide.
										</FieldDescription>
									</Field>
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
					className={`min-w-0 flex-1 overflow-auto border-2 border-dashed ${dragging ? 'border-primary bg-primary/5' : 'border-transparent'}`}
				>
					{/* relative + min-h-full so the loading overlay covers the full scroll content, not just the visible area. Padding lives here (not on section) so inset-0 covers it too. */}
					<div className="relative min-h-full py-6 pb-20 sm:px-6 md:pb-6">
						<div className="mx-auto mb-6 flex w-fit items-center gap-2">
							{error ? (
								<Alert variant="destructive" className="w-fit">
									<AlertCircleIcon />
									<AlertTitle>Could not render this document</AlertTitle>
									<AlertDescription>
										<pre className="whitespace-pre-wrap font-mono text-xs">
											{error}
										</pre>
									</AlertDescription>
								</Alert>
							) : (
								renderMs != null && (
									<Badge variant="secondary">
										Rendered in {renderMs.toFixed(1)} ms
									</Badge>
								)
							)}
							{/* Nothing to clear once the default example is what's showing. */}
							{fixture !== DEFAULT_FIXTURE && (
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => model.document.clear()}
									title="Clear the saved score and reload the default example"
								>
									Clear
									<XIcon data-icon="inline-end" />
								</Button>
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
								className={`relative mx-auto w-full max-w-237.5 bg-card py-8 px-4 shadow-md ring-1 ring-border sm:py-16 ${initialized ? '' : 'invisible'}`}
							/>
						)}
						{(!initialized || debouncing) && (
							<div className="pointer-events-none absolute inset-0 bg-black/40">
								{/* sticky so the badge stays centered in the viewport even when the backdrop is taller than the screen */}
								<div className="sticky top-0 flex h-screen items-center justify-center">
									<Card className="flex-row items-center gap-3 px-6 py-5 shadow-lg">
										<Spinner className="size-6" />
										<span className="text-sm font-medium text-muted-foreground">
											Loading…
										</span>
									</Card>
								</div>
							</div>
						)}
					</div>
				</section>
			</main>

			{tooltip && (
				<div
					className="pointer-events-none fixed z-30 -translate-x-1/2 -translate-y-full whitespace-pre-line rounded-md bg-foreground px-2 py-1 text-center font-mono text-xs text-background shadow-lg"
					style={{ left: tooltip.x, top: tooltip.y - 16 }}
				>
					{tooltip.text}
				</div>
			)}
		</div>
	);
}
