import { LEAD_BARLINE } from './constants';
import type { LayoutForecast, LayoutPlan } from './layout-plan';
import type { MeasureBox, NoteArea, ScoreLayout } from './layout-planner';

/*
 * What the planner decided about the music and the page before any system is broken (see
 * LayoutPlanner.begin): every width a measure or a system takes, read per measure so the plan
 * can leave the measures it has not reached unmeasured. `areaOf` builds vexflow tickables and
 * is the cost of the plan; `estimateOf` reads the beats alone and stands in for it in the
 * forecast.
 */
export interface LayoutRules {
	readonly layoutMode: 'standard' | 'panoramic';
	readonly overflow: 'wrap' | 'allow' | 'widen';
	// Following the document strictly: its widths hold even where notes would collide.
	readonly strict: boolean;
	readonly maxSystemFill: number;
	readonly minLastSystemFill: number;
	readonly stretchSingleSystem: boolean;
	/* The page width systems break at: the reference width, raised by the planner under
	 * overflow: 'widen'. */
	readonly width: number;
	readonly measureCount: number;
	/* Measures a <multiple-rest> swallows: no box, no width, no break. */
	readonly hidden: ReadonlySet<number>;
	/* The page's side margins. */
	readonly left: number;
	readonly right: number;
	/* The last leading edge gap, which butts against what opens the first system; -1 for none. */
	readonly lastLeading: number;
	readonly labelIndent: number;
	readonly systemOverhang: number;
	/* The layout's fields that are known before any system is placed. */
	readonly base: Omit<ScoreLayout, 'boxes' | 'width' | 'systemStaveOffsets'>;
	/* What the document's <print> asks at measure `m`: a break before it, or that it stays on
	 * its line (both false when system breaks are not honored). */
	printOf(m: number): { forcedBreak: boolean; keepsLine: boolean };
	isMusic(m: number): boolean;
	edgeOf(m: number): MeasureBox['edge'];
	edgeWidthOf(m: number): number;
	/* `systemStart` when the measure opens its system: a width the document fixed loses the
	 * lead drawn there. */
	areaOf(m: number, systemStart?: boolean): NoteArea;
	estimateOf(m: number): NoteArea;
	leadOf(m: number, systemStart: boolean): number;
	padOf(m: number): number;
	leadingPadOf(m: number, systemStart: boolean): number;
	indentOf(systemIndex: number, first: number): number;
	rightIndentOf(first: number): number;
	usableOf(systemIndex: number, first: number): number;
}

/*
 * A layout planned a system at a time, so a progressive render draws its first screen before
 * the rest of the score is measured. Measures are packed greedily into systems in order, each
 * measured (its vexflow tickables built) only when the breaker reaches it. A system is placed,
 * its boxes written into `layout`, once nothing can change it: the pair it makes with the next
 * system is evened once the system after that has begun, and a system is known not to be the
 * last once the next has. Placing every system this way gives exactly the boxes LayoutPlanner
 * planned whole, since the breaker, the evening and the placement are the same code in the
 * same order; the eager plan is this plan completed at once.
 *
 * The measures not yet reached have a forecast: the score past the placed systems packed from
 * estimated areas, scaled by how far the measured measures outgrew their own estimates, so the
 * model and timeline of a progressive render have a system for every measure from the start
 * (see ProvisionalGeometry). The forecast changes as the plan advances.
 */
export class LazyLayoutPlan implements LayoutPlan {
	readonly layout: ScoreLayout;
	// The systems broken so far, complete ones; the open row is the one being filled.
	private readonly systems: number[][] = [];
	private row: number[] = [];
	private rowWidth = 0;
	private rowMinWidth = 0;
	// First measure of every system the document forced, which the evening leaves alone.
	private readonly forcedStarts = new Set<number>();
	// The next measure to pack.
	private next = 0;
	// Pairs (s, s+1) evened for s < evened, and systems placed for s < placed.
	private evened = 0;
	private placed = 0;
	private finished = false;
	private version = 0;
	private forecasted: LayoutForecast | null = null;

	constructor(private readonly rules: LayoutRules) {
		this.layout = {
			...rules.base,
			boxes: [],
			width: rules.width,
			systemStaveOffsets: new Map(),
		};
		this.skipHidden();
		if (this.next >= rules.measureCount) {
			this.finish();
		}
	}

	placedSystems(): number {
		return this.placed;
	}

	isComplete(): boolean {
		return this.finished && this.placed >= this.systems.length;
	}

	placeThrough(system: number): void {
		while (!this.finished && this.placed <= system) {
			this.consume();
		}
	}

	complete(): ScoreLayout {
		while (!this.finished) {
			this.consume();
		}
		return this.layout;
	}

	/* Every system once the plan is complete, each its measures in order. */
	systemMeasures(): readonly (readonly number[])[] {
		if (!this.finished) {
			throw new Error('vexml: the layout is not complete');
		}
		return this.systems;
	}

	/* The system measure `m` is placed on, or forecast to land on; a measure with no box of its
	 * own (inside a multirest run) is on its lead's. */
	systemOfMeasure(m: number): number {
		const { boxes } = this.forecast();
		for (let i = Math.min(m, boxes.length - 1); i >= 0; i--) {
			const box = boxes[i];
			if (box) {
				return box.systemIndex;
			}
		}
		return 0;
	}

	/*
	 * Where every measure is expected to land: the placed systems as they are, then the systems
	 * begun but not yet placed, the open row and the measures not yet reached, packed from
	 * their areas (measured where the breaker has been, estimated past it) without evening, and
	 * placed as though the score ended where the forecast does.
	 */
	forecast(): LayoutForecast {
		if (this.forecasted?.version === this.version) {
			return this.forecasted;
		}
		const { rules } = this;
		const ratio = this.estimateRatio();
		const areaOf = (m: number, systemStart = false): NoteArea => {
			if (m < this.next) {
				return rules.areaOf(m, systemStart);
			}
			const estimate = rules.estimateOf(m);
			return {
				min: estimate.min,
				ideal: Math.max(estimate.min, estimate.ideal * ratio),
			};
		};
		const rows = this.systems.slice(this.placed).map((row) => [...row]);
		let row = [...this.row];
		let rowWidth = this.rowWidth;
		for (let m = this.next; m < rules.measureCount; m++) {
			if (rules.hidden.has(m)) {
				continue;
			}
			let area = areaOf(m, !row.some(rules.isMusic));
			const { forcedBreak, keepsLine } = rules.printOf(m);
			const systemIndex = this.placed + rows.length;
			const usable = rules.usableOf(systemIndex, row[0] ?? m);
			const overruns =
				!keepsLine &&
				rowWidth + LEAD_BARLINE + area.ideal > usable * rules.maxSystemFill;
			if (
				rules.layoutMode === 'standard' &&
				this.canBreak(row, m) &&
				(forcedBreak || overruns)
			) {
				rows.push(row);
				row = [];
				rowWidth = 0;
				area = areaOf(m, true);
			}
			rowWidth += rules.leadOf(m, !row.some(rules.isMusic)) + area.ideal;
			row.push(m);
		}
		if (row.length > 0) {
			rows.push(row);
		}
		const boxes = [...this.layout.boxes];
		const systemCount = this.placed + rows.length;
		rows.forEach((measures, i) => {
			this.placeSystem(boxes, measures, this.placed + i, {
				isLast: i === rows.length - 1,
				lone: systemCount === 1,
				areaOf,
			});
		});
		this.forecasted = { boxes, systemCount, version: this.version };
		return this.forecasted;
	}

	// How far the measured measures' areas outgrew their estimates: vexflow's collision
	// minimum, which the estimate cannot see, decides most of a dense score's widths, and a
	// score's texture holds, so the measured systems calibrate the rest.
	private estimateRatio(): number {
		const { rules } = this;
		let measured = 0;
		let estimated = 0;
		for (let m = 0; m < this.next; m++) {
			if (rules.hidden.has(m) || !rules.isMusic(m)) {
				continue;
			}
			measured += rules.areaOf(m).ideal;
			estimated += rules.estimateOf(m).ideal;
		}
		return estimated > 0 ? measured / estimated : 1;
	}

	// Pack the next measure: wrap to a new system once its note area would overrun the
	// reference width (standard), or never (panoramic: one system holding every measure).
	// Breaks depend only on the music and width, never on the live container.
	private consume(): void {
		const { rules } = this;
		const m = this.next;
		let area = rules.areaOf(m, !this.row.some(rules.isMusic));
		const { forcedBreak, keepsLine } = rules.printOf(m);
		const usable = rules.usableOf(this.systems.length, this.row[0] ?? m);
		// An explicit <print new-system="no"/> is a statement, not silence: the document laid
		// this line out and wants the measure to stay on it. Honor it by squeezing the system
		// rather than wrapping, but only while its notes still fit at their collision-free
		// minimum. Past that the document's line and the reference width genuinely can't both
		// hold, and `overflow` says which one gives: 'wrap' breaks the line here, 'allow' and
		// 'widen' keep it and pay for it in page width. Strict keeps an explicitly unbroken
		// document line even when rounded measure widths overrun it: those exact boxes cannot
		// squeeze to fit.
		const overruns = keepsLine
			? !rules.strict &&
				rules.overflow === 'wrap' &&
				this.rowMinWidth + LEAD_BARLINE + area.min > usable
			: this.rowWidth + LEAD_BARLINE + area.ideal >
				usable * rules.maxSystemFill;
		// ponytail: a lone measure has nowhere to wrap to, so one whose own minimum exceeds the
		// usable width stays put and spills like overflow: 'allow'. That is the documented hole
		// in 'wrap'. Needs a tiny referenceWidth or a huge noteSpacing to reach; splitting a
		// measure across systems is the only real fix and no caller has wanted one.
		if (
			rules.layoutMode === 'standard' &&
			this.canBreak(this.row, m) &&
			(forcedBreak || overruns)
		) {
			if (forcedBreak) {
				this.forcedStarts.add(m);
			}
			this.systems.push(this.row);
			this.row = [];
			this.rowWidth = 0;
			this.rowMinWidth = 0;
			// Opening a system, the measure's fixed width loses the lead.
			area = rules.areaOf(m, true);
		}
		const lead = rules.leadOf(m, !this.row.some(rules.isMusic));
		this.rowWidth += lead + area.ideal;
		this.rowMinWidth += lead + area.min;
		this.row.push(m);
		this.next = m + 1;
		this.skipHidden();
		if (this.next >= rules.measureCount) {
			this.finish();
		}
		this.version++;
		this.settle();
	}

	// Edge gaps stay with the music they frame: a system never ends before a trailing gap, nor
	// holds only leading ones.
	private canBreak(row: number[], m: number): boolean {
		return this.rules.isMusic(m) && row.some(this.rules.isMusic);
	}

	private skipHidden(): void {
		while (
			this.next < this.rules.measureCount &&
			this.rules.hidden.has(this.next)
		) {
			this.next++;
		}
	}

	private finish(): void {
		if (this.row.length > 0) {
			this.systems.push(this.row);
			this.row = [];
		}
		this.finished = true;
	}

	// Even and place what nothing can change any more: a pair of systems is evened once the
	// system after it has begun, and a system is placed once evened with both its neighbours,
	// which also says it is not the last. The end of the score settles the rest.
	private settle(): void {
		const begun = this.systems.length + (this.row.length > 0 ? 1 : 0);
		while (this.evened + 2 < begun) {
			this.evenPair(this.evened);
			this.evened++;
		}
		while (
			this.placed < this.systems.length &&
			(this.placed + 2 < begun || this.finished)
		) {
			this.place(this.placed);
			this.placed++;
		}
	}

	/*
	 * Even out a lopsided pair of systems the width breaker produced. Packing is greedy, so
	 * it fills a system to the brim and drops whatever is left onto the next one: a document
	 * line that misses fitting by a single measure comes out as one system squashed until its
	 * lyrics collide followed by that one measure stretched across the whole page. Hand the
	 * last measure of a system back to the next one for as long as that brings the
	 * worse-fitting of the two closer to the line width.
	 *
	 * Left alone are the boundaries this isn't entitled to move: one the document forced with
	 * <print new-system="yes">, and the score's trailing system, which is meant to be short
	 * (a pair is only evened once a system follows it). A system keeps at least one measure of
	 * music, so a leading gap never sits alone. A pair the breaker already balanced never
	 * improves on the first try, so it doesn't move.
	 */
	private evenPair(s: number): void {
		const { rules } = this;
		const start = this.systems[s];
		const follow = this.systems[s + 1];
		const boundary = follow?.[0];
		if (!start || !follow || boundary === undefined) {
			return;
		}
		if (this.forcedStarts.has(boundary)) {
			return;
		}
		// How far a system is from filling its line, as a ratio >= 1 in either direction, so
		// a squashed system and a stretched one are directly comparable.
		const misfit = (measures: number[], systemIndex: number) => {
			const intrinsic = this.spanOf(measures, 'ideal');
			const usable = rules.usableOf(systemIndex, measures[0] ?? 0);
			return intrinsic > usable ? intrinsic / usable : usable / intrinsic;
		};
		// Whether a system's music no longer fits the line even at its collision-free minimum.
		// Evening out the ragged edges is cosmetic; the minimum is not, so a move that would
		// overrun it is refused however much better the two lines would look.
		const overruns = (measures: number[], systemIndex: number) =>
			this.spanOf(measures, 'min') >
			rules.usableOf(systemIndex, measures[0] ?? 0);
		let head: number[] = start;
		let tail: number[] = follow;
		let worst = Math.max(misfit(head, s), misfit(tail, s + 1));
		while (head.length > 1) {
			const nextHead = head.slice(0, -1);
			if (!nextHead.some(rules.isMusic)) {
				break;
			}
			const nextTail = head.slice(-1).concat(tail);
			// The tail is the one growing, so it's the only one that can newly overrun.
			if (overruns(nextTail, s + 1)) {
				break;
			}
			const candidate = Math.max(misfit(nextHead, s), misfit(nextTail, s + 1));
			if (candidate >= worst) {
				break;
			}
			head = nextHead;
			tail = nextTail;
			worst = candidate;
		}
		this.systems[s] = head;
		this.systems[s + 1] = tail;
	}

	// A system's width at each of the two note-area sizes: `ideal` is what it wants, `min` is
	// the narrowest it can be drawn without its notes colliding. Leads are fixed glyph widths,
	// so they count the same in both.
	private spanOf(measures: number[], key: 'min' | 'ideal'): number {
		const start = this.musicStartOf(measures);
		return measures.reduce(
			(sum, m, i) =>
				sum +
				this.rules.leadOf(m, i === start) +
				this.rules.areaOf(m, i === start)[key],
			0,
		);
	}

	// Index of a system's first and last measure of music, which open and close it.
	private musicStartOf(measures: number[]): number {
		return Math.max(0, measures.findIndex(this.rules.isMusic));
	}

	private musicEndOf(measures: number[]): number {
		const i = measures.findLastIndex(this.rules.isMusic);
		return i === -1 ? measures.length - 1 : i;
	}

	// Place system `s` for good: its boxes into the layout, the page widened by whatever it
	// spilled. Final because the system is evened with both neighbours, or the score ended.
	private place(s: number): void {
		const measures = this.systems[s];
		if (!measures) {
			return;
		}
		const right = this.placeSystem(this.layout.boxes, measures, s, {
			isLast: this.finished && s === this.systems.length - 1,
			lone: this.finished && this.systems.length === 1,
			areaOf: (m, systemStart) => this.rules.areaOf(m, systemStart),
		});
		// The page box always covers what was actually drawn. Short lines sit left with
		// margin and never widen it; panoramic grows it to fit its single long system,
		// and a standard system that bottomed out on its minimum grows it by however far
		// it spilled, so the score scales down into its container rather than clipping.
		this.layout.width = Math.max(this.layout.width, right);
	}

	/*
	 * Lay one system left to right at intrinsic (note-area) widths into `boxes`, returning its
	 * right edge. Full systems are justified to the reference width by stretching note areas
	 * proportionally (the per-tick rate stays uniform within the system); the last/partial
	 * system of a multi-system score stays ragged unless it already fills minLastSystemFill
	 * of the line (then it justifies too), and all of panoramic stays ragged, so a short
	 * trailing line keeps its natural width instead of being needlessly stretched. A score
	 * that fits on a single system is justified, so a lone line fills the page width.
	 */
	private placeSystem(
		boxes: (MeasureBox | undefined)[],
		measures: number[],
		systemIndex: number,
		opts: PlacementOptions,
	): number {
		const { rules } = this;
		const start = this.musicStartOf(measures);
		const end = this.musicEndOf(measures);
		const leads = measures.map((m, i) => rules.leadOf(m, i === start));
		const areas = measures.map((m, i) => opts.areaOf(m, i === start));
		const areaSum = areas.reduce((sum, a) => sum + a.ideal, 0);
		const intrinsic = leads.reduce((sum, l) => sum + l, 0) + areaSum;
		const first = measures[0] ?? 0;
		const cap =
			rules.layoutMode === 'standard'
				? rules.usableOf(systemIndex, first)
				: Infinity;
		// The last system of a multi-system score stays ragged unless its measures already
		// fill most of the line: once their intrinsic width reaches minLastSystemFill
		// of the reference width, justify it so a nearly-full trailing line snaps to the page
		// edge instead of leaving a sliver of margin. Full systems always justify. A lone
		// single system also always justifies, unless stretchSingleSystem is off, which
		// makes it obey the same minLastSystemFill rule as a trailing line, so a short
		// excerpt keeps its natural width instead of being blown up across the page.
		const isLastOfMany = opts.isLast && !opts.lone;
		const isRaggableLone = opts.lone && !rules.stretchSingleSystem;
		const obeysMinFill = isLastOfMany || isRaggableLone;
		const justify =
			rules.layoutMode === 'standard' &&
			(!obeysMinFill || intrinsic >= cap * rules.minLastSystemFill);
		// Justified systems fill the page; ragged systems keep their intrinsic width,
		// and every standard system is capped at the page width, so an over-wide system
		// squeezes toward it. Panoramic (cap = Infinity) is untouched and grows the page.
		const target = Math.min(cap, justify ? cap : intrinsic);
		// The note areas absorb the difference between what the system wants and what it
		// gets. Stretching is uniform: every measure grows by the same factor, keeping the
		// spacing curve's proportions. Squeezing is NOT: each measure gives up the same
		// fraction of its own give (ideal - min), so a measure with none to give (an empty
		// bar already at the floor, a bar of 16ths already at its minimum) holds its width
		// while its roomier neighbors close up. A uniform squeeze would instead let the
		// least compressible measure in the line dictate terms for all of them.
		//
		// Once every measure sits at its minimum the system stops shrinking and spills past
		// the page. That floor is what makes cut-off notes unreachable: every width decision
		// above may push against it, none may pass it, and the page width grows to cover
		// whatever spilled so the score scales down instead of clipping (see place).
		// A width the document fixed holds; the flexible areas share what is left.
		const fixed = areas.reduce((sum, a) => sum + (a.fixed ? a.ideal : 0), 0);
		const flexibleSum = areaSum - fixed;
		const areaTarget = target - leads.reduce((sum, l) => sum + l, 0);
		const give = areaSum - areas.reduce((sum, a) => sum + a.min, 0);
		const squeeze = give > 0 ? Math.min(1, (areaSum - areaTarget) / give) : 1;
		const stretch = flexibleSum > 0 ? (areaTarget - fixed) / flexibleSum : 1;
		const areaWidth = (a: NoteArea) => {
			if (a.fixed) {
				return a.ideal;
			}
			return areaTarget >= areaSum
				? a.ideal * stretch
				: a.ideal - (a.ideal - a.min) * squeeze;
		};
		// Leading boxes start at the margin, ahead of the label indent they stand in for.
		const indent = start === 0 ? rules.indentOf(systemIndex, first) : 0;
		let cx = rules.left + indent;
		measures.forEach((m, i) => {
			const area = areas[i];
			const edge = rules.edgeOf(m);
			const w = edge
				? rules.edgeWidthOf(m)
				: (leads[i] ?? 0) + (area ? areaWidth(area) : 0);
			boxes[m] = {
				x: cx,
				width: w,
				trailingPad: rules.padOf(m),
				leadingPad: edge ? 0 : rules.leadingPadOf(m, i === start),
				systemIndex,
				isSystemStart: i === start && !edge,
				isSystemEnd: i === end && !edge,
				edge,
			};
			cx +=
				w +
				(m === rules.lastLeading
					? Math.max(rules.labelIndent, rules.systemOverhang)
					: 0);
		});
		return cx + rules.right + rules.rightIndentOf(first);
	}
}

/* How a system is placed: whether it is the score's last (left ragged) or its only one
 * (justified), and the areas its measures are placed from (exact or estimated). */
interface PlacementOptions {
	isLast: boolean;
	lone: boolean;
	areaOf: (m: number, systemStart: boolean) => NoteArea;
}
