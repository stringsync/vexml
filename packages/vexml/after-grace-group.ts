import {
	type Beam,
	type BoundingBox,
	GraceNoteGroup,
	Modifier,
	type Note,
	type StaveTie,
} from 'vexflow/core';

/*
 * An after-grace cluster: a trailing grace group drawn past the note it follows rather than
 * before the one it leads. vexflow places such a group against its note's head; an engraver
 * puts it at the end of the note's time, just short of what follows. `reach` says how far from
 * the note's tick x the cluster may start, and the cluster slides there, never left of where
 * vexflow put it. vexflow positions grace notes afresh each time it measures or draws the
 * group (its private positionGraceNotes), so the slide follows each of those two.
 */
export class AfterGraceGroup extends GraceNoteGroup {
	private reach = 0;

	constructor(...args: ConstructorParameters<typeof GraceNoteGroup>) {
		super(...args);
		this.setPosition(Modifier.Position.RIGHT);
	}

	/** Let the cluster start as far as `px` past its note's tick x. */
	setReach(px: number): void {
		this.reach = px;
	}

	override getLayoutElements(): (Note | Beam | StaveTie)[] {
		const elements = super.getLayoutElements();
		this.slide();
		return elements;
	}

	override getBoundingBox(): BoundingBox {
		const box = super.getBoundingBox();
		const graces = this.getGraceNotes();
		if (!this.slide()) {
			return box;
		}
		return graces
			.map((grace) => grace.getBoundingBox())
			.reduce((merged, next) => merged.mergeWith(next));
	}

	// Slide the positioned cluster to start at `reach`; true when it moved.
	private slide(): boolean {
		const graces = this.getGraceNotes();
		const first = graces[0]?.getTickContext().getXOffset();
		const start = this.checkAttachedNote().getTickContext().getX() + this.reach;
		if (first === undefined || first >= start) {
			return false;
		}
		for (const grace of graces) {
			const tick = grace.getTickContext();
			tick.setXOffset(tick.getXOffset() + start - first);
		}
		return true;
	}
}
