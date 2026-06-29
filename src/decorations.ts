import type { Bounded, Decorator } from './targets';

/*
 * The decoration store, the production `Decorator`. A target's color/halo toggles delegate here.
 *
 * Phase 4 records state only — which targets are colored/haloed — so the toggles have a real
 * Decorator to talk to and the hit index can be built. The overlay layer and the repaint that
 * actually draws the colors/halos land in Phase 6; `dispose()` will release that layer (a no-op
 * until then).
 */
export class Decorations implements Decorator {
	private readonly colors = new Map<Bounded, string>();
	private readonly halos = new Set<Bounded>();

	setColor(target: Bounded, color: string | null): void {
		if (color === null) {
			this.colors.delete(target);
		} else {
			this.colors.set(target, color);
		}
	}

	setHalo(target: Bounded, on: boolean): void {
		if (on) {
			this.halos.add(target);
		} else {
			this.halos.delete(target);
		}
	}

	isColored(target: Bounded): boolean {
		return this.colors.has(target);
	}

	isHaloed(target: Bounded): boolean {
		return this.halos.has(target);
	}

	dispose(): void {
		this.colors.clear();
		this.halos.clear();
	}
}
