import type { MDocument } from '@stringsync/mdom';

/* Turns XML text/Blob into a document, or reuses an editor's existing MDocument so source
 * identities survive repeated renders. DefaultScoreParser is the production implementer;
 * FakeScoreParser hands back a prebuilt document so a unit test never parses. */
export interface ScoreParser {
	parse(input: string | Blob | MDocument): Promise<MDocument>;
}
