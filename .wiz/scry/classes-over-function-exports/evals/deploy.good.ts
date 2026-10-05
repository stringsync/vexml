import { ConsoleLogger, type Logger } from "./logger.ts";
import { NodePs, type Ps } from "./ps.ts";

export interface DeployOptions {
	/** The environment to deploy to, as named in deploy.json. */
	env: string;
	/** Build and print the plan without pushing anything. */
	dryRun: boolean;
	log?: Logger;
	ps?: Ps;
}

export async function deploy(opts: DeployOptions): Promise<void> {
	const log = opts.log ?? new ConsoleLogger();
	const ps = opts.ps ?? new NodePs();
	await ps.run(["bun", "run", "build"]);
	if (opts.dryRun) {
		log.info(`would deploy to ${opts.env}`);
		return;
	}
	await ps.run(["fly", "deploy", "--config", `fly.${opts.env}.toml`]);
	log.info(`deployed to ${opts.env}`);
}
