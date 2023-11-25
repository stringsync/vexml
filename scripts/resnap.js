/* eslint-disable @typescript-eslint/no-var-requires */
import { execSync } from 'child_process';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

try {
  const hasChanges = execSync('git status --porcelain').toString().trim().length > 0;

  rl.question(`WARNING: Any staged git changes will become unstaged. Do you want to continue? (y/n): `, (answer) => {
    if (answer === 'y') {
      if (hasChanges) {
        console.log('Stashing any pending git changes...');
        execSync('git stash');
      }

      console.log('Getting current branch...');
      const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();

      console.log('Checking out origin/master...');
      execSync('git -c advice.detachedHead=false checkout origin/master');

      console.log('Updating snapshots...');
      execSync('JEST_IMAGE_SNAPSHOT_TRACK_OBSOLETE=1 yarn jest integration --updateSnapshot --silent');

      console.log(`Checking out ${branch}...`);
      execSync(`git checkout ${branch}`);

      if (hasChanges) {
        console.log('Unstashing changes...');
        execSync('git stash pop');
      }
    }
    rl.close();
  });
} catch (error) {
  console.error(`Error executing a command: ${error.message}`);
}
