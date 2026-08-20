import type { Score } from '@stringsync/vexml';

/** Toggle a decoration on every decoratable target and return how many there were.
 * Reaching a target via the pointer is proven once in events.test.ts; here the elements
 * index enumerates them directly. A tab note's visible glyph is its fret (TabPosition),
 * a notation note's is its notehead — decorate whichever this note shows, exactly once
 * (both wrappers stamp the same glyph, so decorating a note AND its fret double-prints). */
export function decorateAllTargets(
	score: Score,
	_container: HTMLDivElement,
	mode: 'color' | 'halo',
) {
	const targets = score
		.getElements()
		.notes()
		.map((note) => note.getTabPosition() ?? note);
	for (const target of targets) {
		if (mode === 'color') {
			target.color.on('#2962ff');
		} else {
			target.halo.on('rgba(41, 98, 255, 0.35)');
		}
	}
	return targets.length;
}
