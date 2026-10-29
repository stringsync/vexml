import type { Logger } from 'webappwiz/log';
import { type Bump, releases } from 'webappwiz/ship';
import type { Ps } from 'webappwiz/system';
import { Duration } from 'webappwiz/time';
import { fix } from './fix';

export interface ShipOptions {
	bump: Bump;
	log: Logger;
	ps: Ps;
}

export async function ship(opts: ShipOptions) {
	// Everything else belongs to webappwiz/ship: it refuses a dirty tree or a
	// branch that isn't master, asks, stamps package.json, commits, pushes,
	// tags, publishes and writes the GitHub notes, and finishes a release that
	// died partway instead of bumping past it.
	await releases
		.lockstep(
			releases.push({ ps: opts.ps }),
			// We publish TypeScript directly (no build step), so a typecheck is the
			// compile gate. It runs after the push and before the release touches anything.
			releases.step({
				name: 'Typecheck',
				deadline: Duration.mins(10),
				stage: 'preflight',
				run: async () => fix({ check: true, log: opts.log, ps: opts.ps }),
			}),
			releases.npm('@stringsync/vexml'),
			releases.git(),
			releases.github(),
		)
		.release({ bump: opts.bump });
}
