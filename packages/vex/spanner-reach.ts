import type { InkMask } from '@vexml/renderer';

/**
 * Compares each source spanner with the ink drawn for it, from pixels alone: it must
 * start at its start note and reach its stop note, or, across a system break, run to
 * the end of its system and pick up again at the start of the next.
 */
export class SpannerReach {
	// Ink already taken by a spanner, so one neighbour's slur cannot vouch for two.
	private readonly claimed = new Set<InkMask>();

	constructor(
		private readonly masks: readonly InkMask[],
		private readonly systems: ReadonlyMap<number, PxBox>,
		private readonly tolerance: ReachTolerance,
	) {}

	check(spans: readonly SourceSpan[]): ReachReport {
		const checked: Record<SpanKind, number> = { slur: 0, tie: 0, hairpin: 0 };
		const findings: ReachFinding[] = [];
		for (const span of spans) {
			checked[span.kind]++;
			findings.push(...this.judge(span));
		}
		return { checked, findings };
	}

	private judge(span: SourceSpan): ReachFinding[] {
		const { kind, start, stop } = span;
		const ink = this.masks.filter((mask) => mask.kind === kind);
		const finding = (problem: ReachProblem, message: string): ReachFinding => ({
			kind,
			problem,
			measure: span.measure,
			message,
		});
		const free = ink.filter((m) => !this.claimed.has(m));
		const onStart = free.filter((m) => this.touches(m, span, start));
		const onStop = free.filter((m) => this.touches(m, span, stop));
		if (start.system === stop.system) {
			if (onStart.length === 0) {
				return [finding('start-missing', 'nothing is drawn at its start note')];
			}
			if (onStop.length === 0) {
				return [finding('stop-missing', 'nothing is drawn at its stop note')];
			}
			const whole = onStart.filter((m) => onStop.includes(m));
			if (whole.length === 0) {
				return [finding('broken', 'its start and stop are drawn apart')];
			}
			this.claim(whole, start, 'start');
			return [];
		}
		const out: ReachFinding[] = [];
		const first = this.systems.get(start.system);
		const last = this.systems.get(stop.system);
		if (onStart.length === 0) {
			out.push(finding('start-missing', 'nothing is drawn at its start note'));
		} else {
			const reaching = first
				? onStart.filter(
						(m) => m.x + m.width >= first.x + first.w - this.tolerance.breakEnd,
					)
				: onStart;
			if (reaching.length === 0) {
				out.push(
					finding('no-break-end', 'it stops short of the end of its system'),
				);
			} else {
				this.claim(reaching, start, 'start');
			}
		}
		if (onStop.length === 0) {
			out.push(finding('stop-missing', 'nothing is drawn at its stop note'));
		} else {
			const resuming = last
				? onStop.filter((m) => m.x <= last.x + this.tolerance.resume)
				: onStop;
			if (resuming.length === 0) {
				out.push(
					finding('no-resume', 'it does not begin at the start of its system'),
				);
			} else {
				this.claim(resuming, stop, 'stop');
			}
		}
		for (let index = start.system + 1; index < stop.system; index++) {
			const system = this.systems.get(index);
			if (
				system &&
				!this.inSystem(ink, system).some((m) => m.width >= system.w * 0.6)
			) {
				out.push(
					finding(
						'break-gap',
						`nothing spans system ${index} between its ends`,
					),
				);
			}
		}
		return out;
	}

	/** Takes the candidate nearest the end's note, so the same ink counts once. */
	private claim(
		candidates: readonly InkMask[],
		end: SpanEnd,
		side: 'start' | 'stop',
	): void {
		const middle = end.box.y + end.box.h / 2;
		const edge = side === 'start' ? end.box.x + end.box.w : end.box.x;
		const gap = (m: InkMask) =>
			Math.hypot(
				(side === 'start' ? m.x : m.x + m.width) - edge,
				m.y + m.height / 2 - middle,
			);
		const nearest = candidates.reduce((a, b) => (gap(b) < gap(a) ? b : a));
		this.claimed.add(nearest);
	}

	private inSystem(ink: readonly InkMask[], system: PxBox): InkMask[] {
		return ink.filter((m) => {
			const middle = m.y + m.height / 2;
			return middle >= system.y - system.h && middle <= system.y + system.h * 2;
		});
	}

	/** Whether the mask overlaps the end's note, give or take the tolerance. */
	private touches(mask: InkMask, span: SourceSpan, end: SpanEnd): boolean {
		const { near } = this.tolerance;
		const box = end.box;
		const horizontal =
			mask.x <= box.x + box.w + near && mask.x + mask.width >= box.x - near;
		if (!horizontal) {
			return false;
		}
		// A hairpin hangs off a direction, not its note, so only its place along the line counts.
		if (span.kind === 'hairpin') {
			return this.sameSystem(mask, end);
		}
		return (
			mask.y <= box.y + box.h + this.tolerance.vertical &&
			mask.y + mask.height >= box.y - this.tolerance.vertical
		);
	}

	private sameSystem(mask: InkMask, end: SpanEnd): boolean {
		const system = this.systems.get(end.system);
		if (!system) {
			return false;
		}
		return this.inSystem([mask], system).length > 0;
	}
}

/** A box in the capture's pixels. */
export interface PxBox {
	x: number;
	y: number;
	w: number;
	h: number;
}

/** One end of a source spanner: the note it sits on and the system that note was drawn in. */
export interface SpanEnd {
	box: PxBox;
	system: number;
}

export type SpanKind = 'slur' | 'tie' | 'hairpin';

/** A slur, tie or hairpin as the MusicXML wrote it. */
export interface SourceSpan {
	kind: SpanKind;
	/** Where it starts, for the report: the start's measure number. */
	measure: string;
	start: SpanEnd;
	stop: SpanEnd;
}

export type ReachProblem =
	| 'start-missing'
	| 'stop-missing'
	| 'broken'
	| 'no-break-end'
	| 'no-resume'
	| 'break-gap';

export interface ReachFinding {
	kind: SpanKind;
	problem: ReachProblem;
	measure: string;
	message: string;
}

export interface ReachReport {
	checked: Record<SpanKind, number>;
	findings: ReachFinding[];
}

/** Pixel tolerances, scaled to the capture's pixel ratio by the caller. */
export interface ReachTolerance {
	/** How far a drawn spanner may sit from a note box and still count as on it. */
	near: number;
	/** How far above or below a note box a slur or tie may sit and still be that note's. */
	vertical: number;
	/** How far short of the system's right edge a spanner that breaks may stop. */
	breakEnd: number;
	/** How far into the system a spanner that resumes may begin. */
	resume: number;
}
