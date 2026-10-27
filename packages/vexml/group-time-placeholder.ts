import type { RenderContext, Stave } from 'vexflow/core';
import { TimeSignature } from 'vexflow/core';
import type { GroupTimeSignature } from './group-time-signature';

export class GroupTimePlaceholder extends TimeSignature {
	constructor(
		private readonly group: GroupTimeSignature,
		width: number,
	) {
		super('4/4');
		this.width = width;
	}

	override setTimeSig(timeSpec: string): this {
		// The base constructor lays out '4/4' before the group is assigned; that layout is moot.
		return this.group ? this : super.setTimeSig(timeSpec);
	}

	override drawAt(_ctx: RenderContext, _stave: Stave, x: number): void {
		this.setRendered();
		this.group.x = x;
	}
}
