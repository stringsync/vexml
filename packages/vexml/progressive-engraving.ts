import type { Part } from '@stringsync/mdom';
import type { Resource } from 'webappwiz/disposable';
import { Dispatcher, type Events } from 'webappwiz/events';
import type { Config } from './config';
import type { Drawing, DrawingEventMap } from './drawing';
import type { ElementFactory } from './element-factory';
import type { ElementIndex } from './element-index';
import type { ElementPlacer } from './element-placer';
import type { RawMeasure, RawNote } from './geometry-collector';
import type { IdleScheduler, IdleSlice } from './idle-scheduler';
import type { LayoutPlan } from './layout-plan';
import type { PaintProbe } from './paint-probe';
import type { ProvisionalGeometry } from './provisional-geometry';
import type { GapInfo } from './score';
import type { DrawResult, Engraving, RawGeometry } from './score-drawer';
import { ScoreRecording } from './score-recording';
import type { Sequence } from './sequence';
import type { SequencePlacer } from './sequence-placer';
import { snapshotConfig } from './snapshot-config';
import type { SystemDraw } from './system-draw';

/* Where the engraving is shown as it grows: the stage. `from` is how many of its ops were
 * shown already, so only the rest need painting unless its size changed. */
export interface ProgressiveSink {
	extendEngraving(engraving: Engraving, from: number): void;
}

/* What a progressive engraving's first screen is measured against: the bottom of what the
 * page shows of the score, in score px. */
export interface ProgressiveView {
	visibleBottom(): number;
}

/* What a progressive engraving works over: the draw to continue and the plan it reads, the
 * score's model built over the plan's forecast geometry (see ProvisionalGeometry) with the
 * placer that moves it into place, and what the recording a snapshot takes is built from. */
export interface ProgressiveEngravingDeps {
	draw: SystemDraw;
	plan: LayoutPlan;
	provisional: ProvisionalGeometry;
	// The forecast geometry the model was built over.
	planned: RawGeometry;
	elements: ElementIndex;
	placer: ElementPlacer;
	sequence: Sequence;
	// Places the timeline again on each system's drawn geometry.
	timeline: SequencePlacer;
	gaps: GapInfo[];
	parts: Part[];
	factory: ElementFactory;
	config: Config;
	probe: PaintProbe;
	scheduler: IdleScheduler;
	sink: ProgressiveSink;
}

/*
 * A score drawn a system at a time while its Score is in use (see Config.progressive): the
 * first screen's systems before render() resolves, the rest in idle slices. The plan is made
 * as the draw goes (see LazyLayoutPlan), so the undrawn systems are a forecast that moves as
 * it advances: after each step, the undrawn measures take the new forecast (their columns
 * rehomed as it adds or drops systems), each settled system's elements move into place, the
 * timeline takes its exact step geometry (rebuilt over the drawn systems' geometry and the
 * forecast for the rest, so the steps keep their indexes), and the stage shows its ops. A
 * cursor moving onto a system not yet drawn draws through it at once, and a snapshot draws
 * everything left.
 */
export class ProgressiveEngraving implements Drawing {
	private readonly dispatcher = new Dispatcher<DrawingEventMap>();
	readonly events: Events<DrawingEventMap> = this.dispatcher.events;
	// The forecast geometry of each measure not yet drawn, for the timeline until it is.
	private readonly forecastByMeasure = new Map<
		number,
		{ measure: RawMeasure; notes: RawNote[] }
	>();
	// Which forecast the undrawn measures hold (see LayoutForecast.version).
	private forecastVersion: number;
	// Systems settled since the last `draw` event.
	private pending: number[] = [];
	// How many of the engraving's ops the sink has been shown.
	private shownOps = 0;
	private lastStepMs = 0;
	private slice: Resource | null = null;
	private disposed = false;
	private final: DrawResult | null = null;
	private recorded: ScoreRecording | null = null;
	private readonly done: Promise<void>;
	private finish: () => void = () => {};

	constructor(private readonly deps: ProgressiveEngravingDeps) {
		this.holdForecast(deps.planned);
		this.forecastVersion = deps.plan.forecast().version;
		this.done = new Promise<void>((resolve) => {
			this.finish = resolve;
		});
	}

	get elements(): ElementIndex {
		return this.deps.elements;
	}

	get sequence(): Sequence {
		return this.deps.sequence;
	}

	get gaps(): GapInfo[] {
		return this.deps.gaps;
	}

	/* Draw the systems that fill the view: the first always, then each next one until the last
	 * drawn reaches past the bottom of what the view shows. */
	drawFirstScreen(view: ProgressiveView): void {
		let system = this.step();
		while (
			system !== null &&
			!this.deps.draw.done() &&
			this.deps.draw.bottomOf(system) < view.visibleBottom()
		) {
			system = this.step();
		}
		this.flush();
	}

	/* Draw the rest in idle slices, from now on. */
	start(): void {
		if (!this.deps.draw.done() && !this.disposed) {
			this.schedule();
		} else {
			this.complete();
		}
	}

	isComplete(): boolean {
		return this.deps.draw.done();
	}

	whenComplete(): Promise<void> {
		return this.done;
	}

	drawThroughMeasure(m: number): void {
		// A forecast system is never settled, so this reads the plan again after each step until
		// the measure's system is placed and drawn.
		while (
			!this.deps.draw.done() &&
			!this.isSettled(this.deps.plan.systemOfMeasure(m))
		) {
			this.step();
		}
		this.flush();
	}

	drawAll(): void {
		while (!this.deps.draw.done()) {
			this.step();
		}
		this.flush();
	}

	/* The recording a snapshot is taken from: the whole score, drawn now if it is not yet. */
	recording(): ScoreRecording {
		this.drawAll();
		if (!this.recorded) {
			const { config, probe, factory, parts, elements, sequence, gaps } =
				this.deps;
			const result = this.result();
			const model = factory.model(result.geometry, parts);
			this.recorded = new ScoreRecording(
				{
					config: snapshotConfig(config),
					engraving: result.engraving,
					fold: result.fold,
					pages: result.pages,
					elements: model,
					notes: model.notes.flatMap(
						(note) => elements.noteLookup.get(note.key) ?? [],
					),
					sequence,
					gaps,
				},
				probe,
			);
		}
		return this.recorded;
	}

	dispose(): void {
		this.disposed = true;
		this.slice?.dispose();
		this.slice = null;
		this.dispatcher.dispose();
	}

	// Hold `geometry` as the forecast of the measures it covers.
	private holdForecast(
		geometry: Pick<RawGeometry, 'measures' | 'notes'>,
	): void {
		for (const m of geometry.measures) {
			this.forecastByMeasure.set(m.index, { measure: m, notes: [] });
		}
		for (const n of geometry.notes) {
			this.forecastByMeasure.get(n.measureIndex)?.notes.push(n);
		}
	}

	// Take the plan's forecast for the measures still undrawn when it has moved since the last.
	private refreshForecast(): void {
		const { plan, provisional, placer } = this.deps;
		const forecast = plan.forecast();
		if (forecast.version === this.forecastVersion) {
			return;
		}
		this.forecastVersion = forecast.version;
		const geometry = provisional.geometryOf(
			forecast,
			this.forecastByMeasure.keys(),
		);
		this.holdForecast(geometry);
		placer.forecast(geometry, forecast.systemCount);
	}

	private isSettled(system: number): boolean {
		return this.deps.draw.settledSystems().includes(system);
	}

	// Settle the next system and bring the model and the stage up to it.
	private step(): number | null {
		const { draw, placer, sink } = this.deps;
		const started = performance.now();
		const system = draw.drawNext();
		if (system === null) {
			return null;
		}
		const result = this.result();
		const { geometry } = result;
		const measures = geometry.measures.filter((m) => m.systemIndex === system);
		for (const m of measures) {
			this.forecastByMeasure.delete(m.index);
		}
		this.refreshForecast();
		const ofSystem = (m: number) => draw.systemOfMeasure(m) === system;
		placer.place(system, {
			measures,
			notes: geometry.notes.filter((n) => ofSystem(n.measureIndex)),
			chordDiagrams: geometry.chordDiagrams.filter((d) =>
				ofSystem(d.measureIndex),
			),
		});
		this.deps.sequence.adoptGeometry(
			this.deps.timeline.place(this.merged(geometry)),
		);
		sink.extendEngraving(result.engraving, this.shownOps);
		this.shownOps = result.engraving.ops.length;
		this.pending.push(system);
		this.lastStepMs = performance.now() - started;
		return system;
	}

	// What is drawn, cropped to score space; taken once the draw is done.
	private result(): DrawResult {
		if (this.deps.draw.done()) {
			this.final ??= this.deps.draw.result();
			return this.final;
		}
		return this.deps.draw.result();
	}

	// The drawn systems' geometry followed by the forecast for the rest, in system order, which
	// is the order a whole draw collects in: the undrawn measures all follow the drawn.
	private merged(drawn: RawGeometry): RawGeometry {
		const notes = [...drawn.notes];
		const measures = [...drawn.measures];
		const undrawn = [...this.forecastByMeasure.keys()].sort((a, b) => a - b);
		for (const m of undrawn) {
			const forecast = this.forecastByMeasure.get(m);
			if (forecast) {
				notes.push(...forecast.notes);
				measures.push(forecast.measure);
			}
		}
		return { ...drawn, notes, measures };
	}

	private flush(): void {
		if (this.pending.length > 0 && !this.disposed) {
			const systems = this.pending;
			this.pending = [];
			this.dispatcher.dispatch('draw', { systems });
		}
		if (this.deps.draw.done()) {
			this.complete();
		}
	}

	private complete(): void {
		this.finish();
		if (!this.disposed) {
			this.dispatcher.dispatch('complete');
		}
	}

	private schedule(): void {
		this.slice = this.deps.scheduler.request((budget) => this.run(budget));
	}

	// One idle slice: at least one system, then as many more as the budget has room for,
	// judged by the last system's cost.
	private run(budget: IdleSlice): void {
		this.slice = null;
		if (this.disposed) {
			return;
		}
		do {
			this.step();
		} while (
			!this.deps.draw.done() &&
			budget.timeRemaining() > this.lastStepMs
		);
		this.flush();
		if (!this.deps.draw.done()) {
			this.schedule();
		}
	}
}
