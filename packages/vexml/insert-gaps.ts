import type { MDocument, Measure } from '@stringsync/mdom';
import type { GapPosition } from './config';
import { DynamicGlyphs } from './dynamic-glyphs';
import { GapInserter } from './gap-inserter';
import { ScoreReader } from './score-reader';

/*
 * Insert gap measures into a document: an ordinary edit of it, so run it inside
 * `document.history.edit()` once an EditingSession has turned history on. Returns the new
 * measures (the first part's) in `positions` order; render the document with
 * `gaps: [{ measure, durationMs, ... }]` naming them. Positions are read against the
 * document as it stands, so gaps in one call never shift each other. A `beforeBarIndex`
 * inside a repeat throws (see GapPosition).
 */
export function insertGaps(
	document: MDocument,
	positions: readonly GapPosition[],
): Measure[] {
	return new GapInserter(new ScoreReader(new DynamicGlyphs())).insert(
		document,
		positions,
	);
}
