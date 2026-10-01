import { describe, expect, it } from 'bun:test';
import { PAGE_MARGIN_X } from './constants';
import { DefaultScoreParser } from './default-score-parser';
import { DynamicGlyphs } from './dynamic-glyphs';
import type { MeasureBox } from './layout-planner';
import { ScoreReader } from './score-reader';
import { SignatureFold } from './signature-fold';
import { SignatureTranslator } from './signature-translator';
import { StavePlan } from './stave-plan';

const NOTE =
	'<note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>';

/* A one-part score of whole notes, each measure prefixed with the given <attributes> body (or
 * none), so a test states only the clef and key changes it's about. */
async function scoreOf(...attributes: string[]) {
	const measures = attributes
		.map(
			(body, i) =>
				`<measure number="${i + 1}">${body ? `<attributes>${body}</attributes>` : ''}${NOTE}</measure>`,
		)
		.join('');
	const mdoc = await new DefaultScoreParser().parse(`<?xml version="1.0"?>
<score-partwise version="4.0">
	<part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list>
	<part id="P1">${measures}</part>
</score-partwise>`);
	return mdoc.score;
}

/* One system of 100px measures, starting at the page margin. */
function boxesOf(count: number): MeasureBox[] {
	return Array.from({ length: count }, (_, i) => ({
		x: PAGE_MARGIN_X + i * 100,
		width: 100,
		trailingPad: 0,
		leadingPad: 0,
		systemIndex: 0,
		isSystemStart: i === 0,
		isSystemEnd: i === count - 1,
		edge: null,
	}));
}

async function foldOf(...attributes: string[]) {
	return new SignatureFold(
		new SignatureTranslator(),
		new ScoreReader(new DynamicGlyphs()),
		new StavePlan({ showTabs: true, showNotation: true }),
		await scoreOf(...attributes),
		{
			boxes: boxesOf(attributes.length),
			rowYs: [0],
			totalStaves: 1,
			height: 200,
			notationColor: '#000000',
			textColor: '#000000',
		},
	);
}

const OPENING =
	'<divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef>';

describe('SignatureFold', () => {
	it('starts at the page margin left of the system', async () => {
		const fold = await foldOf(OPENING, '');
		expect(fold.left).toBe(0);
		expect(fold.height).toBe(200);
	});

	it('keeps one strip while nothing changes', async () => {
		const fold = await foldOf(OPENING, '', '', '');
		expect(fold.indexAt(15)).toBe(0);
		expect(fold.indexAt(10_000)).toBe(0);
	});

	it('starts a new strip at each key and clef change', async () => {
		const fold = await foldOf(
			OPENING,
			'',
			'<key><fifths>4</fifths></key>',
			'',
			'<clef><sign>F</sign><line>4</line></clef>',
		);
		// Measures sit at x = 15, 115, 215, 315, 415.
		expect(fold.indexAt(15)).toBe(0);
		expect(fold.indexAt(214)).toBe(0);
		expect(fold.indexAt(215)).toBe(1);
		expect(fold.indexAt(414)).toBe(1);
		expect(fold.indexAt(415)).toBe(2);
	});

	it('is wide enough for its widest key, whichever strip is showing', async () => {
		const plain = await foldOf(OPENING, '');
		const sharps = await foldOf(OPENING, '<key><fifths>6</fifths></key>');
		expect(plain.width).toBeGreaterThan(0);
		expect(sharps.width).toBeGreaterThan(plain.width);
	});

	it('reads left of the first measure as the opening', async () => {
		const fold = await foldOf(OPENING, '<key><fifths>2</fifths></key>');
		expect(fold.indexAt(0)).toBe(0);
	});
});
