// vexml's ship target: @stringsync/vexml goes to npm through its public
// mirror, stringsync/vexml, whose publish workflow npm trusts. It ships after
// @stringsync/mdom and depends on the version that release made. `bin/vex
// ship` serves it.

import { commitsSince, npm, target } from 'core/ship';

const MDOM = '@stringsync/mdom';

// What a release carries: the package, and the core folders its build bundles
// (the subpaths it imports and what they import). mdom is its own target,
// pinned to the version npm has, so its commits are not vexml's to ship.
const SHIPPED_PATHS = [
	'vexml/packages/vexml',
	'core/packages/core/disposable',
	'core/packages/core/events',
	'core/packages/core/geometry',
	'core/packages/core/time',
];

export const vexmlShip = target({
	name: '@stringsync/vexml',
	bump: 'patch',
	dependencies: [MDOM],
	// The mirror holds the release tags; here a release is the commit that
	// bumped the package's version.
	unshipped: (ctx) =>
		commitsSince(ctx, {
			version: 'vexml/packages/vexml/package.json',
			paths: SHIPPED_PATHS,
		}),
	plan: ({ bump = 'patch', upstream }) =>
		npm.release({
			package: '@stringsync/vexml',
			bump,
			repository: 'stringsync/vexml',
			// The integration tests render in Docker, so the release checks types
			// and runs the library's own tests, as `bin/mono test` does.
			test: 'bin/vex fix --check && bin/mono test @stringsync/vexml @vexml/vex',
			pins: { [MDOM]: upstream(MDOM).version },
			// A bare `bun test` refuses to run, since renders diff against Docker
			// baselines, so the mirror runs its own `bin/vex test`, which renders in
			// Docker from the mirror's Dockerfile.
			mirrorTest: 'bin/vex test',
			// The README's `npx skills add stringsync/vexml@vexml` needs this skill.
			keep: ['skills/vexml/**'],
		}),
});
