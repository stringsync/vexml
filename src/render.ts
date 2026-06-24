import { MDOMParser, type MDocument } from '@stringsync/mdom';
import { Renderer, Stave } from 'vexflow';

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
	renderer.resize(width, 200);

	// ponytail: one part, measures laid left-to-right; signatures drawn when the
	// measure declares them. Notes/multi-part/multi-staff layout come with the
	// fixtures that need them.
	const x = 10;
	const y = 40;
	const measureWidth = (width - 2 * x) / Math.max(part.measures.length, 1);

	for (const measure of part.measures) {
		const stave = new Stave(x + measure.index * measureWidth, y, measureWidth);

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
