# Configuring scry

How to set the models a check asks, what it may spend, and the options a
rule takes. The skill's `SKILL.md` covers when to touch a budget at all:
only when the user asks.

## Where it is set

`scry.config.ts`, at the project root, is the project's, shared by everyone
who checks it out, and `~/.config/scry/config.ts` is the user's own, over
it. Ask which they mean when they have not said. `WIZ_SCRY_JOBS` is over
both. The `ScryConfig` type in `@webappwiz/scry/config` documents every key,
and the default models.

## Models

```ts
import type { ScryConfig } from "@webappwiz/scry/config";

export default {
	// over the defaults, effort by effort: what it leaves out keeps the default
	models: {
		som: "jev-latest", // at every effort
		llm: { default: "claude-sonnet-5-5", high: "claude-fable-5-1" },
	},
	// laid over models by --profile double-check
	profiles: { "double-check": { som: "jev-preview" } },
	jobs: 8, // requests at once, to each model
	exclude: ["vendor/**"], // files no rule checks, from the project root
	rules: { "compact-files": { limit: 400 } }, // over the options a rule declares
} satisfies ScryConfig;
```

A rule's question asks at the effort it names, `low`, `medium` or `high`, or
at the default, and the config picks the model for each. `--profile <name>`
picks a profile for one run, like checking again with `double-check` only the
files a first check flagged. The two runs report apart; comparing them is the
caller's.

`clef` and `clef-flash` run on Cloudflare Workers AI and need
`CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`; a Jev like `jev-latest`
runs on TypeSafe and needs `TYPESAFE_API_KEY`; a Claude like
`claude-sonnet-5-5` runs on Anthropic and needs `ANTHROPIC_API_KEY`. A model
no rule asks needs none.

## Rule options

`rules` sets the options a rule declares as its `static options`, by rule
id, each to a value of its default's type. Naming a rule the project lacks,
or an option its rule does not take, is an error. The user's config lays
its own over the project's, option by option. Tuning a rule here, rather
than editing its `rule.ts`, survives `wiz scry update`.

For one run, `--option <rule>.<option>=<value>` on `wiz scry` or `wiz scry
eval` lays an option over both configs, like `--option
compact-files.limit=400`, given again for each other option. The value is
read as its default's type.

## Budgets

```ts
budgets: "unlimited"  // spend without a limit
budgets: {
	som: { tokens: 5_000_000, per: "day" },
	llm: [
		// every limit in a list holds at once
		{ tokens: 2_000_000, per: "month" },
		{ tokens: 300_000, within: "7d" },
	],
}
```

- Name both `som` and `llm`, each `"nothing"`, `"unlimited"`, a limit, or a
  list of limits, so neither is left to a default. A limit is `tokens`
  input tokens over one window: `per` a `"check"` (one run of `wiz scry`
  or `wiz scry eval`), or a calendar `"day"`, `"week"` (from Monday) or
  `"month"`, in local time; or `within` a rolling `"24h"`, `"7d"` or `"2w"`.
- A config with `budgets` as a list of windows is the old shape, which the
  check refuses: `wiz scry update` rewrites it.
- Budgets are tokens, not money. When the user names an amount of money,
  say so, and help them pick tokens: `--cost` on a typical check says what
  it would spend, and the som is far cheaper per token than the llm.
- The last config to set `budgets` wins whole.
- `wiz scry budgets set <som|llm> <spend>`, like `5m/day`, lays one model's
  budget over the configs for this project on this device only, and `wiz
  scry budgets raise <som|llm> <tokens> --for <4h|1d>` adds tokens for a
  while. When the user wants a change for themselves rather than everyone
  on the project, or only for now, use these rather than a config; `wiz
  scry budgets` shows where each stands.
- What was spent is kept per user on the device, so every worktree of a
  project draws on one budget.
