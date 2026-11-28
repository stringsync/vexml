import { describe, expect, it } from 'bun:test';
import type { Chord, Note } from '@stringsync/mdom';
import {
	Accidental,
	CanvasContext,
	Stave,
	StaveNote,
	TickContext,
} from 'vexflow/core';
import { Appearance } from './appearance';
import { CurveConnectors } from './curve-connectors';
import type { DashedTie } from './dashed-tie';
import { DefaultScoreParser } from './default-score-parser';
import { DynamicGlyphs } from './dynamic-glyphs';
import { FakePaintProbe } from './fake-paint-probe';
import { PaintContext } from './paint-context';
import { PaintList } from './paint-list';
import { ProbeTextCanvas } from './probe-text-canvas';
import { ScoreReader } from './score-reader';
import { TieBuilder } from './tie-builder';

type Spec = {
	key: string;
	x: number;
	stemDirection: 1 | -1;
	voice: string;
	tie?: 'start' | 'stop';
	orientation?: 'over' | 'under';
	hideLedger?: boolean;
};

describe('TieBuilder ledger-line avoidance', () => {
	const parser = new DefaultScoreParser();

	const buildDirections = async (specs: Spec[]): Promise<number[]> => {
		const notesXml = specs
			.map((spec) => {
				const [step, octave] = spec.key.split('/');
				const attrs = spec.orientation
					? ` orientation="${spec.orientation}"`
					: '';
				const notations = spec.tie
					? `<notations><tied type="${spec.tie}"${attrs}/></notations>`
					: '';
				return `<note><pitch><step>${step?.toUpperCase()}</step><octave>${octave}</octave></pitch><duration>8</duration><voice>${spec.voice}</voice><staff>1</staff><type>half</type>${notations}</note>`;
			})
			.join('');
		const doc = await parser.parse(
			`<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>P1</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>4</divisions><clef><sign>G</sign><line>2</line></clef></attributes>${notesXml}</measure></part></score-partwise>`,
		);
		const measure = doc.score.parts[0]?.measures[0];
		const chords: Chord[] = measure?.chords ?? [];
		const stave = new Stave(0, 0, 300);
		const byLead = new Map<Note, StaveNote>();
		chords.forEach((chord, index) => {
			const spec = specs[index];
			if (!spec) {
				return;
			}
			const staveNote = new StaveNote({
				keys: [spec.key],
				duration: 'h',
				stemDirection: spec.stemDirection,
			}).setStave(stave);
			if (spec.hideLedger) {
				Object.assign(staveNote, { ledgerLinesShown: false });
			}
			new TickContext().addTickable(staveNote).preFormat().setX(spec.x);
			byLead.set(chord.lead, staveNote);
		});
		const reader = new ScoreReader(new DynamicGlyphs());
		const connectors = new CurveConnectors(reader);
		const builder = new TieBuilder(connectors, Appearance.NONE);
		return builder.build(chords, byLead).map((tie) => tie.getDirection());
	};

	it('flips an upper-voice tie down clear of another voice’s above-staff ledger lines', async () => {
		expect(
			await buildDirections([
				{ key: 'a/5', x: 40, stemDirection: 1, voice: '1', tie: 'start' },
				{ key: 'a/5', x: 160, stemDirection: 1, voice: '1', tie: 'stop' },
				{ key: 'c/6', x: 48, stemDirection: -1, voice: '2' },
				{ key: 'e/6', x: 100, stemDirection: -1, voice: '2' },
				{ key: 'c/6', x: 160, stemDirection: -1, voice: '2' },
			]),
		).toEqual([1]);
	});

	it('flips a lower-voice tie up clear of another voice’s below-staff ledger lines', async () => {
		expect(
			await buildDirections([
				{ key: 'a/3', x: 40, stemDirection: 1, voice: '1' },
				{ key: 'f/3', x: 100, stemDirection: 1, voice: '1' },
				{ key: 'a/3', x: 160, stemDirection: 1, voice: '1' },
				{ key: 'c/4', x: 40, stemDirection: -1, voice: '2', tie: 'start' },
				{ key: 'c/4', x: 160, stemDirection: -1, voice: '2', tie: 'stop' },
			]),
		).toEqual([-1]);
	});

	it('keeps the natural direction when the tie already sits clear of the other voice’s ledger lines', async () => {
		expect(
			await buildDirections([
				{ key: 'e/6', x: 40, stemDirection: 1, voice: '1', tie: 'start' },
				{ key: 'e/6', x: 160, stemDirection: 1, voice: '1', tie: 'stop' },
				{ key: 'c/6', x: 100, stemDirection: -1, voice: '2' },
			]),
		).toEqual([-1]);
	});

	it('respects an explicit tie orientation even across ledger lines', async () => {
		expect(
			await buildDirections([
				{
					key: 'a/5',
					x: 40,
					stemDirection: 1,
					voice: '1',
					tie: 'start',
					orientation: 'over',
				},
				{ key: 'a/5', x: 160, stemDirection: 1, voice: '1', tie: 'stop' },
				{ key: 'e/6', x: 100, stemDirection: -1, voice: '2' },
			]),
		).toEqual([-1]);
	});

	it('ignores hidden ledger lines (print-leger="no")', async () => {
		expect(
			await buildDirections([
				{ key: 'a/5', x: 40, stemDirection: 1, voice: '1', tie: 'start' },
				{ key: 'a/5', x: 160, stemDirection: 1, voice: '1', tie: 'stop' },
				{
					key: 'e/6',
					x: 100,
					stemDirection: -1,
					voice: '2',
					hideLedger: true,
				},
			]),
		).toEqual([-1]);
	});
});

describe('TieBuilder unison chord ties', () => {
	const parser = new DefaultScoreParser();

	it('pairs each unison notehead to its matching index and stacks both ties down', async () => {
		const doc = await parser.parse(
			`<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>P1</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>4</divisions><clef><sign>G</sign><line>2</line></clef></attributes>
			<note><pitch><step>F</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice><staff>1</staff><type>half</type><notations><tied type="start"/></notations></note>
			<note><chord/><pitch><step>F</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice><staff>1</staff><type>half</type><notations><tied type="start"/></notations></note>
			<note><chord/><pitch><step>A</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice><staff>1</staff><type>half</type><notations><tied type="start"/></notations></note>
			<note><chord/><pitch><step>C</step><octave>5</octave></pitch><duration>8</duration><voice>1</voice><staff>1</staff><type>half</type><notations><tied type="start"/></notations></note>
			<note><pitch><step>F</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice><staff>1</staff><type>half</type><notations><tied type="stop"/></notations></note>
			<note><chord/><pitch><step>F</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice><staff>1</staff><type>half</type><notations><tied type="stop"/></notations></note>
			<note><chord/><pitch><step>A</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice><staff>1</staff><type>half</type><notations><tied type="stop"/></notations></note>
			<note><chord/><pitch><step>C</step><octave>5</octave></pitch><duration>8</duration><voice>1</voice><staff>1</staff><type>half</type><notations><tied type="stop"/></notations></note>
			</measure></part></score-partwise>`,
		);
		const chords: Chord[] = doc.score.parts[0]?.measures[0]?.chords ?? [];
		const stave = new Stave(0, 0, 300);
		const byLead = new Map<Note, StaveNote>();
		chords.forEach((chord, index) => {
			const staveNote = new StaveNote({
				keys: ['f/4', 'f/4', 'a/4', 'c/5'],
				duration: 'h',
				stemDirection: 1,
			}).setStave(stave);
			new TickContext()
				.addTickable(staveNote)
				.preFormat()
				.setX(index === 0 ? 40 : 160);
			byLead.set(chord.lead, staveNote);
		});
		const reader = new ScoreReader(new DynamicGlyphs());
		const connectors = new CurveConnectors(reader);
		const builder = new TieBuilder(connectors, Appearance.NONE);
		const built = builder.build(chords, byLead);
		expect(built.map((t) => t.getDirection())).toEqual([1, 1, -1, -1]);
		expect(built.map((t) => t.getNotes().firstIndexes)).toEqual([
			[0],
			[1],
			[2],
			[3],
		]);
		expect(built.map((t) => t.getNotes().lastIndexes)).toEqual([
			[0],
			[1],
			[2],
			[3],
		]);
	});
});

describe('TieBuilder moving-chord accidental avoidance', () => {
	const parser = new DefaultScoreParser();

	type ChordNoteSpec = {
		key: string;
		tie?: 'start' | 'stop';
		orientation?: 'over' | 'under';
		accidental?: '#' | 'b' | 'n';
	};

	const buildMovingDirections = async (
		fromChord: { notes: ChordNoteSpec[]; stemDirection: 1 | -1 },
		toChord: { notes: ChordNoteSpec[]; stemDirection: 1 | -1 },
	): Promise<number[]> => {
		const noteXml = (notes: ChordNoteSpec[]) =>
			notes
				.map((n, i) => {
					const [step, octave] = n.key.split('/');
					const attrs = n.orientation ? ` orientation="${n.orientation}"` : '';
					const notations = n.tie
						? `<notations><tied type="${n.tie}"${attrs}/></notations>`
						: '';
					let alter = '';
					if (n.accidental === '#') {
						alter = '<alter>1</alter>';
					} else if (n.accidental === 'b') {
						alter = '<alter>-1</alter>';
					}
					return `<note>${i > 0 ? '<chord/>' : ''}<pitch><step>${step?.toUpperCase()}</step>${alter}<octave>${octave}</octave></pitch><duration>8</duration><voice>1</voice><staff>1</staff><type>half</type>${notations}</note>`;
				})
				.join('');
		const doc = await parser.parse(
			`<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>P1</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>4</divisions><clef><sign>G</sign><line>2</line></clef></attributes>${noteXml(fromChord.notes)}${noteXml(toChord.notes)}</measure></part></score-partwise>`,
		);
		const chords: Chord[] = doc.score.parts[0]?.measures[0]?.chords ?? [];
		const stave = new Stave(0, 0, 300);
		const byLead = new Map<Note, StaveNote>();
		const specs = [fromChord, toChord];
		chords.forEach((chord, idx) => {
			const spec = specs[idx];
			if (!spec) {
				return;
			}
			const staveNote = new StaveNote({
				keys: spec.notes.map((n) => n.key),
				duration: 'h',
				stemDirection: spec.stemDirection,
			}).setStave(stave);
			spec.notes.forEach((n, i) => {
				if (n.accidental) {
					staveNote.addModifier(new Accidental(n.accidental), i);
				}
			});
			new TickContext()
				.addTickable(staveNote)
				.preFormat()
				.setX(idx === 0 ? 40 : 120);
			byLead.set(chord.lead, staveNote);
		});
		const reader = new ScoreReader(new DynamicGlyphs());
		const connectors = new CurveConnectors(reader);
		const builder = new TieBuilder(connectors, Appearance.NONE);
		return builder.build(chords, byLead).map((tie) => tie.getDirection());
	};

	it('curves a tie up away from an added accidental below', async () => {
		expect(
			await buildMovingDirections(
				{
					stemDirection: -1,
					notes: [{ key: 'a/4', tie: 'start' }, { key: 'c/5' }],
				},
				{
					stemDirection: 1,
					notes: [
						{ key: 'f/4', accidental: '#' },
						{ key: 'a/4', tie: 'stop' },
					],
				},
			),
		).toEqual([-1]);
	});

	it('curves a tie down away from an added accidental above', async () => {
		expect(
			await buildMovingDirections(
				{
					stemDirection: 1,
					notes: [{ key: 'e/4' }, { key: 'g/4', tie: 'start' }],
				},
				{
					stemDirection: 1,
					notes: [
						{ key: 'g/4', tie: 'stop' },
						{ key: 'a/4', accidental: '#' },
					],
				},
			),
		).toEqual([1]);
	});

	it('keeps conventional direction when added accidentals sit on both sides', async () => {
		expect(
			await buildMovingDirections(
				{
					stemDirection: -1,
					notes: [{ key: 'a/4', tie: 'start' }, { key: 'c/5' }],
				},
				{
					stemDirection: 1,
					notes: [
						{ key: 'f/4', accidental: '#' },
						{ key: 'a/4', tie: 'stop' },
						{ key: 'c/5', accidental: '#' },
					],
				},
			),
		).toEqual([1]);
	});

	it('respects an explicit tie orientation even next to an added accidental', async () => {
		expect(
			await buildMovingDirections(
				{
					stemDirection: -1,
					notes: [
						{ key: 'a/4', tie: 'start', orientation: 'under' },
						{ key: 'c/5' },
					],
				},
				{
					stemDirection: 1,
					notes: [
						{ key: 'f/4', accidental: '#' },
						{ key: 'a/4', tie: 'stop' },
					],
				},
			),
		).toEqual([1]);
	});

	it('keeps conventional direction when the added accidental is far away', async () => {
		expect(
			await buildMovingDirections(
				{
					stemDirection: -1,
					notes: [{ key: 'f/5', tie: 'start' }, { key: 'a/5' }],
				},
				{
					stemDirection: -1,
					notes: [
						{ key: 'f/4', accidental: '#' },
						{ key: 'f/5', tie: 'stop' },
					],
				},
			),
		).toEqual([1]);
	});
});

describe('TieBuilder laissez vibrer (open) ties', () => {
	const parser = new DefaultScoreParser();

	const buildLv = async (
		notesXml: string,
		staveNotes: { keys: string[]; stemDirection: 1 | -1 }[],
		ownsOpen = true,
	) => {
		const doc = await parser.parse(
			`<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>P1</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>4</divisions><clef><sign>G</sign><line>2</line></clef></attributes>${notesXml}</measure></part></score-partwise>`,
		);
		const chords: Chord[] = doc.score.parts[0]?.measures[0]?.chords ?? [];
		const stave = new Stave(0, 0, 300);
		const byLead = new Map<Note, StaveNote>();
		chords.forEach((chord, idx) => {
			const spec = staveNotes[idx];
			if (!spec) {
				return;
			}
			const staveNote = new StaveNote({
				keys: spec.keys,
				duration: 'h',
				stemDirection: spec.stemDirection,
			}).setStave(stave);
			new TickContext()
				.addTickable(staveNote)
				.preFormat()
				.setX(40 + idx * 80);
			byLead.set(chord.lead, staveNote);
		});
		const reader = new ScoreReader(new DynamicGlyphs());
		const connectors = new CurveConnectors(reader);
		const builder = new TieBuilder(connectors, Appearance.NONE);
		return builder.build(chords, byLead, {
			scope: {
				owns: () => true,
				ownsOpen: () => ownsOpen,
			},
		});
	};

	it('builds a short open tie curving down on a stem-up note', async () => {
		const built = await buildLv(
			`<note><pitch><step>A</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice><staff>1</staff><type>half</type><notations><tied type="let-ring"/></notations></note>`,
			[{ keys: ['a/4'], stemDirection: 1 }],
		);
		expect(built).toHaveLength(1);
		expect(built[0]?.getDirection()).toBe(1);
		expect(built[0]?.getNotes().lastNote).toBeUndefined();
		expect(built[0]?.getNotes().laissezVibrer).toBeGreaterThan(0);
	});

	it('curves up on a stem-down note and respects explicit orientation', async () => {
		const built = await buildLv(
			`<note><pitch><step>C</step><octave>5</octave></pitch><duration>8</duration><voice>1</voice><staff>1</staff><type>half</type><notations><tied type="let-ring"/></notations></note>
			<note><pitch><step>A</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice><staff>1</staff><type>half</type><notations><tied type="let-ring" orientation="over"/></notations></note>`,
			[
				{ keys: ['c/5'], stemDirection: -1 },
				{ keys: ['a/4'], stemDirection: 1 },
			],
		);
		expect(built.map((t) => t.getDirection())).toEqual([-1, -1]);
	});

	it('builds open ties on every notehead of a laissez vibrer chord', async () => {
		const built = await buildLv(
			`<note><pitch><step>C</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice><staff>1</staff><type>half</type><notations><tied type="let-ring"/></notations></note>
			<note><chord/><pitch><step>G</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice><staff>1</staff><type>half</type><notations><tied type="let-ring"/></notations></note>`,
			[{ keys: ['c/4', 'g/4'], stemDirection: 1 }],
		);
		expect(built).toHaveLength(2);
		expect(built.map((t) => t.getDirection())).toEqual([1, -1]);
		expect(built.map((t) => t.getNotes().firstIndexes)).toEqual([[0], [1]]);
	});

	it('skips open ties when the span scope does not own them', async () => {
		const built = await buildLv(
			`<note><pitch><step>A</step><octave>4</octave></pitch><duration>8</duration><voice>1</voice><staff>1</staff><type>half</type><notations><tied type="let-ring"/></notations></note>`,
			[{ keys: ['a/4'], stemDirection: 1 }],
			false,
		);
		expect(built).toHaveLength(0);
	});
});

describe('TieBuilder chords with a second', () => {
	new ProbeTextCanvas(new FakePaintProbe()).install();
	const parser = new DefaultScoreParser();

	const renderChordTies = async (
		keys: string[],
		stemDirection: 1 | -1,
	): Promise<{
		first: StaveNote;
		second: StaveNote;
		ties: DashedTie[];
		space: number;
	}> => {
		const chordXml = (type: 'start' | 'stop') =>
			keys
				.map((key, i) => {
					const [step, octave] = key.split('/');
					return `<note>${i > 0 ? '<chord/>' : ''}<pitch><step>${step?.toUpperCase()}</step><octave>${octave}</octave></pitch><duration>8</duration><voice>1</voice><staff>1</staff><type>half</type><notations><tied type="${type}"/></notations></note>`;
				})
				.join('');
		const doc = await parser.parse(
			`<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>P1</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>4</divisions><clef><sign>G</sign><line>2</line></clef></attributes>${chordXml('start')}${chordXml('stop')}</measure></part></score-partwise>`,
		);
		const chords: Chord[] = doc.score.parts[0]?.measures[0]?.chords ?? [];
		const stave = new Stave(0, 40, 300);
		const byLead = new Map<Note, StaveNote>();
		const notes: StaveNote[] = [];
		chords.forEach((chord, idx) => {
			const staveNote = new StaveNote({
				keys,
				duration: 'h',
				stemDirection,
			}).setStave(stave);
			new TickContext()
				.addTickable(staveNote)
				.preFormat()
				.setX(idx === 0 ? 40 : 140);
			byLead.set(chord.lead, staveNote);
			notes.push(staveNote);
		});
		const reader = new ScoreReader(new DynamicGlyphs());
		const connectors = new CurveConnectors(reader);
		const ties = new TieBuilder(connectors, Appearance.NONE).build(
			chords,
			byLead,
		) as DashedTie[];
		const ctx = new CanvasContext(
			new PaintContext(
				new PaintList(),
				new FakePaintProbe(),
				{},
			) as unknown as CanvasRenderingContext2D,
		);
		for (const tie of ties) {
			tie.setContext(ctx).draw();
		}
		return {
			first: notes[0] as StaveNote,
			second: notes[1] as StaveNote,
			ties,
			space: stave.getSpacingBetweenLines(),
		};
	};

	it('starts the displaced second tie over its head, stops it before the upper head, and lifts the outer tie above its head', async () => {
		const { first, second, ties, space } = await renderChordTies(
			['g/4', 'a/4', 'c/5'],
			1,
		);
		const [g4, a4, c5] = ties;
		expect(g4?.getDirection()).toBe(1);
		expect(a4?.getDirection()).toBe(-1);
		expect(c5?.getDirection()).toBe(-1);

		const a4Bounds = a4?.inkBounds;
		const c5Bounds = c5?.inkBounds;
		expect(a4Bounds).not.toBeNull();
		expect(c5Bounds).not.toBeNull();
		if (!a4Bounds || !c5Bounds) {
			return;
		}
		const a4Head = first.noteHeads[1];
		const a4Right =
			first.getNoteHeadBeginX() +
			(a4Head?.getDisplacementX() ?? 0) +
			(a4Head?.getWidth() ?? 0);
		// A4 tie tucks over the displaced A4 head on the left and stops before the undisplaced C5 head on the right.
		expect(a4Bounds.x).toBeLessThan(a4Right);
		expect(a4Bounds.x + a4Bounds.w).toBeLessThan(second.getNoteHeadBeginX());
		// A4 tie sits clear above the A4 head (in the space between A4 and C5), and C5 tie sits a full space higher above C5.
		const a4Y = first.getYs()[1] as number;
		const c5Y = first.getYs()[2] as number;
		expect(a4Bounds.y + a4Bounds.h).toBeLessThan(a4Y - 0.5 * space);
		expect(c5Bounds.y + c5Bounds.h).toBeLessThan(c5Y - 0.5 * space);
		expect(a4Bounds.y - c5Bounds.y).toBeGreaterThanOrEqual(0.95 * space);
	});

	it('mirrors displaced second spacing downward on a down-stem chord', async () => {
		const { first, second, ties, space } = await renderChordTies(
			['c/4', 'e/4', 'f/4'],
			-1,
		);
		const [c4, e4, f4] = ties;
		expect(c4?.getDirection()).toBe(1);
		expect(e4?.getDirection()).toBe(1);
		expect(f4?.getDirection()).toBe(-1);

		const c4Bounds = c4?.inkBounds;
		const e4Bounds = e4?.inkBounds;
		expect(c4Bounds).not.toBeNull();
		expect(e4Bounds).not.toBeNull();
		if (!c4Bounds || !e4Bounds) {
			return;
		}
		// E4 tie clears the undisplaced C4 head on the left and tucks under the displaced E4 head on the right.
		expect(e4Bounds.x).toBeGreaterThan(first.getNoteHeadEndX());
		const e4Head = second.noteHeads[1];
		const e4Left =
			second.getNoteHeadBeginX() + (e4Head?.getDisplacementX() ?? 0);
		expect(e4Bounds.x + e4Bounds.w).toBeGreaterThan(e4Left);
		const c4Y = first.getYs()[0] as number;
		const e4Y = first.getYs()[1] as number;
		expect(e4Bounds.y).toBeGreaterThan(e4Y + 0.5 * space);
		expect(c4Bounds.y).toBeGreaterThan(c4Y + 0.5 * space);
	});
});

describe('TieBuilder cross-staff ties', () => {
	const parser = new DefaultScoreParser();

	it('keeps a downward cross-staff tie on the same system as one tie connecting both notes', async () => {
		const doc = await parser.parse(
			`<score-partwise version="4.0"><part-list><score-part id="P1"><part-name>P1</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>4</divisions><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>
			<note><pitch><step>C</step><octave>4</octave></pitch><duration>8</duration><voice>2</voice><staff>1</staff><type>half</type><notations><tied type="start"/></notations></note>
			<note><pitch><step>C</step><octave>4</octave></pitch><duration>8</duration><voice>2</voice><staff>2</staff><type>half</type><notations><tied type="stop"/></notations></note>
			</measure></part></score-partwise>`,
		);
		const chords: Chord[] = doc.score.parts[0]?.measures[0]?.chords ?? [];
		const upperStave = new Stave(0, 0, 300);
		const lowerStave = new Stave(0, 100, 300);
		const first = new StaveNote({
			keys: ['c/4'],
			duration: 'h',
			stemDirection: -1,
		}).setStave(upperStave);
		const second = new StaveNote({
			keys: ['c/4'],
			duration: 'h',
			stemDirection: 1,
		}).setStave(lowerStave);
		new TickContext().addTickable(first).preFormat().setX(40);
		new TickContext().addTickable(second).preFormat().setX(140);
		const [firstChord, secondChord] = chords;
		if (!firstChord || !secondChord) {
			throw new Error('expected two chords');
		}
		const byLead = new Map<Note, StaveNote>([
			[firstChord.lead, first],
			[secondChord.lead, second],
		]);
		const reader = new ScoreReader(new DynamicGlyphs());
		const connectors = new CurveConnectors(reader);
		const builder = new TieBuilder(connectors, Appearance.NONE);

		// Same system: one single tie connecting both notes.
		const sameSystem = builder.build(chords, byLead, {
			wraps: () => false,
		});
		expect(sameSystem).toHaveLength(1);
		expect(sameSystem[0]?.getNotes().firstNote).toBe(first);
		expect(sameSystem[0]?.getNotes().lastNote).toBe(second);

		// Across a system break: splits into two partial ties.
		const wrapped = builder.build(chords, byLead, {
			wraps: () => true,
		});
		expect(wrapped).toHaveLength(2);
		expect(wrapped[0]?.getNotes().firstNote).toBe(first);
		expect(wrapped[0]?.getNotes().lastNote).toBeUndefined();
		expect(wrapped[1]?.getNotes().firstNote).toBeUndefined();
		expect(wrapped[1]?.getNotes().lastNote).toBe(second);
	});
});
