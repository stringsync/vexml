import { rmSync } from 'node:fs';
import { run } from './util.ts';

const PROJECT = 'tsconfig.package.json';

async function buildLib(): Promise<void> {
  rmSync('dist', { recursive: true, force: true });
  buildTypes();
  buildCjs();
  buildEsm();
}

async function buildSite(): Promise<void> {
  run('npx', ['vite', '--config', 'site/vite.config.js', 'build']);
}

async function buildImage(): Promise<void> {
  run('docker', ['build', '.', '--tag', 'vexml:latest']);
}

function buildTypes(): void {
  run('npx', ['tsc', '--project', PROJECT, '--outDir', 'dist/@types', '--emitDeclarationOnly']);
  run('npx', ['tsc-alias', '-p', PROJECT, '--outDir', 'dist/@types']);
}

function buildCjs(): void {
  run('npx', ['tsc', '--project', PROJECT, '--outDir', 'dist/cjs', '--module', 'commonjs']);
  run('npx', ['tsc-alias', '-p', PROJECT, '--outDir', 'dist/cjs']);
}

function buildEsm(): void {
  run('npx', ['tsc', '--project', PROJECT, '--outDir', 'dist/esm', '--module', 'esnext']);
  run('npx', ['tsc-alias', '-p', PROJECT, '--outDir', 'dist/esm']);
}

export const build = {
  lib: buildLib,
  site: buildSite,
  image: buildImage,
};
