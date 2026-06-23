import { MDOMParser, type MDocument } from '@stringsync/mdom';

export type RenderInput = string | Blob | MDocument;

export async function render(input: RenderInput) {
	if (typeof input === 'string') {
		return renderMusicXML(input);
	}
	if (input instanceof Blob) {
		return renderMXL(input);
	}
	if (isMDocument(input)) {
		return renderMDoc(input);
	}
	throw new TypeError('render: input is not a string, Blob, or MDocument');
}

function renderMDoc(mdoc: MDocument) {
	// TODO: Render something.
}

function renderMusicXML(musicXML: string) {
	const parser = new MDOMParser();
	const mdoc = parser.parseFromString(musicXML);
	return renderMDoc(mdoc);
}

async function renderMXL(mxl: Blob) {
	const parser = new MDOMParser();
	const mdoc = await parser.parseFromBlob(mxl);
	return renderMDoc(mdoc);
}

function isMDocument(input: unknown): input is MDocument {
	return (
		typeof input === 'object' &&
		input !== null &&
		'root' in input &&
		'score' in input
	);
}
