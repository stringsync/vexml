import { expect, it } from 'bun:test';
import { VisibleThings } from './visible-things';

it('asks separately about notes, accidentals, dots, marks and decoded lyric text', () => {
	const questions = new VisibleThings().questions(
		score(
			'<note><pitch><step>C</step><octave>4</octave></pitch><type>quarter</type><accidental>sharp</accidental><dot/><notations><fermata placement="above"/></notations><lyric><text>love &amp; joy</text></lyric></note>',
		),
	);
	expect(questions).toEqual([
		expect.stringContaining('quarter note at pitch C'),
		expect.stringContaining('sharp accidental'),
		expect.stringContaining('augmentation dot'),
		expect.stringContaining('fermata (above)'),
		expect.stringContaining('"love & joy"'),
	]);
});

it('skips hidden notes and markings without treating hidden lyrics as hidden notes', () => {
	const questions = new VisibleThings().questions(
		score(
			'<note print-object="no"><rest/><type>quarter</type></note><note print-lyric="no"><rest/><type>half</type><notations><fermata print-object="no"/></notations><lyric><text>hidden</text></lyric></note>',
		),
	);
	expect(questions).toEqual([
		expect.stringContaining('half rest on note/rest 2'),
	]);
});

function score(notes: string) {
	return `<score-partwise><part-list><score-part id="P1"><part-name>Voice</part-name></score-part></part-list><part id="P1"><measure number="1">${notes}</measure></part></score-partwise>`;
}

it('includes less common notation and direction types without a named handler', () => {
	const questions = new VisibleThings().questions(
		score(
			'<direction><direction-type><damp-all/></direction-type></direction><note><rest/><notations><arpeggiate/><technical><tap>T</tap></technical></notations></note>',
		),
	);
	expect(questions).toEqual([
		expect.stringContaining('damp all'),
		expect.stringContaining('rest'),
		expect.stringContaining('arpeggiate'),
		expect.stringContaining('tap "T"'),
	]);
});
