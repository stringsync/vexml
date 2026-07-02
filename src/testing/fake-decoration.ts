import type { Decoratable, Decoration } from '../elements/element';

/* Fake fulfilling the Decoration seam (preferred over mocks); records what it was told, so tests
 * that don't care simply never read `active`. Test-only — excluded from the published package via
 * package.json "files". */

export class FakeDecoration implements Decoration {
	readonly active = new Map<Decoratable, string>();
	set(target: Decoratable, color: string | null): void {
		if (color === null) {
			this.active.delete(target);
		} else {
			this.active.set(target, color);
		}
	}
	has(target: Decoratable): boolean {
		return this.active.has(target);
	}
}
