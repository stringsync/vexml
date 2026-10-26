import { describe, expect, it } from 'bun:test';
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

// Fixtures across what decides which notes the draw collects: tab and notation staves, cross-staff
// voices, multirests, measure styles, graces, cue and invisible notes, gaps at the edges, repeats
// and a long score.
const FIXTURES = [
	'clef_notation_and_tab.musicxml',
	'clef_percussion.musicxml',
	'cross_stave.musicxml',
	'cue_notes.musicxml',
	'grace_chord.musicxml',
	'invisible_notes.musicxml',
	'lyrics_voice_and_piano.musicxml',
	'measure_style.musicxml',
	'print_object.musicxml',
	'repeats_notation_and_tab.musicxml',
	'rest_multi_measure.musicxml',
	'score_chopin_prelude.musicxml',
	'score_schubert_gute_nacht.musicxml',
	'structure_tab_parts.musicxml',
	'tab_chord.musicxml',
	'tab_tie.musicxml',
	'tuplet_cross_stave.musicxml',
];

describe('ProvisionalGeometry', () => {
	// The drawn geometry of each fixture against the layout's forecast of it: the same notes by
	// mdom identity (and whether each is a fret), and the same measure columns on the same
	// systems, so a progressive render's elements and timeline need no additions once drawn.
	for (const fixture of FIXTURES) {
		it(`forecasts the notes and measures the draw collects for ${fixture}`, async () => {
			const { drawn, provisional } = await engrave(fixture);

			expect(keysOf(provisional)).toEqual(keysOf(drawn));
			expect(columnsOf(provisional)).toEqual(columnsOf(drawn));
		});
	}

	// A progressive render asks one ProvisionalGeometry again after each system as the forecast
	// moves: what it read off the document once still lands each note in the box it moved to.
	it('follows a forecast that moved as a fresh one would', async () => {
		const { plan, geometry } = await begin(
			'score_schubert_gute_nacht.musicxml',
		);
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
			new ChordTranslator(durations, new NotationTranslator()),
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
	const chords = new ChordTranslator(durations, new NotationTranslator());
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
