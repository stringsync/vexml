import type { MDocument } from '@stringsync/mdom';

/* Turns the caller's input (a MusicXML string, or a Blob holding one, compressed or not) into the
 * mdom document the renderer engraves. DefaultScoreParser is the production implementer;
 * FakeScoreParser hands back a prebuilt document so a unit test never parses. */
export interface ScoreParser {
	parse(input: string | Blob): Promise<MDocument>;
}
