// vexml's ship target: @stringsync/vexml goes to npm through its public
// mirror, stringsync/vexml, whose publish workflow npm trusts. It ships after
// @stringsync/mdom and depends on the version that release made. `bin/vex
// ship` serves it.

import { npm, target } from 'core/ship';

const MDOM = '@stringsync/mdom';

export const vexmlShip = target({
	name: '@stringsync/vexml',
	bump: 'patch',
	dependencies: [MDOM],
	plan: ({ bump = 'patch', upstream }) =>
		npm.release({
			package: '@stringsync/vexml',
			bump,
			repository: 'stringsync/vexml',
			// The integration tests render in Docker, so the release checks types
			// and runs the library's own tests, as `bin/mono test` does.
			test: 'bin/vex fix --check && bin/mono test @stringsync/vexml @vexml/vex',
			pins: { [MDOM]: upstream(MDOM).version },
			// The README's `npx skills add stringsync/vexml@vexml` needs this skill.
			keep: ['skills/vexml/**'],
		}),
});
