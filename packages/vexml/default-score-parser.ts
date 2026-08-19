import { MDOMParser, type MDocument } from '@stringsync/mdom';
import type { ScoreParser } from './score-parser';

export class DefaultScoreParser implements ScoreParser {
	async parse(input: string | Blob): Promise<MDocument> {
		const parser = new MDOMParser();
		if (typeof input === 'string') {
			return parser.parseFromString(input);
		}
		if (input instanceof Blob) {
			return parser.parseFromBlob(input);
		}
		throw new TypeError('render: input is not a string or Blob');
	}
}
