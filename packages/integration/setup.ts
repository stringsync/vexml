import { afterAll, beforeAll } from 'bun:test';
import { close, start } from './harness';
// Registers the toMatchScreenshot matcher and its end-of-run report.
import './screenshot';

// The preload (see bunfig.toml): preloaded once per `bun test` run, so the tab pool and
// the matcher's cleanups scope to the whole run, not one file.

// Guard: tests must go through `vex test`, which renders in the pinned Docker
// image. Bare `bun test` on the host compares against the committed Docker
// baselines and silently "fails" on font/anti-aliasing differences. vex sets
// this sentinel; nothing else does.
if (process.env.I_AM_RUNNING_TESTS_USING_VEX_TEST !== '1') {
	// process.exit, not throw: bun catches a preload throw and runs tests anyway.
	console.error(
		'\nRun tests with `vex test`, not `bun test` directly.\n' +
			'Bare bun test diffs host pixels against the Docker baselines. See packages/vex/test.ts.\n',
	);
	process.exit(1);
}

// Eager, to keep the browser launch out of the first test's own timeout.
beforeAll(async () => {
	await start();
});

afterAll(async () => {
	await close();
});
