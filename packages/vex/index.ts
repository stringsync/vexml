#!/usr/bin/env bun
import { NodeFs, NodePs } from 'webappwiz/system';
import { vex } from './vex';

const ps = new NodePs();
const fs = new NodeFs();

// Where the user actually ran `vex`, before we chdir below. Every command
// underneath resolves from the repo root, not this package: the shell scripts,
// the docker build context and the hoisted node_modules all live up there.
const invocationDir = ps.cwd();
ps.cd(`${import.meta.dir}/../..`);

await vex.run({ ps, fs, invocationDir });
