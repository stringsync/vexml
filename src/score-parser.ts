import { MDOMParser, type MDocument } from '@stringsync/mdom';

export interface ScoreParser {
	parse(input: string | Blob): Promise<MDocument>;
}

export class DefaultScoreParser implements ScoreParser {
	async parse(input: string | Blob): Promise<MDocument> {
		const parser = new MDOMParser();
		const mdoc =
			typeof input === 'string'
				? parser.parseFromString(input)
				: input instanceof Blob
					? await parser.parseFromBlob(input)
					: null;
		if (mdoc === null) {
			throw new TypeError('render: input is not a string or Blob');
		}
		return mdoc;
	}
}
