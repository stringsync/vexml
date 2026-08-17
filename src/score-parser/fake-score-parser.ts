import type { MDocument } from '@stringsync/mdom';
import type { ScoreParser } from './score-parser';

/* Fake fulfilling the ScoreParser seam (preferred over mocks); hands back an empty document and
 * counts the parses, so a renderer test never parses MusicXML. Test-only — excluded from the
 * published package via package.json "files". */
export class FakeScoreParser implements ScoreParser {
	parses = 0;

	async parse(): Promise<MDocument> {
		this.parses++;
		return { score: { parts: [] } } as unknown as MDocument;
	}
}
