import type { ScryConfig } from '@webappwiz/scry/config';

export default {
	budgets: {
		som: { tokens: 10_000_000, per: 'month' },
		llm: 'nothing',
	},
	// vendored skills and catalog rules, both rewritten by `wiz update`
	exclude: ['.agents/skills/**', '.wiz/scry/**'],
} satisfies ScryConfig;
