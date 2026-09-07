import type { SystemOverflow } from '@stringsync/vexml';
import { useDisposerEffect, useReactive, useResource } from '@webappwiz/react';
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	Rows3Icon,
	SlidersVerticalIcon,
	UploadIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';
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
import { EditingToolbar } from './editing-toolbar';
import { Header } from './header';
import { INSTRUMENTS } from './instruments';
import { LayoutToggle } from './layout-toggle';
import { Player } from './player';
import { ScoreFit } from './score-fit';
import { Section, SectionReset } from './section';
import { Segmented, type SegmentedOption } from './segmented';
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

// The overflow modes, in the order they sit in the segmented control.
const OVERFLOWS: ReadonlyArray<SegmentedOption<SystemOverflow>> = [
	{ value: 'wrap', label: 'wrap' },
	{ value: 'allow', label: 'allow' },
	{ value: 'widen', label: 'widen' },
];

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
	activeVoice: model.session?.editingVoices.getValue() ?? '',
	navigationFeedback: model.session?.feedback ?? null,
	selectionDescription: model.session?.selectionDescription ?? 'No selection',
});

export default function App() {
	const containerRef = useRef<HTMLDivElement>(null);
	const playerRef = useRef<HTMLDivElement>(null);
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
		selectionDescription,
		navigationFeedback,
		activeVoice,
	} = useReactive(model, projection, ['changed']);

	// Purely local view state: nothing outside the component reads any of it.
	const [dragging, setDragging] = useState(false);
	const [controlsOpen, setControlsOpen] = useState(false);
	const isMobile = useIsMobile();

	const layoutType = config.layout?.type ?? 'standard';
	// Panoramic draws one endless system, so the knobs that decide where a line breaks belong to
	// the stacked view alone. Both views still fit the same scroll box above the player.
	const panoramic = layoutType === 'panoramic';
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

	// The Sheet stands in for the sidebar below md, so widening past it has to close the Sheet:
	// left open, it stacks on top of the very sidebar it was standing in for.
	useEffect(() => {
		if (!isMobile) {
			setControlsOpen(false);
		}
	}, [isMobile]);

	// Re-render the score whenever what to draw, or how to draw it, changes. The counter keys the
	// render-time line: two renders can land on the same duration, and it should replay its
	// entrance either way.
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
			disposer.use(new ScoreFit(container, player, model.config));
		},
		[model, initialized],
	);

	// Spacebar toggles playback, except while typing in the editor.
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (
				e.target === document.body &&
				['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) &&
				!e.altKey &&
				!e.ctrlKey &&
				!e.metaKey
			) {
				if (model.session?.handleKey(e.key, e.shiftKey)) {
					containerRef.current?.focus({ preventScroll: true });
					e.preventDefault();
				}
				return;
			}
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

	// One copy of the panel, rendered into the desktop aside and into the mobile Sheet.
	const controls = (
		<>
			<Section
				icon={UploadIcon}
				title="MusicXML"
				action={
					<SectionReset
						onClick={() => model.document.clear()}
						// Nothing to clear once the default example is what's showing.
						disabled={fixture === DEFAULT_FIXTURE}
						title="Clear the saved score and reload the default example"
					/>
				}
			>
				{/* Outlined rather than filled: it is the card's primary action, but a pink
				    slab at the top of the panel shouts over the score it is there to load. */}
				<Button
					asChild
					variant="outline"
					size="xl"
					className="w-full cursor-pointer font-semibold"
				>
					<label>
						Choose file
						<span className="font-normal text-faint">.xml .musicxml .mxl</span>
						<input
							type="file"
							accept=".xml,.musicxml,.mxl"
							className="hidden"
							onChange={onFile}
						/>
					</label>
				</Button>

				<Field className="gap-1.5">
					<FieldLabel
						htmlFor="example"
						className="text-xs font-normal text-muted-foreground"
					>
						Or pick an example
					</FieldLabel>
					<div className="flex items-center gap-1.5">
						<Button
							type="button"
							variant="outline"
							size="icon-lg"
							className="bg-muted"
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
							onValueChange={(name) => model.document.loadFixture(name)}
						>
							<SelectTrigger
								id="example"
								className="min-w-0 flex-1 font-mono text-sm data-[size=default]:h-9"
							>
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
							size="icon-lg"
							className="bg-muted"
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

				<Collapsible className="flex flex-col gap-2">
					<CollapsibleTrigger asChild>
						{/* The chevron turns down when it opens, so the row reads as
						    the disclosure toggle it is rather than as a label. */}
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="h-auto w-fit gap-1.5 px-0 text-sm text-secondary-foreground hover:bg-transparent [&>svg]:size-3.5 [&>svg]:transition-transform [&[data-state=open]>svg]:rotate-90"
						>
							<ChevronRightIcon data-icon="inline-start" />
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
							className="h-48 resize-y font-mono text-2xs"
						/>
					</CollapsibleContent>
				</Collapsible>
			</Section>

			<Section icon={SlidersVerticalIcon} title="Playback">
				<Field
					orientation="horizontal"
					className="justify-between gap-3"
					title="The synth voice used for playback and note previews."
				>
					<FieldLabel
						htmlFor="instrument"
						className="font-normal text-muted-foreground"
					>
						Instrument
					</FieldLabel>
					<Select
						value={instrumentName}
						onValueChange={(name) => model.instrument.setName(name)}
					>
						<SelectTrigger
							id="instrument"
							size="sm"
							className="h-7.5 text-xs font-medium"
						>
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
				</Field>
			</Section>

			<Section
				icon={Rows3Icon}
				title="Layout"
				gap="lg"
				action={
					<SectionReset
						onClick={() => model.config.resetAll()}
						disabled={!canReset}
					/>
				}
			>
				<Field className="gap-2">
					<FieldLabel className="font-normal text-muted-foreground">
						Score view
					</FieldLabel>
					<LayoutToggle
						value={layoutType}
						onChange={(type) => model.config.setLayoutType(type)}
						className="w-full bg-muted"
					/>
				</Field>
				<Field
					orientation="horizontal"
					className="justify-between gap-3"
					title="The engraving font for noteheads, clefs, accidentals, and rests. Bravura is the default."
				>
					<FieldLabel
						htmlFor="notationFont"
						className="font-normal text-muted-foreground"
					>
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
						<SelectTrigger
							id="notationFont"
							size="sm"
							className="h-7.5 text-xs font-medium"
						>
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
				</Field>

				<ConfigSlider
					id="noteSpacing"
					label="Note spacing"
					display={noteSpacing}
					value={noteSpacing}
					min={12}
					max={120}
					step={1}
					onChange={(noteSpacing) => model.config.patch({ noteSpacing })}
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
					onChange={(softmaxFactor) => model.config.patch({ softmaxFactor })}
					description="How that space is divided among notes. Higher exaggerates the width difference between long and short notes."
				/>

				{/* Every knob below decides where a line breaks or how systems stack, and the
				    panoramic view has neither: one system, no wrapping. */}
				{!panoramic && (
					<>
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
							onChange={(referenceWidth) =>
								model.config.patchLayout({ referenceWidth })
							}
							description="The width the score is engraved to; the rendering then scales up or down to fit its container. Wider fits more measures per system before wrapping."
						/>

						<Field className="gap-2">
							<FieldLabel className="font-normal text-muted-foreground">
								Overflow
							</FieldLabel>
							<Segmented
								value={(layout?.overflow ?? 'wrap') as SystemOverflow}
								onChange={(overflow) => model.config.patchLayout({ overflow })}
								options={OVERFLOWS}
								label="Overflow"
								size="sm"
								mono
								stretch
								className="bg-muted"
							/>
							<FieldDescription className="text-2xs text-faint">
								What gives when an engraved line can't fit the reference width.
							</FieldDescription>
						</Field>

						<Field orientation="horizontal" className="justify-between gap-3">
							<FieldLabel
								htmlFor="honorSystemBreaks"
								className="font-normal text-muted-foreground"
								title={`Whether a <print new-system="yes"> in the document forces a line break. Off wraps purely on width.`}
							>
								Honor system breaks
							</FieldLabel>
							<Switch
								id="honorSystemBreaks"
								size="lg"
								checked={layout?.honorSystemBreaks ?? true}
								onCheckedChange={(checked) =>
									model.config.patchLayout({
										honorSystemBreaks: checked === true,
									})
								}
							/>
						</Field>
					</>
				)}
			</Section>
		</>
	);

	return (
		<div className="flex h-screen flex-col bg-background text-foreground">
			<Header
				controlsOpen={controlsOpen}
				onOpenControls={() => setControlsOpen(true)}
			/>

			{/* relative: the loading overlay below covers this whole box, controls and all. */}
			<main className="relative flex min-h-0 flex-1">
				{/* Desktop keeps the panel in the layout; below md it lives in the Sheet below. */}
				<aside className="hidden w-80 shrink-0 flex-col gap-3 overflow-y-auto border-r bg-card px-3.5 py-4 md:flex">
					{controls}
				</aside>

				<Sheet open={controlsOpen} onOpenChange={setControlsOpen}>
					<SheetContent side="left" className="w-80 gap-0 shadow-sheet">
						{/* pb-0 here and p-3.5 below, so the scroll box starts clear of the title:
						    with no top padding it clips the first card's ring at rest. */}
						<SheetHeader className="h-14 justify-center pb-0">
							<SheetTitle className="text-[15px] font-semibold">
								Controls
							</SheetTitle>
						</SheetHeader>
						<div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3.5">
							{controls}
						</div>
					</SheetContent>
				</Sheet>

				<div className="flex min-w-0 flex-1 flex-col">
					<div className="shrink-0 px-4 pt-4 md:px-10">
						<div className="mx-auto max-w-237.5">
							<EditingToolbar
								title={fixture || 'MusicXML score'}
								renderMs={renderMs}
								error={error}
								voices={session?.editingVoices.options ?? []}
								activeVoice={activeVoice}
								onVoiceChange={(value) => session?.selectVoice(value)}
								selection={selectionDescription}
							/>
						</div>
					</div>
					<div className="relative min-h-0 flex-1">
						{/* biome-ignore lint/a11y/noStaticElementInteractions: drag-drop zone; Choose file is the keyboard-accessible path */}
						<div
							onDragOver={onDragOver}
							onDragLeave={onDragLeave}
							onDrop={onDrop}
							className={`h-full overflow-auto border-2 border-dashed px-4 pt-3 md:px-10 md:py-5 ${dragging ? 'border-brand bg-brand/5' : 'border-transparent'}`}
						>
							{input != null && (
								// vexml appends its managed canvas here; React manages only this div's
								// attributes, never its children. vexml sizes the score to fit this container
								// (scaling down when narrow, never past its engraved width) and centers it — no
								// CSS needed here.
								<div
									ref={containerRef}
									// biome-ignore lint/a11y/noNoninteractiveTabindex: the score application receives keyboard navigation commands.
									tabIndex={0}
									role="application"
									aria-label="Score"
									onKeyDown={(event) => {
										if (
											event.target !== event.currentTarget ||
											event.altKey ||
											event.ctrlKey ||
											event.metaKey ||
											(event.shiftKey &&
												event.key !== 'ArrowLeft' &&
												event.key !== 'ArrowRight')
										) {
											return;
										}
										if (session?.handleKey(event.key, event.shiftKey)) {
											event.preventDefault();
										}
									}}
									// invisible (not hidden) until initialized so the container keeps its
									// width — the canvas fits against it and would fit against 0 if removed.
									// Panoramic is the horizontal scroll box itself — vexml's ScrollController
									// scrolls this container either way, and the measured cap already ends it
									// above the player, so the scrollbar lands somewhere reachable. The card
									// wraps the panorama rather than filling the space: w-fit hugs the music
									// (the height cap does the same vertically) and max-w-full stops a long one
									// from pushing past the space, leaving it to scroll. It also drops the
									// page-width cap: a panorama has no page to be as wide as.
									className={`relative mx-auto rounded-t-2xl border border-border bg-card px-6 py-8 shadow-score focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-4 focus-visible:ring-offset-background md:rounded-2xl md:px-12 md:py-14 ${panoramic ? 'w-fit max-w-full overflow-x-auto' : 'w-full max-w-237.5'} ${initialized ? '' : 'invisible'}`}
								/>
							)}
						</div>
						{/* Below md the score card runs into the player rather than ending above
						    it, so the music fades out instead of being cut off mid-staff. */}
						<div className="pointer-events-none absolute inset-x-0 bottom-0 h-15 bg-linear-to-b from-transparent to-background md:hidden" />
					</div>

					{input != null && initialized && (
						<Player
							navigationFeedback={navigationFeedback}
							playerRef={playerRef}
							session={session}
							instrument={model.instrument}
							muted={muted}
							playing={playing}
							timeMs={timeMs}
							durationMs={durationMs}
						/>
					)}
				</div>

				{/* Over the whole of main, not just the score: a render in flight suspends the
				    controls that would queue another one as much as it does the notation. Sized
				    to main rather than to the scroll content, so it covers the panel, the player
				    and the padding between them, and stays put while the score scrolls under it.
				    pointer-events-none: the overlay reports, it does not trap. */}
				{(!initialized || debouncing) && (
					<div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-foreground/35">
						<Card className="flex-row items-center gap-3 px-6 py-5 shadow-lg">
							<Spinner />
							<span className="font-medium text-muted-foreground">
								Loading…
							</span>
						</Card>
					</div>
				)}
			</main>
		</div>
	);
}
