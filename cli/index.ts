#!/usr/bin/env bun
import { program } from 'commander';
import { fix } from './fix';
import { test } from './test';

process.chdir(`${import.meta.dir}/..`);

program.name('vex').description('vexml dev CLI');

program
	.command('fix')
	.description('format and lint')
	.option('--check', "don't write changes")
	.action(async (opts) => {
		await fix({ check: opts.check ?? false });
	});

program
	.command('test')
	.description('run integration (visual regression) tests')
	.option('--update', 'update screenshot baselines')
	.option('--local', 'run on the host instead of the pinned Docker image')
	// Unknown flags/operands are forwarded to the underlying `bun test`.
	.allowUnknownOption()
	.allowExcessArguments()
	.action(async (opts, command) => {
		// --watch can't work: src/ is bundled into the browser, not bun's module graph.
		if (command.args.some((a: string) => a === '--watch' || a === '-w')) {
			console.error('vex test: watch is not supported');
			process.exit(1);
		}
		await test({
			local: opts.local ?? false,
			update: opts.update ?? false,
			args: command.args,
		});
	});

program.parse();
