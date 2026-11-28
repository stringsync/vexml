import type { VexmlContext } from '@vexml/renderer';
import type { Box, RawMask } from './engraving-ink';

export interface RawNote {
	part?: number;
	measure: number;
	voice?: string;
	pitch: string | null;
	beats?: number;
	grace?: boolean;
	head: Box;
	ink?: Box;
}

export interface RawStave {
	part?: number;
	measure: number;
	staff?: number;
	lines: number[];
	box: Box;
}

export interface RawMeasure {
	index: number;
	system: number;
	rect: Box;
}

export interface RawEngraving {
	measures?: RawMeasure[];
	staves: RawStave[];
	notes: RawNote[];
	masks: RawMask[];
}

// Serialized into the browser: keep it self-contained.
export function collectEngraving(context: VexmlContext): RawEngraving {
	const elements = context.score.getElements();
	const box = (r: Box) => ({ x: r.x, y: r.y, w: r.w, h: r.h });
	const result: RawEngraving = {
		measures: elements.measureBoxes().map((m) => ({
			index: m.getIndex(),
			system: m.getSystem().getIndex(),
			rect: box(m.rect),
		})),
		staves: [],
		notes: [],
		masks: context.inkMasks({ separateNoteDots: true }).map((m) => ({
			kind: m.kind,
			x: m.x,
			y: m.y,
			width: m.width,
			runs: [...m.runs],
		})),
	};
	elements.parts().forEach((part, partIndex) => {
		for (const measure of part.getMeasures()) {
			for (const stave of measure.getStaves()) {
				result.staves.push({
					part: partIndex,
					measure: measure.getIndex(),
					staff: stave.getNumber(),
					lines: stave.getLineYs(),
					box: box(stave.getRect()),
				});
			}
			for (const voice of measure.getVoices()) {
				for (const note of voice.getNotes()) {
					result.notes.push({
						part: partIndex,
						measure: measure.getIndex(),
						voice: voice.getId(),
						pitch: note.getPitch(),
						beats: note.getDurationBeats(),
						grace: note.isGrace(),
						head: box(note.rect),
						ink: box(note.getInkRect()),
					});
				}
			}
		}
	});
	return result;
}
