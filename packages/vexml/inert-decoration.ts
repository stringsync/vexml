import type { Decoratable, Decoration } from './decoration';

/*
 * A decoration store for a score engraved with no page to draw on (createSnapshot): its
 * elements are built only to be recorded, so nothing is ever colored or haloed.
 */
export class InertDecoration implements Decoration {
	set(_target: Decoratable, _color: string | null): void {}

	has(_target: Decoratable): boolean {
		return false;
	}
}
