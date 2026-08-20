import type { Score } from '@stringsync/vexml';

/** Outline every measure box on a content layer (score space) for visual review, and
 * report every notehead/fret that escapes its box. */
export function measureBoxViolations(score: Score): string[] {
	const layer = score.addLayer('content');
	layer.ctx.strokeStyle = '#e53935';
	layer.ctx.lineWidth = 1;

	const bad: string[] = [];
	for (const box of score.getElements().measureBoxes()) {
		const r = box.rect;
		layer.ctx.strokeRect(r.x, r.y, r.w, r.h);
		// Every notehead and its tab fret must sit inside the box.
		for (const measure of box.getMeasures()) {
			for (const voice of measure.getVoices()) {
				for (const note of voice.getNotes()) {
					if (!r.containsRect(note.rect)) {
						bad.push(
							`note ${note.getPitch()} escapes measure ${box.getNumber()}`,
						);
					}
					const tab = note.getTabPosition();
					if (tab && !r.containsRect(tab.rect)) {
						bad.push(
							`fret ${tab.getFret()} escapes measure ${box.getNumber()}`,
						);
					}
				}
			}
		}
	}
	return bad;
}
