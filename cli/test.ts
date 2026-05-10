import { build } from './build.ts';
import { run } from './util.ts';

export async function test(opts: { local: boolean; args: string[] }): Promise<void> {
  if (opts.local) {
    await testLocal({ args: opts.args });
  } else {
    await testDocker({ args: opts.args });
  }
}

async function testLocal(opts: { args: string[] }): Promise<void> {
  run('npx', ['jest', '--runInBand', ...opts.args]);
}

async function testDocker(opts: { args: string[] }): Promise<void> {
  await build.image();

  const cwd = process.cwd();
  const dockerArgs = [
    'run',
    '--rm',
    '-it',
    '-v',
    `${cwd}/src:/vexml/src`,
    '-v',
    `${cwd}/tests:/vexml/tests`,
    'vexml:latest',
    'npx',
    'jest',
    '--runInBand',
    ...opts.args,
  ];

  run('docker', dockerArgs);
}
