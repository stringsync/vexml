import { GhostNote, GraceNoteGroup, type ModifierContext } from 'vexflow/core';

/*
 * A ghost holding a beat on a staff its voice only passes through, that also carries the
 * grace notes written on this staff for a main note that sits on another. vexflow's own
 * GhostNote joins no modifier context and draws only annotations, so graces hung off it
 * would take no room and never print.
 */
export class GraceHostGhostNote extends GhostNote {
	override addToModifierContext(mc: ModifierContext): this {
		this.modifierContext = mc;
		for (const modifier of this.getModifiers()) {
			mc.addMember(modifier);
		}
		this.preFormatted = false;
		return this;
	}

	override draw(): void {
		super.draw();
		const ctx = this.checkContext();
		for (const modifier of this.getModifiers()) {
			if (modifier instanceof GraceNoteGroup) {
				modifier.setContext(ctx).drawWithStyle();
			}
		}
	}
}
