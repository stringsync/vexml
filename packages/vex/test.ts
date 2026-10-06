import type { Logger } from 'webappwiz/log';
import type { Fs, Ps } from 'webappwiz/system';

export interface TestOptions {
	/* Rewrite the screenshot baselines from this run instead of diffing against them. */
	update: boolean;
	/* Delete baselines no test claims any more. */
	clean: boolean;
	/* Filter tests by name (bun's -t). */
	pattern?: string;
	log: Logger;
	fs: Fs;
	ps: Ps;
}

export async function test(opts: TestOptions) {
	// Tests run in Docker for stable baselines; docker-in-docker isn't supported.
	if (await opts.fs.exists('/.dockerenv')) {
		throw new Error('already running inside Docker');
	}
	// No dir: bun discovers every *.test.ts (unit in packages/vexml + integration), skipping
	// node_modules. bun's -t filters tests by name.
	const testArgs = opts.pattern ? ['-t', opts.pattern] : [];

	const args = [
		'run',
		'--rm',
		'-e',
		'FORCE_COLOR=1',
		'-e',
		'I_AM_RUNNING_TESTS_USING_VEX_TEST=1',
		'-v',
		`${opts.ps.cwd()}/packages/integration:/app/packages/integration`,
	];
	if (opts.update) {
		args.push('-e', 'UPDATE_SCREENSHOTS=1');
	}
	if (opts.clean) {
		args.push('-e', 'CLEANUP_ORPHANED_SCREENSHOTS=1');
	}
	const image = await buildSilently(opts);
	// Anything after the image is forwarded to the container's test command.
	args.push(image, ...testArgs);

	try {
		const { exitCode } = await opts.ps.spawn(['docker', ...args]);
		if (exitCode !== 0) {
			throw new Error('tests failed');
		}
	} finally {
		if (image !== SHARED_TAG) {
			// Only the tag goes: the image stays while any other run's tag still names it.
			await opts.ps.spawnCapture(['docker', 'image', 'rm', image]);
		}
	}
}

const SHARED_TAG = 'vexml-tests';

/** Builds the test image and returns a tag of this run's own to run it by. The shared
 * `vexml-tests` tag won't do: every worktree builds it, so a concurrent `vex test` elsewhere
 * can retag it between build and run, and this run tests that worktree's source. Nor will
 * the bare image ID: once that retag leaves the image untagged, Docker may collect it before
 * `docker run` starts, which fails with `No such image`. A tag per run pins the image until
 * the run removes it. */
async function buildSilently(opts: TestOptions): Promise<string> {
	// CI pre-builds the vexml-tests image with layer caching, then sets this to
	// reuse it instead of rebuilding from scratch every run.
	if (opts.ps.env('VEX_TEST_SKIP_BUILD')) {
		opts.log.info('Skipping build (VEX_TEST_SKIP_BUILD set)');
		return SHARED_TAG;
	}
	const tag = `${SHARED_TAG}:run-${opts.ps.pid}`;
	opts.log.info('Building...');
	const start = Date.now();
	// Captured, not inherited: a successful build says nothing worth the scroll,
	// and a failed one prints everything it swallowed.
	const { exitCode, stdout, stderr } = await opts.ps.spawnCapture([
		'docker',
		'build',
		// Prints only the image ID on stdout; errors still go to stderr.
		'-q',
		'-t',
		SHARED_TAG,
		'-t',
		tag,
		'.',
	]);
	if (exitCode !== 0) {
		opts.log.error(stdout + stderr);
		throw new Error('docker build failed');
	}
	opts.log.info(`Built in ${((Date.now() - start) / 1000).toFixed(1)}s`);
	return tag;
}
