import type { Chord, Note } from '@stringsync/mdom';
import type { StaveNote, StaveTie } from 'vexflow/core';
import type { Appearance } from './appearance';
import type { CurveConnectors } from './curve-connectors';
import { DashedTie } from './dashed-tie';
import { type SpanScope, WHOLE_SCORE } from './span-scope';
import { tieSpecs } from './tie-specs';

/* Builds the ties between notes of one pitch. */
export class TieBuilder {
	constructor(
		private readonly connectors: CurveConnectors,
		private readonly appearance: Appearance,
	) {}

	/*
	 * Ties (<tied>) and slurs (<slur>) both connect a start note to its partner;
	 * ties draw as a StaveTie, slurs as a Curve. Drawn after the notes are placed.
	 */
	build(
		chords: Chord[],
		byLead: Map<Note, StaveNote>,
		scope: SpanScope = WHOLE_SCORE,
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

		// The sounding notes on each stave row, by the voice they belong to, read once for the
		// ties that ask whether another voice sits under them.
		let voicesByRow:
			| Map<number, { note: StaveNote; voice: string }[]>
			| undefined;
		const otherVoiceUnder = (
			chord: Chord,
			first: StaveNote,
			last: StaveNote,
		) => {
			const row = first.getStave()?.getY();
			if (row === undefined || last.getStave()?.getY() !== row) {
				return false;
			}
			if (!voicesByRow) {
				const index = new Map<number, { note: StaveNote; voice: string }[]>();
				voicesByRow = index;
				for (const c of chords) {
					const note = byLead.get(c.lead);
					const y = note?.getStave()?.getY();
					if (note && y !== undefined && !note.isRest()) {
						const entry = { note, voice: `${c.lead.staff}/${c.lead.voice}` };
						const notes = index.get(y);
						if (notes) {
							notes.push(entry);
						} else {
							index.set(y, [entry]);
						}
					}
				}
			}
			const voice = `${chord.lead.staff}/${chord.lead.voice}`;
			const left = first.getAbsoluteX();
			const right = last.getAbsoluteX();
			return (voicesByRow.get(row) ?? []).some(
				({ note, voice: other }) =>
					other !== voice &&
					note.getAbsoluteX() > left &&
					note.getAbsoluteX() < right,
			);
		};

		const ties: StaveTie[] = [];
		for (const chord of chords) {
			const heads = chord.notes.length;
			for (const note of chord.notes) {
				const from = placement.get(note);
				if (!from) {
					continue;
				}
				for (const tie of this.connectors.tiesOf(note)) {
					// A tie always joins two notes of the same pitch. When the partner is a
					// chord, mdom can't tell which member it lands on (chord <tied>s usually
					// share number "1"), so partner() pairs every start to the chord's first
					// stop. Re-resolve to the same-pitch member so the tie hits the right
					// notehead.
					const partnerNote =
						(tie.partner &&
							this.samePitchMember(note, chordOf.get(tie.partner))) ??
						tie.partner;
					const to = partnerNote && placement.get(partnerNote);
					if (!to || !scope.owns(from.staveNote, to.staveNote)) {
						continue;
					}
					// A chord member's tie bows away from the chord's center: upper-half
					// notes arc over the top (direction -1), the lower half under the bottom
					// (+1), and an odd chord's middle member bows away from the stem. Otherwise vexflow defaults every tie to the stem direction, so a
					// stem-up chord's top notes would tuck underneath instead of over. Single
					// notes keep that default (a tie opposite the lone stem), unless another
					// voice sounds under the tie: then it bows on the stem side, away from that
					// voice, rather than through it (Gould).
					let direction: number | null = null;
					if (heads > 1) {
						const middle = (heads - 1) / 2;
						if (from.index === middle) {
							// The middle member of an odd chord bows away from the stem.
							direction = from.staveNote.getStemDirection() === 1 ? 1 : -1;
						} else {
							direction = from.index > middle ? -1 : 1;
						}
					} else if (otherVoiceUnder(chord, from.staveNote, to.staveNote)) {
						direction = from.staveNote.getStemDirection() === 1 ? -1 : 1;
					}
					// An explicit orientation overrides both defaults.
					if (tie.orientation === 'over') {
						direction = -1;
					} else if (tie.orientation === 'under') {
						direction = 1;
					}

					const specs = tieSpecs(
						from.staveNote,
						to.staveNote,
						[from.index],
						[to.index],
					);
					for (const spec of specs) {
						const staveTie = new DashedTie(spec, {
							dash: tie.dash,
							tip: this.appearance.lineWidth('tie tip'),
							// A document's own tie line widths keep vexflow's bows, sized as it asks.
							fit:
								this.appearance.lineWidth('tie tip') === null &&
								this.appearance.lineWidth('tie middle') === null,
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
		}
		return ties;
	}

	/*
	 * The member of `chord` whose pitch matches `note` (a tie's two ends are always the
	 * same pitch), or null when there's no chord or no match.
	 */
	private samePitchMember(note: Note, chord: Chord | undefined): Note | null {
		const p = note.pitch;
		if (!chord || !p) {
			return null;
		}
		return (
			chord.notes.find(
				(n) =>
					n.pitch?.step === p.step &&
					n.pitch?.octave === p.octave &&
					n.pitch?.alter === p.alter,
			) ?? null
		);
	}
}
