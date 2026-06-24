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
	.command('test [pattern]')
	.description('run integration (visual regression) tests; pattern filters by name')
	.option('--update', 'update screenshot baselines')
	.option('--local', 'run on the host instead of the pinned Docker image')
	.option('--clean', 'delete orphaned screenshots')
	.action(async (pattern, opts) => {
		if (opts.clean && pattern) {
			console.error('vex test: --clean and a pattern are incompatible');
			process.exit(1);
		}
		await test({
			local: opts.local ?? false,
			update: opts.update ?? false,
			clean: opts.clean ?? false,
			pattern,
		});
	});

program.parse();
