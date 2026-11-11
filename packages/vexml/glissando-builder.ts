import type { Chord, Note } from '@stringsync/mdom';
import type { StaveNote } from 'vexflow/core';
import { SINGLE_SLIDE_GAP } from './constants';
import { NotationSlide } from './notation-slide';
import { lineDashOf } from './score-reader';
import { SingleSlide } from './single-slide';
import { type SpanScope, WHOLE_SCORE } from './span-scope';

/* Builds the glissando and slide lines of a notation stave. */
export class GlissandoBuilder {
	/*
	 * Glissandos/slides on a standard-notation stave: a <slide> (or <glissando>)
	 * start..stop pair drawn as a StaveLine: a straight line between the two
	 * noteheads (the tab counterpart is SlideBuilder, a tilted TabSlide). Paired by
	 * `number` and resolved over the whole score so a slide can cross a barline. The
	 * grace lead is in byLead too, so this covers a grace note that slides into the
	 * main note it precedes.
	 */
	build(
		chords: Chord[],
		byLead: Map<Note, StaveNote>,
		scope: SpanScope = WHOLE_SCORE,
	): Array<NotationSlide | SingleSlide> {
		if (
			!chords.some((c) =>
				c.notes.some((n) => n.slides.length > 0 || n.glissandos.length > 0),
			)
		) {
			return [];
		}
		// A slide can sit on any chord member (a two-note chord may slide both notes,
		// each with its own <slide number>), so map every note (not just the lead)
		// to its StaveNote and notehead index. Otherwise only the lead's line draws.
		const placement = new Map<Note, { staveNote: StaveNote; index: number }>();
		for (const chord of chords) {
			const staveNote = byLead.get(chord.lead);
			if (staveNote) {
				chord.notes.forEach((note, index) => {
					placement.set(note, { staveNote, index });
				});
			}
		}

		const lines: Array<NotationSlide | SingleSlide> = [];
		const open = new Map<
			string,
			{
				staveNote: StaveNote;
				index: number;
				note: Note;
				dash: number[] | null;
			}
		>();
		for (const chord of chords) {
			for (const note of chord.notes) {
				const at = placement.get(note);
				if (!at) {
					continue;
				}
				const markers = [
					...note.slides.map((s) => ({
						number: s.number,
						type: s.slideType,
						dash: lineDashOf(s),
					})),
					...note.glissandos.map((g) => ({
						number: g.number,
						type: g.glissandoType,
						dash: lineDashOf(g),
					})),
				];
				for (const marker of markers) {
					if (marker.type === 'start') {
						open.set(marker.number, { ...at, note, dash: marker.dash });
					} else if (marker.type === 'stop') {
						const from = open.get(marker.number);
						open.delete(marker.number);
						if (!from) {
							// Stop with no start: a slide *into* this note (a "/" tick left of
							// the head), the notation counterpart of the tab slide-in.
							if (scope.owns(at.staveNote, at.staveNote)) {
								lines.push(new SingleSlide(at.staveNote, at.index, 'in', 0));
							}
							continue;
						}
						if (!scope.owns(from.staveNote, at.staveNote)) {
							continue;
						}
						lines.push(
							new NotationSlide(from.staveNote, at.staveNote, {
								fromIndex: from.index,
								toIndex: at.index,
								dash: from.dash ?? marker.dash,
							}),
						);
					}
				}
			}
		}
		// A start left unclosed is a slide *out* of that note: a "/" tick right of the head.
		for (const at of open.values()) {
			if (scope.ownsOpen(at.note)) {
				lines.push(
					new SingleSlide(at.staveNote, at.index, 'out', SINGLE_SLIDE_GAP),
				);
			}
		}
		return lines;
	}
}
