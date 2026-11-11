import type { Chord, Note } from '@stringsync/mdom';
import { type TabNote, TabSlide, type TieNotes } from 'vexflow/core';
import { SINGLE_SLIDE_GAP } from './constants';
import { CrispTabSlide } from './crisp-tab-slide';
import { SingleSlide } from './single-slide';
import { type SpanScope, WHOLE_SCORE } from './span-scope';
import { TabSlideLine } from './tab-slide-line';

/* How SlideBuilder draws and which slides it owns. */
export interface SlideOptions {
	/** Print the "sl." label on each paired slide (the line always draws). */
	showText: boolean;
	scope?: SpanScope;
}

/* Builds the slide lines and ticks of a tab stave. */
export class SlideBuilder {
	/*
	 * Slides on a TAB stave: a <slide> (or <glissando>) start..stop pair, drawn as a
	 * TabSlide: a diagonal line between the two frets, angled up or down by the fret
	 * motion. Paired by `number` like every spanner; resolved over the whole score so a
	 * slide can cross a barline. (Unlike hammer/pull there's no "H"/"P" label, so the
	 * slide direction is purely cosmetic: vexflow just tilts the line.)
	 */
	build(
		chords: Chord[],
		byTabLead: Map<Note, TabNote>,
		opts: SlideOptions,
	): Array<TabSlideLine | SingleSlide> {
		const { showText, scope = WHOLE_SCORE } = opts;
		const slides: Array<TabSlideLine | SingleSlide> = [];
		const open = new Map<string, { note: TabNote; fret: number; lead: Note }>();
		for (const chord of chords) {
			const tabNote = byTabLead.get(chord.lead);
			if (!tabNote) {
				continue;
			}
			const markers = [
				...chord.lead.slides.map((s) => ({
					number: s.number,
					type: s.slideType,
				})),
				...chord.lead.glissandos.map((g) => ({
					number: g.number,
					type: g.glissandoType,
				})),
			];
			for (const marker of markers) {
				const number = marker.number;
				const fret = chord.lead.fret ?? 0;
				if (marker.type === 'start') {
					open.set(number, { note: tabNote, fret, lead: chord.lead });
				} else if (marker.type === 'stop') {
					const from = open.get(number);
					open.delete(number);
					if (!from) {
						// A stop with no matching start is a slide *into* this note from an
						// indeterminate origin: a "/8" tick left of the fret, not a line.
						if (scope.owns(tabNote, tabNote)) {
							slides.push(new SingleSlide(tabNote, 0, 'in', SINGLE_SLIDE_GAP));
						}
						continue;
					}
					if (!scope.owns(from.note, tabNote)) {
						continue;
					}
					const notes: TieNotes = {
						firstNote: from.note,
						lastNote: tabNote,
						firstIndexes: from.note.getPositions().map((_, i) => i),
						lastIndexes: tabNote.getPositions().map((_, i) => i),
					};
					const slide = new CrispTabSlide(
						notes,
						fret > from.fret ? TabSlide.SLIDE_UP : TabSlide.SLIDE_DOWN,
					);
					// The line always draws; clear the "sl." label when the text is off.
					if (!showText) {
						slide.setText('');
					}
					slides.push(new TabSlideLine(slide));
				}
			}
		}
		// A start left unclosed is a slide *out* of that note to an indeterminate target: a
		// tick right of the fret. (showText only labels paired "sl." lines, not these ticks.)
		for (const { note, lead } of open.values()) {
			if (scope.ownsOpen(lead)) {
				slides.push(new SingleSlide(note, 0, 'out', SINGLE_SLIDE_GAP));
			}
		}
		return slides;
	}
}
