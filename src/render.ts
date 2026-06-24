import { MDOMParser, type MDocument } from '@stringsync/mdom';
import { Barline, Renderer, Stave, StaveConnector } from 'vexflow';

// MusicXML <clef> sign + line -> vexflow clef name. Covers the common signs;
// unknown combinations fall back to treble.
function vexflowClef(sign: string, line: number | null): string {
	switch (sign) {
		case 'F':
			return 'bass';
		case 'C':
			return line === 4 ? 'tenor' : 'alto';
		case 'percussion':
			return 'percussion';
		default:
			return 'treble';
	}
}

export type RenderOptions = {
	config?: { WIDTH?: number; [key: string]: unknown };
};

export async function render(
	input: string | Blob,
	element: HTMLElement,
	options?: RenderOptions,
) {
	if (typeof input === 'string') {
		return renderMusicXML(input, element, options);
	}
	if (input instanceof Blob) {
		return renderMXL(input, element, options);
	}
	throw new TypeError('render: input is not a string or Blob');
}

function renderMDoc(
	mdoc: MDocument,
	element: HTMLElement,
	options?: RenderOptions,
) {
	// An empty score has no parts and nothing to draw; leave the element empty.
	const part = mdoc.score.parts[0];
	if (!part) {
		return;
	}

	const width = options?.config?.WIDTH ?? 500;

	// vexflow's type only admits div/canvas; the SVG backend appends a child to any element.
	const renderer = new Renderer(
		element as HTMLDivElement,
		Renderer.Backends.SVG,
	);
	const context = renderer.getContext();

	// ponytail: one part, measures laid left-to-right; a part's staves stack
	// vertically and are joined by a brace. Signatures drawn when the measure
	// declares them. Notes/multi-part layout come with the fixtures that need them.
	// Left margin leaves room for the brace, which draws left of the stave's x.
	const x = 30;
	const y = 40;
	const staveSpacing = 80;
	const staveCount = Math.max(part.staveCount, 1);
	const measureWidth = (width - 2 * x) / Math.max(part.measures.length, 1);

	// Height grows with the stave stack so the bottom stave isn't clipped.
	renderer.resize(width, y + staveCount * staveSpacing + 40);

	for (const measure of part.measures) {
		const measureX = x + measure.index * measureWidth;
		let topStave: Stave | undefined;
		let bottomStave: Stave | undefined;

		for (let s = 0; s < staveCount; s++) {
			const stave = new Stave(measureX, y + s * staveSpacing, measureWidth);
			stave.setBegBarType(Barline.type.SINGLE);
			stave.setEndBarType(Barline.type.SINGLE);

			const clef = measure.getClef();
			if (clef) {
				stave.addClef(vexflowClef(clef.sign, clef.line));
			}
			const key = measure.getKey();
			if (key?.rootNote) {
				stave.addKeySignature(key.rootNote);
			}
			const time = measure.getTime();
			if (time?.beats && time?.beatType) {
				stave.addTimeSignature(`${time.beats}/${time.beatType}`);
			}

			stave.setContext(context).draw();
			topStave ??= stave;
			bottomStave = stave;
		}

		// Join the part's staves into a system: brace + left line on the first
		// measure, and a closing line on the right edge.
		if (topStave && bottomStave && staveCount > 1) {
			if (measure.index === 0) {
				new StaveConnector(topStave, bottomStave)
					.setType('brace')
					.setContext(context)
					.draw();
				new StaveConnector(topStave, bottomStave)
					.setType('singleLeft')
					.setContext(context)
					.draw();
			}
			if (measure.index === part.measures.length - 1) {
				new StaveConnector(topStave, bottomStave)
					.setType('singleRight')
					.setContext(context)
					.draw();
			}
		}
	}
}

function renderMusicXML(
	musicXML: string,
	element: HTMLElement,
	options?: RenderOptions,
) {
	const parser = new MDOMParser();
	const mdoc = parser.parseFromString(musicXML);
	return renderMDoc(mdoc, element, options);
}

async function renderMXL(
	mxl: Blob,
	element: HTMLElement,
	options?: RenderOptions,
) {
	const parser = new MDOMParser();
	const mdoc = await parser.parseFromBlob(mxl);
	return renderMDoc(mdoc, element, options);
}
