#!/usr/bin/env bun
import { program } from 'commander';
import { dev } from './dev';
import { fix } from './fix';
import { release } from './release';
import { render } from './render';
import { test } from './test';
import { validate } from './validate';

// Where the user actually ran `vex`, before we chdir to the repo root below.
const invocationDir = process.cwd();
process.chdir(`${import.meta.dir}/..`);

program.name('vex').description('vexml dev CLI');

program
	.command('dev')
	.description('run the dev playground site')
	.action(async () => {
		await dev();
	});

program
	.command('fix')
	.description('format and lint')
	.option('--check', "don't write changes")
	.action(async (opts) => {
		await fix({ check: opts.check ?? false });
	});

program
	.command('test [pattern]')
	.description(
		'run unit (src) + integration (visual regression) tests; pattern filters by name',
	)
	.option('--update', 'update screenshot baselines')
	.option('--clean', 'delete orphaned screenshots')
	.action(async (pattern, opts) => {
		if (opts.clean && pattern) {
			console.error('vex test: --clean and a pattern are incompatible');
			process.exit(1);
		}
		await test({
			update: opts.update ?? false,
			clean: opts.clean ?? false,
			pattern,
		});
	});

program
	.command('render')
	.description('render a musicxml file to a png')
	.requiredOption('-i, --input <path>', 'input musicxml file')
	.option(
		'-o, --output <path>',
		'output png path (default: ./vexml YYYY-MM-DD HH.MM.SS.png)',
	)
	.option(
		'-c, --config <json>',
		'partial render config as JSON, e.g. \'{"noteSpacing":40,"showPartLabels":true}\'',
	)
	.action(async (opts) => {
		await render({
			input: opts.input,
			output: opts.output,
			config: opts.config,
			cwd: invocationDir,
		});
	});

program
	.command('validate')
	.description('validate a musicxml file against the MusicXML XSD with xmllint')
	.requiredOption('-i, --input <path>', 'input musicxml file')
	.action(async (opts) => {
		await validate({ input: opts.input, cwd: invocationDir });
	});

program
	.command('release <type>')
	.description('bump version (patch|minor|major), commit, tag, and publish')
	.action(async (type) => {
		await release(type);
	});

program.parse();
