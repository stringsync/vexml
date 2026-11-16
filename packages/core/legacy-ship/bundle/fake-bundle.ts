import type { Bundle } from "./bundle";

/** Building nothing, and recording every directory built and cleaned, in order. */
export class FakeBundle implements Bundle {
	readonly built: string[] = [];
	readonly cleaned: string[] = [];
	/** The directory to fail on, as a package that does not compile would. */
	fails?: string;

	async build(dir: string): Promise<string> {
		if (dir === this.fails) {
			throw new Error(`build failed in ${dir}`);
		}
		this.built.push(dir);
		return `${dir}/dist`;
	}

	async clean(dir: string): Promise<void> {
		this.cleaned.push(dir);
	}
}
