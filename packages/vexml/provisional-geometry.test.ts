import { beforeEach, describe, expect, it } from 'bun:test';
import * as path from 'node:path';
import { BarlineTranslator } from './barline-translator';
import { ChordTranslator } from './chord-translator';
import { DEFAULT_CONFIG } from './config';
import { DefaultScoreParser } from './default-score-parser';
import { DetachedViewport } from './detached-viewport';
import { DurationTranslator } from './duration-translator';
import { DynamicGlyphs } from './dynamic-glyphs';
import { ElementFactory } from './element-factory';
import { FakePaintProbe } from './fake-paint-probe';
import { FontShorthandPatch } from './font-shorthand-patch';
import { GapInserter } from './gap-inserter';
import { Gaps } from './gaps';
import { InertDecoration } from './inert-decoration';
import { LayoutPlanner } from './layout-planner';
import { MetricsPatch } from './metrics-patch';
import { NotationTranslator } from './notation-translator';
import { ProbeTextCanvas } from './probe-text-canvas';
import { ProvisionalGeometry } from './provisional-geometry';
import type { RawGeometry } from './score-drawer';
import { ScoreEngraver } from './score-engraver';
import { ScoreReader } from './score-reader';
import { SequenceFactory } from './sequence-factory';
import { SignatureTranslator } from './signature-translator';
import { StavePlan } from './stave-plan';
import { TabVoiceTranslator } from './tab-voice-translator';
import { VoiceTranslator } from './voice-translator';
import { WholeLayoutPlan } from './whole-layout-plan';

const DATA_DIR = path.resolve(import.meta.dir, '../integration/__data__');

describe('ProvisionalGeometry', () => {
	let plan: Awaited<ReturnType<typeof begin>>['plan'];
	let geometry: Awaited<ReturnType<typeof begin>>['geometry'];

	beforeEach(async () => {
		({ plan, geometry } = await begin('score_schubert_gute_nacht.musicxml'));
	});

	// The drawn geometry of each fixture against the layout's forecast of it: the same notes by
	// mdom identity (and whether each is a fret), and the same measure columns on the same
	// systems, so a progressive render's elements and timeline need no additions once drawn. The
	// fixtures span what decides which notes the draw collects: tab and notation staves, cross-staff
	// voices, multirests, measure styles, graces, cue and invisible notes, gaps at the edges, repeats
	// and a long score.
	it('forecasts the notes and measures the draw collects for clef_notation_and_tab.musicxml', async () => {
		await expectForecastMatchesDraw('clef_notation_and_tab.musicxml');
	});

	it('forecasts the notes and measures the draw collects for clef_percussion.musicxml', async () => {
		await expectForecastMatchesDraw('clef_percussion.musicxml');
	});

	it('forecasts the notes and measures the draw collects for cross_stave.musicxml', async () => {
		await expectForecastMatchesDraw('cross_stave.musicxml');
	});

	it('forecasts the notes and measures the draw collects for cue_notes.musicxml', async () => {
		await expectForecastMatchesDraw('cue_notes.musicxml');
	});

	it('forecasts the notes and measures the draw collects for grace_chord.musicxml', async () => {
		await expectForecastMatchesDraw('grace_chord.musicxml');
	});

	it('forecasts the notes and measures the draw collects for invisible_notes.musicxml', async () => {
		await expectForecastMatchesDraw('invisible_notes.musicxml');
	});

	it('forecasts the notes and measures the draw collects for lyrics_voice_and_piano.musicxml', async () => {
		await expectForecastMatchesDraw('lyrics_voice_and_piano.musicxml');
	});

	it('forecasts the notes and measures the draw collects for measure_style.musicxml', async () => {
		await expectForecastMatchesDraw('measure_style.musicxml');
	});

	it('forecasts the notes and measures the draw collects for print_object.musicxml', async () => {
		await expectForecastMatchesDraw('print_object.musicxml');
	});

	it('forecasts the notes and measures the draw collects for repeats_notation_and_tab.musicxml', async () => {
		await expectForecastMatchesDraw('repeats_notation_and_tab.musicxml');
	});

	it('forecasts the notes and measures the draw collects for rest_multi_measure.musicxml', async () => {
		await expectForecastMatchesDraw('rest_multi_measure.musicxml');
	});

	it('forecasts the notes and measures the draw collects for score_chopin_prelude.musicxml', async () => {
		await expectForecastMatchesDraw('score_chopin_prelude.musicxml');
	});

	it('forecasts the notes and measures the draw collects for score_schubert_gute_nacht.musicxml', async () => {
		await expectForecastMatchesDraw('score_schubert_gute_nacht.musicxml');
	});

	it('forecasts the notes and measures the draw collects for structure_tab_parts.musicxml', async () => {
		await expectForecastMatchesDraw('structure_tab_parts.musicxml');
	});

	it('forecasts the notes and measures the draw collects for tab_chord.musicxml', async () => {
		await expectForecastMatchesDraw('tab_chord.musicxml');
	});

	it('forecasts the notes and measures the draw collects for tab_tie.musicxml', async () => {
		await expectForecastMatchesDraw('tab_tie.musicxml');
	});

	it('forecasts the notes and measures the draw collects for tuplet_cross_stave.musicxml', async () => {
		await expectForecastMatchesDraw('tuplet_cross_stave.musicxml');
	});

	// A progressive render asks one ProvisionalGeometry again after each system as the forecast
	// moves: what it read off the document once still lands each note in the box it moved to.
	it('follows a forecast that moved as a fresh one would', async () => {
		const reused = geometry();
		plan.placeThrough(1);
		reused.geometryOf(plan.forecast());
		plan.placeThrough(10);
		const later = plan.forecast();

		expect(reused.geometryOf(later)).toEqual(geometry().geometryOf(later));
	});
});

// Each note the geometry holds, by its mdom note (named by its place in its measure), with how
// it was drawn (a fret or a head). A note drawn on both a notation and a tab stave appears once
// per stave.
function keysOf(geometry: RawGeometry): Set<string> {
	return new Set(
		geometry.notes.map(
			(n) =>
				`${n.measureIndex}:${n.mnote.measure.notes.indexOf(n.mnote)}:${n.tab ? 'tab' : 'head'}`,
		),
	);
}

function columnsOf(geometry: RawGeometry): string[] {
	return geometry.measures.map((m) => `${m.index}@${m.systemIndex}`).sort();
}

// The layout builds vexflow elements, which measure text through the probe.
new ProbeTextCanvas(new FakePaintProbe()).install();
new MetricsPatch().install();
new FontShorthandPatch().install();

async function expectForecastMatchesDraw(fixture: string) {
	const { drawn, provisional } = await engrave(fixture);
	expect(keysOf(provisional)).toEqual(keysOf(drawn));
	expect(columnsOf(provisional)).toEqual(columnsOf(drawn));
}

// A layout planned a system at a time over `fixture`, and ProvisionalGeometry made over it.
async function begin(fixture: string) {
	const config = DEFAULT_CONFIG;
	const reader = new ScoreReader(new DynamicGlyphs());
	const durations = new DurationTranslator(reader);
	const staves = new StavePlan({ showTabs: true, showNotation: true });
	const gaps = new Gaps([], new GapInserter(reader));
	const document = await new DefaultScoreParser().parse(
		await Bun.file(path.join(DATA_DIR, fixture)).text(),
	);
	const plan = new LayoutPlanner(
		new VoiceTranslator(
			new ChordTranslator(durations, new NotationTranslator(reader), reader),
			durations,
			new BarlineTranslator(),
			reader,
		),
		new TabVoiceTranslator(durations, reader, 'none'),
		new SignatureTranslator(),
		staves,
		reader,
		gaps,
	).begin(document.score, config);
	const geometry = () =>
		new ProvisionalGeometry(reader, staves, document.score, plan.layout);
	return { plan, geometry };
}

async function engrave(fixture: string) {
	const config = DEFAULT_CONFIG;
	const reader = new ScoreReader(new DynamicGlyphs());
	const durations = new DurationTranslator(reader);
	const staves = new StavePlan({ showTabs: true, showNotation: true });
	const signatures = new SignatureTranslator();
	const tab = new TabVoiceTranslator(durations, reader, 'none');
	const chords = new ChordTranslator(
		durations,
		new NotationTranslator(reader),
		reader,
	);
	const translator = new VoiceTranslator(
		chords,
		durations,
		new BarlineTranslator(),
		reader,
	);
	const gaps = new Gaps([], new GapInserter(reader));
	const engraver = ScoreEngraver.create(
		config,
		reader,
		gaps,
		new ElementFactory(),
		new SequenceFactory(reader, gaps),
	);
	const document = await new DefaultScoreParser().parse(
		await Bun.file(path.join(DATA_DIR, fixture)).text(),
	);
	// The engrave installs vexflow's measuring patches, which the layout below needs too.
	const drawn = engraver.engrave(
		document,
		new FakePaintProbe(),
		new DetachedViewport(),
		{ color: new InertDecoration(), halo: new InertDecoration() },
	).drawn.geometry;
	const layout = new LayoutPlanner(
		translator,
		tab,
		signatures,
		staves,
		reader,
		gaps,
	).plan(document.score, config);
	const provisional = new ProvisionalGeometry(
		reader,
		staves,
		document.score,
		layout,
	).geometryOf(new WholeLayoutPlan(layout).forecast());
	return { drawn, provisional };
}
