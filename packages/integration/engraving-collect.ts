import type { VexmlContext } from '@vexml/renderer';
import type { Box, RawMask } from './engraving-ink';

export interface RawNote {
	measure: number;
	pitch: string | null;
	head: Box;
}

export interface RawStave {
	measure: number;
	lines: number[];
	box: Box;
}

export interface RawEngraving {
	staves: RawStave[];
	notes: RawNote[];
	masks: RawMask[];
}

// Serialized into the browser: keep it self-contained. Reads the first part's first stave.
export function collectEngraving(context: VexmlContext): RawEngraving {
	const box = (r: Box) => ({ x: r.x, y: r.y, w: r.w, h: r.h });
	const empty: Box = { x: 0, y: 0, w: 0, h: 0 };
	const result: RawEngraving = {
		staves: [],
		notes: [],
		masks: context.inkMasks().map((m) => ({
			kind: m.kind,
			x: m.x,
			y: m.y,
			width: m.width,
			runs: [...m.runs],
		})),
	};
	const part = context.score.getElements().parts()[0];
	for (const measure of part?.getMeasures() ?? []) {
		const stave = measure.getStaves()[0];
		result.staves.push({
			measure: measure.getIndex(),
			lines: stave?.getLineYs() ?? [],
			box: stave ? box(stave.getRect()) : empty,
		});
		for (const voice of measure.getVoices()) {
			for (const note of voice.getNotes()) {
				result.notes.push({
					measure: measure.getIndex(),
					pitch: note.getPitch(),
					head: box(note.rect),
				});
			}
		}
	}
	return result;
}
