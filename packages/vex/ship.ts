// vexml's ship target: @stringsync/vexml goes to npm through its public
// mirror, stringsync/vexml, whose publish workflow npm trusts. It ships after
// @stringsync/mdom and depends on the version that release made. `bin/vex
// ship` serves it.

import { commitsSince, npm, target } from 'core/ship';

/** Private dev files (`@vexml/book`, the Behind Bars verdict ledger, and splates rigs) stay out of the public mirror. */
export const MIRROR_OMIT = [
	'packages/book/**',
	'bin/book',
	'bin/vex-rig',
	'packages/vex/rig.ts',
	'packages/vex/rig-*.ts',
	'packages/vex/rig.test.ts',
	'packages/site/conformance.html',
	'packages/site/conformance/**',
	'packages/integration/__reviews__/**',
	'.cache/**',
];

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
	// A release leaves a @stringsync/vexml@<version> tag on the mono commit it
	// was built from; the count starts from the newest.
	unshipped: (ctx) =>
		commitsSince(ctx, {
			release: '@stringsync/vexml',
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
			// The Behind Bars reader is private: its package and launcher stay out.
			omit: MIRROR_OMIT,
		}),
});
