import { spawn } from 'node:child_process';
import { run } from './run';

const DIR = 'tests/integration';

// Silence the build; on failure dump what was captured so the error is still visible.
function buildSilently(): Promise<void> {
	process.stdout.write('Building...\n');
	return new Promise((resolve, reject) => {
		const child = spawn('docker', ['build', '-t', 'vexml-tests', '.']);
		let output = '';
		child.stdout.on('data', (d) => (output += d));
		child.stderr.on('data', (d) => (output += d));
		child.on('error', reject);
		child.on('exit', (code) => {
			if (code === 0) {
				return resolve();
			}
			process.stderr.write(output);
			process.exit(code ?? 1);
		});
	});
}

export async function test(opts: {
	local: boolean;
	update: boolean;
	args?: string[];
}) {
	const args = opts.args ?? [];
	if (opts.local) {
		return testLocal(opts.update, args);
	} else {
		return testDocker(opts.update, args);
	}
}

function testLocal(update: boolean, testArgs: string[]) {
	// Host pixels differ from the Docker baselines, so compare against a gitignored local set.
	return run('bun', ['test', DIR, ...testArgs], {
		...process.env,
		UPDATE_SCREENSHOTS: update ? '1' : '',
		SCREENSHOTS_DIR: `${DIR}/__local_screenshots__`,
	});
}

async function testDocker(update: boolean, testArgs: string[]) {
	const cwd = process.cwd();

	const args = [
		'run',
		'--rm',
		'-e',
		'FORCE_COLOR=1',
		'-v',
		`${cwd}/tests:/app/tests`,
	];
	if (update) {
		args.push('-e', 'UPDATE_SCREENSHOTS=1');
	}
	// Anything after the image name is forwarded to the container's test command.
	args.push('vexml-tests', ...testArgs);

	await buildSilently();
	await run('docker', args);
}
