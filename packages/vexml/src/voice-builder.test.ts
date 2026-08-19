import { describe, expect, it } from 'bun:test';
import type { Chord, Note } from '@stringsync/mdom';
import {
	BarNote,
	GhostNote,
	type Stave,
	type StaveNote,
	Stem,
	type TabNote,
	type TabStave,
} from 'vexflow';
import { FakeLyricMark } from './lyric-mark/fake-lyric-mark';
import type { NoteTranslator, VoiceTickablesOptions } from './note-translator';
import type { ScoreReader, StaffVoice } from './score-reader';
import type { SpannerBuilder } from './spanner-builder';
import type { PendingStave } from './system-formatter';
import type { TabTranslator } from './tab-translator';
import { type BuildNotesOptions, VoiceBuilder } from './voice-builder';

describe('VoiceBuilder', () => {
	// The lead-note surface the builder reads: registry keys, tie/grace/chord-member
	// routing, and the beam markers groupBeamRuns folds (it reads number/text/isRest).
	const lead = (overrides: Record<string, unknown> = {}) =>
		({
			voice: '1',
			measureBeat: 0,
			ties: [],
			beams: [],
			isGrace: false,
			isChordMember: false,
			isRest: false,
			...overrides,
		}) as unknown as Note;

	const chordOf = (l: Note, measureBeat = 0) =>
		({ lead: l, measureBeat }) as unknown as Chord;

	const staffVoice = (
		chords: Chord[],
		beamChords: Chord[] | null = null,
	): StaffVoice => ({ chords, beamChords });

	// A built note the way buildPartBeams sees one: identity plus a recorded stem set.
	const staveNote = (mods: unknown[] = []) => {
		const note = {
			stemDirections: [] as number[],
			getModifiers: () => mods,
			setStemDirection: (direction: number) => {
				note.stemDirections.push(direction);
			},
		};
		return note as unknown as StaveNote & { stemDirections: number[] };
	};

	// Real vexflow tickables: the builder groups them with instanceof, and a BarNote's
	// identity is what the divider assertions follow.
	const barNote = () => new BarNote();
	const ghostNote = () => new GhostNote('q');

	type TickablesCall = {
		chords: Chord[];
		clef: string;
		opts: VoiceTickablesOptions;
	};

	// The translator surface buildNotes drives. The default per-voice behavior mirrors
	// the real one's contract: one recorded note per chord, in chord order. softVoice
	// wraps without vexflow so each voice's tickables stay inspectable.
	const fakeTranslator = (
		tickablesFor?: (call: TickablesCall, voiceIndex: number) => unknown[],
	) => {
		const calls: TickablesCall[] = [];
		return {
			calls,
			voiceTickables(
				chords: Chord[],
				clef: string,
				opts: VoiceTickablesOptions,
			) {
				const call = { chords, clef, opts };
				calls.push(call);
				if (tickablesFor) {
					return tickablesFor(call, calls.length - 1);
				}
				return chords.map((chord) => {
					const note = staveNote();
					opts.record?.(chord.lead, note);
					return note;
				});
			},
			softVoice: (tickables: unknown[], softmaxFactor: number) => ({
				tickables,
				softmaxFactor,
			}),
		};
	};

	const fakeSpanners = () => {
		const order: string[] = [];
		const beamCalls: Array<{
			groups: unknown[];
			byLead: Map<Note, StaveNote>;
			stem: string | undefined;
			notesByLead: Map<Note, StaveNote[]> | undefined;
		}> = [];
		const tupletCalls: Array<{ chords: Chord[]; map: Map<Note, unknown> }> = [];
		return {
			order,
			beamCalls,
			tupletCalls,
			buildBeams(
				groups: unknown[],
				byLead: Map<Note, StaveNote>,
				stem?: string,
				notesByLead?: Map<Note, StaveNote[]>,
			) {
				order.push('beams');
				beamCalls.push({ groups, byLead, stem, notesByLead });
				return [{ built: 'beam' }];
			},
			buildTuplets(chords: Chord[], map: Map<Note, unknown>) {
				order.push('tuplets');
				tupletCalls.push({ chords, map });
				return [{ built: 'tuplet' }];
			},
		};
	};

	const makeBuilder = (
		overrides: {
			translator?: unknown;
			tab?: unknown;
			spanners?: unknown;
			endBeat?: number;
			octaveShiftByNote?: Map<Note, number>;
			byLead?: Map<Note, StaveNote>;
			byTabLead?: Map<Note, TabNote>;
		} = {},
	) =>
		new VoiceBuilder(
			(overrides.translator ?? fakeTranslator()) as NoteTranslator,
			(overrides.tab ?? {}) as TabTranslator,
			{ endBeatOf: () => overrides.endBeat ?? 0 } as unknown as ScoreReader,
			(overrides.spanners ?? fakeSpanners()) as unknown as SpannerBuilder,
			{
				softmaxFactor: 100,
				octaveShiftByNote: overrides.octaveShiftByNote ?? new Map(),
				byLead: overrides.byLead ?? new Map(),
				byTabLead: overrides.byTabLead ?? new Map(),
			},
		);

	const stave = {} as Stave;
	const buildNotes = (
		builder: VoiceBuilder,
		voices: StaffVoice[],
		opts: BuildNotesOptions = {},
	) => builder.buildNotes(stave, 3, voices, 'treble', opts);

	it('records each built note into the shared registry and the pending stave', () => {
		const plain = lead();
		const tied = lead({ ties: [{}] });
		const grace = lead({ isGrace: true });
		const chords = [chordOf(plain), chordOf(tied), chordOf(grace)];
		const byLead = new Map<Note, StaveNote>();
		const pending = buildNotes(makeBuilder({ byLead }), [staffVoice(chords)]);

		expect(pending.stave).toBe(stave);
		expect(pending.row).toBe(3);
		expect(pending.isTab).toBe(false);
		expect(pending.staveNotes).toHaveLength(3);
		expect([...byLead.keys()]).toEqual([plain, tied, grace]);
		expect(pending.noteChords.map((n) => n.chord.lead)).toEqual([plain, tied]);
		expect(pending.graceChords.map((n) => n.chord.lead)).toEqual([grace]);
		expect([...pending.tiedNotes]).toEqual([byLead.get(tied) as StaveNote]);
		expect(pending.tupletChords).toEqual([chords]);
		expect(pending.tabChords).toEqual([]);
		expect(pending.midBars).toEqual([]);
	});

	it('floors the voice run-out beat at the meter', () => {
		const translator = fakeTranslator();
		const builder = makeBuilder({ translator, endBeat: 3 });
		buildNotes(builder, [staffVoice([])], { meterFloor: 4 });
		buildNotes(builder, [staffVoice([])], { meterFloor: 2 });
		expect(translator.calls.map((c) => c.opts.endBeat)).toEqual([4, 3]);
	});

	it('offsets each note by the clef octave plus its own octave-shift span', () => {
		const shifted = lead();
		const unshifted = lead();
		const translator = fakeTranslator();
		buildNotes(
			makeBuilder({
				translator,
				octaveShiftByNote: new Map([[shifted, 2]]),
			}),
			[staffVoice([])],
			{ clefOctaveShift: 1 },
		);
		const { octaveShiftOf } = translator.calls[0]?.opts ?? {};
		expect(octaveShiftOf?.(shifted)).toBe(3);
		expect(octaveShiftOf?.(unshifted)).toBe(1);
	});

	it('auto-stems a lone voice and stems shared-stave voices apart', () => {
		const translator = fakeTranslator();
		const builder = makeBuilder({ translator });
		buildNotes(builder, [staffVoice([])]);
		buildNotes(builder, [
			staffVoice([], []),
			staffVoice([], []),
			staffVoice([]),
		]);
		expect(translator.calls.map((c) => c.opts.defaultStem)).toEqual([
			undefined,
			'up',
			'down',
			'down',
		]);
	});

	it('routes mid-measure dividers and clef glyphs through the first voice only', () => {
		const translator = fakeTranslator();
		const barlines = [{ beat: 1, style: 'dashed' }];
		const midClefs = [{ beat: 1, clef: 'bass', annotation: undefined }];
		makeBuilder({ translator }).buildNotes(
			stave,
			0,
			[staffVoice([]), staffVoice([])],
			'treble',
			{ barlines, midClefs },
		);
		const [first, second] = translator.calls;
		expect(first?.opts.barlines).toBe(barlines);
		expect(first?.opts.drawMidClefs).toBe(true);
		expect(second?.opts.barlines).toEqual([]);
		expect(second?.opts.drawMidClefs).toBe(false);
		expect(second?.opts.midClefs).toBe(midClefs);
	});

	it('queues only the dividers vexflow has no barline type for', () => {
		const custom = barNote();
		const styled = barNote();
		// The real translator interleaves BarNotes with the notes, in barline order.
		const translator = fakeTranslator(() => [custom, styled]);
		const pending = makeBuilder({ translator }).buildNotes(
			stave,
			0,
			[staffVoice([])],
			'treble',
			{
				barlines: [
					{ beat: 1, style: 'dashed' },
					{ beat: 2, style: 'light-light' },
				],
			},
		);
		expect(pending.midBars).toEqual([{ note: custom, style: 'dashed' }]);
	});

	it('stacks a later voice’s verses beneath the rows already used', () => {
		const upper = new FakeLyricMark(1);
		const low = new FakeLyricMark(0);
		const translator = fakeTranslator(({ opts, chords }, voiceIndex) =>
			chords.map((chord) => {
				const note = staveNote(voiceIndex === 0 ? [upper] : [low]);
				opts.record?.(chord.lead, note);
				return note;
			}),
		);
		buildNotes(makeBuilder({ translator }), [
			staffVoice([chordOf(lead())]),
			staffVoice([chordOf(lead({ voice: '2' }))]),
		]);
		// Voice 1 used rows 0-1, so voice 2's first verse starts on row 2.
		expect(upper.verseIndex).toBe(1);
		expect(low.verseIndex).toBe(2);
	});

	it('plans beam groups off the beam-owning staff and keeps the voice stem', () => {
		const begin = lead({ beams: [{ number: '1', text: 'begin' }] });
		const end = lead({ beams: [{ number: '1', text: 'end' }] });
		const pending = buildNotes(makeBuilder(), [
			staffVoice([], [chordOf(begin), chordOf(end)]),
			// beamChords is null on the staves that don't own the voice, so no plan here.
			staffVoice([], null),
		]);
		expect(pending.beamPlans).toEqual([
			{
				groups: [{ notes: [begin, end], breaksAfter: [] }],
				defaultStem: 'up',
			},
		]);
		expect(pending.beams).toEqual([]);
	});

	const pendingStave = (over: Partial<PendingStave>): PendingStave => ({
		stave,
		row: 0,
		isTab: false,
		vexVoices: [],
		beams: [],
		beamPlans: [],
		tuplets: [],
		tupletChords: [],
		staveNotes: [],
		tiedNotes: new Set(),
		noteChords: [],
		graceChords: [],
		tabChords: [],
		graceTabChords: [],
		midBars: [],
		...over,
	});

	const beamPlan = (notes: Note[], defaultStem?: 'up' | 'down') => ({
		groups: [{ notes, breaksAfter: [] }],
		defaultStem,
	});

	it('builds queued beams then tuplets, consuming both plans', () => {
		const a = lead();
		const b = lead();
		const noteA = staveNote();
		const noteB = staveNote();
		const byLead = new Map<Note, StaveNote>([
			[a, noteA],
			[b, noteB],
		]);
		const spanners = fakeSpanners();
		const chords = [chordOf(a), chordOf(b)];
		const pending = pendingStave({
			staveNotes: [noteA, noteB],
			beamPlans: [beamPlan([a, b])],
			tupletChords: [chords],
		});
		const builder = makeBuilder({ spanners, byLead });
		builder.buildPartBeams([pending]);

		// Tuplets after beams, never before: a tuplet hides its bracket when its notes
		// are already beamed.
		expect(spanners.order).toEqual(['beams', 'tuplets']);
		expect(pending.beams as unknown[]).toEqual([{ built: 'beam' }]);
		expect(pending.tuplets as unknown[]).toEqual([{ built: 'tuplet' }]);
		expect(pending.beamPlans).toEqual([]);
		expect(pending.tupletChords).toEqual([]);
		expect(spanners.tupletCalls[0]?.chords).toBe(chords);
		// A same-stave group keeps auto-stemming: no forced directions, no cross-stave set.
		expect(spanners.beamCalls[0]?.stem).toBeUndefined();
		expect(noteA.stemDirections).toEqual([]);
		expect(builder.crossStaveNotes().size).toBe(0);
	});

	it('stems a cross-staff group down and marks its notes cross-stave', () => {
		const a = lead();
		const b = lead();
		const noteA = staveNote();
		const noteB = staveNote();
		const byLead = new Map<Note, StaveNote>([
			[a, noteA],
			[b, noteB],
		]);
		const spanners = fakeSpanners();
		const top = pendingStave({
			staveNotes: [noteA],
			beamPlans: [beamPlan([a, b])],
		});
		const bottom = pendingStave({ row: 1, staveNotes: [noteB] });
		const builder = makeBuilder({ spanners, byLead });
		builder.buildPartBeams([top, bottom]);

		expect(noteA.stemDirections).toEqual([Stem.DOWN]);
		expect(noteB.stemDirections).toEqual([Stem.DOWN]);
		expect(spanners.beamCalls[0]?.stem).toBe('down');
		expect([...builder.crossStaveNotes()]).toEqual([noteA, noteB]);
	});

	it('honors a shared-stave voice’s up stem across the staves', () => {
		const a = lead();
		const b = lead();
		const noteA = staveNote();
		const noteB = staveNote();
		const spanners = fakeSpanners();
		const builder = makeBuilder({
			spanners,
			byLead: new Map([
				[a, noteA],
				[b, noteB],
			]),
		});
		builder.buildPartBeams([
			pendingStave({
				staveNotes: [noteA],
				beamPlans: [beamPlan([a, b], 'up')],
			}),
			pendingStave({ row: 1, staveNotes: [noteB] }),
		]);
		expect(noteA.stemDirections).toEqual([Stem.UP]);
		expect(spanners.beamCalls[0]?.stem).toBe('up');
	});

	it('orders a split chord’s halves top staff first for the beam', () => {
		const main = lead({ measureBeat: 1 });
		const next = lead({ measureBeat: 2 });
		const member = lead({ measureBeat: 1, isChordMember: true });
		const mainNote = staveNote();
		const halfNote = staveNote();
		const nextNote = staveNote();
		const spanners = fakeSpanners();
		const builder = makeBuilder({
			spanners,
			byLead: new Map([
				[main, mainNote],
				[next, nextNote],
			]),
		});
		const top = pendingStave({
			staveNotes: [halfNote],
			noteChords: [{ note: halfNote, chord: chordOf(member, 1) }],
		});
		const bottom = pendingStave({
			row: 1,
			staveNotes: [mainNote, nextNote],
			beamPlans: [beamPlan([main, next])],
		});
		builder.buildPartBeams([top, bottom]);

		const notesByLead = spanners.beamCalls[0]?.notesByLead;
		expect(notesByLead?.get(main)).toEqual([halfNote, mainNote]);
		expect(notesByLead?.has(next)).toBe(false);
		// Both halves stem with the group, so neither draws a flag beside the beam.
		expect(halfNote.stemDirections).toEqual([Stem.DOWN]);
		expect(mainNote.stemDirections).toEqual([Stem.DOWN]);
	});

	it('records struck tab notes into the shared tab registry and skips ghosts', () => {
		const rest = lead({ isRest: true });
		const struck = lead();
		const grace = lead({ isGrace: true });
		const ghost = ghostNote();
		const byTabLead = new Map<Note, TabNote>();
		const spanners = fakeSpanners();
		const tuning = [64, 59, 55];
		const tab = {
			tickables: (
				chords: Chord[],
				gotTuning: number[] | null,
				record?: (l: Note, tickable: unknown) => void,
			) => {
				expect(gotTuning).toBe(tuning);
				return chords.map((chord) => {
					const tickable = chord.lead.isRest ? ghost : staveNote();
					record?.(chord.lead, tickable);
					return tickable;
				});
			},
		};
		const voice = staffVoice([chordOf(rest), chordOf(struck), chordOf(grace)]);
		const pending = makeBuilder({
			tab,
			spanners,
			byTabLead,
		}).buildTabNotes({} as TabStave, 2, [voice], tuning);

		expect(pending.isTab).toBe(true);
		expect(pending.row).toBe(2);
		expect([...byTabLead.keys()]).toEqual([struck, grace]);
		expect(pending.tabChords.map((t) => t.chord.lead)).toEqual([struck]);
		expect(pending.graceTabChords.map((t) => t.chord.lead)).toEqual([grace]);
		expect(pending.staveNotes).toEqual([]);
		expect(pending.noteChords).toEqual([]);
		// The tab tuplets are built (rescaling ticks) over EVERY tickable, ghosts
		// included, but discarded: the bracket draws on the notation staff.
		expect(spanners.tupletCalls[0]?.chords).toBe(voice.chords);
		expect(spanners.tupletCalls[0]?.map.get(rest)).toBe(ghost);
		expect(pending.tuplets).toEqual([]);
		expect(pending.tupletChords).toEqual([]);
	});

	it('wraps every voice at the shared softmax factor', () => {
		const pending = buildNotes(makeBuilder(), [staffVoice([]), staffVoice([])]);
		expect(
			(pending.vexVoices as unknown as Array<{ softmaxFactor: number }>).map(
				(v) => v.softmaxFactor,
			),
		).toEqual([100, 100]);
	});
});
