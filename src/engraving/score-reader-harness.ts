import { DefaultScoreParser } from '../score-parser/default-score-parser';

/* A one-part score of whole 4/4 measures of quarter notes, each measure optionally prefixed
 * with the directions under test. What the tempo, swing and modulation readers are asked
 * about. */
export const FOUR_QUARTERS =
	'<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note>'.repeat(
		4,
	);

export function metronomeDir(bpm: number, sound?: number): string {
	const soundTempo = sound === undefined ? '' : `<sound tempo="${sound}"/>`;
	return `<direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${bpm}</per-minute></metronome></direction-type>${soundTempo}</direction>`;
}

export function measureXml(number: number, prefix: string): string {
	const attrs =
		number === 1
			? '<attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>'
			: '';
	return `<measure number="${number}">${attrs}${prefix}${FOUR_QUARTERS}</measure>`;
}

export async function parseMeasures(...prefixes: string[]) {
	const body = prefixes.map((p, i) => measureXml(i + 1, p)).join('');
	const mdoc = await new DefaultScoreParser().parse(
		`<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>M</part-name></score-part></part-list>
  <part id="P1">${body}</part>
</score-partwise>`,
	);
	return mdoc.score.parts[0]?.measures ?? [];
}

export function nth<T>(arr: readonly T[], i: number): T {
	const value = arr[i];
	if (value === undefined) {
		throw new Error(`no element at index ${i}`);
	}
	return value;
}
