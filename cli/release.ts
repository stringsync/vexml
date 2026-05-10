import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import chalk from 'chalk';
import { build } from './build.ts';
import { run } from './util.ts';

const VERSION_TYPES = ['patch', 'minor', 'major'] as const;
type VersionType = (typeof VERSION_TYPES)[number];

const PACKAGE_JSON_PATH = path.join(process.cwd(), 'package.json');

export async function release(type: string): Promise<void> {
  if (!VERSION_TYPES.includes(type as VersionType)) {
    throw new Error(`Invalid version type: ${type}. Must be one of: ${VERSION_TYPES.join(', ')}.`);
  }
  const versionType = type as VersionType;

  if (execSync('git status --porcelain').toString().trim()) {
    throw new Error('Commit your changes before publishing.');
  }

  const currentBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  if (currentBranch !== 'master') {
    throw new Error('You must be on the master branch to publish.');
  }

  try {
    execSync('npm whoami', { stdio: 'ignore' });
  } catch {
    throw new Error('You are not logged in to npm. Run `npm login` before publishing.');
  }

  const currentVersion = getCurrentVersion();
  const nextVersion = getNextVersion(versionType, currentVersion);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    chalk.yellow(`current: ${currentVersion}, next: ${nextVersion} (${versionType}). Are you sure? (y/n) `)
  );
  rl.close();

  if (answer.toLowerCase() !== 'y') {
    console.log(chalk.red('Aborted.'));
    return;
  }

  console.log(chalk.green(`Publishing version ${nextVersion}...`));
  updateVersion(nextVersion);

  run('npm', ['install']);
  await build.lib();
  run('git', ['commit', '-am', `Release ${nextVersion}`]);
  run('git', ['tag', `v${nextVersion}`]);
  run('git', ['push', 'origin', `v${nextVersion}`]);

  run('npm', ['publish', '--access', 'public']);
  run('git', ['push', 'origin', 'master']);

  console.log(chalk.green(`Published ${nextVersion}.`));
}

function getCurrentVersion(): string {
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
  return pkg.version;
}

function updateVersion(version: string): void {
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
  pkg.version = version;
  writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(pkg, null, 2) + '\n');
}

function getNextVersion(type: VersionType, currentVersion: string): string {
  const match = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Cannot parse version: ${currentVersion}`);
  }
  const [, majorStr, minorStr, patchStr] = match;
  const major = Number(majorStr);
  const minor = Number(minorStr);
  const patch = Number(patchStr);

  switch (type) {
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'major':
      return `${major + 1}.0.0`;
  }
}
