import { MDOMParser } from '@stringsync/mdom';

/* A one-part score whose measures carry exactly the given <attributes> inner XML
 * (and a note, so the measure is well-formed). '' means the measure declares none. */
export function scoreOf(...attributes: string[]): string {
	const measures = attributes
		.map(
			(a, i) => `<measure number="${i + 1}">
			${a ? `<attributes>${a}</attributes>` : ''}
			<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>
		</measure>`,
		)
		.join('');
	return `<?xml version="1.0"?>
<score-partwise version="4.0">
	<part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
	<part id="P1">${measures}</part>
</score-partwise>`;
}

export const DIVISIONS = '<divisions>1</divisions>';
export const TREBLE = '<clef><sign>G</sign><line>2</line></clef>';
export const COMMON = '<time><beats>4</beats><beat-type>4</beat-type></time>';
export const SHARPS = '<key><fifths>3</fifths></key>';
export const FLATS = '<key><fifths>-2</fifths></key>';

export function measuresOf(xml: string) {
	const [part] = new MDOMParser().parseFromString(xml).score.parts;
	if (!part) {
		throw new Error('sliced score has no parts');
	}
	return part.measures;
}

export function firstMeasureOf(xml: string) {
	const [measure] = measuresOf(xml);
	if (!measure) {
		throw new Error('sliced part has no measures');
	}
	return measure;
}

/* Occurrences of `<tag` in the serialized slice — how a duplicated signature shows up.
 * String-counted rather than walked: what the CLI writes out is the artifact under test. */
export function countOf(xml: string, tag: string): number {
	return xml.split(`<${tag}`).length - 1;
}
