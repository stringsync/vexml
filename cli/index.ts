#!/usr/bin/env bun
import { program } from 'commander';
import { fix } from './fix';

process.chdir(`${import.meta.dir}/..`);

program.name('vex').description('vexml dev CLI');

program
	.command('fix')
	.description('format and lint')
	.option('--check', "don't write changes")
	.action(async (opts) => {
		await fix({ check: opts.check ?? false });
	});

program.parse();
