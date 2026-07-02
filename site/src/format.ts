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

// ms → m:ss
export function fmtTime(ms: number): string {
	const s = Math.floor(ms / 1000);
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
