import { spawn } from 'node:child_process';

// stdio: 'inherit' gives the child the real TTY, so it keeps its colors.
export function run(cmd: string, args: string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, args, { stdio: 'inherit', env: process.env });
		child.on('error', reject);
		// The child already printed its own failure; just exit with its code, no stack trace.
		child.on('exit', (code) =>
			code === 0 ? resolve() : process.exit(code ?? 1),
		);
	});
}
