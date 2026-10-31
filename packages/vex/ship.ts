import type { Logger } from 'core/log';
import {
	type Bump,
	type DryRun,
	type GithubActions,
	githubActions,
	releases,
} from 'core/ship';
import type { Ps } from 'core/system';
import { Duration } from 'core/time';
import { fix } from './fix';
import { MIRROR } from './mirror';

export interface ShipOptions {
	bump: Bump;
	log: Logger;
	ps: Ps;
	/** Rehearse the release, sending nothing out; see core/ship's `dryRun`. */
	dryRun?: boolean | DryRun;
}

/** The repository vexml is mirrored to, whose workflow publishes it. */
const REPO = 'stringsync/vexml';

/** What stringsync/vexml's publish workflow runs, from the mirror's root. */
const PUBLISH = 'bin/vex publish';

const PACKAGE = '@stringsync/vexml';

export async function ship(opts: ShipOptions) {
	const via = actions(opts.ps);
	// Everything else belongs to core/ship: it refuses a dirty tree or a
	// branch that isn't main, asks, stamps package.json, commits, pushes,
	// tags, publishes and writes the GitHub notes, and finishes a release that
	// died partway instead of bumping past it.
	await releases
		.lockstep(
			releases.push({ ps: opts.ps }),
			// vexml goes out against the @stringsync/mdom npm has, so an mdom
			// change it relies on must ship first; this lists any mdom has not
			// shipped and asks whether to go ahead without them.
			releases.shipped({ project: 'vexml', ps: opts.ps }),
			// A typecheck gates the release after the push and before the release
			// touches anything.
			releases.step({
				name: 'Typecheck',
				deadline: Duration.mins(10),
				stage: 'preflight',
				run: async () => fix({ check: true, log: opts.log, ps: opts.ps }),
			}),
			// npm gets the build stringsync/vexml's publish workflow makes from the
			// mirror's commit, which npm trusts, so nothing logs in or approves.
			releases.npm(PACKAGE, { ps: opts.ps, via }),
			// The tag and the notes go on the public repository; mono, which holds
			// every project, gets no tag, and the release commit goes up with mono's
			// next push.
			releases.github({ repo: REPO, ps: opts.ps }),
			// The build happens in the mirror, installed from npm as anyone cloning
			// stringsync/vexml would: @stringsync/mdom is the release npm has, so
			// vexml needing an mdom change not yet released fails here, and the
			// core it reaches, which no registry has, is folded in. The mirror's
			// commit is pushed at the tag stage.
			releases.mirrored({ ...MIRROR, ps: opts.ps, publish: PUBLISH, via }),
		)
		.release({
			bump: opts.bump,
			project: 'vexml',
			dryRun: opts.dryRun,
			log: opts.log,
			ps: opts.ps,
		});
}

export interface PublishOptions {
	log: Logger;
	ps: Ps;
}

/**
 * Builds @stringsync/vexml and publishes it at the version the checkout
 * stands at, unless npm has it already. stringsync/vexml's publish workflow
 * runs it from a release's mirror commit, as a job npm trusts; it is never
 * run in mono.
 */
export async function publish(opts: PublishOptions): Promise<void> {
	await releases
		.lockstep(releases.vendor(), releases.npm(PACKAGE, { ps: opts.ps }))
		.publish({ log: opts.log, ps: opts.ps });
}

/**
 * Has npm trust stringsync/vexml's publish workflow to publish
 * @stringsync/vexml. Run once, by the person: npm asks to sign in in a browser.
 */
export async function trust(opts: PublishOptions): Promise<void> {
	await releases
		.npm(PACKAGE, { ps: opts.ps, via: actions(opts.ps) })
		.trust({ log: opts.log });
}

function actions(ps: Ps): GithubActions {
	return githubActions({ repo: REPO, ps, trustCommand: 'vex trust' });
}
