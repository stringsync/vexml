import { Modifier, Ornament } from 'vexflow/core';

/*
 * An ornament that records whether MusicXML gave it an explicit placement side,
 * so multi-voice placement can put an unplaced lower-voice trill below the stave
 * without overriding an explicit placement="above".
 */
export class StaveOrnament extends Ornament {
	readonly explicitPlacement: boolean;

	constructor(type: string, placement: 'above' | 'below' | null = null) {
		super(type);
		this.explicitPlacement = placement === 'above' || placement === 'below';
		if (placement === 'below') {
			this.setPosition(Modifier.Position.BELOW);
		}
	}

	get isTrill(): boolean {
		return this.type === 'tr';
	}

	getLine(): number {
		return this.textLine;
	}
}
