import type { Note } from '@stringsync/mdom';
import { GhostNote } from 'vexflow';
import { EPSILON } from './constants';

// MusicXML <type> -> vexflow duration code; rests append 'r'.
const DURATION_CODES: Record<string, string> = {
	whole: 'w',
	half: 'h',
	quarter: 'q',
	eighth: '8',
	'16th': '16',
	'32nd': '32',
	'64th': '64',
	'128th': '128',
};

// Quarter-note beats -> vexflow duration code, for a note that omits <type> (see code()).
const BEAT_CODES: [beats: number, code: string][] = [
	[4, 'w'],
	[2, 'h'],
	[1, 'q'],
	[0.5, '8'],
	[0.25, '16'],
	[0.125, '32'],
	[0.0625, '64'],
	[0.03125, '128'],
];

// VexFlow duration code -> quarter-note beats, largest first.
const GHOST_DURATIONS: [code: string, beats: number][] = [
	['w', 4],
	['h', 2],
	['q', 1],
	['8', 0.5],
	['16', 0.25],
	['32', 0.125],
	['64', 0.0625],
	['128', 0.03125],
];

/*
 * Translates an mdom note's length to the terms vexflow wants: a duration code for a note that
 * draws, and a run of invisible GhostNotes for time that passes without one. Every tickable
 * builder (notation, tablature, and the voice assembler over both) dates its output through
 * this.
 */
export class DurationTranslator {
	/**
	 * A note's vexflow duration code. <type> is optional in MusicXML — Finale omits it on the
	 * rests it inserts to hold a voice open — so fall back to the note's own <duration>, which
	 * is what makes a typeless bar-filling rest a whole rest instead of a quarter. An
	 * unrecognized type, or a duration matching no plain note value, falls back to 'q'.
	 * ponytail: only exact powers of two match, so a bar-filling rest in 3/4 (3 beats) still
	 * comes out a quarter. Map the measure's own beat count to 'w' if that case turns up.
	 */
	code(lead: Note): string {
		if (lead.type) {
			return DURATION_CODES[lead.type] ?? 'q';
		}
		const beats = lead.beats;
		if (beats === null) {
			return 'q';
		}
		return BEAT_CODES.find(([b]) => Math.abs(b - beats) < EPSILON)?.[1] ?? 'q';
	}

	/**
	 * Fill a timing gap (in quarter-note beats) with invisible GhostNotes: tickables
	 * that reserve the gap's time but draw nothing, so a voice that starts late or has
	 * an internal hole stays aligned with its sibling voices. Greedy largest-first;
	 * MusicXML gaps are dyadic, so this lands exactly down to a 128th (the epsilon
	 * guards float drift). ponytail: a non-dyadic gap (e.g. a lone tuplet-sized hole)
	 * drops a sub-128th remainder — add tuplet ghosts if that ever shows up.
	 */
	ghostNotes(beats: number): GhostNote[] {
		const ghosts: GhostNote[] = [];
		let remaining = beats;
		for (const [duration, value] of GHOST_DURATIONS) {
			while (remaining >= value - EPSILON) {
				ghosts.push(new GhostNote({ duration }));
				remaining -= value;
			}
		}
		return ghosts;
	}
}
