import type { Logger } from 'core/log';
import type { Ps } from 'core/system';
import { Duration, sleep } from 'core/time';

/** How the wait for Docker's daemon is paced, so a test need not wait. */
export type DockerWait = {
	pause: () => Promise<void>;
	attempts: number;
};

const DOCKER_WAIT: DockerWait = {
	pause: () => sleep(Duration.secs(2)),
	// About two minutes, which is what Docker Desktop takes on a cold start.
	attempts: 60,
};

/**
 * Makes sure the Docker daemon answers, starting Docker Desktop when it is
 * stopped on macOS, so a ship's mirror test never waits for someone to start
 * it. Throws, saying what to do, when the daemon cannot be reached.
 */
export async function ensureDocker(
	{ ps, log }: { ps: Ps; log: Logger },
	wait: DockerWait = DOCKER_WAIT,
): Promise<void> {
	const answers = async () => (await run(ps, ['docker', 'info'])) === 0;
	if (await answers()) {
		return;
	}
	if ((await run(ps, ['docker', '--version'])) !== 0) {
		throw new Error('docker is not installed, and vex test renders in it');
	}
	if (ps.platform !== 'darwin') {
		throw new Error('the Docker daemon is not running; start it and run again');
	}
	if ((await run(ps, ['open', '-a', 'Docker'])) !== 0) {
		throw new Error('Docker Desktop could not be started; is it installed?');
	}
	log.info('Starting Docker Desktop, waiting for its daemon...');
	for (let attempt = 0; attempt < wait.attempts; attempt++) {
		await wait.pause();
		if (await answers()) {
			return;
		}
	}
	throw new Error(
		'Docker Desktop did not come up in time; check it and run again',
	);
}

/** The exit code of a program, or undefined when the program is missing. */
async function run(ps: Ps, argv: string[]): Promise<number | undefined> {
	try {
		return (await ps.spawnCapture(argv)).exitCode;
	} catch {
		return undefined;
	}
}
