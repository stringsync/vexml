/* eslint-disable @typescript-eslint/no-var-requires */
const { execSync } = require('child_process');

try {
  console.log('Stashing any pending git changes...');
  execSync('git stash');

  console.log('Getting current branch...');
  const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();

  console.log('Checking out origin/master...');
  execSync('git -c advice.detachedHead=false checkout origin/master');

  console.log('Updating snapshots...');
  execSync('JEST_IMAGE_SNAPSHOT_TRACK_OBSOLETE=1 yarn jest integration --silent --updateSnapshot');

  console.log(`Checking out ${branch}...`);
  execSync(`git checkout ${branch}`);

  console.log('Unstashing changes...');
  execSync('git stash pop');

  console.log('Done.');
} catch (error) {
  console.error(`Error executing a command: ${error.message}`);
}
