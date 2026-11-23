// vexml's rigs for the splates Rigs page: the playground dev server and the Behind Bars
// rule review inbox. `bin/vex rig` serves them, as `bin/vex ship` serves the ship target.

import { group, rig } from 'core/rig';
import type { Ps } from 'core/system';

export function vexmlRigs(ps: Ps) {
	return group({
		name: 'vexml',
		rigs: [
			rig({
				name: 'dev',
				label: 'Playground',
				description:
					'Vite serving the playground, with its perf and review pages',
				health: { http: '/' },
				run: async ({ port }) => {
					// Ends when splates stops it, which is not a failure.
					await ps.spawn([
						'bunx',
						'vite',
						'packages/site',
						'--port',
						String(port),
						'--strictPort',
					]);
				},
			}),
			rig({
				name: 'rule-inbox',
				label: 'Behind Bars review',
				description:
					'Rule-first Behind Bars engraving review inbox across sittings',
				health: { http: '/' },
				run: async ({ port }) => {
					// Ends when splates stops it, which is not a failure.
					await ps.spawn([
						'bun',
						'packages/vex/index.ts',
						'review',
						'--rules',
						'--port',
						String(port),
					]);
				},
			}),
		],
	});
}
