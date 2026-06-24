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
	const parts = mdoc.score.parts;
	if (parts.length === 0) {
		return;
	}

	const width = options?.config?.WIDTH ?? 500;

	// vexflow's type only admits div/canvas; the SVG backend appends a child to any element.
	const renderer = new Renderer(
		element as HTMLDivElement,
		Renderer.Backends.SVG,
	);
	const context = renderer.getContext();

	// ponytail: measures laid left-to-right; every part's staves stack vertically
	// down the page. A part with >1 stave is joined by a brace; multiple parts are
	// grouped by a bracket, and the whole system shares a left/right barline.
	// Inter-part spacing reuses the intra-part spacing for simplicity.
	// Left margin leaves room for the brace/bracket, which draw left of the stave's x.
	const x = 30;
	const y = 40;
	const staveSpacing = 80;
	const measureCount = Math.max(parts[0]?.measures.length ?? 0, 1);
	const totalStaves = parts.reduce(
		(sum, part) => sum + Math.max(part.staveCount, 1),
		0,
	);
	const measureWidth = (width - 2 * x) / measureCount;

	// Height grows with the full stave stack so the bottom stave isn't clipped.
	renderer.resize(width, y + totalStaves * staveSpacing + 40);

	for (let m = 0; m < measureCount; m++) {
		const measureX = x + m * measureWidth;
		let staveRow = 0;
		let systemTop: Stave | undefined;
		let systemBottom: Stave | undefined;

		for (const part of parts) {
			const staveCount = Math.max(part.staveCount, 1);
			const measure = part.measures[m];
			if (!measure) {
				staveRow += staveCount;
				continue;
			}

			let partTop: Stave | undefined;
			let partBottom: Stave | undefined;

			for (let s = 0; s < staveCount; s++) {
				const stave = new Stave(
					measureX,
					y + staveRow * staveSpacing,
					measureWidth,
				);
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
				partTop ??= stave;
				partBottom = stave;
				systemTop ??= stave;
				systemBottom = stave;
				staveRow++;
			}

			// A part's own staves are joined by a brace on the first measure.
			if (partTop && partBottom && staveCount > 1 && m === 0) {
				new StaveConnector(partTop, partBottom)
					.setType('brace')
					.setContext(context)
					.draw();
			}
		}

		// Join the whole system across all parts with a shared left line on the
		// first measure, and a closing line on the right.
		if (systemTop && systemBottom && totalStaves > 1) {
			if (m === 0) {
				new StaveConnector(systemTop, systemBottom)
					.setType('singleLeft')
					.setContext(context)
					.draw();
			}
			if (m === measureCount - 1) {
				new StaveConnector(systemTop, systemBottom)
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
