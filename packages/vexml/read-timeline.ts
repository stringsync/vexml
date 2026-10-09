import type { MDocument } from '@stringsync/mdom';
import type { Gap } from './config';
import { DefaultScoreParser } from './default-score-parser';
import { DynamicGlyphs } from './dynamic-glyphs';
import { GapInserter } from './gap-inserter';
import { Gaps } from './gaps';
import { ScoreReader } from './score-reader';
import { SequenceFactory } from './sequence-factory';
import type { Timeline } from './timeline';

/*
 * Read a score's playback timing without rendering it: parse text or a compressed .mxl Blob,
 * or reuse an MDocument (never edited), place `gaps` the way render does, and time it the way
 * the rendered Score's sequence does, skipping layout and drawing. For the same document and
 * gaps, every number equals what render's Score reports.
 */
export async function readTimeline(
	input: string | Blob | MDocument,
	config?: { gaps?: Gap[] },
): Promise<Timeline> {
	const reader = new ScoreReader(new DynamicGlyphs());
	const gaps = new Gaps(config?.gaps ?? [], new GapInserter(reader));
	gaps.check(input);
	const document = await new DefaultScoreParser().parse(input);
	if (document.score.parts.length > 0) {
		gaps.resolve(document);
	}
	return new SequenceFactory(reader, gaps).timeline(document.score.parts);
}
