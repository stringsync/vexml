import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import readline from 'readline';

const PACKAGE_JSON_PATH = path.join(process.cwd(), 'package.json');

function runCommand(command) {
  console.log(`\x1b[36m$ ${command}\x1b[0m`); // Highlight command
  return execSync(command, { stdio: 'inherit' });
}

function getCurrentVersion() {
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
  return pkg.version;
}

function updateVersion(version) {
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
  pkg.version = version;
  writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(pkg, null, 2) + '\n');
}

function getNextVersion(type, currentVersion) {
  const [major, minor, patch, revision] = currentVersion.split('.').map(Number);

  switch (type) {
    case 'alpha':
      return `${major}.${minor}.${patch}-alpha.${revision + 1}`;
    case 'beta':
      return `${major}.${minor}.${patch}-beta.${revision + 1}`;
    case 'rc':
      return `${major}.${minor}.${patch}-rc.${revision + 1}`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'major':
      return `${major + 1}.0.0`;
    default:
      throw new Error(`Invalid version type: ${type}`);
  }
}

function main() {
  if (execSync('git status --porcelain').toString().trim()) {
    console.error('\x1b[31m❌ Commit your changes before publishing.\x1b[0m');
    process.exit(1);
  }

  const currentBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  if (currentBranch !== 'master') {
    console.error('\x1b[31m❌ You must be on the master branch to publish.\x1b[0m');
    process.exit(1);
  }

  try {
    execSync('npm whoami', { stdio: 'ignore' });
  } catch {
    console.error('\x1b[31m❌ You are not logged in to npm. Run `npm login` before publishing.\x1b[0m');
    process.exit(1);
  }

  const type = process.argv[2]; // Get version type from CLI args
  if (!type) {
    console.error('\x1b[31m❌ Please specify a version type (alpha, beta, rc, patch, minor, major)\x1b[0m');
    process.exit(1);
  }

  const currentVersion = getCurrentVersion();
  const nextVersion = getNextVersion(type, currentVersion);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(
    `\x1b[33mcurrent: ${currentVersion}, next: ${nextVersion} (${type}). Are you sure? (y/n) \x1b[0m`,
    (answer) => {
      rl.close();

      if (answer.toLowerCase() !== 'y') {
        console.log('\x1b[31m❌ Aborted.\x1b[0m');
        process.exit(0);
      }

      console.log(`\x1b[32m🚀 Publishing version ${nextVersion}...\x1b[0m`);
      updateVersion(nextVersion);

      runCommand('npm install'); // Ensure dependencies are locked with the new version
      runCommand('npm run build');
      runCommand(`git commit -am "Release ${nextVersion}"`);
      runCommand(`git tag v${nextVersion}`);
      runCommand(`git push origin v${nextVersion}`);

      // Determine npm tag
      const npmTag = ['alpha', 'beta', 'rc'].includes(type) ? type : 'latest';

      runCommand(`npm publish --access public --tag ${npmTag}`);
      runCommand('git push origin master'); // Push changes to repo

      console.log(`\x1b[32m✅ Published ${nextVersion} with tag "${npmTag}".\x1b[0m`);
    }
  );
}

main();
