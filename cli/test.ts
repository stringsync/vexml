import { spawn } from 'node:child_process';
import { run } from './run';

const INTEGRATION_TESTS_DIR = 'tests/integration';

export async function test(opts: {
	local: boolean;
	update: boolean;
	clean: boolean;
	pattern?: string;
}) {
	// No dir: bun discovers every *.test.ts (unit in src/ + integration), skipping
	// node_modules. bun's -t filters tests by name.
	const args = opts.pattern ? ['-t', opts.pattern] : [];
	if (opts.local) {
		return testLocal(opts, args);
	} else {
		return testDocker(opts, args);
	}
}

function testLocal(
	opts: { update: boolean; clean: boolean },
	testArgs: string[],
) {
	// Host pixels differ from the Docker baselines, so compare against a gitignored local set.
	return run('bun', ['test', ...testArgs], {
		...process.env,
		UPDATE_SCREENSHOTS: opts.update ? '1' : '',
		CLEANUP_ORPHANED_SCREENSHOTS: opts.clean ? '1' : '',
		SCREENSHOTS_DIR: `${INTEGRATION_TESTS_DIR}/__local_screenshots__`,
	});
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
