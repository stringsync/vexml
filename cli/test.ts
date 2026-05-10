import { build } from './build.ts';
import { run } from './util.ts';

export async function test(opts: { local: boolean; ci: boolean; args: string[] }): Promise<void> {
  const jestArgs = ['--runInBand', ...(opts.ci ? ['--ci'] : []), ...opts.args];
  if (opts.local) {
    await testLocal({ args: jestArgs });
  } else {
    await testDocker({ ci: opts.ci, args: jestArgs });
  }
}

async function testLocal(opts: { args: string[] }): Promise<void> {
  run('npx', ['jest', ...opts.args]);
}

async function testDocker(opts: { ci: boolean; args: string[] }): Promise<void> {
  await build.image();

  const cwd = process.cwd();
  const dockerArgs = [
    'run',
    '--rm',
    opts.ci ? '-i' : '-it',
    '-v',
    `${cwd}/src:/vexml/src`,
    '-v',
    `${cwd}/tests:/vexml/tests`,
    'vexml:latest',
    'npx',
    'jest',
    ...opts.args,
  ];

  run('docker', dockerArgs);
}
