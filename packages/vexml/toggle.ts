import type { Decoratable, Decoration } from './decoration';

/* A reversible on/off effect carrying its color, delegating to the Decoration's store. `off()`
 * is the whole undo: this is view state, not a document edit, so there is no history. */
export class Toggle {
	constructor(
		private readonly target: Decoratable,
		private readonly decoration: Decoration,
	) {}
	on(color: string): void {
		this.decoration.set(this.target, color);
	}
	off(): void {
		this.decoration.set(this.target, null);
	}
	get active(): boolean {
		return this.decoration.has(this.target);
	}
}
