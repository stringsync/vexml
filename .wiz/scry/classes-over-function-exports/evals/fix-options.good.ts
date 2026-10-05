// fix.ts, the action behind `wiz dev fix`, with fix.test.ts beside it
export interface FixOptions {
	/** Report problems without writing fixes, as CI wants it. */
	check: boolean;
	log?: Logger;
	ps?: Ps;
}

export async function fix(opts: FixOptions): Promise<void> {
	const log = opts.log ?? new ConsoleLogger();
	const ps = opts.ps ?? new NodePs();
	// ...
}
