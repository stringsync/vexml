import { afterAll, beforeAll } from 'bun:test';
import { renderers } from '@vexml/renderer';
import { Testing } from './testing';
// Registers the toMatchScreenshot matcher and its end-of-run report.
import './screenshot';

// The preload (see bunfig.toml): preloaded once per `bun test` run, so the renderers'
// shared browser and the matcher's cleanups scope to the whole run, not one file. This
// is the one module allowed side effects; everything else only declares.

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

/** The run's one Testing. Assigned in beforeAll below — an ESM binding is live, so
 * tests importing `testing` see the instance by the time any of them runs. */
export let testing: Testing;

beforeAll(async () => {
	testing = new Testing();
	// One throwaway render to warm the shared machinery (browser launch, page bundle,
	// first tab) outside any test's own timeout.
	await testing.render('note.musicxml');
});

afterAll(async () => {
	await renderers.disposeAsync();
});
