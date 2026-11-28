import type { Chord, Note } from '@stringsync/mdom';
import type { Stave, StaveNote } from 'vexflow/core';
import type { Appearance } from './appearance';
import {
	SLUR_ACCIDENTAL_GAP,
	SLUR_BARLINE_GAP,
	SLUR_GHOST_MAX_BETWEEN,
	SLUR_GHOST_STEEPNESS,
	SLUR_GRACE_CP_Y,
	SLUR_GRACE_Y_SHIFT,
} from './constants';
import type { CurveConnectors } from './curve-connectors';
import { SlurBow } from './slur-bow';
import { type SlurCurve, SlurCurveFactory } from './slur-curve';
import { type SlurCandidate, SlurNesting } from './slur-nesting';
import { SlurObstacles } from './slur-obstacles';
import { SlurShape } from './slur-shape';
import { type SpanScope, WHOLE_SCORE } from './span-scope';

/*
 * Builds slurs, and the hammer-ons and pull-offs a notation stave draws as slurs: which
 * notes each one passes, which side it bows on, and whether it wraps onto the next system
 * or falls back to a ghost end.
 */
export class SlurBuilder {
	private readonly obstacles = new SlurObstacles();
	private readonly curves: SlurCurveFactory;

	constructor(
		private readonly connectors: CurveConnectors,
		appearance: Appearance,
	) {
		this.curves = new SlurCurveFactory(appearance);
	}

	/*
	 * vexflow anchors a Curve only at its two endpoints, so the arc ignores notes in
	 * between and a high (or low) middle note pokes through it. We anchor each
	 * endpoint on the bulge side of its own noteheads, then raise the bezier control
	 * points so the arc clears the most extreme note it spans.
	 */
	build(
		chords: Chord[],
		byLead: ReadonlyMap<Note, StaveNote>,
		scope: SpanScope = WHOLE_SCORE,
	): SlurCurve[] {
		// No chord starts a slur or a hammer-on/pull-off, so skip the per-note maps below.
		if (
			!chords.some((c) =>
				c.notes.some((n) => {
					const { slurs, techniques } = this.connectors.connectorsOf(n);
					return slurs.length > 0 || techniques.length > 0;
				}),
			)
		) {
			return [];
		}
		const slurs: SlurCurve[] = [];
		const candidates: SlurCandidate[] = [];
		const spans = this.connectors.slurSpans(chords);
		const indexOf = new Map(chords.map((chord, i) => [chord.lead, i]));
		// A slur can start or stop on any note of a chord, not just its lead, but only a
		// lead has a StaveNote to anchor to, so each end is read as its chord's lead. A
		// chord slurred note-for-note into the next one then names the same two leads
		// once per note, and draws one bow.
		const leadOf = new Map(
			chords.flatMap((chord) => chord.notes.map((note) => [note, chord.lead])),
		);
		// The chords a tie starts or ends on: a slur ending on one stands off the tie.
		const tiedLeads = new Set<Note>();
		for (const chord of chords) {
			for (const note of chord.notes) {
				for (const tie of this.connectors.tiesOf(note)) {
					tiedLeads.add(chord.lead);
					if (tie.partner) {
						tiedLeads.add(leadOf.get(tie.partner) ?? tie.partner);
					}
				}
			}
		}
		const voiceOf = new Map<StaveNote, string>();
		for (const chord of chords) {
			const note = byLead.get(chord.lead);
			if (note) {
				voiceOf.set(note, `${chord.lead.staff}/${chord.lead.voice}`);
			}
		}
		let notesByRow:
			| Map<number, Array<{ note: StaveNote; index: number }>>
			| undefined;
		const onRow = (stave: Stave) => {
			if (!notesByRow) {
				const index = new Map<
					number,
					Array<{ note: StaveNote; index: number }>
				>();
				notesByRow = index;
				chords.forEach((chord, chordIndex) => {
					const note = byLead.get(chord.lead);
					const row = note?.getStave()?.getY();
					if (note && row !== undefined) {
						const notes = index.get(row);
						if (notes) {
							notes.push({ note, index: chordIndex });
						} else {
							index.set(row, [{ note, index: chordIndex }]);
						}
					}
				});
			}
			return notesByRow.get(stave.getY()) ?? [];
		};
		chords.forEach((chord, i) => {
			const from = byLead.get(chord.lead);
			const isGrace = chord.lead.isGrace;
			const connectors = [
				...this.connectors.slurConnectors(chord.lead, spans),
				...chord.notes
					.filter((note) => note !== chord.lead)
					.flatMap((note) => this.connectors.connectorsOf(note).slurs),
			];
			const reached = new Set<Note>();
			for (const slur of connectors) {
				if (slur.slurType !== 'start' || !slur.partner || !from) {
					continue;
				}
				const partner = leadOf.get(slur.partner.note) ?? slur.partner.note;
				const to = byLead.get(partner);
				if (!to || reached.has(partner) || !scope.owns(from, to)) {
					continue;
				}
				reached.add(partner);
				const j = indexOf.get(partner) ?? -1;
				// `chords` is the whole score in document order, so the slice between two
				// notes also sweeps up every other part, stave and voice that happens to be
				// notated in between: the last note of a bass-stave voice and the first note
				// of the next measure's same voice are separated by the whole treble stave.
				// Clearing those would inflate a two-note bow into a spike reaching the stave
				// above, so only notes sharing a stave with an endpoint count.
				let span =
					j > i
						? chords
								.slice(i, j + 1)
								.map((c) => byLead.get(c.lead))
								.filter((n): n is StaveNote => n !== undefined)
								.filter(
									(n) =>
										n.getStave() === from.getStave() ||
										n.getStave() === to.getStave(),
								)
						: [from, to];

				// A cross-stave slur: the two ends sit on different staves of the same system,
				// because the run is beamed out of one hand's stave up into the other's. A stop
				// that WRAPS onto a later system is on another stave too, but that splits into
				// two half-curves below and each half stays put, hence the Y test, which reads
				// "the stop's stave is HIGHER on the page", the one thing a wrap can't be.
				const fromStave = from.getStave();
				const toStave = to.getStave();
				const crossStave =
					!!fromStave && !!toStave && toStave.getY() < fromStave.getY();
				// A cross-stave slur's two ends sit on different staves, which `chords` lists one
				// after the other, so the slice above can't hold the notes between them (the
				// stop can even come first). Both ends are on one system, so what the bow passes
				// over is every note on either stave between their Xs. So does a slur along one
				// row of staves: the slice misses a second voice written after the stop (a
				// <backup> replays the measure), and its beam is just as much under the bow.
				// That row is every measure's stave at the ends' height, not just the two
				// measures the ends sit in. A grace curve hugs its two notes and keeps the slice.
				const sameRow =
					!!fromStave && !!toStave && toStave.getY() === fromStave.getY();
				if ((crossStave || (sameRow && !isGrace)) && fromStave && toStave) {
					const left = from.getAbsoluteX();
					const right = to.getAbsoluteX();
					const sliced = new Set(span);
					const candidates = crossStave
						? [...onRow(fromStave), ...onRow(toStave)].sort(
								(a, b) => a.index - b.index,
							)
						: onRow(fromStave);
					span = candidates
						.filter(
							({ note: n }) =>
								n.getAbsoluteX() >= left &&
								n.getAbsoluteX() <= right &&
								// Another voice's rest can make way instead, so only the slice's own
								// rests count, as they always have.
								(crossStave || sliced.has(n) || !n.isRest()),
						)
						.map(({ note }) => note);
				}

				// Bulge up for placement="above", down for "below", otherwise opposite the
				// stems (slurs sit on the notehead side). The opening direction forces the
				// arc's sign even when the two endpoints' stems disagree. A grace-to-main
				// slur always hugs under (under the grace, down to the main notehead),
				// ignoring placement: grace slurs read as a consistent underneath bow.
				// A cross-stave slur overrides placement too, bowing away from its run's beam: its
				// ends are a stave apart, so a bow on the beam's side has to duck under (or over)
				// the beam and then dive most of a stave to reach the far end, which reads as a
				// spike rather than a slur. The run beams one way (see buildPartBeams), so its
				// first note's stem says which side the beam is on.
				// Another voice's rest sounding under the slur is as much in its way as that
				// voice's notes: the bow on the notehead side would run through the rest, which
				// the formatter has already parked on that side to clear its own voice.
				const restedOver =
					sameRow &&
					!isGrace &&
					onRow(fromStave).some(
						({ note: n }) =>
							n.isRest() &&
							voiceOf.get(n) !== voiceOf.get(from) &&
							n.getAbsoluteX() >= from.getAbsoluteX() &&
							n.getAbsoluteX() <= to.getAbsoluteX(),
					);
				let bulgeUp: boolean;
				// Only a side the score leaves free is scored: a written placement, a grace and
				// a cross-stave slur keep theirs.
				// Nor does one whose stems disagree or that shares the stave with another voice
				// (a rest included): those have rules of their own (Gould) that the score
				// cannot see.
				const sideIsFree =
					!isGrace &&
					!crossStave &&
					!slur.placement &&
					!restedOver &&
					from.getStemDirection() === to.getStemDirection() &&
					span.every(
						(n) =>
							voiceOf.get(n) === undefined ||
							voiceOf.get(n) === voiceOf.get(from),
					);
				if (isGrace) {
					bulgeUp = this.graceBulgeUp(
						from,
						to,
						span,
						slur.placement,
						crossStave,
						fromStave,
						voiceOf,
						onRow,
					);
				} else if (crossStave) {
					bulgeUp = from.getStemDirection() !== 1;
				} else if (slur.placement === 'above') {
					bulgeUp = true;
				} else if (slur.placement === 'below') {
					bulgeUp = false;
				} else if (
					(from.getStemDirection() === to.getStemDirection() ||
						voiceOf.get(from) !== voiceOf.get(to)) &&
					(restedOver ||
						span.some(
							(n) =>
								!n.isRest() &&
								voiceOf.get(n) !== undefined &&
								voiceOf.get(n) !== voiceOf.get(from),
						))
				) {
					// Another voice sharing the stave under the slur puts it on the stem side
					// (Gould): the notehead side is where the other voice sits, and a bow there
					// either cuts through it or swings out around it.
					bulgeUp = from.getStemDirection() === 1;
				} else {
					// Stems disagreeing across the slur put it above the notes (Gould): a bow
					// from a stem-up note to a stem-down one has no notehead side to follow,
					// and below it has to dive under the whole run to reach the far end.
					bulgeUp =
						from.getStemDirection() !== to.getStemDirection() ||
						from.getStemDirection() !== 1;
				}
				if (sideIsFree) {
					bulgeUp = this.obstacles.cheaperSide(from, to, span, bulgeUp);
				}

				// The last resort for a cross-stave slur that can't read as a bow: it ends on a
				// ghost note, at its start's own height on its start's stave and directly under
				// the stop, and draws as a level slur on that stave, bowing away from the gap.
				// A beamed run, a document's own control points and a slur across a phrase keep
				// their real end, since their shape is what says where they go.
				const voicesBetween = span.filter(
					(n) =>
						n !== from &&
						n !== to &&
						(voiceOf.get(n) === voiceOf.get(from) ||
							voiceOf.get(n) === voiceOf.get(to)),
				).length;
				const mayGhost =
					crossStave &&
					!from.hasBeam() &&
					!to.hasBeam() &&
					!slur.bezier &&
					voicesBetween <= SLUR_GHOST_MAX_BETWEEN;
				const ghost =
					mayGhost &&
					Math.abs(to.getAbsoluteX() - from.getAbsoluteX()) <
						Math.abs(from.getStemExtents().baseY - to.getStemExtents().baseY) *
							SLUR_GHOST_STEEPNESS;
				if (ghost && !(isGrace && slur.placement)) {
					bulgeUp = false;
				}
				const wraps = Boolean(
					toStave && fromStave && toStave.getY() > fromStave.getY(),
				);
				candidates.push({
					from,
					to,
					lead: chord.lead,
					partner,
					slur,
					isGrace,
					span,
					fromStave,
					toStave,
					crossStave,
					bulgeUp,
					mayGhost,
					ghost,
					wraps,
					width: Math.abs(to.getAbsoluteX() - from.getAbsoluteX()),
				});
			}
		});

		// Build shorter slurs first so a longer simultaneous slur on the same side
		// clears any inner slur and lifts past shared endpoints (Behind Bars p. 113).
		candidates.sort((a, b) => {
			if (a.wraps !== b.wraps) {
				return a.wraps ? 1 : -1;
			}
			return a.width - b.width;
		});
		const nesting = new SlurNesting();

		for (const c of candidates) {
			const { from, to, slur, span, fromStave, toStave } = c;
			const bowOpts = {
				from,
				to,
				isGrace: c.isGrace,
				crossStave: c.crossStave,
				mayGhost: c.mayGhost,
				bulgeUp: c.bulgeUp,
				ghost: c.ghost,
				tiedFrom: tiedLeads.has(c.lead),
				tiedTo: tiedLeads.has(c.partner),
			};
			let bow = new SlurBow(this.obstacles, bowOpts);

			// When the stop note wraps onto a later system its stave sits lower on the
			// page (greater Y), so a single Curve would slant across the page gap. Split
			// it into two partial curves like a wrapped tie (see tieSpecs): one bowing off
			// the right edge of the start note's stave ("slur to nothing") and one bowing
			// in from the left edge of the stop note's ("slur from nothing"). vexflow
			// renders a Curve given only a `from` or only a `to` exactly so, anchoring the
			// open end at the stave's tie edge. (Y, not X: a slur whose start note is the
			// first in its system shares the stop note's left X but not its row.)
			if (c.wraps && toStave && fromStave) {
				const rowEndX = Math.max(
					fromStave.getTieEndX(),
					...onRow(fromStave).map(
						({ note }) => note.getStave()?.getTieEndX() ?? 0,
					),
				);
				const rowStartX = Math.min(
					toStave.getTieStartX(),
					...onRow(toStave).map(
						({ note }) => note.getStave()?.getTieStartX() ?? Infinity,
					),
				);
				const fromX = from.getAbsoluteX();
				const toX = to.getAbsoluteX();
				const fromOver = slur.bezier
					? []
					: nesting.overlapping(fromStave.getY(), bow.bulgeUp, fromX, rowEndX);
				const toOver = slur.bezier
					? []
					: nesting.overlapping(toStave.getY(), bow.bulgeUp, rowStartX, toX);
				const fromTuplets = slur.bezier
					? []
					: nesting.shorterTuplets(
							span,
							fromStave.getY(),
							bow.bulgeUp,
							fromX,
							rowEndX,
						);
				const toTuplets = slur.bezier
					? []
					: nesting.shorterTuplets(
							span,
							toStave.getY(),
							bow.bulgeUp,
							rowStartX,
							toX,
						);
				bow = nesting.liftBow(
					bow,
					fromOver,
					toOver,
					fromTuplets,
					toTuplets,
					bowOpts,
				);
				// At a system break, the outgoing half reaches the closing barline's X as a level
				// open arc. Lift it when needed so its tip clears the outer edge of the closing
				// barline instead of touching or crossing it (Behind Bars p. 112 / house style).
				const barlineEdge = bow.bulgeUp
					? fromStave.getYForLine(0)
					: fromStave.getYForLine(fromStave.getNumLines() - 1);
				const barlineMinYShift = slur.bezier
					? 0
					: bow.dir * (barlineEdge - bow.endpointY(from)) + SLUR_BARLINE_GAP;
				const halves = [
					{
						stave: fromStave,
						from,
						to: undefined,
						openX: rowEndX,
						xL: fromX,
						xR: rowEndX,
						y: bow.endpointY(from),
						over: fromOver,
						tuplets: fromTuplets,
						minYShift: barlineMinYShift,
					},
					{
						stave: toStave,
						from: undefined,
						to,
						openX: rowStartX,
						xL: rowStartX,
						xR: toX,
						y: bow.endpointY(to),
						over: toOver,
						tuplets: toTuplets,
						minYShift: 0,
					},
				];
				for (const h of halves) {
					const shape = new SlurShape(
						bow,
						span.filter((n) => n.getStave() === h.stave),
						{ xL: h.xL, xR: h.xR, yL: h.y, yR: h.y },
						[
							...nesting.obstacles(h.over, h.xL, h.xR),
							...nesting.tupletObstacles(
								h.tuplets,
								bow.bulgeUp,
								bow.dir,
								h.xL,
								h.xR,
							),
						],
						h.minYShift,
					);
					nesting.record({
						rowY: h.stave.getY(),
						bulgeUp: bow.bulgeUp,
						from: h.from,
						to: h.to,
						xL: h.xL,
						xR: h.xR,
						yL: h.y,
						yR: h.y,
						shape,
						dir: bow.dir,
					});
					slurs.push(
						this.curves.create(bow, slur, {
							from: h.from,
							to: h.to,
							openX: h.openX,
							shape,
						}),
					);
				}
				continue;
			}

			const canNest =
				!c.isGrace &&
				!c.crossStave &&
				!slur.bezier &&
				fromStave !== undefined &&
				toStave !== undefined &&
				fromStave.getY() === toStave.getY();
			const over = canNest
				? nesting.overlapping(
						fromStave.getY(),
						bow.bulgeUp,
						from.getAbsoluteX(),
						to.getAbsoluteX(),
					)
				: [];
			const innerTuplets = canNest
				? nesting.shorterTuplets(
						span,
						fromStave.getY(),
						bow.bulgeUp,
						from.getAbsoluteX(),
						to.getAbsoluteX(),
					)
				: [];
			if (over.length > 0 || innerTuplets.length > 0) {
				bow = nesting.liftBow(
					bow,
					over,
					over,
					innerTuplets,
					innerTuplets,
					bowOpts,
				);
			}
			const extra = [
				...(over.length > 0
					? nesting.obstacles(over, from.getAbsoluteX(), to.getAbsoluteX())
					: []),
				...(innerTuplets.length > 0
					? nesting.tupletObstacles(
							innerTuplets,
							bow.bulgeUp,
							bow.dir,
							from.getAbsoluteX(),
							to.getAbsoluteX(),
						)
					: []),
			];

			const solve = () =>
				new SlurShape(
					bow,
					bow.ghost
						? span.filter((n) => n.getStave()?.getY() === fromStave?.getY())
						: span,
					{
						xL: from.getAbsoluteX(),
						xR: to.getAbsoluteX(),
						yL: bow.endpointY(from),
						yR: bow.endpointY(to),
					},
					extra,
				);
			let shape = solve();
			if (c.mayGhost && !bow.ghost && !c.isGrace && shape.blocked) {
				bow.takeSide(!bow.bulgeUp);
				shape = solve();
				if (shape.blocked) {
					bow.ghost = true;
					bow.takeSide(false);
					shape = solve();
				}
			}
			// A ghost end is only useful if it clears the intervening ink. When it
			// cannot, omit the slur rather than draw a detached bow through the notes.
			if (bow.ghost && shape.blocked) {
				continue;
			}
			if (canNest) {
				nesting.record({
					rowY: fromStave.getY(),
					bulgeUp: bow.bulgeUp,
					from,
					to,
					xL: from.getAbsoluteX(),
					xR: to.getAbsoluteX(),
					yL: bow.endpointY(from),
					yR: bow.endpointY(to),
					shape,
					dir: bow.dir,
				});
			}
			slurs.push(
				this.curves.create(bow, slur, {
					from,
					to,
					openX: undefined,
					shape,
				}),
			);
		}
		return slurs;
	}

	/*
	 * Behind Bars pp. 129–130: single-voice grace-note slurs curve below by default,
	 * but curve away from the stave in two-voice writing (upper voice above, lower
	 * voice below), and above in single-voice writing when curving below would collide
	 * with an accidental on the measured note or when slurring to a chord's upper note.
	 */
	private graceBulgeUp(
		from: StaveNote,
		to: StaveNote,
		span: StaveNote[],
		placement: string | null | undefined,
		crossStave: boolean,
		fromStave: Stave | undefined,
		voiceOf: ReadonlyMap<StaveNote, string>,
		onRow: (stave: Stave) => Array<{ note: StaveNote; index: number }>,
	): boolean {
		if (crossStave) {
			return placement === 'above';
		}
		const sharedStave =
			fromStave !== undefined &&
			onRow(fromStave).some(
				({ note: n }) =>
					n.getStave() === fromStave &&
					voiceOf.get(n) !== undefined &&
					voiceOf.get(n) !== voiceOf.get(from),
			);
		if (sharedStave) {
			return from.getStemDirection() === 1;
		}
		const accBoxes = this.obstacles.accidentalBoxes(to);
		if (accBoxes.length > 0) {
			const xL = from.getAbsoluteX();
			const xR = to.getAbsoluteX();
			const width = xR - xL;
			const yL = from.getNoteHeadBounds().yBottom;
			const yR = to.getNoteHeadBounds().yBottom;
			const hitsAccidental = accBoxes.some((box) => {
				const cx = box.getX() + box.getW() / 2;
				const s = width > 0 ? Math.max(0, Math.min(1, (cx - xL) / width)) : 0.5;
				const curveY =
					yL +
					SLUR_GRACE_Y_SHIFT +
					s * (yR - yL) +
					3 * s * (1 - s) * SLUR_GRACE_CP_Y;
				return curveY <= box.getY() + box.getH() + SLUR_ACCIDENTAL_GAP;
			});
			if (hitsAccidental) {
				return true;
			}
		}
		if (to.getKeys().length > 1) {
			const resolving =
				span.length >= 2 ? (span[span.length - 2] ?? from) : from;
			const graceBounds = resolving.getNoteHeadBounds();
			const graceMidY = (graceBounds.yTop + graceBounds.yBottom) / 2;
			const toBounds = to.getNoteHeadBounds();
			const chordMidY = (toBounds.yTop + toBounds.yBottom) / 2;
			if (graceMidY <= chordMidY) {
				return true;
			}
		}
		return false;
	}
}
