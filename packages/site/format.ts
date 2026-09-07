import { type Element, Note, TabPosition } from '@stringsync/vexml';

// One-line summary of the hovered element for the tooltip.
export function describe(target: Element): string {
	if (target instanceof Note) {
		const beats = target.getDurationBeats();
		const parts = [
			target.getPitch() ?? 'rest',
			`${beats} beat${beats === 1 ? '' : 's'}`,
		];
		if (target.isGrace()) {
			parts.push('grace');
		}
		if (target.isChordMember()) {
			parts.push('chord');
		}
		return `${parts.join(' · ')}\nmeasure ${target.getMeasure().getNumber()}`;
	}
	if (target instanceof TabPosition) {
		return `string ${target.getString()} · fret ${target.getFret()} · ${target.getNote().getPitch() ?? 'rest'}`;
	}
	return '';
}

export function fmtTime(ms: number): string {
	const s = Math.floor(ms / 1000);
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function formatPitch(pitch: {
	step: string;
	alter: number;
	octave: number;
}): string {
	const accidentals: Record<number, string> = {
		[-2]: '♭♭',
		[-1]: '♭',
		0: '',
		1: '♯',
		2: '♯♯',
	};
	const accidental = accidentals[pitch.alter];
	if (accidental !== undefined) {
		return `${pitch.step}${accidental}${pitch.octave}`;
	}
	return `${pitch.step}${pitch.octave} (${pitch.alter > 0 ? '+' : ''}${pitch.alter} st)`;
}
