import { program } from 'commander';
import { build } from './build.ts';
import { dev } from './dev.ts';
import { fix } from './fix.ts';
import { release } from './release.ts';
import { resnap } from './resnap.ts';
import { test } from './test.ts';
import { withErrorHandling, withTiming } from './util.ts';

program.name('vex').description('vexml dev CLI');

program
  .command('dev')
  .description('start the demo site dev server')
  .action(
    withErrorHandling(async () => {
      await dev();
    })
  );

program
  .command('fix')
  .description('format, lint, and typecheck')
  .option('--check', 'check without fixing issues', false)
  .action(
    withErrorHandling(
      withTiming(async (opts: { check: boolean }) => {
        await fix({ check: opts.check });
      })
    )
  );

program
  .command('test')
  .description('run jest in Docker')
  .allowUnknownOption(true)
  .option('-l, --local', 'run jest locally instead of in Docker', false)
  .argument('[args...]', 'extra args forwarded to jest', [])
  .action(
    withErrorHandling(
      withTiming(async (args: string[], opts: { local: boolean }) => {
        await test({ local: opts.local, args });
      })
    )
  );

program
  .command('resnap')
  .description('regenerate obsolete jest image snapshots from origin/master')
  .action(
    withErrorHandling(async () => {
      await resnap();
    })
  );

const buildCommand = program.command('build').description('build vexml artifacts');

buildCommand
  .command('lib')
  .description('build the library (types, cjs, esm)')
  .action(
    withErrorHandling(
      withTiming(async () => {
        await build.lib();
      })
    )
  );

buildCommand
  .command('site')
  .description('build the demo site')
  .action(
    withErrorHandling(
      withTiming(async () => {
        await build.site();
      })
    )
  );

buildCommand
  .command('image')
  .description('build the Docker image used for tests')
  .action(
    withErrorHandling(
      withTiming(async () => {
        await build.image();
      })
    )
  );

program
  .command('release')
  .description('publish to npm with a version bump')
  .argument('<type>', 'version bump (patch, minor, major)')
  .action(
    withErrorHandling(async (type: string) => {
      await release(type);
    })
  );

program.parse();
