import type { Chord, Note } from '@stringsync/mdom';
import type { StaveNote, StaveTie, TieNotes } from 'vexflow/core';
import type { Appearance } from './appearance';
import type { CurveConnectors } from './curve-connectors';
import {
	DashedTie,
	TIE_LV_LENGTH,
	TIE_OFF_DISPLACED,
	TIE_OFF_LINE,
	tieLineBand,
} from './dashed-tie';
import { type SpanScope, WHOLE_SCORE } from './span-scope';
import {
	addedAccidentalHitsSide,
	otherVoiceLedgerBands,
} from './tie-obstacles';
import { tieSpecs } from './tie-specs';

export type TieOptions = {
	scope?: SpanScope;
	wraps?: (from: StaveNote, to: StaveNote) => boolean;
};

/* Builds the ties between notes of one pitch. */
export class TieBuilder {
	constructor(
		private readonly connectors: CurveConnectors,
		private readonly appearance: Appearance,
	) {}

	/*
	 * Ties (<tied>) and slurs (<slur>) both connect a start note to its partner;
	 * ties draw as a StaveTie, slurs as a Curve. Drawn after the notes are placed.
	 * `wraps` tells a later system from another stave of the same one (a downward
	 * cross-staff tie sits lower on the page without wrapping); without it, a
	 * lower stave wraps.
	 */
	build(
		chords: Chord[],
		byLead: Map<Note, StaveNote>,
		{
			scope = WHOLE_SCORE,
			wraps = (from, to) =>
				(to.getStave()?.getY() ?? 0) > (from.getStave()?.getY() ?? 0),
		}: TieOptions = {},
	): StaveTie[] {
		// Nothing to draw, so skip the per-note maps below.
		if (
			!chords.some((c) =>
				c.notes.some((n) => this.connectors.tiesOf(n).length > 0),
			)
		) {
			return [];
		}
		// Each chord member can carry its own tie, so map every note (not just the lead)
		// to its StaveNote and notehead index: the tie must land on the right notehead,
		// and its partner may itself be a chord member.
		const placement = new Map<Note, { staveNote: StaveNote; index: number }>();
		const chordOf = new Map<Note, Chord>();
		for (const chord of chords) {
			const staveNote = byLead.get(chord.lead);
			if (staveNote) {
				chord.notes.forEach((note, index) => {
					placement.set(note, { staveNote, index });
					chordOf.set(note, chord);
				});
			}
		}

		// Sounding notes grouped by stave (for double-stemmed measures) and by stave row (for
		// ties spanning across measures with another voice sounding between their endpoints).
		let voicesByStave: Map<unknown, Set<string>> | undefined;
		let voicesByRow:
			| Map<number, { note: StaveNote; voice: string }[]>
			| undefined;
		const indexVoices = () => {
			if (voicesByStave && voicesByRow) {
				return;
			}
			const byStave = new Map<unknown, Set<string>>();
			const byRow = new Map<number, { note: StaveNote; voice: string }[]>();
			for (const c of chords) {
				const note = byLead.get(c.lead);
				const stave = note?.getStave();
				if (note && stave && !note.isRest()) {
					const voice = `${c.lead.staff}/${c.lead.voice}`;
					let staveVoices = byStave.get(stave);
					if (!staveVoices) {
						staveVoices = new Set();
						byStave.set(stave, staveVoices);
					}
					staveVoices.add(voice);
					const y = stave.getY();
					const entry = { note, voice };
					const notes = byRow.get(y);
					if (notes) {
						notes.push(entry);
					} else {
						byRow.set(y, [entry]);
					}
				}
			}
			voicesByStave = byStave;
			voicesByRow = byRow;
		};
		const inDoubleStemmedVoice = (
			chord: Chord,
			first: StaveNote,
			last: StaveNote | null,
		) => {
			indexVoices();
			const voice = `${chord.lead.staff}/${chord.lead.voice}`;
			for (const stave of last
				? [first.getStave(), last.getStave()]
				: [first.getStave()]) {
				const others = stave ? voicesByStave?.get(stave) : undefined;
				if (
					others &&
					(others.size > 1 || (others.size === 1 && !others.has(voice)))
				) {
					return true;
				}
			}
			if (!last) {
				return false;
			}
			const row = first.getStave()?.getY();
			if (row === undefined || last.getStave()?.getY() !== row) {
				return false;
			}
			const left = first.getAbsoluteX();
			const right = last.getAbsoluteX();
			return (voicesByRow?.get(row) ?? []).some(
				({ note, voice: other }) =>
					other !== voice &&
					note.getAbsoluteX() > left &&
					note.getAbsoluteX() < right,
			);
		};

		type PendingTie = {
			from: { staveNote: StaveNote; index: number };
			to: { staveNote: StaveNote; index: number } | null;
			tie: ReturnType<CurveConnectors['tiesOf']>[number];
			direction: number | null;
			extraOff: number;
			voice: string;
			row: number | undefined;
			left: number;
			right: number | undefined;
			line: number | undefined;
			doubleStemmed: boolean;
		};
		const pendingByChord: { heads: number; pending: PendingTie[] }[] = [];
		for (const chord of chords) {
			const heads = chord.notes.length;
			const voice = `${chord.lead.staff}/${chord.lead.voice}`;
			const pending: PendingTie[] = [];
			for (const note of chord.notes) {
				const from = placement.get(note);
				if (!from) {
					continue;
				}
				for (const tie of this.connectors.tiesOf(note)) {
					let to: { staveNote: StaveNote; index: number } | null = null;
					if (tie.letRing) {
						if (from.staveNote.isRest() || !scope.ownsOpen(note)) {
							continue;
						}
					} else {
						// A tie always joins two notes of the same pitch. When the partner is a
						// chord, mdom can't tell which member it lands on (chord <tied>s usually
						// share number "1"), so partner() pairs every start to the chord's first
						// stop. Re-resolve to the same-pitch member so the tie hits the right
						// notehead.
						const partnerNote =
							(tie.partner &&
								this.samePitchMember(note, chord, chordOf.get(tie.partner))) ??
							tie.partner;
						const resolved = partnerNote
							? placement.get(partnerNote)
							: undefined;
						if (!resolved || !scope.owns(from.staveNote, resolved.staveNote)) {
							continue;
						}
						to = resolved;
					}
					// In double-stemmed writing, every tie (including all ties on a chord)
					// curves towards its own voice's stem: upper voice up (-1), lower voice
					// down (+1) (Behind Bars p. 67). In single-voice writing, a chord
					// member's tie bows away from the chord's center (odd middle away from
					// the stem), and opposite-stem single notes curve away from the first
					// note's stem.
					const doubleStemmed = inDoubleStemmedVoice(
						chord,
						from.staveNote,
						to?.staveNote ?? null,
					);
					let direction: number | null = null;
					if (doubleStemmed) {
						direction = from.staveNote.getStemDirection() === 1 ? -1 : 1;
					} else if (heads > 1) {
						const middle = (heads - 1) / 2;
						if (from.index === middle) {
							// The middle member of an odd chord bows away from the stem.
							direction = from.staveNote.getStemDirection() === 1 ? 1 : -1;
						} else {
							direction = from.index > middle ? -1 : 1;
						}
					} else if (
						to &&
						from.staveNote.getStemDirection() !== 0 &&
						from.staveNote.getStemDirection() !==
							to.staveNote.getStemDirection()
					) {
						// Opposite stems (including a stemless note whose virtual stem disagrees
						// with its partner, or a tie split over a system break): curve away from
						// the first note's stem so both halves keep one direction and clear any
						// start flag (Behind Bars p. 65; Verovio, decisions.md 2026-11-26).
						direction = from.staveNote.getStemDirection();
					}
					// An explicit orientation overrides defaults.
					if (tie.orientation === 'over') {
						direction = -1;
					} else if (tie.orientation === 'under') {
						direction = 1;
					}
					const firstRow = from.staveNote.getStave()?.getY();
					const lastRow = to?.staveNote.getStave()?.getY();
					pending.push({
						from,
						to,
						tie,
						direction,
						extraOff: 0,
						voice,
						row:
							firstRow !== undefined && firstRow === lastRow
								? firstRow
								: undefined,
						left: from.staveNote.getAbsoluteX(),
						right: to?.staveNote.getAbsoluteX(),
						line: from.staveNote.getKeyProps()[from.index]?.line,
						doubleStemmed,
					});
				}
			}

			// A lone second in a single-voice chord curves its two ties away from each other
			// and sets the split for the rest of the chord (Behind Bars p. 66). Multiple
			// seconds (two pairs or a cluster) keep the chord's middle split.
			if (heads > 1 && pending.length > 1 && !pending[0]?.doubleStemmed) {
				const byLine = pending
					.map((item) => ({
						item,
						line: item.line,
					}))
					.filter(
						(entry): entry is { item: PendingTie; line: number } =>
							entry.line !== undefined,
					)
					.sort((a, b) => a.line - b.line);
				const seconds: number[] = [];
				for (let i = 0; i < byLine.length - 1; i++) {
					const low = byLine[i];
					const high = byLine[i + 1];
					if (low && high && Math.abs(high.line - low.line - 0.5) < 0.01) {
						seconds.push(i);
					}
				}
				if (seconds.length === 1) {
					const split = seconds[0] as number;
					byLine.forEach(({ item }, index) => {
						if (!item.tie.orientation) {
							item.direction = index <= split ? 1 : -1;
						}
					});
				}
			}

			if (pending.length > 0) {
				pendingByChord.push({ heads, pending });
			}
		}

		// When two crossed double-stemmed voices are both tied over an overlapping span,
		// their normal stem-side directions point towards each other (the lower-pitched
		// up-stem tie curves up into the higher-pitched down-stem tie). Reverse both so
		// the higher tie curves up and the lower tie curves down (Behind Bars p. 67).
		const doubleTies = pendingByChord
			.flatMap(({ pending }) => pending)
			.filter(
				(item) =>
					item.doubleStemmed &&
					item.to !== null &&
					item.right !== undefined &&
					item.row !== undefined &&
					item.line !== undefined,
			);
		const flipCrossed = new Set<PendingTie>();
		for (let i = 0; i < doubleTies.length; i++) {
			const a = doubleTies[i] as PendingTie;
			for (let j = i + 1; j < doubleTies.length; j++) {
				const b = doubleTies[j] as PendingTie;
				if (
					a.row !== b.row ||
					a.voice === b.voice ||
					a.right === undefined ||
					b.right === undefined ||
					a.left >= b.right ||
					b.left >= a.right
				) {
					continue;
				}
				const aLine = a.line as number;
				const bLine = b.line as number;
				if (
					(a.direction === -1 && b.direction === 1 && aLine < bLine) ||
					(a.direction === 1 && b.direction === -1 && aLine > bLine)
				) {
					flipCrossed.add(a);
					flipCrossed.add(b);
				}
			}
		}
		for (const item of flipCrossed) {
			if (!item.tie.orientation && item.direction !== null) {
				item.direction = -item.direction;
			}
		}

		// Keep a tie clear of another part's ledger lines: if its arc would pass
		// between or intersect another voice's ledger lines, curve it the other way
		// when that side is clear (Behind Bars p. 68).
		for (const { heads, pending } of pendingByChord) {
			for (const item of pending) {
				if (
					!item.doubleStemmed ||
					!item.to ||
					item.right === undefined ||
					item.tie.orientation ||
					item.direction === null ||
					item.row === undefined ||
					item.line === undefined
				) {
					continue;
				}
				const stave = item.from.staveNote.getStave();
				if (!stave) {
					continue;
				}
				const space = stave.getSpacingBetweenLines();
				const ledgerBands = otherVoiceLedgerBands(
					voicesByRow?.get(item.row) ?? [],
					item.voice,
					item.from.staveNote,
					item.to.staveNote,
					space,
				);
				if (ledgerBands.length === 0) {
					continue;
				}
				const lengthInSpaces = Math.max(0, (item.right - item.left) / space);
				const hits = (dir: number) => {
					const [min, max] = tieLineBand(
						item.line as number,
						dir,
						heads > 1,
						lengthInSpaces,
					);
					return ledgerBands.some(([lo, hi]) => min <= hi && max >= lo);
				};
				if (hits(item.direction) && !hits(-item.direction)) {
					item.direction = -item.direction;
				}
			}
		}

		// In single-stemmed moving chords, curve a tie away from an added note carrying an
		// accidental on the tie's side when the opposite side is clear (Behind Bars p. 71).
		for (const { pending } of pendingByChord) {
			for (const item of pending) {
				if (
					item.doubleStemmed ||
					!item.to ||
					item.tie.orientation ||
					item.line === undefined
				) {
					continue;
				}
				const to = item.to;
				const stave = to.staveNote.getStave();
				if (!stave || to.staveNote.getKeys().length < 2) {
					continue;
				}
				const dir =
					item.direction ??
					(item.from.staveNote.getStemDirection() === -1 ? -1 : 1);
				const tiedToIndices = new Set(
					pending
						.filter((p) => p.to?.staveNote === to.staveNote)
						.map((p) => p.to?.index as number),
				);
				const space = stave.getSpacingBetweenLines();
				const lengthInSpaces =
					item.row !== undefined && item.right !== undefined
						? Math.max(0, (item.right - item.left) / space)
						: 4;
				if (
					addedAccidentalHitsSide(
						to.staveNote,
						tiedToIndices,
						item.line,
						dir,
						lengthInSpaces,
					) &&
					!addedAccidentalHitsSide(
						to.staveNote,
						tiedToIndices,
						item.line,
						-dir,
						lengthInSpaces,
					)
				) {
					item.direction = -dir;
				}
			}
		}

		const ties: StaveTie[] = [];
		for (const { heads, pending } of pendingByChord) {
			// Keep same-direction chord ties at least one stave-space apart: in a second or
			// cluster, an inner line note's tie claims the adjacent space note's space, so the
			// outer tie pushes outward by a space.
			if (heads > 1 && pending.length > 1) {
				for (const dir of [-1, 1] as const) {
					const group = pending
						.filter((item) => item.direction === dir)
						.map((item) => ({
							item,
							line: item.line,
						}))
						.filter(
							(entry): entry is { item: PendingTie; line: number } =>
								entry.line !== undefined,
						)
						.sort((a, b) => (dir < 0 ? a.line - b.line : b.line - a.line));
					let prevEnd: number | null = null;
					for (let idx = 0; idx < group.length; idx++) {
						const { item, line } = group[idx] as {
							item: PendingTie;
							line: number;
						};
						// Downward staff position (up to a constant): matches DashedTie.offHead.
						const pos = -line;
						const base = Number.isInteger(line)
							? TIE_OFF_LINE
							: 0.5 - TIE_OFF_LINE;
						let natural = pos + dir * base;
						// A displaced second's tie curving away from its partner (with room on its
						// tie side) and sharing its direction with an outer tie starts clear of its
						// own head so it sits in the space between the heads and pushes the outer
						// tie clear of its own head.
						const disp =
							item.from.staveNote.noteHeads[
								item.from.index
							]?.getDisplacementX() ?? 0;
						if (idx < group.length - 1 && disp !== 0) {
							const props = item.from.staveNote.getKeyProps();
							const awayFromSecond = props.some(
								(p) => Math.abs(p.line - (line + dir * 0.5)) < 0.01,
							);
							const clearOnTieSide = !props.some(
								(p) => Math.abs(p.line - (line - dir * 0.5)) < 0.01,
							);
							if (
								awayFromSecond &&
								clearOnTieSide &&
								base < TIE_OFF_DISPLACED
							) {
								item.extraOff = TIE_OFF_DISPLACED - base;
								natural = pos + dir * TIE_OFF_DISPLACED;
							}
						}
						if (prevEnd !== null && dir * (natural - prevEnd) < 1) {
							const target: number = prevEnd + dir;
							item.extraOff = dir * (target - (pos + dir * base));
							prevEnd = target;
						} else {
							prevEnd = natural;
						}
					}
				}
			}

			for (const { from, to, tie, direction, extraOff } of pending) {
				let specs: TieNotes[];
				if (tie.letRing) {
					const space =
						from.staveNote.getStave()?.getSpacingBetweenLines() ?? 10;
					specs = [
						{
							firstNote: from.staveNote,
							firstIndexes: [from.index],
							lastIndexes: [from.index],
							laissezVibrer: TIE_LV_LENGTH * space,
						},
					];
				} else if (to) {
					specs = tieSpecs(
						from.staveNote,
						to.staveNote,
						[from.index],
						[to.index],
						wraps(from.staveNote, to.staveNote),
					);
				} else {
					continue;
				}
				for (const spec of specs) {
					const staveTie = new DashedTie(spec, {
						dash: tie.dash,
						tip: this.appearance.lineWidth('tie tip'),
						// A document's own tie line widths keep vexflow's bows, sized as it asks.
						fit:
							this.appearance.lineWidth('tie tip') === null &&
							this.appearance.lineWidth('tie middle') === null,
						extraOff,
						bezier: tie.bezier && {
							start: spec.firstNote ? tie.bezier.start : { x: null, y: null },
							end: spec.lastNote ? tie.bezier.end : { x: null, y: null },
						},
					});
					// A solid tie is the lens between two quadratic bows, cp1 and cp2 off
					// the ends, so it is (cp2 - cp1) / 2 deep at its middle.
					const middle = this.appearance.lineWidth('tie middle');
					if (middle !== null) {
						const options = staveTie.renderOptions;
						options.cp1 = options.cp2 - 2 * middle;
						options.cp1Short = options.cp2Short - 2 * middle;
					}
					if (direction !== null) {
						staveTie.setDirection(direction);
					}
					ties.push(staveTie);
				}
			}
		}
		return ties;
	}

	/*
	 * The member of `target` whose pitch matches `note` (a tie's two ends are always the
	 * same pitch), or null when there's no chord or no match. When both chords hold a
	 * unison of the same pitch, pairs the k-th occurrence in `source` to the k-th in `target`.
	 */
	private samePitchMember(
		note: Note,
		source: Chord,
		target: Chord | undefined,
	): Note | null {
		const p = note.pitch;
		if (!target || !p) {
			return null;
		}
		const same = (n: Note) =>
			n.pitch?.step === p.step &&
			n.pitch?.octave === p.octave &&
			n.pitch?.alter === p.alter;
		const rank = source.notes.filter(same).indexOf(note);
		const matches = target.notes.filter(same);
		return matches[rank] ?? matches[0] ?? null;
	}
}
