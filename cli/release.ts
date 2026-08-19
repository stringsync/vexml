import { type Bump, releases } from 'webappwiz/ship';
import { fix } from './fix';

export async function release(type: Bump) {
	// The gate is the only part of a release that belongs to this repo. We publish
	// src directly (no build step), so a typecheck is the compile gate. Run it
	// before ship touches anything so failures abort cleanly.
	await fix({ check: true });

	// Everything else is ship's: it refuses a dirty tree or a branch that isn't
	// master, asks, stamps package.json, commits, pushes, tags, publishes and
	// writes the GitHub notes — and finishes a release that died partway instead
	// of bumping past it.
	await releases
		.lockstep(
			releases.npm('@stringsync/vexml'),
			releases.git(),
			releases.github(),
		)
		.release({ bump: type });
}
