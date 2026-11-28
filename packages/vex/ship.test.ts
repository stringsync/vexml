import { expect, test } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { MemoryLogger } from 'core/log';
import { view } from 'core/ship';
import { FakeFs, FakePs } from 'core/system/testing';
import { MIRROR_OMIT, vexmlShip } from './ship';
import { vex } from './vex';

test('vexml ships to npm through its mirror after mdom, at the bump asked for', () => {
	const plan = view(vexmlShip, {
		bump: 'minor',
		upstream: () => ({ version: '2.3.4' }),
	});
	expect(plan.name).toBe('@stringsync/vexml');
	expect(plan.bump).toBe('minor');
	expect(plan.dependencies).toEqual(['@stringsync/mdom']);
	expect(plan.steps.map((each) => each.id)).toEqual([
		'login',
		'test',
		'version',
		'workflow',
		'mirror',
		'first-publish',
		'trust',
		'publish',
		'tag',
	]);
});

test("vexml's plan reads the version mdom released", () => {
	expect(() => view(vexmlShip)).toThrow('nothing upstream was given');
});

test('vexml counts unshipped commits since its newest release tag', async () => {
	const commands: string[] = [];
	const count = await vexmlShip.unshipped?.({
		sh: async (command: string) => {
			commands.push(command);
			return '3\n';
		},
	});
	expect(count).toBe(3);
	expect(commands[0]).toContain('refs/tags/@stringsync/vexml@*');
	expect(commands[0]).toContain(
		"'vexml/packages/vexml' 'core/packages/core/disposable'",
	);
	expect(commands[0]).not.toContain('mdom');
});

test("vexml's mirror leaves out the private book reader, verdict ledger, rigs, and nothing it needs", () => {
	const omitted = (filePath: string) =>
		MIRROR_OMIT.some((glob) => new Bun.Glob(glob).match(filePath));
	expect(omitted('packages/book/package.json')).toBe(true);
	expect(omitted('packages/book/book-server.ts')).toBe(true);
	expect(omitted('packages/book/book-ui.html')).toBe(true);
	expect(omitted('packages/book/book-ui.css')).toBe(true);
	expect(omitted('packages/book/book-client.ts')).toBe(true);
	expect(omitted('packages/book/book-client-render.ts')).toBe(true);
	expect(omitted('packages/book/src/index.ts')).toBe(true);
	expect(omitted('bin/book')).toBe(true);
	expect(omitted('bin/vex-rig')).toBe(true);
	expect(omitted('packages/vex/rig.ts')).toBe(true);
	expect(omitted('packages/vex/rig-cli.ts')).toBe(true);
	expect(omitted('packages/vex/rig-conformance-ui.ts')).toBe(true);
	expect(omitted('packages/vex/rig.test.ts')).toBe(true);
	expect(omitted('packages/site/conformance.html')).toBe(true);
	expect(omitted('packages/site/conformance/app.tsx')).toBe(true);
	expect(omitted('packages/integration/__reviews__/stem-length.json')).toBe(
		true,
	);
	expect(omitted('.cache/jev/abc123.json')).toBe(true);
	expect(omitted('packages/integration/ENGRAVING.md')).toBe(false);
	expect(omitted('packages/integration/ledger/decisions.md')).toBe(false);
	expect(omitted('packages/integration/rules/stem-length.md')).toBe(false);
	expect(omitted('bin/vex')).toBe(false);
	expect(omitted('packages/vex/vex.ts')).toBe(false);
	expect(omitted('packages/vex/dev.ts')).toBe(false);
	expect(omitted('packages/vex/perf.ts')).toBe(false);
	expect(omitted('packages/vexml/package.json')).toBe(false);
});

test('public vex CLI keeps dev and perf and drops rig', async () => {
	const log = new MemoryLogger();
	const ps = new FakePs();
	ps.args = ['--help'];
	await vex.run({ ps, fs: new FakeFs(), log, invocationDir: '/' });
	const help = Bun.stripANSI(
		log.entries.map((each) => String(each.message)).join('\n'),
	);
	expect(help).toMatch(/^\s+dev\s+/m);
	expect(help).toMatch(/^\s+perf\s+/m);
	expect(help).not.toMatch(/^\s+rig\s+/m);
});

function shippedFiles(vexmlRoot: string): string[] {
	const omitGlobs = MIRROR_OMIT.map((glob) => new Bun.Glob(glob));
	const files: string[] = [];

	function walk(dir: string): void {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			if (
				entry.name === 'node_modules' ||
				entry.name === '.git' ||
				entry.name === 'dist' ||
				entry.name === 'coverage'
			) {
				continue;
			}
			const full = path.join(dir, entry.name);
			const rel = path.relative(vexmlRoot, full).replaceAll('\\', '/');
			if (omitGlobs.some((glob) => glob.match(rel))) {
				continue;
			}
			// Mirror keeps only skills/vexml/** from skills/, and overlays AGENTS.md from mirror/.
			if (
				(rel === 'skills' || rel.startsWith('skills/')) &&
				rel !== 'skills' &&
				!rel.startsWith('skills/vexml')
			) {
				continue;
			}
			if (rel === 'AGENTS.md' || rel === 'CLAUDE.md') {
				continue;
			}
			if (entry.isDirectory()) {
				walk(full);
				continue;
			}
			if (entry.isFile()) {
				files.push(rel);
			}
		}
	}

	walk(vexmlRoot);
	return files;
}

test('no file shipped to the public mirror imports a rig file or the private book package', () => {
	const vexmlRoot = path.join(import.meta.dir, '../..');
	const privateImport =
		/(?:from|import)\s+['"](?:\.\/rig(?:-cli)?(?:\.ts)?|core\/rig(?:\/[^'"]*)?|@vexml\/book(?:\/[^'"]*)?)['"]/;
	const hits: string[] = [];
	for (const rel of shippedFiles(vexmlRoot)) {
		if (!/\.(?:ts|tsx|js|mjs|cjs)$/.test(rel)) {
			continue;
		}
		const content = readFileSync(path.join(vexmlRoot, rel), 'utf8');
		if (privateImport.test(content)) {
			hits.push(rel);
		}
	}
	expect(hits).toEqual([]);
});

test('no file shipped to the public mirror names the private external viewer', () => {
	const vexmlRoot = path.join(import.meta.dir, '../..');
	const privateViewer = new RegExp(['sound', 'slice'].join(''), 'i');
	const textExts = new Set([
		'.ts',
		'.tsx',
		'.js',
		'.mjs',
		'.cjs',
		'.json',
		'.md',
		'.txt',
		'.yml',
		'.yaml',
		'.toml',
		'.sh',
		'.musicxml',
		'.xml',
		'.html',
		'.css',
	]);
	const hits: string[] = [];

	for (const rel of shippedFiles(vexmlRoot)) {
		const ext = path.extname(rel).toLowerCase();
		if (ext && !textExts.has(ext)) {
			continue;
		}
		if (privateViewer.test(readFileSync(path.join(vexmlRoot, rel), 'utf8'))) {
			hits.push(rel);
		}
	}

	expect(hits).toEqual([]);
});
