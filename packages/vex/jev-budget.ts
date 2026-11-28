/** Default hard cap on uncached images sent to Jev in a single run. */
export const DEFAULT_MAX_JEV_IMAGES = 25;

/** Configuration for `JevImageBudget`. */
export interface JevImageBudgetOptions {
	/** Maximum number of uncached images allowed in one run; defaults to 25. */
	maxImages?: number;
}

/** Enforces a hard per-run cap on uncached images before any API call is sent. */
export class JevImageBudget {
	readonly maxImages: number;
	private spent = 0;

	constructor(opts: JevImageBudgetOptions = {}) {
		const maxImages = opts.maxImages ?? DEFAULT_MAX_JEV_IMAGES;
		if (!Number.isInteger(maxImages) || maxImages < 0) {
			throw new Error(
				`maxImages must be a non-negative integer, got ${maxImages}`,
			);
		}
		this.maxImages = maxImages;
	}

	get used(): number {
		return this.spent;
	}

	get remaining(): number {
		return Math.max(0, this.maxImages - this.spent);
	}

	/** Refuses without spending when `imageCount` uncached images would exceed the cap. */
	check(imageCount: number): void {
		if (!Number.isInteger(imageCount) || imageCount < 0) {
			throw new Error(
				`imageCount must be a non-negative integer, got ${imageCount}`,
			);
		}
		if (this.spent + imageCount > this.maxImages) {
			const noun = imageCount === 1 ? 'image' : 'images';
			throw new Error(
				`Jev image budget exceeded: requested ${imageCount} uncached ${noun}, but only ${this.remaining} of ${this.maxImages} remaining (${this.spent} already used)`,
			);
		}
	}

	/** Checks the cap and reserves `imageCount` images prior to issuing an API call. */
	consume(imageCount: number): void {
		this.check(imageCount);
		this.spent += imageCount;
	}
}
