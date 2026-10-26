import { MDOMParser, MusicXMLSerializer } from '@stringsync/mdom';

export interface SemanticMeasure {
	index: number;
	number: string;
	xml: string;
}

/** Slices by score position, so repeated and nonnumeric measure labels stay distinct. */
export class SemanticMeasures {
	constructor(private readonly xml: string) {}

	all(): SemanticMeasure[] {
		const score = new MDOMParser().parseFromString(this.xml).score;
		return (score.parts[0]?.measures ?? []).map((measure, index) => {
			const doc = new MDOMParser().parseFromString(this.xml);
			for (const part of doc.score.parts) {
				const kept = part.measures[index];
				if (!kept) {
					throw new Error(
						`part ${part.id} lacks measure at position ${index + 1}`,
					);
				}
				kept.materializeSignatures();
				for (const other of part.measures) {
					if (other !== kept) {
						other.remove();
					}
				}
			}
			return {
				index,
				number: measure.number,
				xml: new MusicXMLSerializer().serializeToString(doc),
			};
		});
	}
}
