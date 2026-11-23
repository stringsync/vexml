# core/rig

A project's dev servers, declared as plain objects, and `serve`, which
answers the splates Rigs protocol (`splates/docs/rigs.md`) from the project's
launcher. Nothing here starts a server until `serve` is asked to `start` one.

```ts
// bin/vex-rig.ts
import { group, rig, serve } from "core/rig";

const vexml = group({
	name: "vexml",
	rigs: [
		rig({
			name: "dev",
			label: "Dev server",
			health: { http: "/healthz" },
			options: [
				{ name: "renderer", type: "enum", values: ["svg", "canvas"], default: "svg" },
				{ name: "debug", type: "boolean", default: false },
			],
			run: async ({ port, options }) => {
				await startVite({ port, renderer: options.renderer });
			},
		}),
	],
});

await serve(vexml, process.argv.slice(2));
```

- `rig()` checks a rig: lowercase `-` names, at least one port (`["web"]`
  when left out, the main one first), unique ports and options, an enum's
  default among its values, and a health check on a declared port.
- `group()` names the rigs one command answers for, unique in it.
- `serve(group, argv)` answers `describe` (the group as JSON, `run` left
  out, `ports` and `options` filled in) and `start <rig> --<option>=<value>…`
  (booleans as `true`/`false`), which hands `run` the typed `options` and the
  `ports` read from `PORT_<NAME>`, the first also as `port`. `run` stays in
  the foreground until the process is stopped.
- A bad request throws; the launcher lets it exit non-zero.
