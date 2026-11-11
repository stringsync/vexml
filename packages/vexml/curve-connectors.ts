import type { Chord, Note } from '@stringsync/mdom';
import {
	curveSegmentOf,
	type DocumentBezier,
	lineDashOf,
	type ScoreReader,
} from './score-reader';

/*
 * The ties, slurs and hammer-on/pull-offs starting on each note, with their partners
 * resolved, read once per render, and how far a note's spanners reach.
 */
export class CurveConnectors {
	private readonly connectors = new Map<
		Note,
		{ slurs: SlurConnector[]; techniques: SlurConnector[] }
	>();
	// A note's starting ties with their partners, read once: like a slur's, a tie's partner
	// re-pairs every tie in the part.
	private readonly ties = new Map<Note, TieEnd[]>();
	private readonly reaches = new Map<Note, number>();
	private documentCurves = false;

	constructor(private readonly reader: ScoreReader) {}

	useDocumentCurves(enabled: boolean): void {
		if (enabled !== this.documentCurves) {
			this.connectors.clear();
			this.ties.clear();
			this.reaches.clear();
		}
		this.documentCurves = enabled;
	}

	/* A note's starting <tied>s with their partners resolved, read once per note. */
	tiesOf(note: Note): TieEnd[] {
		let ties = this.ties.get(note);
		if (!ties) {
			ties = this.reader
				.tiesOf(note)
				.filter(
					(tie) =>
						tie.tieType === 'start' ||
						(this.documentCurves && tie.tieType === 'continue'),
				)
				.map((tie) => {
					const segment = this.documentCurves ? curveSegmentOf(tie) : null;
					return {
						partner: segment?.end.note ?? tie.partner?.note ?? null,
						bezier: segment?.bezier ?? null,
						dash: lineDashOf(tie),
						orientation: tie.getAttribute('orientation'),
					};
				});
			this.ties.set(note, ties);
		}
		return ties;
	}

	/*
	 * A note's <slur>s and hammer-on/pull-offs with their partners resolved, read once per
	 * note. mdom pairs a marker by re-pairing every marker of its kind in the part, so each
	 * `partner` read costs the whole part, and the slur passes run per measure and per pass
	 * over the whole score. A SpannerBuilder lives for one render, over a document that
	 * doesn't change under it. Starts only: every connector is drawn from its start, and a
	 * stop's partner costs as much to find as a start's.
	 */
	connectorsOf(note: Note): {
		slurs: SlurConnector[];
		techniques: SlurConnector[];
	} {
		const cached = this.connectors.get(note);
		if (cached) {
			return cached;
		}
		const resolved = {
			slurs: note.slurs
				.filter(
					(s) =>
						s.slurType === 'start' ||
						(this.documentCurves && s.slurType === 'continue'),
				)
				.map((s) => {
					const found = curveSegmentOf(s);
					const segment = this.documentCurves ? found : null;
					const partner = segment?.end.note ?? s.partner?.note ?? null;
					return {
						slurType: 'start',
						bezier: segment?.bezier ?? null,
						partner: partner && { note: partner },
						placement:
							s.placement ??
							placementOfOrientation(s) ??
							placementOfBezier(found?.bezier ?? null),
						dash: lineDashOf(s),
					};
				}),
			techniques: [
				...note.hammerOns
					.filter((h) => h.hammerOnType === 'start')
					.map((h) => ({
						slurType: h.hammerOnType,
						bezier: null,
						partner: h.partner,
						placement: null,
						dash: null,
					})),
				...note.pullOffs
					.filter((p) => p.pullOffType === 'start')
					.map((p) => ({
						slurType: p.pullOffType,
						bezier: null,
						partner: p.partner,
						placement: null,
						dash: null,
					})),
			],
		};
		this.connectors.set(note, resolved);
		return resolved;
	}

	slurConnectors(note: Note, spans: Array<Set<Note>>): SlurConnector[] {
		const { slurs, techniques } = this.connectorsOf(note);
		const slurTargets = new Set(slurs.map((s) => s.partner?.note ?? null));
		return [
			...slurs,
			...techniques.filter((t) => {
				const partner = t.partner?.note ?? null;
				return (
					!slurTargets.has(partner) &&
					!spans.some(
						(span) => span.has(note) && !!partner && span.has(partner),
					)
				);
			}),
		];
	}

	/*
	 * Every note each resolved <slur> arcs over, one set per slur. Used by slurConnectors to
	 * spot a hammer-on/pull-off the slur already covers. Only leads carry slurs here, and a
	 * span whose partner isn't a lead (or runs backwards) has no notes to cover, so it drops out.
	 */
	slurSpans(chords: Chord[]): Array<Set<Note>> {
		const leads = chords.map((chord) => chord.lead);
		const index = new Map(leads.map((note, i) => [note, i]));
		const spans: Array<Set<Note>> = [];
		leads.forEach((note, i) => {
			for (const slur of this.connectorsOf(note).slurs) {
				const j =
					slur.slurType === 'start' && slur.partner
						? (index.get(slur.partner.note) ?? -1)
						: -1;
				if (j > i) {
					spans.push(new Set(leads.slice(i, j + 1)));
				}
			}
		});
		return spans;
	}

	/*
	 * The furthest measure index a spanner starting on `note` reaches: its own measure, or
	 * the measure of the furthest partner of any tie, slur, hammer-on, pull-off, slide,
	 * glissando or trill line it starts. Read off the document alone, so it is known before
	 * the far end is drawn: a system-at-a-time resolve keeps the note in its window until
	 * that measure is on the page.
	 */
	reach(note: Note): number {
		let reach = this.reaches.get(note);
		if (reach === undefined) {
			const { slurs, techniques } = this.connectorsOf(note);
			const partners = [
				...this.tiesOf(note).map((tie) => tie.partner),
				...[...slurs, ...techniques].map((c) => c.partner?.note ?? null),
				...note.slides
					.filter((s) => s.slideType === 'start')
					.map((s) => s.partner?.note ?? null),
				...note.glissandos
					.filter((g) => g.glissandoType === 'start')
					.map((g) => g.partner?.note ?? null),
				...note.wavyLines
					.filter((w) => w.wavyLineType === 'start')
					.map((w) => w.partner?.note ?? null),
			];
			reach = Math.max(
				note.measure.index,
				...partners.map((partner) => partner?.measure.index ?? -1),
			);
			this.reaches.set(note, reach);
		}
		return reach;
	}
}

/* A tie starting on a note. */
export type TieEnd = {
	bezier: DocumentBezier | null;
	partner: Note | null;
	dash: number[] | null;
	/* <tied orientation>: "over" bows the tie up, "under" down. */
	orientation: string | null;
};

/*
 * The slur-like connectors starting/stopping on a note: its <slur> markers plus any
 * <hammer-on>/<pull-off> in <technical>. In standard notation a hammer-on/pull-off IS
 * just a slur curve (the "H"/"P" label is a tab-only convention), so buildSlurs draws
 * them the same way, including grace-to-main graces. A technique a real <slur> already
 * covers is dropped, so an exporter that emits both doesn't double the arc: either the
 * slur reaches the same partner, or (`spans`) one slur arcs over both of the technique's
 * ends. The second case is a legato run written as one long <slur> plus a hammer-on/pull-off
 * per adjacent pair: the run gets its one arc, not that arc plus a bump over every pair.
 */
export type SlurConnector = {
	bezier: DocumentBezier | null;
	slurType: string;
	partner: { note: Note } | null;
	placement: string | null;
	/* The canvas dash array from <slur line-type>, or null for a solid curve. A
	 * hammer-on/pull-off has no line-type, so it is always solid. */
	dash: number[] | null;
};

/* <slur orientation> as the placement it implies, for a slur that states no placement. */
function placementOfOrientation(slur: {
	getAttribute(name: string): string | null;
}): string | null {
	const orientation = slur.getAttribute('orientation');
	if (orientation === 'over') {
		return 'above';
	}
	return orientation === 'under' ? 'below' : null;
}

/* A slur with no placement or orientation still says its side by where its control
 * points sit: positive bezier-y is above, negative below. Ends that disagree say nothing. */
function placementOfBezier(
	bezier: DocumentBezier | null,
): 'above' | 'below' | null {
	const ys = [bezier?.start.y, bezier?.end.y].filter(
		(y): y is number => typeof y === 'number' && y !== 0,
	);
	const first = ys[0];
	if (
		first === undefined ||
		ys.some((y) => Math.sign(y) !== Math.sign(first))
	) {
		return null;
	}
	return first > 0 ? 'above' : 'below';
}
