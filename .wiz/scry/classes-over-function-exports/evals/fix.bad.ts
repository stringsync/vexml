export class Fix {
	constructor(opts: FixOptions = {}) {
		/* ... */
	}

	async run(opts: { check: boolean }): Promise<void> {
		/* ... */
	}
}

wiz.command("fix").action((opts, deps) => new Fix(deps).run(opts));
