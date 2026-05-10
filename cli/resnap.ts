import { execSync } from 'node:child_process';
import readline from 'node:readline/promises';
import chalk from 'chalk';
import { run } from './util.ts';

export async function resnap(): Promise<void> {
  const hasChanges = execSync('git status --porcelain').toString().trim().length > 0;

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    chalk.yellow('WARNING: Any staged git changes will become unstaged. Do you want to continue? (y/n): ')
  );
  rl.close();

  if (answer.toLowerCase() !== 'y') {
    return;
  }

  if (hasChanges) {
    console.log(chalk.dim('Stashing any pending git changes...'));
    run('git', ['stash']);
  }

  console.log(chalk.dim('Getting current branch...'));
  const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();

  try {
    console.log(chalk.dim('Checking out origin/master...'));
    run('git', ['-c', 'advice.detachedHead=false', 'checkout', 'origin/master']);

    console.log(chalk.dim('Updating snapshots...'));
    run('npx', ['jest', 'integration', '--updateSnapshot', '--silent'], {
      env: { ...process.env, JEST_IMAGE_SNAPSHOT_TRACK_OBSOLETE: '1' },
    });
  } finally {
    console.log(chalk.dim(`Checking out ${branch}...`));
    run('git', ['checkout', branch]);

    if (hasChanges) {
      console.log(chalk.dim('Unstashing changes...'));
      run('git', ['stash', 'pop']);
    }
  }
}
