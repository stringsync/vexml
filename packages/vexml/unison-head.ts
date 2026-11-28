import { NoteHead, type NoteHeadStruct } from 'vexflow/core';

/* A head of an altered unison, placed beside its unison partners rather than in vexflow's column. */
export class UnisonHead extends NoteHead {
	constructor(
		struct: NoteHeadStruct,
		private readonly displacedFromColumn: boolean,
		private readonly displacementX: () => number,
	) {
		super(struct);
	}

	override isDisplaced(): boolean {
		return this.displacedFromColumn;
	}

	override getDisplacementX(): number {
		return this.displacementX();
	}
}
