import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { run } from './run';

export async function test(opts: {
	update: boolean;
	clean: boolean;
	pattern?: string;
}) {
	// Tests run in Docker for stable baselines; docker-in-docker isn't supported.
	if (existsSync('/.dockerenv')) {
		console.error('vex test: already running inside Docker');
		process.exit(1);
	}
	// No dir: bun discovers every *.test.ts (unit in src/ + integration), skipping
	// node_modules. bun's -t filters tests by name.
	const args = opts.pattern ? ['-t', opts.pattern] : [];
	return testDocker(opts, args);
}

async function testDocker(
	opts: { update: boolean; clean: boolean },
	testArgs: string[],
) {
	const cwd = process.cwd();

	const args = [
		'run',
		'--rm',
		'-e',
		'FORCE_COLOR=1',
		'-e',
		'I_AM_RUNNING_TESTS_USING_VEX_TEST=1',
		'-v',
		`${cwd}/tests:/app/tests`,
	];
	if (opts.update) {
		args.push('-e', 'UPDATE_SCREENSHOTS=1');
	}
	if (opts.clean) {
		args.push('-e', 'CLEANUP_ORPHANED_SCREENSHOTS=1');
	}
	// Anything after the image name is forwarded to the container's test command.
	args.push('vexml-tests', ...testArgs);

	await buildSilently();
	await run('docker', args);
}

function buildSilently(): Promise<void> {
	// CI pre-builds the vexml-tests image with layer caching, then sets this to
	// reuse it instead of rebuilding from scratch every run.
	if (process.env.VEX_TEST_SKIP_BUILD) {
		process.stdout.write('Skipping build (VEX_TEST_SKIP_BUILD set)\n');
		return Promise.resolve();
	}
	process.stdout.write('Building...\n');
	const start = Date.now();
	return new Promise((resolve, reject) => {
		const child = spawn('docker', ['build', '-t', 'vexml-tests', '.']);
		let output = '';
		child.stdout.on('data', (d) => (output += d));
		child.stderr.on('data', (d) => (output += d));
		child.on('error', reject);
		child.on('exit', (code) => {
			if (code === 0) {
				process.stdout.write(
					`Built in ${((Date.now() - start) / 1000).toFixed(1)}s\n`,
				);
				return resolve();
			}
			process.stderr.write(output);
			process.exit(code ?? 1);
		});
	});
}
