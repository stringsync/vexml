import { describe, expect, it } from 'bun:test';
import { render } from './progressive-engraving-harness';
import type { Stave } from './stave';

describe('Stave', () => {
	it("names a sharp key's accidentals left to right, between the clef and the notes", async () => {
		const stave = await firstStave('<fifths>2</fifths>');
		const accidentals = stave.getKeyAccidentals();

		expect(accidentals.map((a) => [a.step, a.alter])).toEqual([
			['F', 1],
			['C', 1],
		]);
		expectBetweenClefAndNotes(stave);
		// F5 on the top line, C5 in the third space.
		expectOn(stave, 0, 0);
		expectOn(stave, 1, 1.5);
	});

	it("names a flat key's accidentals left to right, each on its line or space", async () => {
		const stave = await firstStave('<fifths>-3</fifths>');

		expect(stave.getKeyAccidentals().map((a) => [a.step, a.alter])).toEqual([
			['B', -1],
			['E', -1],
			['A', -1],
		]);
		expectBetweenClefAndNotes(stave);
		// B4 on the middle line, E5 in the top space, A4 in the second.
		expectOn(stave, 0, 2);
		expectOn(stave, 1, 0.5);
		expectOn(stave, 2, 2.5);
	});

	it('names the steps on the clef the key is drawn against', async () => {
		const stave = await firstStave(
			'<fifths>1</fifths>',
			'<clef><sign>F</sign><line>4</line></clef>',
		);

		expect(stave.getKeyAccidentals().map((a) => [a.step, a.alter])).toEqual([
			['F', 1],
		]);
		// F3 on the bass staff's fourth line from the bottom: line 1 from the top.
		expectOn(stave, 0, 1);
	});

	it('names a custom key by the steps it writes', async () => {
		const stave = await firstStave(
			'<key-step>B</key-step><key-alter>-1</key-alter><key-step>F</key-step><key-alter>1</key-alter>',
		);

		expect(stave.getKeyAccidentals().map((a) => [a.step, a.alter])).toEqual([
			['B', -1],
			['F', 1],
		]);
	});

	it('names the naturals that cancel the key before it', async () => {
		const stave = await staveOf(
			1,
			'<fifths>2</fifths>',
			'<key><cancel>2</cancel><fifths>0</fifths></key>',
		);

		expect(stave.getKeyAccidentals().map((a) => [a.step, a.alter])).toEqual([
			['F', 0],
			['C', 0],
		]);
	});

	it('returns none for a stave that opens with no key signature', async () => {
		expect(
			(await firstStave('<fifths>0</fifths>')).getKeyAccidentals(),
		).toEqual([]);
		// The second measure keeps the key without drawing it again.
		expect(
			(await staveOf(1, '<fifths>2</fifths>', '')).getKeyAccidentals(),
		).toEqual([]);
	});
});

function expectBetweenClefAndNotes(stave: Stave): void {
	const rects = stave.getKeyAccidentals().map((a) => a.rect);
	const rect = stave.getRect();
	// The clef takes the stave's first stretch; the key starts well right of its left edge.
	expect(rects[0]?.x ?? 0).toBeGreaterThan(rect.x + 20);
	for (const [i, r] of rects.entries()) {
		expect(r.w).toBeGreaterThan(0);
		expect(r.x).toBeGreaterThan(rects[i - 1]?.x ?? rect.x);
		expect(r.x + r.w).toBeLessThanOrEqual(stave.getNoteStartX());
	}
}

/* The accidental's glyph is anchored on `line` (0 the top line, 0.5 the space under it). The
 * headless probe measures every glyph as sitting on its baseline, so its box ends there. */
function expectOn(stave: Stave, index: number, line: number): void {
	const ys = stave.getLineYs();
	const top = ys[0] ?? 0;
	const space = ((ys[4] ?? 0) - top) / 4;
	const rect = stave.getKeyAccidentals()[index]?.rect;
	expect((rect?.y ?? 0) + (rect?.h ?? 0)).toBe(top + line * space);
}

async function firstStave(key: string, clef = ''): Promise<Stave> {
	return staveOf(0, `<key>${key}</key>${clef}`);
}

/* The first stave of measure `index` in a one-part score of whole notes, the first measure's
 * <attributes> holding `first` (a treble clef unless it names one) and each later one's its
 * entry of `rest`, a whole <key> or nothing. */
async function staveOf(
	index: number,
	first: string,
	...rest: string[]
): Promise<Stave> {
	const opening = first.startsWith('<key>') ? first : `<key>${first}</key>`;
	const clef = opening.includes('<clef>')
		? ''
		: '<clef><sign>G</sign><line>2</line></clef>';
	const measures = [
		`<attributes><divisions>1</divisions>${opening}<time><beats>4</beats><beat-type>4</beat-type></time>${clef}</attributes>`,
		...rest.map((r) => (r ? `<attributes>${r}</attributes>` : '')),
	].map(
		(attributes, i) =>
			`<measure number="${i + 1}">${attributes}<note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>whole</type></note></measure>`,
	);
	const xml = `<?xml version="1.0"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>P</part-name></score-part></part-list><part id="P1">${measures.join('')}</part></score-partwise>`;
	const { score } = await render(xml);
	const stave = score.getParts()[0]?.getMeasures()[index]?.getStaves()[0];
	if (!stave) {
		throw new Error(`no stave in measure ${index + 1}`);
	}
	return stave;
}
