import type { VexmlContext } from './vexml-renderer';

/** A box in a capture's PNG pixels, top left at the PNG's top left. */
export interface PixelBox {
	x: number;
	y: number;
	w: number;
	h: number;
}

/**
 * Where a vexml render put its notation, in the PNG's pixels: what a mark drawn on the
 * image resolves to, so a reviewer's box or arrow names measures, staves and notes rather
 * than pixels. Plain data, so it crosses out of the page and into JSON as it is.
 */
export interface ScoreLayout {
	/** Each system (line of music), top to bottom. */
	systems: { index: number; box: PixelBox }[];
	/** Each measure column, across every part of its system. */
	measures: { number: string; index: number; system: number; box: PixelBox }[];
	/** Each stave of each part's measure. */
	staves: {
		part: string;
		measure: string;
		stave: number;
		box: PixelBox;
	}[];
	/** Each note, rest and tab fret, with the ink drawn for it. */
	notes: {
		part: string;
		measure: string;
		stave: number;
		voice: string;
		/** A vexflow key ("E/4"); null for a rest. */
		pitch: string | null;
		beats: number;
		/** Set on a tab fret, which is its own entry beside its note. */
		tab?: { string: number; fret: number };
		box: PixelBox;
	}[];
}

/**
 * Pass to a vexml renderer's `eval` to get, with the image, where each system, measure,
 * stave and note landed in it: `renderers.vexml({ musicXML }).eval(captureLayout)`.
 */
export function captureLayout({ score }: VexmlContext): ScoreLayout {
	// It runs in the page from its source text, so it stays self-contained (see
	// EvalRenderer). Element rects are in score space; one measure box's client rect gives
	// the scale and offset to the page, and #screenshot, the element the capture is of,
	// the origin, scaled by the device pixel ratio as the PNG is.
	const elements = score.getElements();
	const empty: ScoreLayout = {
		systems: [],
		measures: [],
		staves: [],
		notes: [],
	};
	const origin = document.getElementById('screenshot')?.getBoundingClientRect();
	const ratio = window.devicePixelRatio;
	const reference = elements.measureBoxes()[0];
	if (!origin || !reference) {
		return empty;
	}
	const client = reference.getBoundingClientRect();
	const scale = reference.rect.w === 0 ? 1 : client.width / reference.rect.w;
	const dx = client.x - reference.rect.x * scale;
	const dy = client.y - reference.rect.y * scale;
	const box = (r: { x: number; y: number; w: number; h: number }) => ({
		x: Math.round((r.x * scale + dx - origin.x) * ratio),
		y: Math.round((r.y * scale + dy - origin.y) * ratio),
		w: Math.round(r.w * scale * ratio),
		h: Math.round(r.h * scale * ratio),
	});
	const layout: ScoreLayout = {
		systems: elements
			.systems()
			.map((system) => ({ index: system.getIndex(), box: box(system.rect) })),
		measures: elements.measureBoxes().map((measure) => ({
			number: measure.getNumber(),
			index: measure.getIndex(),
			system: measure.getSystem().getIndex(),
			box: box(measure.rect),
		})),
		staves: [],
		notes: [],
	};
	for (const part of elements.parts()) {
		const name = part.getLabel() ?? part.getId();
		for (const measure of part.getMeasures()) {
			const number = measure.getNumber();
			for (const stave of measure.getStaves()) {
				layout.staves.push({
					part: name,
					measure: number,
					stave: stave.getNumber(),
					box: box(stave.getRect()),
				});
			}
			for (const voice of measure.getVoices()) {
				for (const note of voice.getNotes()) {
					const at = {
						part: name,
						measure: number,
						stave: voice.getStave(),
						voice: voice.getId(),
						pitch: note.getPitch(),
						beats: note.getDurationBeats(),
					};
					layout.notes.push({ ...at, box: box(note.getInkRect()) });
					const tab = note.getTabPosition();
					if (tab) {
						layout.notes.push({
							...at,
							tab: { string: tab.getString(), fret: tab.getFret() },
							box: box(tab.rect),
						});
					}
				}
			}
		}
	}
	return layout;
}
